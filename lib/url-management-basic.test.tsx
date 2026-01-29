/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react'
import { useCloudStorageNavigationStore } from '@/hooks/use-cloud-storage-navigation'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}))

// Mock actions
jest.mock('@/app/(dashboard)/dateien/actions', () => ({
  loadFilesForPath: jest.fn().mockResolvedValue({
    files: [],
    folders: [],
    error: null
  })
}))

describe('URL Management Basic Tests', () => {
  beforeEach(() => {
    // Mock window.history
    Object.defineProperty(window, 'history', {
      value: {
        pushState: jest.fn(),
        replaceState: jest.fn(),
        back: jest.fn(),
        forward: jest.fn(),
        state: null
      },
      writable: true,
      configurable: true
    })
    
    // Mock document.title
    Object.defineProperty(document, 'title', {
      value: '',
      writable: true,
      configurable: true
    })
    
    // Mock window.scrollY
    Object.defineProperty(window, 'scrollY', {
      value: 0,
      writable: true,
      configurable: true
    })
  })

  it('should convert storage paths to URLs correctly', () => {
    const { result } = renderHook(() => useCloudStorageNavigationStore())
    
    expect(result.current.getCurrentUrl('user_test-user')).toBe('/dateien')
    expect(result.current.getCurrentUrl('user_test-user/house1')).toBe('/dateien/house1')
    expect(result.current.getCurrentUrl('user_test-user/house1/apt1')).toBe('/dateien/house1/apt1')
  })

  it('should update document title correctly', () => {
    const { result } = renderHook(() => useCloudStorageNavigationStore())
    
    const breadcrumbs = [
      { name: 'Cloud Storage', path: 'user_test-user', type: 'root' as const },
      { name: 'House 1', path: 'user_test-user/house1', type: 'house' as const },
      { name: 'Apartment 1', path: 'user_test-user/house1/apt1', type: 'apartment' as const }
    ]
    
    act(() => {
      result.current.updateDocumentTitle('user_test-user/house1/apt1', breadcrumbs)
    })
    
    expect(document.title).toBe('Apartment 1 - House 1 - Cloud Storage - RMS')
  })

  it('should update browser history with correct state', () => {
    const { result } = renderHook(() => useCloudStorageNavigationStore())
    
    act(() => {
      result.current.updateBrowserHistory('user_test-user/house1', false)
    })
    
    expect(window.history.pushState).toHaveBeenCalledWith(
      expect.objectContaining({
        path: 'user_test-user/house1',
        clientNavigation: true,
        timestamp: expect.any(Number)
      }),
      '',
      '/dateien/house1'
    )
  })

  it('should save and retrieve scroll positions', () => {
    const { result } = renderHook(() => useCloudStorageNavigationStore())
    
    act(() => {
      result.current.saveScrollPosition('user_test-user/house1', 500)
    })
    
    expect(result.current.getScrollPosition('user_test-user/house1')).toBe(500)
    expect(result.current.getScrollPosition('user_test-user/house2')).toBe(0) // Default
  })

  it('should handle navigation history correctly', async () => {
    const { result } = renderHook(() => useCloudStorageNavigationStore())
    
    // Navigate to a path
    await act(async () => {
      await result.current.navigateToPath('user_test-user/house1')
    })
    
    expect(result.current.currentPath).toBe('user_test-user/house1')
    expect(result.current.navigationHistory).toHaveLength(1)
    expect(result.current.historyIndex).toBe(0)
  })
})