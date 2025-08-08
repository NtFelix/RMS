import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useDebounce } from './use-debounce';
import type { SearchResult, SearchResponse, SearchCategory } from '@/types/search';

interface SearchCache {
  [key: string]: {
    data: SearchResult[];
    timestamp: number;
    totalCount: number;
  };
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

  // Cache for storing search results
  const cacheRef = useRef<SearchCache>({});
  
  // AbortController for request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounced query to reduce API calls
  const debouncedQuery = useDebounce(query, debounceMs);



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
      setError(null);
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
          }
        });
      });

      // Convert houses
      data.results.houses.forEach(house => {
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
          }
        });
      });

      // Convert apartments
      data.results.apartments.forEach(apartment => {
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
          }
        });
      });

      // Convert finances
      data.results.finances.forEach(finance => {
        const isIncome = finance.type === 'income';
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
          }
        });
      });

      // Convert tasks
      data.results.tasks.forEach(task => {
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
          }
        });
      });

      // Cache the results
      cacheRef.current[cacheKey] = {
        data: searchResults,
        timestamp: Date.now(),
        totalCount: data.totalCount
      };

      setResults(searchResults);
      setTotalCount(data.totalCount);
      setExecutionTime(data.executionTime);
      setError(null);

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

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    totalCount,
    executionTime,
    clearSearch,
    retry
  };
}