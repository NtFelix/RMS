import { renderHook, act } from '@testing-library/react';
import { useSearch } from './use-search';

// Mock the useDebounce hook to return the value immediately
jest.mock('./use-debounce', () => ({
  useDebounce: jest.fn((value) => value)
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('useSearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useSearch());

    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.executionTime).toBe(0);
  });

  it('should update query when setQuery is called', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('test query');
    });

    expect(result.current.query).toBe('test query');
  });

  it('should clear search when clearSearch is called', () => {
    const { result } = renderHook(() => useSearch());

    act(() => {
      result.current.setQuery('test query');
    });

    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.error).toBe(null);
  });

  it('should provide retry function', () => {
    const { result } = renderHook(() => useSearch());

    expect(typeof result.current.retry).toBe('function');
  });

  it('should accept custom options', () => {
    const options = {
      debounceMs: 500,
      limit: 10,
      categories: ['tenant' as const, 'house' as const]
    };

    const { result } = renderHook(() => useSearch(options));

    // Hook should initialize without errors
    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
  });
});