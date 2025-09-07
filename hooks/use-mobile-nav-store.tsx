'use client'

import { create } from 'zustand'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useOrientation } from './use-orientation'

export interface MobileNavState {
  // Dropdown states
  isAddMenuOpen: boolean
  isMoreMenuOpen: boolean
  activeDropdown: 'none' | 'add' | 'more'
  
  // Actions
  openAddMenu: () => void
  closeAddMenu: () => void
  openMoreMenu: () => void
  closeMoreMenu: () => void
  closeAllDropdowns: () => void
  
  // Internal state management
  setActiveDropdown: (dropdown: 'none' | 'add' | 'more') => void
}

const initialState = {
  isAddMenuOpen: false,
  isMoreMenuOpen: false,
  activeDropdown: 'none' as const,
}

export const useMobileNavStore = create<MobileNavState>((set, get) => ({
  ...initialState,
  
  openAddMenu: () => {
    const state = get()
    // Close other dropdowns first
    if (state.isMoreMenuOpen) {
      set({ isMoreMenuOpen: false })
    }
    set({ 
      isAddMenuOpen: true, 
      activeDropdown: 'add' 
    })
  },
  
  closeAddMenu: () => {
    set({ 
      isAddMenuOpen: false, 
      activeDropdown: 'none' 
    })
  },
  
  openMoreMenu: () => {
    const state = get()
    // Close other dropdowns first
    if (state.isAddMenuOpen) {
      set({ isAddMenuOpen: false })
    }
    set({ 
      isMoreMenuOpen: true, 
      activeDropdown: 'more' 
    })
  },
  
  closeMoreMenu: () => {
    set({ 
      isMoreMenuOpen: false, 
      activeDropdown: 'none' 
    })
  },
  
  closeAllDropdowns: () => {
    set({
      isAddMenuOpen: false,
      isMoreMenuOpen: false,
      activeDropdown: 'none'
    })
  },
  
  setActiveDropdown: (dropdown: 'none' | 'add' | 'more') => {
    set({ activeDropdown: dropdown })
  }
}))

/**
 * Hook for managing mobile navigation state with automatic cleanup
 * Handles route changes, orientation changes, and provides click-outside functionality
 */
export function useMobileNavigation() {
  const pathname = usePathname()
  const store = useMobileNavStore()
  const orientationState = useOrientation()
  
  // Close all dropdowns when route changes
  useEffect(() => {
    store.closeAllDropdowns()
  }, [pathname]) // Remove store from dependencies to prevent infinite loop
  
  // Handle orientation changes
  useEffect(() => {
    // Close dropdowns when orientation starts changing to prevent layout issues
    if (orientationState.isChanging) {
      store.closeAllDropdowns()
    }
  }, [orientationState.isChanging, orientationState.orientation])
  
  // Optimized click-outside handler setup with proper cleanup
  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      
      // Don't close if clicking on navigation buttons or dropdown content
      if (target.closest('[data-mobile-nav]') || target.closest('[data-mobile-dropdown]')) {
        return
      }
      
      // Close all dropdowns if clicking outside
      if (store.activeDropdown !== 'none') {
        store.closeAllDropdowns()
      }
    }
    
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && store.activeDropdown !== 'none') {
        store.closeAllDropdowns()
      }
    }
    
    const handleVisibilityChange = () => {
      // Close dropdowns when page becomes hidden (e.g., tab switch)
      if (document.hidden && store.activeDropdown !== 'none') {
        store.closeAllDropdowns()
      }
    }
    
    // Only add listeners if there's an active dropdown
    if (store.activeDropdown !== 'none') {
      // Use passive listeners for better performance
      document.addEventListener('mousedown', handleClickOutside, { passive: true })
      document.addEventListener('keydown', handleEscapeKey, { passive: true })
      document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true })
      
      // Prevent body scroll when dropdown is open with timeout to avoid layout thrashing
      timeoutId = setTimeout(() => {
        document.body.style.overflow = 'hidden'
      }, 0)
    } else {
      // Restore body scroll when no dropdowns are open
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      // Cleanup all event listeners
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscapeKey)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      
      // Clear timeout and restore scroll
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      document.body.style.overflow = 'unset'
    }
  }, [store.activeDropdown]) // Remove store from dependencies to prevent infinite loop
  
  return store
}