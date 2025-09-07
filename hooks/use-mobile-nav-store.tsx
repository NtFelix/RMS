'use client'

import { create } from 'zustand'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

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
 * Handles route changes and provides click-outside functionality
 */
export function useMobileNavigation() {
  const pathname = usePathname()
  const store = useMobileNavStore()
  
  // Close all dropdowns when route changes
  useEffect(() => {
    store.closeAllDropdowns()
  }, [pathname]) // Remove store from dependencies to prevent infinite loop
  
  // Click-outside handler setup
  useEffect(() => {
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
    
    // Only add listeners if there's an active dropdown
    if (store.activeDropdown !== 'none') {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscapeKey)
      
      // Prevent body scroll when dropdown is open
      document.body.style.overflow = 'hidden'
    } else {
      // Restore body scroll when no dropdowns are open
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscapeKey)
      document.body.style.overflow = 'unset'
    }
  }, [store.activeDropdown]) // Remove store from dependencies to prevent infinite loop
  
  return store
}