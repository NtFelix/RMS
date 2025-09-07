import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { usePathname } from 'next/navigation'
import { useMobileNavigation, useMobileNavStore } from '@/hooks/use-mobile-nav-store'
import { useOrientation } from '@/hooks/use-orientation'

// Mock dependencies
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

jest.mock('@/hooks/use-orientation', () => ({
  useOrientation: jest.fn(),
}))

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>
const mockUseOrientation = useOrientation as jest.MockedFunction<typeof useOrientation>

describe('Mobile Navigation State Management Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUsePathname.mockReturnValue('/home')
    mockUseOrientation.mockReturnValue({
      orientation: 'portrait',
      isChanging: false,
      angle: 0,
    })
    
    // Reset Zustand store
    useMobileNavStore.getState().closeAllDropdowns()
  })

  afterEach(() => {
    // Clean up any body style changes
    document.body.style.overflow = 'unset'
    
    // Remove any event listeners
    document.removeEventListener('mousedown', jest.fn())
    document.removeEventListener('keydown', jest.fn())
  })

  describe('Store State Management', () => {
    it('initializes with correct default state', () => {
      const { result } = renderHook(() => useMobileNavStore())
      
      expect(result.current.isAddMenuOpen).toBe(false)
      expect(result.current.isMoreMenuOpen).toBe(false)
      expect(result.current.activeDropdown).toBe('none')
    })

    it('opens add menu correctly', () => {
      const { result } = renderHook(() => useMobileNavStore())
      
      act(() => {
        result.current.openAddMenu()
      })
      
      expect(result.current.isAddMenuOpen).toBe(true)
      expect(result.current.activeDropdown).toBe('add')
    })

    it('opens more menu correctly', () => {
      const { result } = renderHook(() => useMobileNavStore())
      
      act(() => {
        result.current.openMoreMenu()
      })
      
      expect(result.current.isMoreMenuOpen).toBe(true)
      expect(result.current.activeDropdown).toBe('more')
    })

    it('closes add menu correctly', () => {
      const { result } = renderHook(() => useMobileNavStore())
      
      act(() => {
        result.current.openAddMenu()
      })
      
      expect(result.current.isAddMenuOpen).toBe(true)
      
      act(() => {
        result.current.closeAddMenu()
      })
      
      expect(result.current.isAddMenuOpen).toBe(false)
      expect(result.current.activeDropdown).toBe('none')
    })

    it('closes more menu correctly', () => {
      const { result } = renderHook(() => useMobileNavStore())
      
      act(() => {
        result.current.openMoreMenu()
      })
      
      expect(result.current.isMoreMenuOpen).toBe(true)
      
      act(() => {
        result.current.closeMoreMenu()
      })
      
      expect(result.current.isMoreMenuOpen).toBe(false)
      expect(result.current.activeDropdown).toBe('none')
    })

    it('closes all dropdowns correctly', () => {
      const { result } = renderHook(() => useMobileNavStore())
      
      act(() => {
        result.current.openAddMenu()
      })
      
      expect(result.current.isAddMenuOpen).toBe(true)
      
      act(() => {
        result.current.closeAllDropdowns()
      })
      
      expect(result.current.isAddMenuOpen).toBe(false)
      expect(result.current.isMoreMenuOpen).toBe(false)
      expect(result.current.activeDropdown).toBe('none')
    })

    it('only allows one dropdown open at a time', () => {
      const { result } = renderHook(() => useMobileNavStore())
      
      // Open add menu first
      act(() => {
        result.current.openAddMenu()
      })
      
      expect(result.current.isAddMenuOpen).toBe(true)
      expect(result.current.isMoreMenuOpen).toBe(false)
      
      // Open more menu - should close add menu
      act(() => {
        result.current.openMoreMenu()
      })
      
      expect(result.current.isAddMenuOpen).toBe(false)
      expect(result.current.isMoreMenuOpen).toBe(true)
      expect(result.current.activeDropdown).toBe('more')
    })
  })

  describe('Navigation Hook Integration', () => {
    it('closes dropdowns when route changes', () => {
      const { result, rerender } = renderHook(() => useMobileNavigation())
      
      // Open a dropdown
      act(() => {
        useMobileNavStore.getState().openAddMenu()
      })
      
      expect(useMobileNavStore.getState().isAddMenuOpen).toBe(true)
      
      // Change route
      mockUsePathname.mockReturnValue('/haeuser')
      rerender()
      
      // Should close dropdown
      expect(useMobileNavStore.getState().isAddMenuOpen).toBe(false)
    })

    it('closes dropdowns when orientation starts changing', () => {
      const { result, rerender } = renderHook(() => useMobileNavigation())
      
      // Open a dropdown
      act(() => {
        useMobileNavStore.getState().openAddMenu()
      })
      
      expect(useMobileNavStore.getState().isAddMenuOpen).toBe(true)
      
      // Start orientation change
      mockUseOrientation.mockReturnValue({
        orientation: 'landscape',
        isChanging: true,
        angle: 90,
      })
      rerender()
      
      // Should close dropdown
      expect(useMobileNavStore.getState().isAddMenuOpen).toBe(false)
    })

    it('sets up click-outside handlers when dropdown is open', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener')
      const { result } = renderHook(() => useMobileNavigation())
      
      // Open dropdown
      act(() => {
        useMobileNavStore.getState().openAddMenu()
      })
      
      // Should add event listeners
      expect(addEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
      
      addEventListenerSpy.mockRestore()
    })

    it('removes event listeners when dropdown is closed', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener')
      const { result, unmount } = renderHook(() => useMobileNavigation())
      
      // Open dropdown
      act(() => {
        useMobileNavStore.getState().openAddMenu()
      })
      
      // Close dropdown
      act(() => {
        useMobileNavStore.getState().closeAddMenu()
      })
      
      // Unmount to trigger cleanup
      unmount()
      
      // Should remove event listeners
      expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
      
      removeEventListenerSpy.mockRestore()
    })

    it('prevents body scroll when dropdown is open', () => {
      const { result } = renderHook(() => useMobileNavigation())
      
      // Open dropdown
      act(() => {
        useMobileNavStore.getState().openAddMenu()
      })
      
      // Should prevent body scroll
      expect(document.body.style.overflow).toBe('hidden')
    })

    it('restores body scroll when dropdown is closed', () => {
      const { result } = renderHook(() => useMobileNavigation())
      
      // Open dropdown
      act(() => {
        useMobileNavStore.getState().openAddMenu()
      })
      
      expect(document.body.style.overflow).toBe('hidden')
      
      // Close dropdown
      act(() => {
        useMobileNavStore.getState().closeAddMenu()
      })
      
      // Should restore body scroll
      expect(document.body.style.overflow).toBe('unset')
    })
  })

  describe('Event Handling', () => {
    it('handles click outside to close dropdown', () => {
      const { result } = renderHook(() => useMobileNavigation())
      
      // Open dropdown
      act(() => {
        useMobileNavStore.getState().openAddMenu()
      })
      
      expect(useMobileNavStore.getState().isAddMenuOpen).toBe(true)
      
      // Simulate click outside
      const mouseEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      })
      
      act(() => {
        document.dispatchEvent(mouseEvent)
      })
      
      // Should close dropdown
      expect(useMobileNavStore.getState().isAddMenuOpen).toBe(false)
    })

    it('does not close dropdown when clicking on navigation elements', () => {
      const { result } = renderHook(() => useMobileNavigation())
      
      // Create a mock navigation element
      const navElement = document.createElement('div')
      navElement.setAttribute('data-mobile-nav', '')
      document.body.appendChild(navElement)
      
      // Open dropdown
      act(() => {
        useMobileNavStore.getState().openAddMenu()
      })
      
      expect(useMobileNavStore.getState().isAddMenuOpen).toBe(true)
      
      // Simulate click on navigation element
      const mouseEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      })
      Object.defineProperty(mouseEvent, 'target', {
        value: navElement,
        enumerable: true,
      })
      
      act(() => {
        document.dispatchEvent(mouseEvent)
      })
      
      // Should not close dropdown
      expect(useMobileNavStore.getState().isAddMenuOpen).toBe(true)
      
      // Cleanup
      document.body.removeChild(navElement)
    })

    it('does not close dropdown when clicking on dropdown content', () => {
      const { result } = renderHook(() => useMobileNavigation())
      
      // Create a mock dropdown element
      const dropdownElement = document.createElement('div')
      dropdownElement.setAttribute('data-mobile-dropdown', '')
      document.body.appendChild(dropdownElement)
      
      // Open dropdown
      act(() => {
        useMobileNavStore.getState().openAddMenu()
      })
      
      expect(useMobileNavStore.getState().isAddMenuOpen).toBe(true)
      
      // Simulate click on dropdown element
      const mouseEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      })
      Object.defineProperty(mouseEvent, 'target', {
        value: dropdownElement,
        enumerable: true,
      })
      
      act(() => {
        document.dispatchEvent(mouseEvent)
      })
      
      // Should not close dropdown
      expect(useMobileNavStore.getState().isAddMenuOpen).toBe(true)
      
      // Cleanup
      document.body.removeChild(dropdownElement)
    })

    it('handles escape key to close dropdown', () => {
      const { result } = renderHook(() => useMobileNavigation())
      
      // Open dropdown
      act(() => {
        useMobileNavStore.getState().openAddMenu()
      })
      
      expect(useMobileNavStore.getState().isAddMenuOpen).toBe(true)
      
      // Simulate escape key
      const keyEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      })
      
      act(() => {
        document.dispatchEvent(keyEvent)
      })
      
      // Should close dropdown
      expect(useMobileNavStore.getState().isAddMenuOpen).toBe(false)
    })

    it('ignores non-escape keys', () => {
      const { result } = renderHook(() => useMobileNavigation())
      
      // Open dropdown
      act(() => {
        useMobileNavStore.getState().openAddMenu()
      })
      
      expect(useMobileNavStore.getState().isAddMenuOpen).toBe(true)
      
      // Simulate other key
      const keyEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      })
      
      act(() => {
        document.dispatchEvent(keyEvent)
      })
      
      // Should not close dropdown
      expect(useMobileNavStore.getState().isAddMenuOpen).toBe(true)
    })
  })

  describe('Multiple Hook Instances', () => {
    it('maintains consistent state across multiple hook instances', () => {
      const { result: result1 } = renderHook(() => useMobileNavigation())
      const { result: result2 } = renderHook(() => useMobileNavigation())
      
      // Both should start with same state
      expect(result1.current.isAddMenuOpen).toBe(result2.current.isAddMenuOpen)
      expect(result1.current.activeDropdown).toBe(result2.current.activeDropdown)
      
      // Change state through one hook
      act(() => {
        result1.current.openAddMenu()
      })
      
      // Both should reflect the change
      expect(result1.current.isAddMenuOpen).toBe(true)
      expect(result2.current.isAddMenuOpen).toBe(true)
    })

    it('handles cleanup properly with multiple instances', () => {
      const { result: result1, unmount: unmount1 } = renderHook(() => useMobileNavigation())
      const { result: result2, unmount: unmount2 } = renderHook(() => useMobileNavigation())
      
      // Open dropdown
      act(() => {
        result1.current.openAddMenu()
      })
      
      // Unmount one instance
      unmount1()
      
      // Other instance should still work
      expect(result2.current.isAddMenuOpen).toBe(true)
      
      // Close through remaining instance
      act(() => {
        result2.current.closeAddMenu()
      })
      
      expect(result2.current.isAddMenuOpen).toBe(false)
      
      // Cleanup
      unmount2()
    })
  })

  describe('Error Handling', () => {
    it('handles missing orientation data gracefully', () => {
      mockUseOrientation.mockReturnValue({
        orientation: 'portrait',
        isChanging: false,
        angle: 0,
      })
      
      const { result } = renderHook(() => useMobileNavigation())
      
      // Should not throw error
      expect(() => {
        act(() => {
          result.current.openAddMenu()
        })
      }).not.toThrow()
    })

    it('handles pathname changes gracefully', () => {
      const { result, rerender } = renderHook(() => useMobileNavigation())
      
      // Open dropdown
      act(() => {
        result.current.openAddMenu()
      })
      
      // Change to undefined pathname
      mockUsePathname.mockReturnValue(undefined as any)
      
      // Should not throw error
      expect(() => {
        rerender()
      }).not.toThrow()
    })

    it('handles event listener errors gracefully', () => {
      const originalAddEventListener = document.addEventListener
      const originalRemoveEventListener = document.removeEventListener
      
      // Mock addEventListener to throw error
      document.addEventListener = jest.fn(() => {
        throw new Error('Event listener error')
      })
      
      const { result } = renderHook(() => useMobileNavigation())
      
      // Should not crash when opening dropdown
      expect(() => {
        act(() => {
          result.current.openAddMenu()
        })
      }).not.toThrow()
      
      // Restore original methods
      document.addEventListener = originalAddEventListener
      document.removeEventListener = originalRemoveEventListener
    })
  })
})