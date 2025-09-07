'use client'

import { useState, useEffect } from 'react'

export type OrientationType = 'portrait' | 'landscape'

export interface OrientationState {
  orientation: OrientationType
  isChanging: boolean
  angle: number
}

/**
 * Hook for detecting and handling device orientation changes
 * Provides orientation state and change detection for mobile layouts
 */
export function useOrientation() {
  const [orientationState, setOrientationState] = useState<OrientationState>({
    orientation: 'portrait',
    isChanging: false,
    angle: 0
  })

  useEffect(() => {
    // Function to determine orientation based on screen dimensions
    const getOrientation = (): OrientationType => {
      if (typeof window === 'undefined') return 'portrait'
      
      // Use screen dimensions for more reliable detection
      const { innerWidth, innerHeight } = window
      return innerWidth > innerHeight ? 'landscape' : 'portrait'
    }

    // Function to get screen orientation angle
    const getOrientationAngle = (): number => {
      if (typeof window === 'undefined') return 0
      
      // Try to get orientation angle from screen API
      if (screen?.orientation?.angle !== undefined) {
        return screen.orientation.angle
      }
      
      // Fallback to deprecated orientationchange event
      if (window.orientation !== undefined) {
        return Math.abs(window.orientation as number)
      }
      
      return 0
    }

    // Update orientation state
    const updateOrientation = () => {
      const newOrientation = getOrientation()
      const newAngle = getOrientationAngle()
      
      setOrientationState(prev => ({
        orientation: newOrientation,
        isChanging: prev.orientation !== newOrientation,
        angle: newAngle
      }))
    }

    // Handle orientation change with debouncing
    let orientationTimeout: NodeJS.Timeout
    
    const handleOrientationChange = () => {
      // Set changing state immediately
      setOrientationState(prev => ({
        ...prev,
        isChanging: true
      }))

      // Clear existing timeout
      if (orientationTimeout) {
        clearTimeout(orientationTimeout)
      }

      // Debounce the orientation update to handle rapid changes
      orientationTimeout = setTimeout(() => {
        updateOrientation()
        
        // Reset changing state after a brief delay
        setTimeout(() => {
          setOrientationState(prev => ({
            ...prev,
            isChanging: false
          }))
        }, 150)
      }, 100)
    }

    // Handle resize events (more reliable than orientationchange)
    const handleResize = () => {
      handleOrientationChange()
    }

    // Initial orientation detection
    updateOrientation()

    // Add event listeners
    window.addEventListener('resize', handleResize)
    
    // Also listen to orientationchange for better support
    if ('onorientationchange' in window) {
      window.addEventListener('orientationchange', handleOrientationChange)
    }

    // Modern orientation API support
    if (screen?.orientation) {
      screen.orientation.addEventListener('change', handleOrientationChange)
    }

    // Cleanup function
    return () => {
      if (orientationTimeout) {
        clearTimeout(orientationTimeout)
      }
      
      window.removeEventListener('resize', handleResize)
      
      if ('onorientationchange' in window) {
        window.removeEventListener('orientationchange', handleOrientationChange)
      }
      
      if (screen?.orientation) {
        screen.orientation.removeEventListener('change', handleOrientationChange)
      }
    }
  }, [])

  return orientationState
}

/**
 * Hook for orientation-aware mobile detection
 * Combines mobile detection with orientation awareness
 */
export function useOrientationAwareMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined)
  const orientationState = useOrientation()

  useEffect(() => {
    const MOBILE_BREAKPOINT = 768
    
    const updateMobileState = () => {
      const { innerWidth, innerHeight } = window
      
      // In landscape mode, use height as the primary dimension for mobile detection
      // This prevents tablets in landscape from being treated as desktop
      const primaryDimension = orientationState.orientation === 'landscape' 
        ? Math.min(innerWidth, innerHeight)
        : innerWidth
      
      setIsMobile(primaryDimension < MOBILE_BREAKPOINT)
    }

    // Update mobile state when orientation changes
    updateMobileState()

    // Also listen to resize events
    const handleResize = () => {
      updateMobileState()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [orientationState.orientation])

  return {
    isMobile: !!isMobile,
    ...orientationState
  }
}