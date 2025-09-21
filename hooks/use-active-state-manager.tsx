'use client'

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import type { BreadcrumbItem } from './use-cloud-storage-store'

export interface ActiveStateInfo {
  currentRoute: string
  currentDirectory: string
  breadcrumbs: BreadcrumbItem[]
  isCloudStorageActive: boolean
  activeDirectoryPath: string | null
  lastUpdated: number
}

export interface ActiveStateManager {
  // Current active state
  activeState: ActiveStateInfo
  
  // State update methods
  updateActiveRoute: (route: string) => void
  updateActiveDirectory: (path: string, breadcrumbs?: BreadcrumbItem[]) => void
  updateBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void
  
  // State query methods
  isRouteActive: (route: string) => boolean
  isDirectoryActive: (path: string) => boolean
  getActiveBreadcrumbs: () => BreadcrumbItem[]
  
  // Visual feedback methods
  getActiveStateClasses: (route: string) => string
  getDirectoryActiveClasses: (path: string) => string
  
  // Utility methods
  reset: () => void
  syncWithNavigation: (currentPath: string, breadcrumbs: BreadcrumbItem[]) => void
}

const initialActiveState: ActiveStateInfo = {
  currentRoute: '',
  currentDirectory: '',
  breadcrumbs: [],
  isCloudStorageActive: false,
  activeDirectoryPath: null,
  lastUpdated: Date.now()
}

export const useActiveStateStore = create<ActiveStateManager>()(
  immer((set, get) => ({
    activeState: initialActiveState,
    
    updateActiveRoute: (route: string) => {
      set((draft) => {
        draft.activeState.currentRoute = route
        draft.activeState.isCloudStorageActive = route.startsWith('/dateien')
        draft.activeState.lastUpdated = Date.now()
      })
    },
    
    updateActiveDirectory: (path: string, breadcrumbs?: BreadcrumbItem[]) => {
      set((draft) => {
        draft.activeState.currentDirectory = path
        draft.activeState.activeDirectoryPath = path
        if (breadcrumbs) {
          draft.activeState.breadcrumbs = breadcrumbs
        }
        draft.activeState.lastUpdated = Date.now()
      })
    },
    
    updateBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => {
      set((draft) => {
        draft.activeState.breadcrumbs = breadcrumbs
        draft.activeState.lastUpdated = Date.now()
      })
    },
    
    isRouteActive: (route: string) => {
      const { activeState } = get()
      return activeState.currentRoute === route || 
             activeState.currentRoute.startsWith(`${route}/`)
    },
    
    isDirectoryActive: (path: string) => {
      const { activeState } = get()
      return activeState.activeDirectoryPath === path
    },
    
    getActiveBreadcrumbs: () => {
      return get().activeState.breadcrumbs
    },
    
    getActiveStateClasses: (route: string) => {
      const isActive = get().isRouteActive(route)
      return isActive 
        ? "bg-accent text-accent-foreground" 
        : "text-muted-foreground"
    },
    
    getDirectoryActiveClasses: (path: string) => {
      const isActive = get().isDirectoryActive(path)
      return isActive
        ? "bg-accent/20 border-accent text-accent-foreground font-medium"
        : "hover:bg-accent/10"
    },
    
    reset: () => {
      set((draft) => {
        draft.activeState = { ...initialActiveState, lastUpdated: Date.now() }
      })
    },
    
    syncWithNavigation: (currentPath: string, breadcrumbs: BreadcrumbItem[]) => {
      set((draft) => {
        draft.activeState.currentDirectory = currentPath
        draft.activeState.activeDirectoryPath = currentPath
        draft.activeState.breadcrumbs = breadcrumbs
        draft.activeState.lastUpdated = Date.now()
      })
    }
  }))
)

/**
 * Custom hook to sync pathname with store - DRY principle
 * Centralizes pathname syncing logic to avoid repetition across multiple hooks
 */
function useSyncPathnameWithStore() {
  const store = useActiveStateStore()
  const pathname = usePathname()
  
  // Sync with Next.js router changes
  useEffect(() => {
    store.updateActiveRoute(pathname)
  }, [pathname, store.updateActiveRoute])
  
  return store
}

/**
 * Hook for managing active states across the application
 * Automatically syncs with Next.js router and navigation changes
 */
export function useActiveStateManager() {
  return useSyncPathnameWithStore()
}

/**
 * Hook specifically for sidebar navigation active states
 */
export function useSidebarActiveState() {
  const store = useSyncPathnameWithStore()
  
  return {
    isRouteActive: store.isRouteActive,
    getActiveStateClasses: store.getActiveStateClasses,
    currentRoute: store.activeState.currentRoute,
    isCloudStorageActive: store.activeState.isCloudStorageActive
  }
}

/**
 * Hook for breadcrumb navigation active states
 */
export function useBreadcrumbActiveState() {
  const store = useActiveStateStore()
  
  return {
    breadcrumbs: store.activeState.breadcrumbs,
    updateBreadcrumbs: store.updateBreadcrumbs,
    isDirectoryActive: store.isDirectoryActive,
    getDirectoryActiveClasses: store.getDirectoryActiveClasses,
    activeDirectoryPath: store.activeState.activeDirectoryPath
  }
}

/**
 * Hook for directory-specific active states
 */
export function useDirectoryActiveState() {
  const store = useActiveStateStore()
  
  return {
    activeDirectoryPath: store.activeState.activeDirectoryPath,
    currentDirectory: store.activeState.currentDirectory,
    updateActiveDirectory: store.updateActiveDirectory,
    isDirectoryActive: store.isDirectoryActive,
    getDirectoryActiveClasses: store.getDirectoryActiveClasses,
    syncWithNavigation: store.syncWithNavigation
  }
}

/**
 * Hook that automatically syncs active state with cloud storage navigation
 */
export function useActiveStateSync() {
  const store = useActiveStateStore()
  
  const syncActiveState = useCallback((currentPath: string, breadcrumbs: BreadcrumbItem[]) => {
    store.syncWithNavigation(currentPath, breadcrumbs)
  }, [store.syncWithNavigation])
  
  const updateActiveDirectory = useCallback((path: string, breadcrumbs?: BreadcrumbItem[]) => {
    store.updateActiveDirectory(path, breadcrumbs)
  }, [store.updateActiveDirectory])
  
  const updateBreadcrumbs = useCallback((breadcrumbs: BreadcrumbItem[]) => {
    store.updateBreadcrumbs(breadcrumbs)
  }, [store.updateBreadcrumbs])
  
  return {
    syncActiveState,
    updateActiveDirectory,
    updateBreadcrumbs,
    activeState: store.activeState
  }
}

/**
 * Higher-order hook that provides comprehensive active state management
 * for components that need full active state functionality
 */
export function useComprehensiveActiveState() {
  const store = useSyncPathnameWithStore()
  
  return {
    // Current state
    activeState: store.activeState,
    
    // Route active state
    isRouteActive: store.isRouteActive,
    getActiveStateClasses: store.getActiveStateClasses,
    
    // Directory active state
    isDirectoryActive: store.isDirectoryActive,
    getDirectoryActiveClasses: store.getDirectoryActiveClasses,
    
    // Breadcrumb state
    breadcrumbs: store.activeState.breadcrumbs,
    
    // Update methods
    updateActiveRoute: store.updateActiveRoute,
    updateActiveDirectory: store.updateActiveDirectory,
    updateBreadcrumbs: store.updateBreadcrumbs,
    syncWithNavigation: store.syncWithNavigation,
    
    // Utility
    reset: store.reset
  }
}