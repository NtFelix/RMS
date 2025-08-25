'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

interface NavigationState {
  currentPath: string
  isNavigating: boolean
  error: string | null
}

interface NavigationOptions {
  force?: boolean
  replace?: boolean
  clientOnly?: boolean
}

/**
 * Simple navigation hook for cloud storage without circular dependencies
 * 
 * This provides efficient client-side navigation that avoids full page reloads:
 * - Client-side navigation for folder changes (no page reload)
 * - URL updates without triggering Next.js router navigation
 * - Browser history management
 * - No circular dependencies with cloud storage store
 */
export function useSimpleNavigation(userId: string) {
  const router = useRouter()
  const { toast } = useToast()
  
  // Navigation state
  const [state, setState] = useState<NavigationState>({
    currentPath: '',
    isNavigating: false,
    error: null
  })
  
  // Prevent concurrent navigation attempts
  const navigationInProgress = useRef<boolean>(false)
  const lastNavigationTime = useRef<number>(0)
  
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
    
    // Debounce rapid navigation attempts
    const now = Date.now()
    if (now - lastNavigationTime.current < 100 && !options.force) {
      console.log('Debouncing navigation to:', path)
      return
    }
    
    lastNavigationTime.current = now
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
        
        // Update local state
        setState(prev => ({
          ...prev,
          currentPath: path,
          isNavigating: false,
          error: null
        }))
        
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
  }, [state.currentPath, pathToUrl, router, toast])
  
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
        
        // Update state immediately
        setState(prev => ({
          ...prev,
          currentPath: event.state.path,
          error: null
        }))
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
    setCurrentPath,
    clearError,
    
    // Utilities
    pathToUrl,
    isNavigationInProgress: () => navigationInProgress.current
  }
}