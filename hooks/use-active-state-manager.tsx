'use client'

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { persist } from 'zustand/middleware'
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
  persist(
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
    }),
    {
      name: 'sidebar-active-state',
      partialize: (state) => ({
        activeState: {
          currentRoute: state.activeState.currentRoute,
          isCloudStorageActive: state.activeState.isCloudStorageActive,
          // Don't persist directory-specific state as it's more volatile
          currentDirectory: '',
          breadcrumbs: [],
          activeDirectoryPath: null,
          lastUpdated: Date.now()
        }
      }),
      // Only persist the current route and cloud storage active state
      version: 1,
    }
  )
)

/**
 * Hook for managing active states across the application
 * Automatically syncs with Next.js router and navigation changes
 */
export function useActiveStateManager() {
  const pathname = usePathname()
  const updateActiveRoute = useActiveStateStore((state) => state.updateActiveRoute)
  
  // Sync with Next.js router changes
  useEffect(() => {
    updateActiveRoute(pathname)
  }, [pathname, updateActiveRoute])
  
  // Return the entire store for backward compatibility
  return useActiveStateStore()
}

/**
 * Hook specifically for sidebar navigation active states
 */
export function useSidebarActiveState() {
  const pathname = usePathname()
  
  // Subscribe to the store state directly to ensure reactivity
  const currentRoute = useActiveStateStore((state) => state.activeState.currentRoute)
  const isCloudStorageActive = useActiveStateStore((state) => state.activeState.isCloudStorageActive)
  const updateActiveRoute = useActiveStateStore((state) => state.updateActiveRoute)
  const isRouteActive = useActiveStateStore((state) => state.isRouteActive)
  const getActiveStateClasses = useActiveStateStore((state) => state.getActiveStateClasses)
  
  // Update route when pathname changes
  useEffect(() => {
    updateActiveRoute(pathname)
  }, [pathname, updateActiveRoute])
  
  // Return the reactive state and methods
  return {
    isRouteActive,
    getActiveStateClasses,
    currentRoute,
    isCloudStorageActive
  }
}

/**
 * Hook for breadcrumb navigation active states
 */
export function useBreadcrumbActiveState() {
  const breadcrumbs = useActiveStateStore((state) => state.activeState.breadcrumbs)
  const activeDirectoryPath = useActiveStateStore((state) => state.activeState.activeDirectoryPath)
  const updateBreadcrumbs = useActiveStateStore((state) => state.updateBreadcrumbs)
  const isDirectoryActive = useActiveStateStore((state) => state.isDirectoryActive)
  const getDirectoryActiveClasses = useActiveStateStore((state) => state.getDirectoryActiveClasses)
  
  return {
    breadcrumbs,
    updateBreadcrumbs,
    isDirectoryActive,
    getDirectoryActiveClasses,
    activeDirectoryPath
  }
}

/**
 * Hook for directory-specific active states
 */
export function useDirectoryActiveState() {
  const activeDirectoryPath = useActiveStateStore((state) => state.activeState.activeDirectoryPath)
  const currentDirectory = useActiveStateStore((state) => state.activeState.currentDirectory)
  const updateActiveDirectory = useActiveStateStore((state) => state.updateActiveDirectory)
  const isDirectoryActive = useActiveStateStore((state) => state.isDirectoryActive)
  const getDirectoryActiveClasses = useActiveStateStore((state) => state.getDirectoryActiveClasses)
  const syncWithNavigation = useActiveStateStore((state) => state.syncWithNavigation)
  
  return {
    activeDirectoryPath,
    currentDirectory,
    updateActiveDirectory,
    isDirectoryActive,
    getDirectoryActiveClasses,
    syncWithNavigation
  }
}

/**
 * Hook that automatically syncs active state with cloud storage navigation
 */
export function useActiveStateSync() {
  const activeState = useActiveStateStore((state) => state.activeState)
  const syncWithNavigation = useActiveStateStore((state) => state.syncWithNavigation)
  const updateActiveDirectory = useActiveStateStore((state) => state.updateActiveDirectory)
  const updateBreadcrumbs = useActiveStateStore((state) => state.updateBreadcrumbs)
  
  const syncActiveState = useCallback((currentPath: string, breadcrumbs: BreadcrumbItem[]) => {
    syncWithNavigation(currentPath, breadcrumbs)
  }, [syncWithNavigation])
  
  const updateActiveDirectoryCallback = useCallback((path: string, breadcrumbs?: BreadcrumbItem[]) => {
    updateActiveDirectory(path, breadcrumbs)
  }, [updateActiveDirectory])
  
  const updateBreadcrumbsCallback = useCallback((breadcrumbs: BreadcrumbItem[]) => {
    updateBreadcrumbs(breadcrumbs)
  }, [updateBreadcrumbs])
  
  return {
    syncActiveState,
    updateActiveDirectory: updateActiveDirectoryCallback,
    updateBreadcrumbs: updateBreadcrumbsCallback,
    activeState
  }
}

/**
 * Higher-order hook that provides comprehensive active state management
 * for components that need full active state functionality
 */
export function useComprehensiveActiveState() {
  const pathname = usePathname()
  
  // Subscribe to specific parts of the store for better reactivity
  const activeState = useActiveStateStore((state) => state.activeState)
  const isRouteActive = useActiveStateStore((state) => state.isRouteActive)
  const getActiveStateClasses = useActiveStateStore((state) => state.getActiveStateClasses)
  const isDirectoryActive = useActiveStateStore((state) => state.isDirectoryActive)
  const getDirectoryActiveClasses = useActiveStateStore((state) => state.getDirectoryActiveClasses)
  const updateActiveRoute = useActiveStateStore((state) => state.updateActiveRoute)
  const updateActiveDirectory = useActiveStateStore((state) => state.updateActiveDirectory)
  const updateBreadcrumbs = useActiveStateStore((state) => state.updateBreadcrumbs)
  const syncWithNavigation = useActiveStateStore((state) => state.syncWithNavigation)
  const reset = useActiveStateStore((state) => state.reset)
  
  // Auto-sync with router
  useEffect(() => {
    updateActiveRoute(pathname)
  }, [pathname, updateActiveRoute])
  
  return useMemo(() => ({
    // Current state
    activeState,
    
    // Route active state
    isRouteActive,
    getActiveStateClasses,
    
    // Directory active state
    isDirectoryActive,
    getDirectoryActiveClasses,
    
    // Breadcrumb state
    breadcrumbs: activeState.breadcrumbs,
    
    // Update methods
    updateActiveRoute,
    updateActiveDirectory,
    updateBreadcrumbs,
    syncWithNavigation,
    
    // Utility
    reset
  }), [
    activeState,
    isRouteActive,
    getActiveStateClasses,
    isDirectoryActive,
    getDirectoryActiveClasses,
    updateActiveRoute,
    updateActiveDirectory,
    updateBreadcrumbs,
    syncWithNavigation,
    reset
  ])
}