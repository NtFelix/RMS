"use client"

import { useEffect, useCallback } from 'react'
import { useIsMobile } from './use-mobile'

interface MobileAccessibilityOptions {
  enableTouchFeedback?: boolean
  enableReducedMotion?: boolean
  enableLargerTouchTargets?: boolean
  announceStateChanges?: boolean
}

export function useMobileAccessibility(options: MobileAccessibilityOptions = {}) {
  const isMobile = useIsMobile()
  const {
    enableTouchFeedback = true,
    enableReducedMotion = true,
    enableLargerTouchTargets = true,
    announceStateChanges = true
  } = options

  // Add mobile-specific CSS classes to body
  useEffect(() => {
    if (!isMobile) return

    const body = document.body
    const classes = []

    if (enableLargerTouchTargets) {
      classes.push('mobile-touch-targets')
    }

    if (enableReducedMotion) {
      // Check user's motion preference
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (prefersReducedMotion) {
        classes.push('reduced-motion')
      }
    }

    // Add classes
    classes.forEach(className => body.classList.add(className))

    // Cleanup
    return () => {
      classes.forEach(className => body.classList.remove(className))
    }
  }, [isMobile, enableLargerTouchTargets, enableReducedMotion])

  // Handle touch feedback
  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (!enableTouchFeedback || !isMobile) return

    const target = event.target as HTMLElement
    if (target.matches('button, [role="button"], a, [tabindex]')) {
      target.style.transform = 'scale(0.98)'
      target.style.transition = 'transform 0.1s ease'
    }
  }, [enableTouchFeedback, isMobile])

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (!enableTouchFeedback || !isMobile) return

    const target = event.target as HTMLElement
    if (target.matches('button, [role="button"], a, [tabindex]')) {
      setTimeout(() => {
        target.style.transform = ''
        target.style.transition = ''
      }, 100)
    }
  }, [enableTouchFeedback, isMobile])

  // Add touch event listeners
  useEffect(() => {
    if (!isMobile || !enableTouchFeedback) return

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })
    document.addEventListener('touchcancel', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleTouchEnd)
      document.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [isMobile, enableTouchFeedback, handleTouchStart, handleTouchEnd])

  // Announce state changes for screen readers
  const announceToScreenReader = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announceStateChanges || !isMobile) return

    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', priority)
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = message

    document.body.appendChild(announcement)

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }, [announceStateChanges, isMobile])

  // Handle viewport changes (orientation, keyboard)
  useEffect(() => {
    if (!isMobile) return

    const handleViewportChange = () => {
      // Adjust for virtual keyboard on mobile
      const viewportHeight = window.visualViewport?.height || window.innerHeight
      const windowHeight = window.innerHeight
      const keyboardHeight = windowHeight - viewportHeight

      if (keyboardHeight > 100) {
        document.body.classList.add('keyboard-open')
        document.body.style.setProperty('--keyboard-height', `${keyboardHeight}px`)
      } else {
        document.body.classList.remove('keyboard-open')
        document.body.style.removeProperty('--keyboard-height')
      }
    }

    // Listen for viewport changes
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange)
    }

    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('orientationchange', handleViewportChange)

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange)
      }
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('orientationchange', handleViewportChange)
      
      // Cleanup
      document.body.classList.remove('keyboard-open')
      document.body.style.removeProperty('--keyboard-height')
    }
  }, [isMobile])

  return {
    isMobile,
    announceToScreenReader,
    // Utility functions for mobile-specific behavior
    addTouchClass: useCallback((element: HTMLElement) => {
      if (isMobile) {
        element.classList.add('touch-device')
      }
    }, [isMobile]),
    
    removeTouchClass: useCallback((element: HTMLElement) => {
      element.classList.remove('touch-device')
    }, []),

    // Check if device supports hover
    supportsHover: !isMobile,
    
    // Get appropriate touch target size
    getTouchTargetSize: useCallback(() => {
      return isMobile ? '44px' : '32px' // 44px is iOS recommended minimum
    }, [isMobile])
  }
}

// CSS-in-JS styles for mobile accessibility
export const mobileAccessibilityStyles = `
  .mobile-touch-targets button,
  .mobile-touch-targets [role="button"],
  .mobile-touch-targets a,
  .mobile-touch-targets [tabindex] {
    min-height: 44px;
    min-width: 44px;
  }

  .reduced-motion * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  .keyboard-open {
    height: calc(100vh - var(--keyboard-height, 0px));
  }

  .touch-device {
    -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }

  @media (hover: none) and (pointer: coarse) {
    /* Mobile-specific styles */
    .group:hover .group-hover\\:opacity-100 {
      opacity: 1 !important;
    }
    
    .hover\\:shadow-md:hover {
      box-shadow: none;
    }
  }
`