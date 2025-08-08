import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useDebounce } from './use-debounce';
import type { SearchResult, SearchResponse, SearchCategory, SearchResultAction } from '@/types/search';
import { Edit, Eye, Trash2, User, Building2, Home, Wallet, CheckSquare } from 'lucide-react';

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
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const DEFAULT_DEBOUNCE = 300; // 300ms
const DEFAULT_LIMIT = 5;
const DEFAULT_CATEGORIES: SearchCategory[] = ['tenant', 'house', 'apartment', 'finance', 'task'];
const MAX_CACHE_SIZE = 100; // Maximum number of cached entries

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

  // Debounced query to reduce API calls
  const debouncedQuery = useDebounce(query, debounceMs);

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



  // Main search function
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setTotalCount(0);
      setExecutionTime(0);
      setError(null);
      return;
    }

    const cacheKey = `${searchQuery}:${limit}:${memoizedCategories.sort().join(',')}`;
    
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
        q: searchQuery,
        limit: limit.toString(),
        categories: memoizedCategories.join(',')
      });

      const response = await fetch(`/api/search?${searchParams}`, {
        signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip, deflate, br',
        },
      });

      if (!response.ok) {
        if (response.status === 400) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Ungültige Suchanfrage');
        } else if (response.status === 500) {
          throw new Error('Serverfehler bei der Suche. Bitte versuchen Sie es später erneut.');
        } else {
          throw new Error(`Fehler bei der Suche: ${response.status}`);
        }
      }

      const data: SearchResponse = await response.json();
      
      // Convert API response to SearchResult[]
      const searchResults: SearchResult[] = [];

      // Convert tenants
      data.results.tenants.forEach(tenant => {
        const actions: SearchResultAction[] = [
          {
            label: 'Bearbeiten',
            icon: Edit,
            action: () => {}, // Will be handled by command menu
            variant: 'default'
          },
          {
            label: 'Anzeigen',
            icon: Eye,
            action: () => {}, // Will be handled by command menu
            variant: 'default'
          }
        ];

        searchResults.push({
          id: tenant.id,
          type: 'tenant',
          title: tenant.name,
          subtitle: tenant.email || tenant.phone,
          context: tenant.apartment ? `${tenant.apartment.name} - ${tenant.apartment.house_name}` : undefined,
          metadata: {
            status: tenant.status,
            move_in_date: tenant.move_in_date,
            move_out_date: tenant.move_out_date,
            email: tenant.email,
            phone: tenant.phone
          },
          actions
        });
      });

      // Convert houses
      data.results.houses.forEach(house => {
        const actions: SearchResultAction[] = [
          {
            label: 'Bearbeiten',
            icon: Edit,
            action: () => {}, // Will be handled by command menu
            variant: 'default'
          },
          {
            label: 'Anzeigen',
            icon: Eye,
            action: () => {}, // Will be handled by command menu
            variant: 'default'
          }
        ];

        searchResults.push({
          id: house.id,
          type: 'house',
          title: house.name,
          subtitle: house.address,
          context: `${house.apartment_count} Wohnungen • ${house.free_apartments} frei`,
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
      data.results.apartments.forEach(apartment => {
        const actions: SearchResultAction[] = [
          {
            label: 'Bearbeiten',
            icon: Edit,
            action: () => {}, // Will be handled by command menu
            variant: 'default'
          },
          {
            label: 'Anzeigen',
            icon: Eye,
            action: () => {}, // Will be handled by command menu
            variant: 'default'
          }
        ];

        searchResults.push({
          id: apartment.id,
          type: 'apartment',
          title: apartment.name,
          subtitle: apartment.house_name,
          context: apartment.current_tenant 
            ? `Vermietet an ${apartment.current_tenant.name}` 
            : `Frei • ${apartment.rent}€/Monat`,
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
      data.results.finances.forEach(finance => {
        const isIncome = finance.type === 'income';
        const actions: SearchResultAction[] = [
          {
            label: 'Bearbeiten',
            icon: Edit,
            action: () => {}, // Will be handled by command menu
            variant: 'default'
          },
          {
            label: 'Anzeigen',
            icon: Eye,
            action: () => {}, // Will be handled by command menu
            variant: 'default'
          },
          {
            label: 'Löschen',
            icon: Trash2,
            action: () => {}, // Will be handled by command menu
            variant: 'destructive'
          }
        ];

        searchResults.push({
          id: finance.id,
          type: 'finance',
          title: finance.name,
          subtitle: `${isIncome ? '+' : '-'}${finance.amount}€`,
          context: finance.apartment 
            ? `${finance.apartment.name} - ${finance.apartment.house_name}` 
            : new Date(finance.date).toLocaleDateString('de-DE'),
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
      data.results.tasks.forEach(task => {
        const actions: SearchResultAction[] = [
          {
            label: 'Bearbeiten',
            icon: Edit,
            action: () => {}, // Will be handled by command menu
            variant: 'default'
          },
          {
            label: task.completed ? 'Als offen markieren' : 'Als erledigt markieren',
            icon: CheckSquare,
            action: () => {}, // Will be handled by command menu
            variant: 'default'
          },
          {
            label: 'Löschen',
            icon: Trash2,
            action: () => {}, // Will be handled by command menu
            variant: 'destructive'
          }
        ];

        searchResults.push({
          id: task.id,
          type: 'task',
          title: task.name,
          subtitle: task.description,
          context: task.completed 
            ? 'Erledigt' 
            : task.due_date 
              ? `Fällig: ${new Date(task.due_date).toLocaleDateString('de-DE')}` 
              : 'Offen',
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

      setResults(searchResults);
      setTotalCount(data.totalCount);
      setExecutionTime(data.executionTime);
      setError(null);
      
      // Update response time metrics
      const responseTime = Date.now() - requestStartTime;
      const currentAvg = metricsRef.current.averageResponseTime;
      const totalRequests = metricsRef.current.totalRequests;
      metricsRef.current.averageResponseTime = 
        (currentAvg * (totalRequests - 1) + responseTime) / totalRequests;

    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          // Request was cancelled, don't update state
          return;
        }
        setError(err.message);
      } else {
        setError('Ein unbekannter Fehler ist aufgetreten');
      }
      setResults([]);
      setTotalCount(0);
      setExecutionTime(0);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [limit, memoizedCategories, cacheTimeMs]);

  // Effect to trigger search when debounced query changes
  useEffect(() => {
    performSearch(debouncedQuery);
  }, [debouncedQuery, performSearch]);

  // Cleanup function to cancel ongoing requests
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
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
    
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Retry function
  const retry = useCallback(() => {
    if (debouncedQuery.trim()) {
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
    getCacheMetrics
  };
}