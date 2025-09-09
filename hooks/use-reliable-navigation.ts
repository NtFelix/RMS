'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { useCloudStorageStore } from './use-cloud-storage-store'

interface NavigationState {
  currentPath: string
  isNavigating: boolean
  error: string | null
}

interface NavigationOptions {
  force?: boolean
  replace?: boolean
  skipCache?: boolean
  clientOnly?: boolean // New option for client-side only navigation
}

/**
 * Efficient navigation hook for cloud storage
 * 
 * This provides efficient client-side navigation that avoids full page reloads:
 * - Client-side navigation for folder changes (no page reload)
 * - URL updates without triggering Next.js router navigation
 * - Browser history management
 * - Proper error handling and recovery
 * - Debouncing to prevent rapid navigation attempts
 */
export function useReliableNavigation(userId: string) {
  const router = useRouter()
  const { toast } = useToast()
  const cloudStorageStore = useCloudStorageStore()
  
  // Navigation state
  const [state, setState] = useState<NavigationState>({
    currentPath: '',
    isNavigating: false,
    error: null
  })
  
  // Prevent concurrent navigation attempts
  const navigationInProgress = useRef<boolean>(false)
  const lastNavigationPath = useRef<string>('')
  const lastNavigationTime = useRef<number>(0)
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)
  
  /**
   * Convert storage path to URL path
   */
  const pathToUrl = useCallback((path: string): string => {
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
   * Check if navigation should be debounced
   */
  const shouldDebounce = useCallback((path: string): boolean => {
    const now = Date.now()
    const timeSinceLastNav = now - lastNavigationTime.current
    const isSamePath = path === lastNavigationPath.current
    
    // Debounce if same path within 500ms or any navigation within 150ms
    return (isSamePath && timeSinceLastNav < 500) || timeSinceLastNav < 150
  }, [])
  
  /**
   * Perform efficient navigation with proper error handling
   */
  const navigate = useCallback(async (path: string, options: NavigationOptions = {}) => {
    // Prevent concurrent navigation
    if (navigationInProgress.current && !options.force) {
      console.log('Navigation already in progress, skipping:', path)
      return
    }
    
    // Prevent navigation to same path unless forced
    if (path === state.currentPath && !options.force) {
      console.log('Already at target path:', path)
      return
    }
    
    // Clear any existing debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
      debounceTimer.current = null
    }
    
    // Check if we should debounce this navigation
    if (shouldDebounce(path) && !options.force) {
      console.log('Debouncing navigation to:', path)
      debounceTimer.current = setTimeout(() => {
        navigate(path, options)
      }, 200)
      return
    }
    
    // Update navigation tracking
    lastNavigationPath.current = path
    lastNavigationTime.current = Date.now()
    navigationInProgress.current = true
    
    // Set loading state
    setState(prev => ({
      ...prev,
      isNavigating: true,
      error: null
    }))
    
    try {
      const url = pathToUrl(path)
      
      // Use client-side navigation by default for efficiency
      if (options.clientOnly !== false) {
        // Update browser URL without triggering Next.js navigation
        const currentUrl = window.location.pathname + window.location.search
        if (url !== currentUrl) {
          if (options.replace) {
            window.history.replaceState({ path, clientNavigation: true }, '', url)
          } else {
            window.history.pushState({ path, clientNavigation: true }, '', url)
          }
        }
        
        // Update local state first
        setState(prev => ({
          ...prev,
          currentPath: path,
          isNavigating: false,
          error: null
        }))
        
        // Trigger cloud storage store update separately to avoid circular dependency
        setTimeout(async () => {
          try {
            await cloudStorageStore.navigateToPath(path);
          } catch (error) {
            console.error('Failed to load path data:', error);
            setState(prev => ({
              ...prev,
              error: error instanceof Error ? error.message : 'Failed to load directory'
            }));
          }
        }, 0)
        
        console.log('Client-side navigation successful:', path, '→', url)
      } else {
        // Fallback to Next.js router navigation (full page reload)
        if (options.replace) {
          router.replace(url)
        } else {
          router.push(url)
        }
        
        // State will be updated by the new page load
        setState(prev => ({
          ...prev,
          currentPath: path,
          isNavigating: false,
          error: null
        }))
        
        console.log('Server-side navigation successful:', path, '→', url)
      }
      
    } catch (error) {
      console.error('Navigation failed:', error)
      
      setState(prev => ({
        ...prev,
        isNavigating: false,
        error: error instanceof Error ? error.message : 'Navigation failed'
      }))
      
      // If client-side navigation failed, try server-side as fallback
      if (options.clientOnly !== false) {
        console.log('Client-side navigation failed, falling back to server-side')
        try {
          const url = pathToUrl(path)
          router.push(url)
        } catch (fallbackError) {
          toast({
            title: "Navigation Error",
            description: "Failed to navigate to directory. Please try again.",
            variant: "destructive"
          })
        }
      } else {
        toast({
          title: "Navigation Error",
          description: "Failed to navigate to directory. Please try again.",
          variant: "destructive"
        })
      }
    } finally {
      navigationInProgress.current = false
    }
  }, [state.currentPath, pathToUrl, router, shouldDebounce, toast])
  
  /**
   * Navigate to parent directory
   */
  const navigateUp = useCallback(() => {
    if (!state.currentPath) return
    
    const segments = state.currentPath.split('/').filter(Boolean)
    if (segments.length > 1) {
      const parentPath = segments.slice(0, -1).join('/')
      navigate(parentPath)
    }
  }, [state.currentPath, navigate])
  
  /**
   * Refresh current path
   */
  const refresh = useCallback(() => {
    if (state.currentPath) {
      navigate(state.currentPath, { force: true })
    }
  }, [state.currentPath, navigate])
  
  /**
   * Set current path (for initialization)
   */
  const setCurrentPath = useCallback((path: string) => {
    setState(prev => ({
      ...prev,
      currentPath: path
    }))
  }, [])
  
  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }))
  }, [])
  
  /**
   * Handle browser back/forward navigation
   */
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.clientNavigation && event.state?.path) {
        // This was a client-side navigation, handle it with client-side routing
        console.log('Handling browser navigation to:', event.state.path)
        
        // Update state immediately to prevent UI flicker
        setState(prev => ({
          ...prev,
          currentPath: event.state.path,
          isNavigating: true,
          error: null
        }))
        
        // Load the path data asynchronously to avoid circular dependency
        setTimeout(async () => {
          try {
            await cloudStorageStore.navigateToPath(event.state.path);
            setState(prev => ({
              ...prev,
              isNavigating: false
            }));
          } catch (error) {
            console.error('Browser navigation failed:', error);
            setState(prev => ({
              ...prev,
              isNavigating: false,
              error: error instanceof Error ? error.message : 'Navigation failed'
            }));
          }
        }, 0)
      }
      // If not a client navigation, let Next.js handle it normally
    }
    
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])
  
  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
      navigationInProgress.current = false
    }
  }, [])
  
  return {
    // State
    currentPath: state.currentPath,
    isNavigating: state.isNavigating,
    error: state.error,
    
    // Actions
    navigate,
    navigateUp,
    refresh,
    setCurrentPath,
    clearError,
    
    // Utilities
    pathToUrl,
    isNavigationInProgress: () => navigationInProgress.current
  }
}