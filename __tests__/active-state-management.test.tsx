import { renderHook, act } from '@testing-library/react'
import { useActiveStateManager, useActiveStateStore } from '@/hooks/use-active-state-manager'

// Mock Next.js usePathname
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/dateien')
}))

import { usePathname } from 'next/navigation'
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>

describe('Active State Management', () => {
  beforeEach(() => {
    // Reset the store before each test
    useActiveStateStore.getState().reset()
  })

  describe('useActiveStateManager', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useActiveStateManager())
      
      expect(result.current.activeState.currentRoute).toBe('/dateien')
      expect(result.current.activeState.isCloudStorageActive).toBe(true)
      expect(result.current.activeState.breadcrumbs).toEqual([])
      expect(result.current.activeState.activeDirectoryPath).toBeNull()
    })

    it('should update active route correctly', () => {
      // Mock pathname change
      mockUsePathname.mockReturnValue('/dateien/house1')
      const { result } = renderHook(() => useActiveStateManager())
      
      expect(result.current.activeState.currentRoute).toBe('/dateien/house1')
      expect(result.current.activeState.isCloudStorageActive).toBe(true)
    })

    it('should update active directory with breadcrumbs', () => {
      const { result } = renderHook(() => useActiveStateManager())
      const mockBreadcrumbs = [
        { name: 'Cloud Storage', path: 'user_123', type: 'root' as const },
        { name: 'House 1', path: 'user_123/house1', type: 'house' as const }
      ]
      
      act(() => {
        result.current.updateActiveDirectory('user_123/house1', mockBreadcrumbs)
      })
      
      expect(result.current.activeState.activeDirectoryPath).toBe('user_123/house1')
      expect(result.current.activeState.breadcrumbs).toEqual(mockBreadcrumbs)
    })

    it('should detect active routes correctly', () => {
      mockUsePathname.mockReturnValue('/dateien/house1/apartment1')
      const { result } = renderHook(() => useActiveStateManager())
      
      expect(result.current.isRouteActive('/dateien')).toBe(true)
      expect(result.current.isRouteActive('/dateien/house1')).toBe(true)
      expect(result.current.isRouteActive('/dateien/house1/apartment1')).toBe(true)
      expect(result.current.isRouteActive('/haeuser')).toBe(false)
    })

    it('should detect active directories correctly', () => {
      const { result } = renderHook(() => useActiveStateManager())
      
      act(() => {
        result.current.updateActiveDirectory('user_123/house1/apartment1')
      })
      
      expect(result.current.isDirectoryActive('user_123/house1/apartment1')).toBe(true)
      expect(result.current.isDirectoryActive('user_123/house1')).toBe(false)
      expect(result.current.isDirectoryActive('user_123')).toBe(false)
    })

    it('should provide correct active state classes', () => {
      const { result } = renderHook(() => useActiveStateManager())
      
      act(() => {
        result.current.updateActiveRoute('/dateien')
      })
      
      expect(result.current.getActiveStateClasses('/dateien')).toContain('bg-accent')
      expect(result.current.getActiveStateClasses('/haeuser')).toContain('text-muted-foreground')
    })

    it('should provide correct directory active classes', () => {
      const { result } = renderHook(() => useActiveStateManager())
      
      act(() => {
        result.current.updateActiveDirectory('user_123/house1')
      })
      
      expect(result.current.getDirectoryActiveClasses('user_123/house1')).toContain('bg-accent/20')
      expect(result.current.getDirectoryActiveClasses('user_123/house2')).toContain('hover:bg-accent/10')
    })

    it('should sync with navigation correctly', () => {
      const { result } = renderHook(() => useActiveStateManager())
      const mockBreadcrumbs = [
        { name: 'Cloud Storage', path: 'user_123', type: 'root' as const },
        { name: 'House 1', path: 'user_123/house1', type: 'house' as const }
      ]
      
      act(() => {
        result.current.syncWithNavigation('user_123/house1', mockBreadcrumbs)
      })
      
      expect(result.current.activeState.currentDirectory).toBe('user_123/house1')
      expect(result.current.activeState.activeDirectoryPath).toBe('user_123/house1')
      expect(result.current.activeState.breadcrumbs).toEqual(mockBreadcrumbs)
    })

    it('should reset state correctly', () => {
      // Start with a different pathname
      mockUsePathname.mockReturnValue('/dateien/house1')
      const { result } = renderHook(() => useActiveStateManager())
      
      // Set some directory state
      act(() => {
        result.current.updateActiveDirectory('user_123/house1')
      })
      
      // Reset
      act(() => {
        result.current.reset()
      })
      
      // Route will still be from pathname, but directory state should be reset
      expect(result.current.activeState.activeDirectoryPath).toBeNull()
      expect(result.current.activeState.breadcrumbs).toEqual([])
    })
  })

  describe('Active State Persistence', () => {
    it('should maintain state across multiple updates', () => {
      // Set final pathname
      mockUsePathname.mockReturnValue('/dateien/house1/apartment1')
      const { result } = renderHook(() => useActiveStateManager())
      
      // Simulate navigation sequence for directory state
      act(() => {
        result.current.updateActiveDirectory('user_123')
      })
      
      act(() => {
        result.current.updateActiveDirectory('user_123/house1')
      })
      
      act(() => {
        result.current.updateActiveDirectory('user_123/house1/apartment1')
      })
      
      expect(result.current.activeState.currentRoute).toBe('/dateien/house1/apartment1')
      expect(result.current.activeState.activeDirectoryPath).toBe('user_123/house1/apartment1')
      expect(result.current.isRouteActive('/dateien')).toBe(true)
      expect(result.current.isDirectoryActive('user_123/house1/apartment1')).toBe(true)
    })

    it('should handle breadcrumb updates correctly', () => {
      const { result } = renderHook(() => useActiveStateManager())
      
      const initialBreadcrumbs = [
        { name: 'Cloud Storage', path: 'user_123', type: 'root' as const }
      ]
      
      const updatedBreadcrumbs = [
        { name: 'Cloud Storage', path: 'user_123', type: 'root' as const },
        { name: 'House 1', path: 'user_123/house1', type: 'house' as const }
      ]
      
      act(() => {
        result.current.updateBreadcrumbs(initialBreadcrumbs)
      })
      
      expect(result.current.activeState.breadcrumbs).toEqual(initialBreadcrumbs)
      
      act(() => {
        result.current.updateBreadcrumbs(updatedBreadcrumbs)
      })
      
      expect(result.current.activeState.breadcrumbs).toEqual(updatedBreadcrumbs)
    })
  })

  describe('Cloud Storage Active State Detection', () => {
    it('should correctly identify cloud storage routes', () => {
      const { result } = renderHook(() => useActiveStateManager())
      
      const cloudStorageRoutes = [
        '/dateien',
        '/dateien/',
        '/dateien/house1',
        '/dateien/house1/apartment1',
        '/dateien/house1/apartment1/tenant1'
      ]
      
      const nonCloudStorageRoutes = [
        '/haeuser',
        '/wohnungen',
        '/mieter',
        '/finanzen',
        '/betriebskosten'
      ]
      
      cloudStorageRoutes.forEach(route => {
        mockUsePathname.mockReturnValue(route)
        const { result: testResult } = renderHook(() => useActiveStateManager())
        expect(testResult.current.activeState.isCloudStorageActive).toBe(true)
      })
      
      nonCloudStorageRoutes.forEach(route => {
        mockUsePathname.mockReturnValue(route)
        const { result: testResult } = renderHook(() => useActiveStateManager())
        expect(testResult.current.activeState.isCloudStorageActive).toBe(false)
      })
    })
  })

  describe('State Timestamps', () => {
    it('should update lastUpdated timestamp on state changes', async () => {
      const { result } = renderHook(() => useActiveStateManager())
      
      const initialTimestamp = result.current.activeState.lastUpdated
      
      // Wait for a moment to ensure a different timestamp
      await new Promise(resolve => setTimeout(resolve, 10))
      
      act(() => {
        result.current.updateActiveRoute('/dateien/house1')
      })
      
      expect(result.current.activeState.lastUpdated).toBeGreaterThan(initialTimestamp)
    })
  })
})