'use client'

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { enableMapSet } from 'immer'
import { useEffect, useCallback } from 'react'
import type { StorageObject, VirtualFolder, BreadcrumbItem } from './use-cloud-storage-store'

// Enable Map and Set support in Immer
enableMapSet()

// Types for navigation state
export interface DirectoryContents {
  files: StorageObject[]
  folders: VirtualFolder[]
  breadcrumbs: BreadcrumbItem[]
  timestamp: number
  error?: string
}

export interface ViewPreferences {
  viewMode: 'grid' | 'list'
  sortBy: string
  sortOrder: 'asc' | 'desc'
  selectedItems: Set<string>
  searchQuery?: string
}

export interface NavigationOptions {
  replace?: boolean
  preserveScroll?: boolean
  force?: boolean // Force reload even if cached
  skipHistory?: boolean // Skip adding to browser history
}

export interface NavigationHistoryEntry {
  path: string
  timestamp: number
  scrollPosition: number
  viewPreferences: ViewPreferences
}

// LRU Cache implementation for directory contents
class DirectoryCache {
  private cache = new Map<string, DirectoryContents>()
  private accessOrder = new Map<string, number>()
  private maxSize: number
  private accessCounter = 0

  constructor(maxSize = 50) {
    this.maxSize = maxSize
  }

  get(path: string): DirectoryContents | null {
    const contents = this.cache.get(path)
    if (contents) {
      // Update access order
      this.accessOrder.set(path, ++this.accessCounter)
      return contents
    }
    return null
  }

  set(path: string, contents: DirectoryContents): void {
    // If cache is full, remove least recently used item
    if (this.cache.size >= this.maxSize && !this.cache.has(path)) {
      this.evictLRU()
    }

    this.cache.set(path, contents)
    this.accessOrder.set(path, ++this.accessCounter)
  }

  has(path: string): boolean {
    return this.cache.has(path)
  }

  invalidate(path: string): void {
    this.cache.delete(path)
    this.accessOrder.delete(path)
  }

  clear(): void {
    this.cache.clear()
    this.accessOrder.clear()
    this.accessCounter = 0
  }

  private evictLRU(): void {
    let lruPath = ''
    let lruAccess = Infinity

    for (const [path, accessTime] of this.accessOrder.entries()) {
      if (accessTime < lruAccess) {
        lruAccess = accessTime
        lruPath = path
      }
    }

    if (lruPath) {
      this.cache.delete(lruPath)
      this.accessOrder.delete(lruPath)
    }
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.accessCounter > 0 ? (this.cache.size / this.accessCounter) : 0
    }
  }

  // Preload directories (for parent/sibling prefetching)
  async preload(paths: string[], loadFunction: (path: string) => Promise<DirectoryContents>): Promise<void> {
    const preloadPromises = paths
      .filter(path => !this.has(path))
      .slice(0, 5) // Limit concurrent preloads
      .map(async (path) => {
        try {
          const contents = await loadFunction(path)
          this.set(path, contents)
        } catch (error) {
          console.warn(`Failed to preload directory: ${path}`, error)
        }
      })

    await Promise.allSettled(preloadPromises)
  }
}

interface CloudStorageNavigationState {
  // Current navigation state
  currentPath: string
  isNavigating: boolean
  navigationHistory: NavigationHistoryEntry[]
  historyIndex: number
  
  // Directory caching
  directoryCache: DirectoryCache
  
  // View state preservation
  viewPreferences: Map<string, ViewPreferences>
  scrollPositions: Map<string, number>
  
  // Performance tracking
  navigationStartTime: number | null
  cacheHitRate: number
  
  // Navigation methods
  navigateToPath: (path: string, options?: NavigationOptions) => Promise<void>
  goBack: () => Promise<void>
  goForward: () => Promise<void>
  
  // Cache management
  getCachedDirectory: (path: string) => DirectoryContents | null
  setCachedDirectory: (path: string, contents: DirectoryContents) => void
  invalidateCache: (path?: string) => void
  preloadDirectories: (paths: string[]) => Promise<void>
  
  // View state management
  getViewPreferences: (path: string) => ViewPreferences
  setViewPreferences: (path: string, preferences: ViewPreferences) => void
  preserveViewState: (path: string) => void
  restoreViewState: (path: string) => ViewPreferences
  
  // Scroll position management
  saveScrollPosition: (path: string, position: number) => void
  getScrollPosition: (path: string) => number
  
  // Browser history integration
  updateBrowserHistory: (path: string, replace?: boolean) => void
  handleBrowserNavigation: (path: string) => Promise<void>
  
  // Utility methods
  reset: () => void
  getNavigationStats: () => object
}

// Default view preferences
const defaultViewPreferences: ViewPreferences = {
  viewMode: 'grid',
  sortBy: 'name',
  sortOrder: 'asc',
  selectedItems: new Set<string>(),
  searchQuery: ''
}

const initialState = {
  currentPath: '',
  isNavigating: false,
  navigationHistory: [],
  historyIndex: -1,
  directoryCache: new DirectoryCache(50),
  viewPreferences: new Map<string, ViewPreferences>(),
  scrollPositions: new Map<string, number>(),
  navigationStartTime: null,
  cacheHitRate: 0,
}

export const useCloudStorageNavigationStore = create<CloudStorageNavigationState>()(
  immer((set, get) => ({
    ...initialState,
    
    // Navigation methods
    navigateToPath: async (path: string, options: NavigationOptions = {}) => {
      const state = get()
      const startTime = performance.now()
      
      // Prevent navigation to same path unless forced
      if (state.currentPath === path && !options.force) {
        return
      }
      
      set((draft) => {
        draft.isNavigating = true
        draft.navigationStartTime = startTime
      })
      
      try {
        // Save current state before navigation
        if (state.currentPath) {
          get().preserveViewState(state.currentPath)
        }
        
        // Check cache first
        let directoryContents = state.directoryCache.get(path)
        let fromCache = !!directoryContents
        
        if (!directoryContents || options.force) {
          // Load from server
          directoryContents = await loadDirectoryContents(path)
          fromCache = false
          
          // Cache the results
          get().setCachedDirectory(path, directoryContents)
        }
        
        // Update navigation state
        set((draft) => {
          draft.currentPath = path
          draft.isNavigating = false
          
          // Update cache hit rate
          const stats = draft.directoryCache.getStats()
          draft.cacheHitRate = stats.hitRate
          
          // Add to navigation history if not skipped
          if (!options.skipHistory) {
            const historyEntry: NavigationHistoryEntry = {
              path,
              timestamp: Date.now(),
              scrollPosition: 0,
              viewPreferences: get().getViewPreferences(path)
            }
            
            // Remove any forward history if we're not at the end
            if (draft.historyIndex < draft.navigationHistory.length - 1) {
              draft.navigationHistory = draft.navigationHistory.slice(0, draft.historyIndex + 1)
            }
            
            draft.navigationHistory.push(historyEntry)
            draft.historyIndex = draft.navigationHistory.length - 1
          }
        })
        
        // Update browser history
        if (!options.skipHistory) {
          get().updateBrowserHistory(path, options.replace)
        }
        
        // Restore scroll position if requested
        if (options.preserveScroll) {
          const scrollPosition = get().getScrollPosition(path)
          if (scrollPosition > 0) {
            // Delay scroll restoration to allow content to render
            setTimeout(() => {
              window.scrollTo({ top: scrollPosition, behavior: 'smooth' })
            }, 100)
          }
        }
        
        // Preload related directories in background
        setTimeout(() => {
          get().preloadDirectories(getRelatedPaths(path))
        }, 500)
        
        // Performance logging
        const navigationTime = performance.now() - startTime
        if (navigationTime > 100) {
          console.warn(`Slow navigation to ${path}: ${navigationTime.toFixed(2)}ms`)
        }
        
      } catch (error) {
        set((draft) => {
          draft.isNavigating = false
          draft.navigationStartTime = null
        })
        
        console.error('Navigation failed:', error)
        throw error
      }
    },
    
    goBack: async () => {
      const state = get()
      if (state.historyIndex > 0) {
        const previousEntry = state.navigationHistory[state.historyIndex - 1]
        
        set((draft) => {
          draft.historyIndex -= 1
        })
        
        await get().navigateToPath(previousEntry.path, { 
          skipHistory: true, 
          preserveScroll: true 
        })
        
        // Restore view preferences
        get().setViewPreferences(previousEntry.path, previousEntry.viewPreferences)
      } else {
        // Use browser back if no internal history
        window.history.back()
      }
    },
    
    goForward: async () => {
      const state = get()
      if (state.historyIndex < state.navigationHistory.length - 1) {
        const nextEntry = state.navigationHistory[state.historyIndex + 1]
        
        set((draft) => {
          draft.historyIndex += 1
        })
        
        await get().navigateToPath(nextEntry.path, { 
          skipHistory: true, 
          preserveScroll: true 
        })
        
        // Restore view preferences
        get().setViewPreferences(nextEntry.path, nextEntry.viewPreferences)
      } else {
        // Use browser forward if no internal history
        window.history.forward()
      }
    },
    
    // Cache management
    getCachedDirectory: (path: string) => {
      return get().directoryCache.get(path)
    },
    
    setCachedDirectory: (path: string, contents: DirectoryContents) => {
      get().directoryCache.set(path, contents)
    },
    
    invalidateCache: (path?: string) => {
      if (path) {
        get().directoryCache.invalidate(path)
      } else {
        get().directoryCache.clear()
      }
    },
    
    preloadDirectories: async (paths: string[]) => {
      const cache = get().directoryCache
      await cache.preload(paths, loadDirectoryContents)
    },
    
    // View state management
    getViewPreferences: (path: string) => {
      const state = get()
      return state.viewPreferences.get(path) || { ...defaultViewPreferences }
    },
    
    setViewPreferences: (path: string, preferences: ViewPreferences) => {
      set((draft) => {
        draft.viewPreferences.set(path, preferences)
      })
      
      // Persist to localStorage
      try {
        const key = `cloud-storage-view-${path}`
        localStorage.setItem(key, JSON.stringify({
          ...preferences,
          selectedItems: Array.from(preferences.selectedItems) // Convert Set to Array for JSON
        }))
      } catch (error) {
        console.warn('Failed to persist view preferences:', error)
      }
    },
    
    preserveViewState: (path: string) => {
      // This would be called by the UI components to save current view state
      // Implementation depends on how the UI components expose their state
    },
    
    restoreViewState: (path: string) => {
      // Try to restore from localStorage first
      try {
        const key = `cloud-storage-view-${path}`
        const stored = localStorage.getItem(key)
        if (stored) {
          const parsed = JSON.parse(stored)
          return {
            ...parsed,
            selectedItems: new Set(parsed.selectedItems || []) // Convert Array back to Set
          }
        }
      } catch (error) {
        console.warn('Failed to restore view preferences from localStorage:', error)
      }
      
      return get().getViewPreferences(path)
    },
    
    // Scroll position management
    saveScrollPosition: (path: string, position: number) => {
      set((draft) => {
        draft.scrollPositions.set(path, position)
      })
    },
    
    getScrollPosition: (path: string) => {
      return get().scrollPositions.get(path) || 0
    },
    
    // Browser history integration
    updateBrowserHistory: (path: string, replace = false) => {
      const url = `/dateien/${path.replace(/^user_[^/]+\/?/, '')}`
      
      try {
        if (replace) {
          window.history.replaceState({ path }, '', url)
        } else {
          window.history.pushState({ path }, '', url)
        }
      } catch (error) {
        console.warn('Failed to update browser history:', error)
      }
    },
    
    handleBrowserNavigation: async (path: string) => {
      // Handle browser back/forward navigation
      await get().navigateToPath(path, { skipHistory: true, preserveScroll: true })
    },
    
    // Utility methods
    reset: () => {
      set((draft) => {
        Object.assign(draft, {
          ...initialState,
          directoryCache: new DirectoryCache(50),
          viewPreferences: new Map(),
          scrollPositions: new Map(),
        })
      })
    },
    
    getNavigationStats: () => {
      const state = get()
      return {
        cacheStats: state.directoryCache.getStats(),
        historyLength: state.navigationHistory.length,
        currentHistoryIndex: state.historyIndex,
        viewPreferencesCount: state.viewPreferences.size,
        scrollPositionsCount: state.scrollPositions.size,
        cacheHitRate: state.cacheHitRate
      }
    }
  }))
)

// Helper function to load directory contents
async function loadDirectoryContents(path: string): Promise<DirectoryContents> {
  try {
    // Extract user ID from path
    const userIdMatch = path.match(/^user_([^\/]+)/)
    if (!userIdMatch) {
      throw new Error('Invalid path format')
    }
    const userId = userIdMatch[1]
    
    // Use server action to load files for the path
    const { loadFilesForPath } = await import('@/app/(dashboard)/dateien/actions')
    const { files, folders, error } = await loadFilesForPath(userId, path)
    
    if (error) {
      throw new Error(error)
    }
    
    // Generate breadcrumbs (simplified version - full implementation would be in the main store)
    const breadcrumbs: BreadcrumbItem[] = []
    const pathSegments = path.split('/').filter(Boolean)
    
    breadcrumbs.push({
      name: 'Cloud Storage',
      path: `user_${userId}`,
      type: 'root'
    })
    
    let currentPath = `user_${userId}`
    for (let i = 1; i < pathSegments.length; i++) {
      const segment = pathSegments[i]
      currentPath = `${currentPath}/${segment}`
      
      breadcrumbs.push({
        name: segment,
        path: currentPath,
        type: i === 1 ? 'house' : i === 2 ? 'apartment' : 'category'
      })
    }
    
    return {
      files,
      folders: folders.map(folder => ({
        name: folder.name,
        path: folder.path,
        type: folder.type as any,
        isEmpty: folder.isEmpty,
        children: [],
        fileCount: folder.fileCount,
        displayName: folder.displayName
      })),
      breadcrumbs,
      timestamp: Date.now()
    }
  } catch (error) {
    return {
      files: [],
      folders: [],
      breadcrumbs: [],
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Failed to load directory'
    }
  }
}

// Helper function to get related paths for preloading
function getRelatedPaths(currentPath: string): string[] {
  const paths: string[] = []
  const segments = currentPath.split('/').filter(Boolean)
  
  // Add parent path
  if (segments.length > 1) {
    const parentPath = segments.slice(0, -1).join('/')
    paths.push(parentPath)
  }
  
  // Add sibling paths (this would need more sophisticated logic based on actual folder structure)
  // For now, we'll just return the parent path
  
  return paths
}

// React hook for using the navigation store with browser integration
export function useCloudStorageNavigation() {
  const store = useCloudStorageNavigationStore()
  
  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.path) {
        store.handleBrowserNavigation(event.state.path)
      }
    }
    
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [store])
  
  // Save scroll position on scroll
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout
    
    const handleScroll = () => {
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        if (store.currentPath) {
          store.saveScrollPosition(store.currentPath, window.scrollY)
        }
      }, 100)
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(scrollTimeout)
    }
  }, [store.currentPath, store])
  
  // Restore view preferences on mount
  useEffect(() => {
    if (store.currentPath) {
      const preferences = store.restoreViewState(store.currentPath)
      store.setViewPreferences(store.currentPath, preferences)
    }
  }, [store.currentPath, store])
  
  return store
}

// Selector hooks for specific functionality
export const useNavigationState = () => {
  const store = useCloudStorageNavigationStore()
  return {
    currentPath: store.currentPath,
    isNavigating: store.isNavigating,
    canGoBack: store.historyIndex > 0,
    canGoForward: store.historyIndex < store.navigationHistory.length - 1,
    navigateToPath: store.navigateToPath,
    goBack: store.goBack,
    goForward: store.goForward,
  }
}

export const useDirectoryCache = () => {
  const store = useCloudStorageNavigationStore()
  return {
    getCachedDirectory: store.getCachedDirectory,
    setCachedDirectory: store.setCachedDirectory,
    invalidateCache: store.invalidateCache,
    preloadDirectories: store.preloadDirectories,
    cacheStats: store.getNavigationStats(),
  }
}

export const useViewPreferences = () => {
  const store = useCloudStorageNavigationStore()
  return {
    getViewPreferences: store.getViewPreferences,
    setViewPreferences: store.setViewPreferences,
    preserveViewState: store.preserveViewState,
    restoreViewState: store.restoreViewState,
  }
}

export const useScrollPosition = () => {
  const store = useCloudStorageNavigationStore()
  return {
    saveScrollPosition: store.saveScrollPosition,
    getScrollPosition: store.getScrollPosition,
  }
}