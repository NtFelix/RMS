'use client'

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { useEffect, useCallback, useMemo } from 'react'
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
  immer((set, get) => {
    const updateActiveRoute = (route: string) => {
      const currentState = get().activeState
      // Only update if the route actually changed
      if (currentState.currentRoute !== route) {
        set((draft) => {
          draft.activeState.currentRoute = route
          draft.activeState.isCloudStorageActive = route.startsWith('/dateien')
          draft.activeState.lastUpdated = Date.now()
        })
      }
    }
    
    const updateActiveDirectory = (path: string, breadcrumbs?: BreadcrumbItem[]) => {
      set((draft) => {
        draft.activeState.currentDirectory = path
        draft.activeState.activeDirectoryPath = path
        if (breadcrumbs) {
          draft.activeState.breadcrumbs = breadcrumbs
        }
        draft.activeState.lastUpdated = Date.now()
      })
    }
    
    const updateBreadcrumbs = (breadcrumbs: BreadcrumbItem[]) => {
      set((draft) => {
        draft.activeState.breadcrumbs = breadcrumbs
        draft.activeState.lastUpdated = Date.now()
      })
    }
    
    const isRouteActive = (route: string) => {
      const { activeState } = get()
      return activeState.currentRoute === route || 
             activeState.currentRoute.startsWith(`${route}/`)
    }
    
    const isDirectoryActive = (path: string) => {
      const { activeState } = get()
      return activeState.activeDirectoryPath === path
    }
    
    const getActiveBreadcrumbs = () => {
      return get().activeState.breadcrumbs
    }
    
    const getActiveStateClasses = (route: string) => {
      const isActive = isRouteActive(route)
      return isActive 
        ? "bg-accent text-accent-foreground" 
        : "text-muted-foreground"
    }
    
    const getDirectoryActiveClasses = (path: string) => {
      const isActive = isDirectoryActive(path)
      return isActive
        ? "bg-accent/20 border-accent text-accent-foreground font-medium"
        : "hover:bg-accent/10"
    }
    
    const reset = () => {
      set((draft) => {
        draft.activeState = { ...initialActiveState, lastUpdated: Date.now() }
      })
    }
    
    const syncWithNavigation = (currentPath: string, breadcrumbs: BreadcrumbItem[]) => {
      set((draft) => {
        draft.activeState.currentDirectory = currentPath
        draft.activeState.activeDirectoryPath = currentPath
        draft.activeState.breadcrumbs = breadcrumbs
        draft.activeState.lastUpdated = Date.now()
      })
    }
    
    return {
      activeState: initialActiveState,
      updateActiveRoute,
      updateActiveDirectory,
      updateBreadcrumbs,
      isRouteActive,
      isDirectoryActive,
      getActiveBreadcrumbs,
      getActiveStateClasses,
      getDirectoryActiveClasses,
      reset,
      syncWithNavigation
    }
  })
)

/**
 * Hook for managing active states across the application
 * Automatically syncs with Next.js router and navigation changes
 */
export function useActiveStateManager() {
  const store = useActiveStateStore()
  const pathname = usePathname()
  
  // Sync with Next.js router changes, but only if it's actually different
  useEffect(() => {
    if (store.activeState.currentRoute !== pathname) {
      store.updateActiveRoute(pathname)
    }
  }, [pathname, store.activeState.currentRoute, store.updateActiveRoute])
  
  return store
}

/**
 * Hook specifically for sidebar navigation active states
 */
export function useSidebarActiveState() {
  const store = useActiveStateStore()
  const pathname = usePathname()
  
  // Update active route when pathname changes, but only if it's actually different
  useEffect(() => {
    if (store.activeState.currentRoute !== pathname) {
      store.updateActiveRoute(pathname)
    }
  }, [pathname, store.activeState.currentRoute, store.updateActiveRoute])
  
  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(() => ({
    isRouteActive: store.isRouteActive,
    getActiveStateClasses: store.getActiveStateClasses,
    currentRoute: store.activeState.currentRoute,
    isCloudStorageActive: store.activeState.isCloudStorageActive
  }), [store.isRouteActive, store.getActiveStateClasses, store.activeState.currentRoute, store.activeState.isCloudStorageActive])
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
  }, [store])
  
  const updateActiveDirectory = useCallback((path: string, breadcrumbs?: BreadcrumbItem[]) => {
    store.updateActiveDirectory(path, breadcrumbs)
  }, [store])
  
  const updateBreadcrumbs = useCallback((breadcrumbs: BreadcrumbItem[]) => {
    store.updateBreadcrumbs(breadcrumbs)
  }, [store])
  
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
  const store = useActiveStateStore()
  const pathname = usePathname()
  
  // Auto-sync with router, but only if it's actually different
  useEffect(() => {
    if (store.activeState.currentRoute !== pathname) {
      store.updateActiveRoute(pathname)
    }
  }, [pathname, store.activeState.currentRoute, store.updateActiveRoute])
  
  return useMemo(() => ({
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
  }), [
    store.activeState,
    store.isRouteActive,
    store.getActiveStateClasses,
    store.isDirectoryActive,
    store.getDirectoryActiveClasses,
    store.updateActiveRoute,
    store.updateActiveDirectory,
    store.updateBreadcrumbs,
    store.syncWithNavigation,
    store.reset
  ])
}