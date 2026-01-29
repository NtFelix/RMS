import { renderHook, act } from '@testing-library/react'
import { useCloudStorageNavigationStore, useNavigationState } from './use-cloud-storage-navigation'

// Mock the server action
jest.mock('@/app/(dashboard)/dateien/actions', () => ({
  loadFilesForPath: jest.fn().mockResolvedValue({
    files: [],
    folders: [],
    error: null
  })
}))

describe('useCloudStorageNavigation', () => {
  beforeEach(() => {
    // Reset the store before each test
    const { result } = renderHook(() => useCloudStorageNavigationStore())
    act(() => {
      result.current.reset()
    })
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useNavigationState())
    
    expect(result.current.currentPath).toBe('')
    expect(result.current.isNavigating).toBe(false)
    expect(result.current.canGoBack).toBe(false)
    expect(result.current.canGoForward).toBe(false)
  })

  it('should handle navigation to a path', async () => {
    const { result } = renderHook(() => useNavigationState())
    
    await act(async () => {
      await result.current.navigateToPath('user_123/house_456')
    })
    
    expect(result.current.currentPath).toBe('user_123/house_456')
    expect(result.current.isNavigating).toBe(false)
  })

  it('should manage navigation history', async () => {
    const { result } = renderHook(() => useNavigationState())
    
    // Navigate to first path
    await act(async () => {
      await result.current.navigateToPath('user_123/house_456')
    })
    
    // Navigate to second path
    await act(async () => {
      await result.current.navigateToPath('user_123/house_456/apartment_789')
    })
    
    expect(result.current.canGoBack).toBe(true)
    expect(result.current.canGoForward).toBe(false)
    
    // Go back
    await act(async () => {
      await result.current.goBack()
    })
    
    expect(result.current.currentPath).toBe('user_123/house_456')
    expect(result.current.canGoForward).toBe(true)
  })

  it('should cache directory contents', async () => {
    const { result } = renderHook(() => useCloudStorageNavigationStore())
    
    const testPath = 'user_123/house_456'
    const testContents = {
      files: [],
      folders: [],
      breadcrumbs: [],
      timestamp: Date.now()
    }
    
    act(() => {
      result.current.setCachedDirectory(testPath, testContents)
    })
    
    const cached = result.current.getCachedDirectory(testPath)
    expect(cached).toEqual(testContents)
  })

  it('should manage view preferences', () => {
    const { result } = renderHook(() => useCloudStorageNavigationStore())
    
    const testPath = 'user_123/house_456'
    const preferences = {
      viewMode: 'list' as const,
      sortBy: 'date',
      sortOrder: 'desc' as const,
      selectedItems: new Set(['file1', 'file2']),
      searchQuery: 'test'
    }
    
    act(() => {
      result.current.setViewPreferences(testPath, preferences)
    })
    
    const retrieved = result.current.getViewPreferences(testPath)
    expect(retrieved.viewMode).toBe('list')
    expect(retrieved.sortBy).toBe('date')
    expect(retrieved.sortOrder).toBe('desc')
    expect(retrieved.selectedItems).toEqual(new Set(['file1', 'file2']))
    expect(retrieved.searchQuery).toBe('test')
  })

  it('should manage scroll positions', () => {
    const { result } = renderHook(() => useCloudStorageNavigationStore())
    
    const testPath = 'user_123/house_456'
    const scrollPosition = 500
    
    act(() => {
      result.current.saveScrollPosition(testPath, scrollPosition)
    })
    
    const retrieved = result.current.getScrollPosition(testPath)
    expect(retrieved).toBe(scrollPosition)
  })

  it('should provide navigation statistics', () => {
    const { result } = renderHook(() => useCloudStorageNavigationStore())
    
    const stats = result.current.getNavigationStats()
    
    expect(stats).toHaveProperty('cacheStats')
    expect(stats).toHaveProperty('historyLength')
    expect(stats).toHaveProperty('currentHistoryIndex')
    expect(stats).toHaveProperty('viewPreferencesCount')
    expect(stats).toHaveProperty('scrollPositionsCount')
    expect(stats).toHaveProperty('cacheHitRate')
  })
})