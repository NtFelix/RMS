import { renderHook, act, waitFor } from '@testing-library/react';
import { 
  useDocumentationCache, 
  useCachedCategories, 
  useCachedArticles, 
  useCachedSearch,
  documentationCacheUtils 
} from '@/hooks/use-documentation-cache';
import type { Article, Category } from '@/types/documentation';

// Mock fetch
global.fetch = jest.fn();

const mockCategories: Category[] = [
  { name: 'Getting Started', articleCount: 5 },
  { name: 'Advanced Topics', articleCount: 3 },
];

const mockArticles: Article[] = [
  {
    id: '1',
    titel: 'Test Article 1',
    kategorie: 'Getting Started',
    seiteninhalt: 'Content 1',
    meta: {},
  },
  {
    id: '2',
    titel: 'Test Article 2',
    kategorie: 'Advanced Topics',
    seiteninhalt: 'Content 2',
    meta: {},
  },
];

describe('useDocumentationCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    documentationCacheUtils.invalidateAll();
    (global.fetch as jest.Mock).mockClear();
  });

  it('should fetch and cache data on first call', async () => {
    const mockFetcher = jest.fn().mockResolvedValue('test data');
    
    const { result } = renderHook(() => 
      useDocumentationCache('test-key', mockFetcher)
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBe('test data');
    expect(result.current.error).toBeNull();
    expect(result.current.isStale).toBe(false);
    expect(mockFetcher).toHaveBeenCalledTimes(1);
  });

  it('should return cached data on subsequent calls', async () => {
    const mockFetcher = jest.fn().mockResolvedValue('cached data');
    
    // First call
    const { result: result1 } = renderHook(() => 
      useDocumentationCache('cache-test', mockFetcher)
    );

    await waitFor(() => {
      expect(result1.current.data).toBe('cached data');
    });

    // Second call with same key
    const { result: result2 } = renderHook(() => 
      useDocumentationCache('cache-test', mockFetcher)
    );

    // Should immediately return cached data
    expect(result2.current.data).toBe('cached data');
    expect(result2.current.isLoading).toBe(false);
    expect(mockFetcher).toHaveBeenCalledTimes(1); // Only called once
  });

  it('should handle stale-while-revalidate', async () => {
    const mockFetcher = jest.fn()
      .mockResolvedValueOnce('initial data')
      .mockResolvedValueOnce('fresh data');
    
    const { result, rerender } = renderHook(() => 
      useDocumentationCache('stale-test', mockFetcher, {
        ttl: 100, // Very short TTL
        staleWhileRevalidate: true,
      })
    );

    // Wait for initial data
    await waitFor(() => {
      expect(result.current.data).toBe('initial data');
    });

    // Wait for data to become stale
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });

    // Trigger revalidation
    rerender();

    // Should show stale data while revalidating
    expect(result.current.data).toBe('initial data');
    expect(result.current.isStale).toBe(true);

    // Wait for fresh data
    await waitFor(() => {
      expect(result.current.data).toBe('fresh data');
      expect(result.current.isStale).toBe(false);
    });
  });

  it('should handle fetch errors', async () => {
    const mockError = new Error('Fetch failed');
    const mockFetcher = jest.fn().mockRejectedValue(mockError);
    
    const { result } = renderHook(() => 
      useDocumentationCache('error-test', mockFetcher)
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe(mockError);
  });

  it('should allow manual refresh', async () => {
    const mockFetcher = jest.fn()
      .mockResolvedValueOnce('initial data')
      .mockResolvedValueOnce('refreshed data');
    
    const { result } = renderHook(() => 
      useDocumentationCache('refresh-test', mockFetcher)
    );

    await waitFor(() => {
      expect(result.current.data).toBe('initial data');
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.data).toBe('refreshed data');
    expect(mockFetcher).toHaveBeenCalledTimes(2);
  });

  it('should allow cache invalidation', async () => {
    const mockFetcher = jest.fn().mockResolvedValue('test data');
    
    const { result } = renderHook(() => 
      useDocumentationCache('invalidate-test', mockFetcher)
    );

    await waitFor(() => {
      expect(result.current.data).toBe('test data');
    });

    act(() => {
      result.current.invalidate();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.isStale).toBe(false);
  });
});

describe('useCachedCategories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    documentationCacheUtils.invalidateAll();
  });

  it('should fetch categories from API', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCategories,
    });

    const { result } = renderHook(() => useCachedCategories());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.data).toEqual(mockCategories);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/documentation/categories');
    expect(result.current.error).toBeNull();
  });

  it('should handle API errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useCachedCategories());

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
    });

    expect(result.current.data).toBeNull();
  });
});

describe('useCachedArticles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    documentationCacheUtils.invalidateAll();
  });

  it('should fetch all articles when no category specified', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockArticles,
    });

    const { result } = renderHook(() => useCachedArticles());

    await waitFor(() => {
      expect(result.current.data).toEqual(mockArticles);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/documentation?');
  });

  it('should fetch articles by category', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockArticles.filter(a => a.kategorie === 'Getting Started'),
    });

    const { result } = renderHook(() => useCachedArticles('Getting Started'));

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/documentation?kategorie=Getting+Started');
  });
});

describe('useCachedSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    documentationCacheUtils.invalidateAll();
  });

  it('should return empty array for empty query', async () => {
    const { result } = renderHook(() => useCachedSearch(''));

    await waitFor(() => {
      expect(result.current.data).toEqual([]);
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should search articles', async () => {
    const searchResults = mockArticles.filter(a => a.titel.includes('Test'));
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => searchResults,
    });

    const { result } = renderHook(() => useCachedSearch('test query'));

    await waitFor(() => {
      expect(result.current.data).toEqual(searchResults);
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/documentation/search?q=test+query');
  });

  it('should not show stale search results', async () => {
    const { result } = renderHook(() => useCachedSearch('test'));

    // Search results should not use stale-while-revalidate
    expect(result.current.isStale).toBe(false);
  });
});

describe('documentationCacheUtils', () => {
  beforeEach(() => {
    documentationCacheUtils.invalidateAll();
  });

  it('should invalidate all cache entries', () => {
    // This is tested implicitly by other tests that rely on clean cache state
    expect(documentationCacheUtils.getCacheSize()).toBe(0);
  });

  it('should invalidate categories cache', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockCategories,
    });

    // Cache some categories
    const { result } = renderHook(() => useCachedCategories());
    await waitFor(() => {
      expect(result.current.data).toEqual(mockCategories);
    });

    expect(documentationCacheUtils.getCacheSize()).toBeGreaterThan(0);

    documentationCacheUtils.invalidateCategories();

    // Cache should be smaller now
    const newSize = documentationCacheUtils.getCacheSize();
    expect(newSize).toBeLessThan(1);
  });

  it('should invalidate articles cache', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockArticles,
    });

    // Cache some articles
    const { result } = renderHook(() => useCachedArticles());
    await waitFor(() => {
      expect(result.current.data).toEqual(mockArticles);
    });

    const initialSize = documentationCacheUtils.getCacheSize();
    expect(initialSize).toBeGreaterThan(0);

    documentationCacheUtils.invalidateArticles();

    // Articles cache should be cleared
    const newSize = documentationCacheUtils.getCacheSize();
    expect(newSize).toBeLessThan(initialSize);
  });

  it('should invalidate search cache', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockArticles,
    });

    // Cache some search results
    const { result } = renderHook(() => useCachedSearch('test'));
    await waitFor(() => {
      expect(result.current.data).toEqual(mockArticles);
    });

    const initialSize = documentationCacheUtils.getCacheSize();
    expect(initialSize).toBeGreaterThan(0);

    documentationCacheUtils.invalidateSearch();

    // Search cache should be cleared
    const newSize = documentationCacheUtils.getCacheSize();
    expect(newSize).toBeLessThan(initialSize);
  });
});