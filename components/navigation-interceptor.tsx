"use client"

import { useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCloudStorageNavigation } from '@/hooks/use-cloud-storage-navigation'
import { getDirectoryCache } from '@/lib/directory-cache'
import { useToast } from '@/hooks/use-toast'

export interface NavigationInterceptorProps {
  userId: string
  onNavigate?: (path: string, options?: NavigationOptions) => void
  fallbackToSSR?: boolean
  enableDebouncing?: boolean
  debounceMs?: number
  children: React.ReactNode
}

export interface NavigationOptions {
  replace?: boolean
  preserveScroll?: boolean
  force?: boolean
  skipHistory?: boolean
}

interface NavigationAttempt {
  path: string
  timestamp: number
  retryCount: number
}

/**
 * Navigation Interceptor Component
 * 
 * Intercepts folder click events and determines whether to use:
 * - Client-side navigation (default for folder clicks)
 * - Server-side navigation (fallback for errors or direct access)
 * 
 * Features:
 * - Debouncing for rapid navigation events
 * - Fallback mechanisms for navigation failures
 * - Integration with existing folder click handlers
 * - Performance monitoring and error recovery
 */
export function NavigationInterceptor({
  userId,
  onNavigate,
  fallbackToSSR = true,
  enableDebouncing = true,
  debounceMs = 150,
  children
}: NavigationInterceptorProps) {
  const router = useRouter()
  const navigation = useCloudStorageNavigation()
  const directoryCache = getDirectoryCache()
  const { toast } = useToast()
  
  // Debouncing state
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)
  const lastNavigationAttempt = useRef<NavigationAttempt | null>(null)
  const navigationInProgress = useRef<boolean>(false)
  
  // Performance tracking
  const navigationStats = useRef({
    totalAttempts: 0,
    successfulClientNavigation: 0,
    fallbackToSSR: 0,
    errors: 0,
    averageTime: 0
  })

  /**
   * Determines if client-side navigation should be used
   */
  const shouldUseClientNavigation = useCallback((path: string): boolean => {
    // Don't use client navigation if already navigating
    if (navigationInProgress.current) {
      return false
    }
    
    // Don't use client navigation for external paths
    if (!path.startsWith(`user_${userId}`)) {
      return false
    }
    
    // Use client navigation if we have cached data
    if (directoryCache.get(path)) {
      return true
    }
    
    // Use client navigation for normal folder navigation
    return true
  }, [userId, directoryCache])

  /**
   * Converts storage path to SSR URL
   */
  const pathToHref = useCallback((path: string): string => {
    const base = `user_${userId}`
    if (!path || path === base) return "/dateien"
    const prefix = `${base}/`
    if (path.startsWith(prefix)) {
      const rest = path.slice(prefix.length)
      return `/dateien/${rest}`
    }
    return "/dateien"
  }, [userId])

  /**
   * Performs client-side navigation with error handling
   */
  const performClientNavigation = useCallback(async (
    path: string, 
    options: NavigationOptions = {}
  ): Promise<boolean> => {
    const startTime = performance.now()
    
    try {
      navigationInProgress.current = true
      
      // Use the navigation store to handle client-side navigation
      await navigation.navigateToPath(path, options)
      
      // The navigation store will handle URL updates automatically
      // No need to manually update history here as it's handled in the store
      
      // Update performance stats
      const navigationTime = performance.now() - startTime
      navigationStats.current.successfulClientNavigation++
      navigationStats.current.averageTime = 
        (navigationStats.current.averageTime + navigationTime) / 2
      
      // Call custom navigation handler if provided
      if (onNavigate) {
        onNavigate(path, options)
      }
      
      return true
      
    } catch (error) {
      console.error('Client-side navigation failed:', error)
      navigationStats.current.errors++
      
      // Show user-friendly error message
      toast({
        title: "Navigation Error",
        description: "Failed to navigate to directory. Falling back to page reload.",
        variant: "destructive"
      })
      
      return false
    } finally {
      navigationInProgress.current = false
    }
  }, [navigation, pathToHref, onNavigate, toast])

  /**
   * Performs SSR navigation fallback
   */
  const performSSRNavigation = useCallback((path: string, replace = false) => {
    const url = pathToHref(path)
    
    navigationStats.current.fallbackToSSR++
    
    if (replace) {
      router.replace(url)
    } else {
      router.push(url)
    }
  }, [router, pathToHref])

  /**
   * Main navigation handler with debouncing and fallback logic
   */
  const handleNavigation = useCallback(async (
    path: string, 
    options: NavigationOptions = {}
  ) => {
    navigationStats.current.totalAttempts++
    
    // Prevent navigation to same path unless forced
    if (navigation.currentPath === path && !options.force) {
      return
    }
    
    // Check for rapid navigation attempts
    const now = Date.now()
    if (lastNavigationAttempt.current && 
        lastNavigationAttempt.current.path === path &&
        now - lastNavigationAttempt.current.timestamp < 1000) {
      
      // Increment retry count and potentially block
      lastNavigationAttempt.current.retryCount++
      if (lastNavigationAttempt.current.retryCount > 3) {
        console.warn('Too many rapid navigation attempts, blocking:', path)
        return
      }
    } else {
      // Reset retry count for new path or after timeout
      lastNavigationAttempt.current = {
        path,
        timestamp: now,
        retryCount: 1
      }
    }
    
    // Debounce navigation if enabled
    if (enableDebouncing) {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
      
      debounceTimer.current = setTimeout(async () => {
        await executeNavigation(path, options)
      }, debounceMs)
    } else {
      await executeNavigation(path, options)
    }
  }, [navigation.currentPath, enableDebouncing, debounceMs])

  /**
   * Executes the actual navigation logic
   */
  const executeNavigation = useCallback(async (
    path: string, 
    options: NavigationOptions = {}
  ) => {
    // Determine navigation strategy
    const useClientNavigation = shouldUseClientNavigation(path)
    
    if (useClientNavigation) {
      // Attempt client-side navigation
      const success = await performClientNavigation(path, options)
      
      if (!success && fallbackToSSR) {
        // Fall back to SSR navigation
        console.log('Falling back to SSR navigation for:', path)
        performSSRNavigation(path, options.replace)
      }
    } else {
      // Use SSR navigation directly
      performSSRNavigation(path, options.replace)
    }
  }, [shouldUseClientNavigation, performClientNavigation, performSSRNavigation, fallbackToSSR])

  /**
   * Intercepts click events on folder elements
   */
  const interceptFolderClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    
    // Find the closest folder element
    const folderElement = target.closest('[data-folder-path]') as HTMLElement
    if (!folderElement) return
    
    const folderPath = folderElement.getAttribute('data-folder-path')
    if (!folderPath) return
    
    // Prevent default navigation
    event.preventDefault()
    event.stopPropagation()
    
    // Handle navigation
    handleNavigation(folderPath)
  }, [handleNavigation])

  /**
   * Handle browser back/forward navigation
   */
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.clientNavigation && event.state?.path) {
        // This was a client-side navigation, handle it appropriately
        handleNavigation(event.state.path, { 
          skipHistory: true, 
          preserveScroll: true,
          force: false // Don't force reload for browser navigation
        })
      } else {
        // Handle direct URL access or page refresh
        const currentUrl = window.location.pathname
        const pathMatch = currentUrl.match(/^\/dateien(?:\/(.+))?$/)
        
        if (pathMatch) {
          const urlPath = pathMatch[1] || ''
          const storagePath = urlPath ? `user_${userId}/${urlPath}` : `user_${userId}`
          
          // Only navigate if it's different from current path
          if (storagePath !== navigation.currentPath) {
            handleNavigation(storagePath, { 
              skipHistory: true, 
              preserveScroll: false,
              force: true // Force reload for direct URL access
            })
          }
        }
      }
    }
    
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [handleNavigation, userId, navigation.currentPath])

  /**
   * Cleanup debounce timer on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [])

  /**
   * Expose navigation stats for debugging
   */
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      (window as any).__navigationStats = navigationStats.current
    }
  }, [])

  /**
   * Enhanced click handler for folder navigation
   * This can be used by components that need to trigger navigation
   */
  const navigateToFolder = useCallback((
    folderPath: string, 
    options: NavigationOptions = {}
  ) => {
    handleNavigation(folderPath, options)
  }, [handleNavigation])

  /**
   * Enhanced click handler with retry logic
   */
  const navigateWithRetry = useCallback(async (
    folderPath: string, 
    options: NavigationOptions = {},
    maxRetries = 2
  ) => {
    let retryCount = 0
    
    while (retryCount <= maxRetries) {
      try {
        await handleNavigation(folderPath, { ...options, force: retryCount > 0 })
        return // Success
      } catch (error) {
        retryCount++
        if (retryCount > maxRetries) {
          console.error(`Navigation failed after ${maxRetries} retries:`, error)
          
          if (fallbackToSSR) {
            performSSRNavigation(folderPath, options.replace)
          }
        } else {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 500 * retryCount))
        }
      }
    }
  }, [handleNavigation, fallbackToSSR, performSSRNavigation])

  // Provide navigation methods to children through context or props
  const navigationMethods = {
    navigateToFolder,
    navigateWithRetry,
    isNavigating: navigationInProgress.current,
    stats: navigationStats.current
  }

  // Clone children and inject navigation methods if they accept them
  const enhancedChildren = children

  return (
    <div 
      onClick={interceptFolderClick}
      data-navigation-interceptor="true"
    >
      {enhancedChildren}
    </div>
  )
}

/**
 * Hook for components to access navigation methods
 */
export function useNavigationInterceptor() {
  const navigation = useCloudStorageNavigation()
  
  return {
    navigateToFolder: navigation.navigateToPath,
    isNavigating: navigation.isNavigating,
    canGoBack: navigation.historyIndex > 0,
    canGoForward: navigation.historyIndex < navigation.navigationHistory.length - 1,
    goBack: navigation.goBack,
    goForward: navigation.goForward,
    stats: navigation.getNavigationStats()
  }
}

/**
 * Enhanced folder click handler that integrates with navigation interceptor
 * This can be used by existing components to replace their router.push calls
 */
export function useFolderNavigation(userId: string) {
  const navigation = useCloudStorageNavigation()
  const directoryCache = getDirectoryCache()
  const { toast } = useToast()
  const router = useRouter()
  
  const pathToHref = useCallback((path: string): string => {
    const base = `user_${userId}`
    if (!path || path === base) return "/dateien"
    const prefix = `${base}/`
    if (path.startsWith(prefix)) {
      const rest = path.slice(prefix.length)
      return `/dateien/${rest}`
    }
    return "/dateien"
  }, [userId])
  
  const handleFolderClick = useCallback(async (
    folderPath: string,
    options: NavigationOptions = {}
  ) => {
    try {
      // Check if we should use client-side navigation
      const shouldUseClient = folderPath.startsWith(`user_${userId}`) && 
                             !navigation.isNavigating
      
      if (shouldUseClient) {
        // Try client-side navigation first
        // The navigation store will handle URL updates automatically
        await navigation.navigateToPath(folderPath, options)
      } else {
        // Fall back to SSR navigation
        const url = pathToHref(folderPath)
        if (options.replace) {
          router.replace(url)
        } else {
          router.push(url)
        }
      }
    } catch (error) {
      console.error('Folder navigation failed:', error)
      
      // Show error and fall back to SSR
      toast({
        title: "Navigation Error",
        description: "Failed to navigate. Trying alternative method...",
        variant: "destructive"
      })
      
      const url = pathToHref(folderPath)
      router.push(url)
    }
  }, [userId, navigation, pathToHref, router, toast])
  
  return {
    handleFolderClick,
    isNavigating: navigation.isNavigating,
    pathToHref
  }
}

/**
 * Higher-order component to wrap components with navigation interception
 */
export function withNavigationInterceptor<P extends object>(
  Component: React.ComponentType<P>,
  interceptorProps?: Partial<NavigationInterceptorProps>
) {
  return function WrappedComponent(props: P & { userId: string }) {
    return (
      <NavigationInterceptor userId={props.userId} {...interceptorProps}>
        <Component {...props} />
      </NavigationInterceptor>
    )
  }
}