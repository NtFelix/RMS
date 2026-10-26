'use client'

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import type { BreadcrumbItem } from './use-cloud-storage-store'

const isPathActive = (pathname: string, route: string) => pathname === route || pathname.startsWith(`${route}/`)
const routeClasses = (active: boolean) => (active ? "bg-accent text-accent-foreground" : "text-muted-foreground")

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
      return isPathActive(activeState.currentRoute, route)
    },
    
    isDirectoryActive: (path: string) => {
      const { activeState } = get()
      return activeState.activeDirectoryPath === path
    },
    
    getActiveBreadcrumbs: () => {
      return get().activeState.breadcrumbs
    },
    
    getActiveStateClasses: (route: string) => {
      return routeClasses(get().isRouteActive(route))
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
  const pathname = usePathname()
  // Select only the (stable) action: subscribing to the whole store would re-render the sidebar again each time
  // the store is written, which happens after every navigation.
  const updateActiveRoute = useActiveStateStore((state) => state.updateActiveRoute)

  // Keep the store in sync for the consumers that still read the route from it.
  useEffect(() => {
    updateActiveRoute(pathname)
  }, [pathname, updateActiveRoute])

  // The store only learns about a new route in that effect, one render after usePathname() changed. Reading it for
  // the highlight would paint the old item for a frame (and no item at all on the first paint, as it starts empty),
  // which shows as flicker in the sidebar. So everything here is derived from the pathname in the same render.
  const isRouteActive = useCallback((route: string) => isPathActive(pathname, route), [pathname])
  const getActiveStateClasses = useCallback((route: string) => routeClasses(isRouteActive(route)), [isRouteActive])

  return {
    isRouteActive,
    getActiveStateClasses,
    currentRoute: pathname,
    isCloudStorageActive: pathname.startsWith('/dateien')
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