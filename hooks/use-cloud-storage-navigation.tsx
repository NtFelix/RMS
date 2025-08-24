'use client'

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { enableMapSet } from 'immer'
import { useEffect, useCallback } from 'react'
import type { StorageObject, VirtualFolder, BreadcrumbItem } from './use-cloud-storage-store'
import { getDirectoryCache, type DirectoryContents as CacheDirectoryContents, type DirectoryCacheManager } from '@/lib/directory-cache'
import { getCacheWarmingManager, type CacheWarmingManager } from '@/lib/cache-warming'

// Enable Map and Set support in Immer
enableMapSet()

// Types for navigation state (extending the cache types)
export interface DirectoryContents extends Omit<CacheDirectoryContents, 'files' | 'folders' | 'breadcrumbs'> {
  files: StorageObject[]
  folders: VirtualFolder[]
  breadcrumbs: BreadcrumbItem[]
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

// Convert between cache and navigation types
function convertCacheToNavigation(cacheContents: CacheDirectoryContents): DirectoryContents {
  return {
    ...cacheContents,
    files: cacheContents.files as StorageObject[],
    folders: cacheContents.folders as VirtualFolder[],
    breadcrumbs: cacheContents.breadcrumbs as BreadcrumbItem[]
  }
}

function convertNavigationToCache(navContents: DirectoryContents): CacheDirectoryContents {
  return {
    ...navContents,
    files: navContents.files as any[],
    folders: navContents.folders as any[],
    breadcrumbs: navContents.breadcrumbs as any[]
  }
}

interface CloudStorageNavigationState {
  // Current navigation state
  currentPath: string
  isNavigating: boolean
  navigationHistory: NavigationHistoryEntry[]
  historyIndex: number
  
  // Directory caching (using enhanced cache manager)
  directoryCache: DirectoryCacheManager
  cacheWarmingManager: CacheWarmingManager
  
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
  updateDocumentTitle: (path: string, breadcrumbs: BreadcrumbItem[]) => void
  getCurrentUrl: (path: string) => string
  
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
  directoryCache: getDirectoryCache({
    maxSize: 100,
    maxMemoryMB: 50,
    ttlMinutes: 5,
    enablePreloading: true,
    enableMemoryMonitoring: true,
    enableBackgroundPrefetch: true,
    enableNavigationPatterns: true,
    preloadSiblingCount: 3,
    idleTimeThreshold: 2000
  }),
  cacheWarmingManager: getCacheWarmingManager({
    maxConcurrentRequests: 2,
    priorityThreshold: 50,
    idleTimeRequired: 3000,
    maxWarmingTime: 30000
  }),
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
      
      // Record activity for cache warming
      state.cacheWarmingManager.recordActivity()
      
      try {
        // Save current state before navigation
        if (state.currentPath) {
          get().preserveViewState(state.currentPath)
        }
        
        // Check cache first
        let cacheContents = state.directoryCache.get(path)
        let directoryContents: DirectoryContents | null = null
        let fromCache = !!cacheContents
        
        if (cacheContents && !options.force) {
          directoryContents = convertCacheToNavigation(cacheContents)
        }
        
        if (!directoryContents || options.force) {
          // Load from server
          const loadStartTime = performance.now()
          directoryContents = await loadDirectoryContents(path)
          const loadTime = performance.now() - loadStartTime
          fromCache = false
          
          // Cache the results with load time for performance tracking
          const cacheData = convertNavigationToCache(directoryContents)
          state.directoryCache.set(path, cacheData, loadTime)
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
        
        // Update browser history and document title
        if (!options.skipHistory) {
          get().updateBrowserHistory(path, options.replace)
        }
        
        // Update document title with current directory info
        if (directoryContents && directoryContents.breadcrumbs) {
          get().updateDocumentTitle(path, directoryContents.breadcrumbs)
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
        
        // Preload related directories in background using intelligent caching
        setTimeout(async () => {
          const relatedPaths = getRelatedPaths(path)
          if (relatedPaths.length > 0) {
            await state.directoryCache.preload(relatedPaths, loadDirectoryContentsForCache, 'parent')
          }
          
          // Also warm cache based on navigation patterns
          await state.directoryCache.warmCache(path, loadDirectoryContentsForCache)
          
          // Warm sibling directories during idle time
          await state.cacheWarmingManager.warmSiblings(path, loadDirectoryContentsForCache)
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
      const cacheContents = get().directoryCache.get(path)
      return cacheContents ? convertCacheToNavigation(cacheContents) : null
    },
    
    setCachedDirectory: (path: string, contents: DirectoryContents) => {
      const cacheData = convertNavigationToCache(contents)
      get().directoryCache.set(path, cacheData)
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
      await cache.preload(paths, loadDirectoryContentsForCache, 'parent')
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
      const url = get().getCurrentUrl(path)
      
      try {
        const state = { 
          path, 
          clientNavigation: true,
          timestamp: Date.now(),
          scrollPosition: window.scrollY
        }
        
        if (replace) {
          window.history.replaceState(state, '', url)
        } else {
          window.history.pushState(state, '', url)
        }
        
        // Update document title
        const cachedData = get().getCachedDirectory(path)
        if (cachedData) {
          get().updateDocumentTitle(path, cachedData.breadcrumbs)
        }
      } catch (error) {
        console.warn('Failed to update browser history:', error)
      }
    },
    
    handleBrowserNavigation: async (path: string) => {
      // Handle browser back/forward navigation
      try {
        await get().navigateToPath(path, { 
          skipHistory: true, 
          preserveScroll: true,
          force: false // Don't force reload for browser navigation
        })
      } catch (error) {
        console.error('Browser navigation failed:', error)
        // Fallback to page reload
        window.location.href = get().getCurrentUrl(path)
      }
    },
    
    updateDocumentTitle: (path: string, breadcrumbs: BreadcrumbItem[]) => {
      try {
        let title = 'Cloud Storage'
        
        if (breadcrumbs.length > 1) {
          // Use the last breadcrumb as the main title
          const currentDir = breadcrumbs[breadcrumbs.length - 1]
          title = `${currentDir.name} - Cloud Storage`
          
          // Add parent context if available
          if (breadcrumbs.length > 2) {
            const parent = breadcrumbs[breadcrumbs.length - 2]
            title = `${currentDir.name} - ${parent.name} - Cloud Storage`
          }
        }
        
        // Add app name
        title += ' - RMS'
        
        document.title = title
      } catch (error) {
        console.warn('Failed to update document title:', error)
      }
    },
    
    getCurrentUrl: (path: string) => {
      // Convert storage path to URL path
      const userIdMatch = path.match(/^user_([^/]+)/)
      if (!userIdMatch) {
        return '/dateien'
      }
      
      const userId = userIdMatch[1]
      const basePath = `user_${userId}`
      
      if (path === basePath) {
        return '/dateien'
      }
      
      // Remove user prefix and construct URL
      const relativePath = path.replace(`${basePath}/`, '')
      return `/dateien/${relativePath}`
    },
    
    // Utility methods
    reset: () => {
      set((draft) => {
        Object.assign(draft, {
          ...initialState,
          directoryCache: getDirectoryCache({
            maxSize: 50,
            maxMemoryMB: 25,
            ttlMinutes: 5
          }),
          viewPreferences: new Map(),
          scrollPositions: new Map(),
        })
      })
    },
    
    getNavigationStats: () => {
      const state = get()
      const cacheStats = state.directoryCache.getStats()
      return {
        cacheStats,
        historyLength: state.navigationHistory.length,
        currentHistoryIndex: state.historyIndex,
        viewPreferencesCount: state.viewPreferences.size,
        scrollPositionsCount: state.scrollPositions.size,
        cacheHitRate: state.cacheHitRate,
        navigationPatterns: state.directoryCache.getNavigationPatterns(),
        pendingPreloads: state.directoryCache.getPendingPreloads(),
        cacheEfficiency: cacheStats.cacheEfficiency,
        backgroundPrefetchCount: cacheStats.backgroundPrefetchCount,
        preloadHitRate: cacheStats.totalHits > 0 ? (cacheStats.preloadHits / cacheStats.totalHits) : 0
      }
    }
  }))
)

// Helper function to load directory contents for cache
async function loadDirectoryContentsForCache(path: string): Promise<CacheDirectoryContents> {
  const navContents = await loadDirectoryContents(path)
  return convertNavigationToCache(navContents)
}

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
      if (event.state?.clientNavigation && event.state?.path) {
        // This was a client-side navigation, handle it with client-side routing
        store.handleBrowserNavigation(event.state.path)
        
        // Restore scroll position if available
        if (event.state.scrollPosition) {
          setTimeout(() => {
            window.scrollTo({ top: event.state.scrollPosition, behavior: 'auto' })
          }, 100)
        }
      } else {
        // This might be a direct URL access or external navigation
        // Extract path from current URL and handle appropriately
        const currentUrl = window.location.pathname
        const pathMatch = currentUrl.match(/^\/dateien(?:\/(.+))?$/)
        
        if (pathMatch) {
          // Construct storage path from URL
          const urlPath = pathMatch[1] || ''
          const userId = store.currentPath?.match(/^user_([^/]+)/)?.[1]
          
          if (userId) {
            const storagePath = urlPath ? `user_${userId}/${urlPath}` : `user_${userId}`
            
            // Only handle if it's different from current path
            if (storagePath !== store.currentPath) {
              store.handleBrowserNavigation(storagePath)
            }
          }
        }
      }
    }
    
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [store])
  
  // Handle page refresh and direct URL access
  useEffect(() => {
    const handlePageLoad = () => {
      const currentUrl = window.location.pathname
      const pathMatch = currentUrl.match(/^\/dateien(?:\/(.+))?$/)
      
      if (pathMatch && store.currentPath) {
        const urlPath = pathMatch[1] || ''
        const userId = store.currentPath.match(/^user_([^/]+)/)?.[1]
        
        if (userId) {
          const expectedStoragePath = urlPath ? `user_${userId}/${urlPath}` : `user_${userId}`
          
          // Ensure URL matches current path
          if (expectedStoragePath !== store.currentPath) {
            const correctUrl = store.getCurrentUrl(store.currentPath)
            if (correctUrl !== currentUrl) {
              window.history.replaceState(
                { 
                  path: store.currentPath, 
                  clientNavigation: true,
                  timestamp: Date.now(),
                  scrollPosition: 0
                }, 
                '', 
                correctUrl
              )
            }
          }
          
          // Update document title
          const cachedData = store.getCachedDirectory(store.currentPath)
          if (cachedData?.breadcrumbs) {
            store.updateDocumentTitle(store.currentPath, cachedData.breadcrumbs)
          }
        }
      }
    }
    
    // Run on mount and when current path changes
    if (store.currentPath) {
      handlePageLoad()
    }
  }, [store.currentPath, store])
  
  // Save scroll position on scroll
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout
    
    const handleScroll = () => {
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        if (store.currentPath) {
          store.saveScrollPosition(store.currentPath, window.scrollY)
          
          // Also update browser history state with current scroll position
          try {
            const currentState = window.history.state
            if (currentState?.clientNavigation) {
              window.history.replaceState(
                { ...currentState, scrollPosition: window.scrollY },
                '',
                window.location.pathname
              )
            }
          } catch (error) {
            // Ignore errors in updating history state
          }
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
  
  // Handle beforeunload to save state
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (store.currentPath) {
        // Save current scroll position
        store.saveScrollPosition(store.currentPath, window.scrollY)
        
        // Save view preferences
        store.preserveViewState(store.currentPath)
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [store.currentPath, store])

  // Handle user activity for cache warming
  useEffect(() => {
    const handleActivity = () => {
      store.cacheWarmingManager.recordActivity()
    }

    // Listen for various user activity events
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
    }
  }, [store])

  // Cleanup cache warming on unmount
  useEffect(() => {
    return () => {
      store.cacheWarmingManager.destroy()
    }
  }, [])
  
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
  const stats = store.getNavigationStats()
  
  return {
    getCachedDirectory: store.getCachedDirectory,
    setCachedDirectory: store.setCachedDirectory,
    invalidateCache: store.invalidateCache,
    preloadDirectories: store.preloadDirectories,
    cacheStats: stats.cacheStats,
    navigationPatterns: stats.navigationPatterns,
    pendingPreloads: stats.pendingPreloads,
    cacheEfficiency: stats.cacheEfficiency,
    preloadHitRate: stats.preloadHitRate,
    // Enhanced cache methods
    warmCache: async (currentPath: string) => {
      await store.directoryCache.warmCache(currentPath, loadDirectoryContentsForCache)
    },
    getPreloadPaths: (currentPath: string) => {
      return store.directoryCache.getPreloadPaths(currentPath)
    },
    // Cache warming methods
    warmPaths: async (paths: string[]) => {
      await store.cacheWarmingManager.warmPaths(paths, loadDirectoryContentsForCache)
    },
    warmFromPatterns: async (currentPath: string) => {
      await store.cacheWarmingManager.warmFromPatterns(currentPath, loadDirectoryContentsForCache)
    },
    warmSiblings: async (currentPath: string) => {
      await store.cacheWarmingManager.warmSiblings(currentPath, loadDirectoryContentsForCache)
    },
    stopWarming: () => store.cacheWarmingManager.stopWarming(),
    isWarmingActive: () => store.cacheWarmingManager.isWarmingActive(),
    getWarmingStats: () => store.cacheWarmingManager.getWarmingStats()
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