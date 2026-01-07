import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useDebounce } from './use-debounce';
import { useSearchAnalytics } from './use-search-analytics';
import type { SearchResult, SearchResponse, SearchCategory, SearchResultAction } from '@/types/search';
import { Edit, Trash2, User, Building2, Home, Wallet, CheckSquare } from 'lucide-react';

interface SearchCache {
  [key: string]: {
    data: SearchResult[];
    timestamp: number;
    totalCount: number;
    executionTime: number;
  };
}

interface SearchMetrics {
  totalRequests: number;
  cacheHits: number;
  averageResponseTime: number;
}

interface UseSearchOptions {
  debounceMs?: number;
  cacheTimeMs?: number;
  limit?: number;
  categories?: SearchCategory[];
}

interface UseSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  executionTime: number;
  clearSearch: () => void;
  retry: () => void;
  retryCount: number;
  isOffline: boolean;
  lastSuccessfulQuery: string | null;
  getCacheMetrics?: () => any;
  suggestions: string[];
  recentSearches: string[];
  addToRecentSearches: (query: string) => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const DEFAULT_DEBOUNCE = 300; // 300ms
const DEFAULT_LIMIT = 5;
const DEFAULT_CATEGORIES: SearchCategory[] = ['tenant', 'house', 'apartment', 'finance', 'task'];
const MAX_CACHE_SIZE = 100; // Maximum number of cached entries
const MAX_RETRY_COUNT = 3; // Maximum number of retry attempts
const RETRY_DELAY_BASE = 1000; // Base delay for exponential backoff (1 second)

export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
  const {
    debounceMs = DEFAULT_DEBOUNCE,
    cacheTimeMs = CACHE_DURATION,
    limit = DEFAULT_LIMIT,
    categories = DEFAULT_CATEGORIES
  } = options;

  // Memoize categories to prevent recreation on every render
  const memoizedCategories = useMemo(() => categories, [categories.join(',')]);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [executionTime, setExecutionTime] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  const [lastSuccessfulQuery, setLastSuccessfulQuery] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Cache for storing search results with LRU eviction
  const cacheRef = useRef<SearchCache>({});
  const cacheKeysRef = useRef<string[]>([]);

  // AbortController for request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Search metrics for performance monitoring
  const metricsRef = useRef<SearchMetrics>({
    totalRequests: 0,
    cacheHits: 0,
    averageResponseTime: 0
  });

  // Retry timeout reference
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Recent searches management
  const RECENT_SEARCHES_KEY = 'rms-recent-searches';
  const MAX_RECENT_SEARCHES = 5;

  // Search analytics
  const { trackSearch } = useSearchAnalytics();

  // Debounced query to reduce API calls
  const debouncedQuery = useDebounce(query, debounceMs);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.slice(0, MAX_RECENT_SEARCHES));
        }
      }
    } catch (error) {
      console.warn('Failed to load recent searches:', error);
    }
  }, []);

  // Function to add search to recent searches
  const addToRecentSearches = useCallback((searchQuery: string) => {
    // Normalize the query by trimming and converting to lowercase for comparison
    const normalizedQuery = searchQuery.trim();

    // Skip if query is too short or empty
    if (normalizedQuery.length < 2) return;

    setRecentSearches(prev => {
      // Check if the query is already the most recent search
      if (prev.length > 0 && prev[0].toLowerCase() === normalizedQuery.toLowerCase()) {
        return prev; // No need to update if it's the same as the most recent search
      }

      // Filter out any existing instances of this query (case-insensitive)
      const filtered = prev.filter(s => s.toLowerCase() !== normalizedQuery.toLowerCase());

      // Add the new query to the beginning and limit the array size
      const updated = [normalizedQuery, ...filtered].slice(0, MAX_RECENT_SEARCHES);

      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch (error) {
        console.warn('Failed to save recent searches:', error);
      }

      return updated;
    });
  }, []);

  // Generate search suggestions based on query
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }

    const queryLower = query.toLowerCase();
    const newSuggestions: string[] = [];

    // Add recent searches that match
    recentSearches.forEach(recent => {
      if (recent.toLowerCase().includes(queryLower) && recent.toLowerCase() !== queryLower) {
        newSuggestions.push(recent);
      }
    });

    // Add common search patterns
    const commonSuggestions = [
      'Mieter',
      'Wohnung',
      'Haus',
      'Rechnung',
      'Aufgabe',
      'Einnahmen',
      'Ausgaben',
      'Betriebskosten',
      'Kaution',
      'Nebenkosten'
    ];

    commonSuggestions.forEach(suggestion => {
      if (suggestion.toLowerCase().includes(queryLower) &&
        suggestion.toLowerCase() !== queryLower &&
        !newSuggestions.includes(suggestion)) {
        newSuggestions.push(suggestion);
      }
    });

    setSuggestions(newSuggestions.slice(0, 3));
  }, [query, recentSearches]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Retry last failed search if we were offline
      if (error && debouncedQuery.trim()) {
        performSearch(debouncedQuery);
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      setError('Keine Internetverbindung verfügbar');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial online status
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [error, debouncedQuery]);

  // Cache management functions
  const cleanupCache = useCallback(() => {
    const now = Date.now();
    const validKeys: string[] = [];

    Object.keys(cacheRef.current).forEach(key => {
      if (now - cacheRef.current[key].timestamp < cacheTimeMs) {
        validKeys.push(key);
      } else {
        delete cacheRef.current[key];
      }
    });

    cacheKeysRef.current = validKeys;
  }, [cacheTimeMs]);

  const evictLRUCache = useCallback(() => {
    if (cacheKeysRef.current.length >= MAX_CACHE_SIZE) {
      // Remove oldest entries (LRU eviction)
      const keysToRemove = cacheKeysRef.current.splice(0, Math.floor(MAX_CACHE_SIZE * 0.2));
      keysToRemove.forEach(key => {
        delete cacheRef.current[key];
      });
    }
  }, []);

  const updateCache = useCallback((key: string, data: SearchResult[], totalCount: number, executionTime: number) => {
    // Clean up expired entries periodically
    if (Math.random() < 0.1) {
      cleanupCache();
    }

    // Evict old entries if cache is full
    evictLRUCache();

    // Add new entry
    cacheRef.current[key] = {
      data,
      timestamp: Date.now(),
      totalCount,
      executionTime
    };

    // Update LRU order
    const existingIndex = cacheKeysRef.current.indexOf(key);
    if (existingIndex > -1) {
      cacheKeysRef.current.splice(existingIndex, 1);
    }
    cacheKeysRef.current.push(key);
  }, [cleanupCache, evictLRUCache]);



  // Enhanced error classification
  const classifyError = useCallback((error: Error): string => {
    const message = error.message.toLowerCase();

    if (!navigator.onLine || message.includes('network') || message.includes('fetch')) {
      return 'Keine Internetverbindung verfügbar. Bitte überprüfen Sie Ihre Netzwerkverbindung.';
    }

    if (message.includes('timeout') || message.includes('aborted')) {
      return 'Die Suche dauert zu lange. Bitte versuchen Sie es mit einem anderen Suchbegriff.';
    }

    if (message.includes('400') || message.includes('bad request')) {
      return 'Ungültige Suchanfrage. Bitte überprüfen Sie Ihre Eingabe.';
    }

    if (message.includes('401') || message.includes('unauthorized') || message.includes('permission')) {
      return 'Sie haben keine Berechtigung für diese Suche. Bitte melden Sie sich erneut an.';
    }

    if (message.includes('403') || message.includes('forbidden')) {
      return 'Zugriff verweigert. Bitte wenden Sie sich an den Administrator.';
    }

    if (message.includes('404') || message.includes('not found')) {
      return 'Suchservice nicht verfügbar. Bitte versuchen Sie es später erneut.';
    }

    if (message.includes('429') || message.includes('rate limit')) {
      return 'Zu viele Suchanfragen. Bitte warten Sie einen Moment und versuchen Sie es erneut.';
    }

    if (message.includes('500') || message.includes('server error')) {
      return 'Serverfehler bei der Suche. Bitte versuchen Sie es später erneut.';
    }

    if (message.includes('503') || message.includes('service unavailable')) {
      return 'Suchservice vorübergehend nicht verfügbar. Bitte versuchen Sie es später erneut.';
    }

    return 'Bei der Suche ist ein unerwarteter Fehler aufgetreten. Bitte versuchen Sie es erneut.';
  }, []);

  // Exponential backoff delay calculation
  const getRetryDelay = useCallback((attempt: number): number => {
    return Math.min(RETRY_DELAY_BASE * Math.pow(2, attempt), 10000); // Max 10 seconds
  }, []);

  // Main search function with enhanced error handling
  const performSearch = useCallback(async (searchQuery: string, isRetry: boolean = false) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setTotalCount(0);
      setExecutionTime(0);
      setError(null);
      setRetryCount(0);
      return;
    }

    // Handle keyword-based filtering
    let filteredCategories = memoizedCategories;
    let actualQuery = searchQuery;

    if (searchQuery.startsWith('M-')) {
      filteredCategories = ['tenant'];
      actualQuery = searchQuery.substring(2).trim();
      if (!actualQuery) {
        actualQuery = '*'; // Show all tenants
      }
    } else if (searchQuery.startsWith('H-')) {
      filteredCategories = ['house'];
      actualQuery = searchQuery.substring(2).trim();
      if (!actualQuery) {
        actualQuery = '*'; // Show all houses
      }
    } else if (searchQuery.startsWith('W-')) {
      filteredCategories = ['apartment'];
      actualQuery = searchQuery.substring(2).trim();
      if (!actualQuery) {
        actualQuery = '*'; // Show all apartments
      }
    } else if (searchQuery.startsWith('F-')) {
      filteredCategories = ['finance'];
      actualQuery = searchQuery.substring(2).trim();
      if (!actualQuery) {
        actualQuery = '*'; // Show all finance records
      }
    } else if (searchQuery.startsWith('T-')) {
      filteredCategories = ['task'];
      actualQuery = searchQuery.substring(2).trim();
      if (!actualQuery) {
        actualQuery = '*'; // Show all tasks
      }
    }

    // Check if offline
    if (!navigator.onLine) {
      setError('Keine Internetverbindung verfügbar');
      setIsOffline(true);
      return;
    }

    const cacheKey = `${searchQuery}:${limit}:${filteredCategories.sort().join(',')}`;

    // Check cache first
    const cached = cacheRef.current[cacheKey];
    if (cached && Date.now() - cached.timestamp < cacheTimeMs) {
      setResults(cached.data);
      setTotalCount(cached.totalCount);
      setExecutionTime(cached.executionTime);
      setError(null);

      // Update cache hit metrics
      metricsRef.current.cacheHits++;

      // Update LRU order
      const keyIndex = cacheKeysRef.current.indexOf(cacheKey);
      if (keyIndex > -1) {
        cacheKeysRef.current.splice(keyIndex, 1);
        cacheKeysRef.current.push(cacheKey);
      }

      return;
    }

    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsLoading(true);
    setError(null);

    // Update request metrics
    metricsRef.current.totalRequests++;
    const requestStartTime = Date.now();

    try {
      const searchParams = new URLSearchParams({
        q: actualQuery,
        limit: limit.toString(),
        categories: filteredCategories.join(',')
      });

      // Add timeout to the fetch request
      const timeoutId = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      }, 10000); // 10 second timeout

      const response = await fetch(`/api/search?${searchParams}`, {
        signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache', // Prevent stale responses during errors
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage: string;

        try {
          const errorData = await response.json();
          errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }

        throw new Error(errorMessage);
      }

      const data: SearchResponse = await response.json();

      if (process.env.NODE_ENV === 'development') {
        console.log('Received search response:', {
          totalCount: data.totalCount,
          executionTime: data.executionTime,
          resultCounts: {
            tenant: data.results.tenant.length,
            house: data.results.house.length,
            apartment: data.results.apartment.length,
            finance: data.results.finance.length,
            task: data.results.task.length
          }
        });
      }

      // Convert API response to SearchResult[]
      const searchResults: SearchResult[] = [];

      // Convert tenants

      data.results.tenant.forEach(tenant => {
        const actions: SearchResultAction[] = [
          {
            label: 'Bearbeiten',
            icon: Edit,
            action: () => { }, // Will be handled by command menu
            variant: 'default'
          }
        ];

        searchResults.push({
          id: tenant.id,
          type: 'tenant',
          title: tenant.name,
          subtitle: tenant.email,
          context: tenant.apartment ? `${tenant.apartment.name} - ${tenant.apartment.house_name}` : undefined,
          metadata: {
            status: tenant.status,
            move_in_date: tenant.move_in_date,
            move_out_date: tenant.move_out_date,
            email: tenant.email,
            phone: tenant.phone,
            apartment: tenant.apartment ? {
              name: tenant.apartment.name,
              house_name: tenant.apartment.house_name
            } : undefined
          },
          actions
        });
      });

      // Convert houses
      data.results.house.forEach(house => {
        const actions: SearchResultAction[] = [
          {
            label: 'Bearbeiten',
            icon: Edit,
            action: () => { }, // Will be handled by command menu
            variant: 'default'
          }
        ];

        searchResults.push({
          id: house.id,
          type: 'house',
          title: house.name,
          metadata: {
            apartment_count: house.apartment_count,
            total_rent: house.total_rent,
            free_apartments: house.free_apartments,
            address: house.address
          },
          actions
        });
      });

      // Convert apartments
      data.results.apartment.forEach(apartment => {
        const actions: SearchResultAction[] = [
          {
            label: 'Bearbeiten',
            icon: Edit,
            action: () => { }, // Will be handled by command menu
            variant: 'default'
          }
        ];

        searchResults.push({
          id: apartment.id,
          type: 'apartment',
          title: apartment.name,
          metadata: {
            house_name: apartment.house_name,
            size: apartment.size,
            rent: apartment.rent,
            status: apartment.status,
            current_tenant: apartment.current_tenant
          },
          actions
        });
      });

      // Convert finances
      data.results.finance.forEach(finance => {
        const isIncome = finance.type === 'income';
        const actions: SearchResultAction[] = [
          {
            label: 'Bearbeiten',
            icon: Edit,
            action: () => { }, // Will be handled by command menu
            variant: 'default'
          },
          {
            label: 'Löschen',
            icon: Trash2,
            action: () => { }, // Will be handled by command menu
            variant: 'destructive'
          }
        ];

        searchResults.push({
          id: finance.id,
          type: 'finance',
          title: finance.name,
          subtitle: `${isIncome ? '+' : '-'}${finance.amount}€`,
          context: finance.apartment ? `${finance.apartment.name} - ${finance.apartment.house_name}` : undefined,
          metadata: {
            amount: finance.amount,
            date: finance.date,
            type: finance.type,
            apartment: finance.apartment,
            notes: finance.notes
          },
          actions
        });
      });

      // Convert tasks
      data.results.task.forEach(task => {
        const actions: SearchResultAction[] = [
          {
            label: 'Bearbeiten',
            icon: Edit,
            action: () => { }, // Will be handled by command menu
            variant: 'default'
          },
          {
            label: task.completed ? 'Als offen markieren' : 'Als erledigt markieren',
            icon: CheckSquare,
            action: () => { }, // Will be handled by command menu
            variant: 'default'
          },
          {
            label: 'Löschen',
            icon: Trash2,
            action: () => { }, // Will be handled by command menu
            variant: 'destructive'
          }
        ];

        searchResults.push({
          id: task.id,
          type: 'task',
          title: task.name,
          metadata: {
            description: task.description,
            completed: task.completed,
            created_date: task.created_date,
            due_date: task.due_date
          },
          actions
        });
      });

      // Update cache with new results
      updateCache(cacheKey, searchResults, data.totalCount, data.executionTime);

      if (process.env.NODE_ENV === 'development') {
        console.log(`Converted ${searchResults.length} search results:`, searchResults.map(r => ({
          type: r.type,
          title: r.title,
          metadata: r.metadata
        })));
      }

      setResults(searchResults);
      setTotalCount(data.totalCount);
      setExecutionTime(data.executionTime);
      setError(null);
      setRetryCount(0); // Reset retry count on success
      setLastSuccessfulQuery(searchQuery);

      // Add to recent searches on successful search with results
      // Only add if this is a new search (not a retry) and we have results
      if (searchResults.length > 0 && !isRetry) {
        // Only add if the query is different from the last successful query
        if (!lastSuccessfulQuery || lastSuccessfulQuery.toLowerCase() !== searchQuery.toLowerCase()) {
          addToRecentSearches(searchQuery);
        }
      }

      // Update response time metrics
      const responseTime = Date.now() - requestStartTime;
      const currentAvg = metricsRef.current.averageResponseTime;
      const totalRequests = metricsRef.current.totalRequests;
      metricsRef.current.averageResponseTime =
        (currentAvg * (totalRequests - 1) + responseTime) / totalRequests;

      // Track search analytics
      trackSearch({
        query: searchQuery,
        responseTime,
        resultCount: searchResults.length,
        wasError: false,
        wasCacheHit: !!cached
      });

    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          // Request was cancelled, don't update state
          return;
        }

        const classifiedError = classifyError(err);

        // Implement automatic retry for certain error types
        const shouldRetry = !isRetry &&
          retryCount < MAX_RETRY_COUNT &&
          (err.message.includes('network') ||
            err.message.includes('timeout') ||
            err.message.includes('500') ||
            err.message.includes('503'));

        if (shouldRetry) {
          const newRetryCount = retryCount + 1;
          setRetryCount(newRetryCount);

          // Schedule retry with exponential backoff
          const delay = getRetryDelay(newRetryCount - 1);
          retryTimeoutRef.current = setTimeout(() => {
            performSearch(searchQuery, true);
          }, delay);

          setError(`${classifiedError} (Wiederholung ${newRetryCount}/${MAX_RETRY_COUNT}...)`);
        } else {
          setError(classifiedError);
          setResults([]);
          setTotalCount(0);
          setExecutionTime(0);

          // Track error analytics
          trackSearch({
            query: searchQuery,
            responseTime: Date.now() - requestStartTime,
            resultCount: 0,
            wasError: true,
            wasCacheHit: false
          });
        }
      } else {
        setError('Ein unbekannter Fehler ist aufgetreten');
        setResults([]);
        setTotalCount(0);
        setExecutionTime(0);

        // Track unknown error analytics
        trackSearch({
          query: searchQuery,
          responseTime: Date.now() - requestStartTime,
          resultCount: 0,
          wasError: true,
          wasCacheHit: false
        });
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [limit, memoizedCategories, cacheTimeMs, retryCount, classifyError, getRetryDelay]);

  // Effect to trigger search when debounced query changes
  useEffect(() => {
    performSearch(debouncedQuery);
  }, [debouncedQuery, performSearch]);

  // Cleanup function to cancel ongoing requests and timeouts
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Clear search function
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setTotalCount(0);
    setExecutionTime(0);
    setError(null);
    setRetryCount(0);

    // Cancel any ongoing request and retry timeout
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
  }, []);

  // Enhanced retry function
  const retry = useCallback(() => {
    if (debouncedQuery.trim()) {
      setError(null);
      setRetryCount(0);

      // Cancel any pending retry
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }

      performSearch(debouncedQuery);
    }
  }, [debouncedQuery, performSearch]);

  // Expose cache metrics for debugging (development only)
  const getCacheMetrics = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      return {
        cacheSize: Object.keys(cacheRef.current).length,
        cacheHitRate: metricsRef.current.totalRequests > 0
          ? (metricsRef.current.cacheHits / metricsRef.current.totalRequests * 100).toFixed(2) + '%'
          : '0%',
        averageResponseTime: metricsRef.current.averageResponseTime.toFixed(2) + 'ms',
        totalRequests: metricsRef.current.totalRequests
      };
    }
    return null;
  }, []);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    totalCount,
    executionTime,
    clearSearch,
    retry,
    retryCount,
    isOffline,
    lastSuccessfulQuery,
    getCacheMetrics,
    suggestions,
    recentSearches,
    addToRecentSearches
  };
}