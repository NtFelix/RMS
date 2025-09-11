"use client"

import { useEffect, useRef } from 'react'

interface UseFocusTrapOptions {
  isActive: boolean
  initialFocusRef?: React.RefObject<HTMLElement>
  restoreFocusRef?: React.RefObject<HTMLElement>
}

/**
 * Custom hook for managing focus trapping within a modal or dialog
 * Ensures keyboard navigation stays within the modal when active
 */
export function useFocusTrap({ 
  isActive, 
  initialFocusRef, 
  restoreFocusRef 
}: UseFocusTrapOptions) {
  const containerRef = useRef<HTMLElement>(null)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isActive) return

    // Store the currently focused element to restore later
    previousActiveElementRef.current = document.activeElement as HTMLElement

    // Get all focusable elements within the container
    const getFocusableElements = (): HTMLElement[] => {
      if (!containerRef.current) return []

      const focusableSelectors = [
        'button:not([disabled])',
        'input:not([disabled])',
        'textarea:not([disabled])',
        'select:not([disabled])',
        'a[href]',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]'
      ].join(', ')

      return Array.from(
        containerRef.current.querySelectorAll(focusableSelectors)
      ) as HTMLElement[]
    }

    // Handle Tab key navigation
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      const currentElement = document.activeElement as HTMLElement

      if (event.shiftKey) {
        // Shift + Tab: moving backwards
        if (currentElement === firstElement || !focusableElements.includes(currentElement)) {
          event.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab: moving forwards
        if (currentElement === lastElement || !focusableElements.includes(currentElement)) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }

    // Set initial focus
    const setInitialFocus = () => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus()
      } else {
        const focusableElements = getFocusableElements()
        if (focusableElements.length > 0) {
          focusableElements[0].focus()
        }
      }
    }

    // Add event listener and set initial focus
    document.addEventListener('keydown', handleKeyDown)
    
    // Use setTimeout to ensure DOM is ready
    setTimeout(setInitialFocus, 0)

    // Cleanup function
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      
      // Restore focus to the previously focused element
      if (restoreFocusRef?.current) {
        restoreFocusRef.current.focus()
      } else if (previousActiveElementRef.current) {
        previousActiveElementRef.current.focus()
      }
    }
  }, [isActive, initialFocusRef, restoreFocusRef])

  return containerRef
}

/**
 * Hook for managing focus announcements for screen readers
 */
export function useFocusAnnouncement() {
  const announcementRef = useRef<HTMLDivElement>(null)

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announcementRef.current) return

    // Clear previous announcement
    announcementRef.current.textContent = ''
    announcementRef.current.setAttribute('aria-live', priority)
    
    // Set new announcement after a brief delay to ensure screen readers pick it up
    setTimeout(() => {
      if (announcementRef.current) {
        announcementRef.current.textContent = message
      }
    }, 100)
  }

  const AnnouncementRegion = () => (
    <div
      ref={announcementRef}
      className="sr-only"
      aria-live="polite"
      aria-atomic="true"
      role="status"
    />
  )

  return { announce, AnnouncementRegion }
}

/**
 * Hook for managing high contrast mode detection and support
 */
export function useHighContrastMode() {
  const isHighContrast = useRef(false)

  useEffect(() => {
    // Check for high contrast mode using media queries
    const checkHighContrast = () => {
      // Windows High Contrast Mode detection
      const windowsHighContrast = window.matchMedia('(prefers-contrast: high)').matches ||
        window.matchMedia('(-ms-high-contrast: active)').matches ||
        window.matchMedia('(-ms-high-contrast: black-on-white)').matches ||
        window.matchMedia('(-ms-high-contrast: white-on-black)').matches

      // macOS Increase Contrast detection
      const macOSHighContrast = window.matchMedia('(prefers-contrast: high)').matches

      isHighContrast.current = windowsHighContrast || macOSHighContrast

      // Add class to document for CSS targeting
      if (isHighContrast.current) {
        document.documentElement.classList.add('high-contrast')
      } else {
        document.documentElement.classList.remove('high-contrast')
      }
    }

    // Initial check
    checkHighContrast()

    // Listen for changes
    const mediaQueries = [
      window.matchMedia('(prefers-contrast: high)'),
      window.matchMedia('(-ms-high-contrast: active)'),
      window.matchMedia('(-ms-high-contrast: black-on-white)'),
      window.matchMedia('(-ms-high-contrast: white-on-black)')
    ]

    mediaQueries.forEach(mq => {
      if (mq.addEventListener) {
        mq.addEventListener('change', checkHighContrast)
      } else {
        // Fallback for older browsers
        mq.addListener(checkHighContrast)
      }
    })

    return () => {
      mediaQueries.forEach(mq => {
        if (mq.removeEventListener) {
          mq.removeEventListener('change', checkHighContrast)
        } else {
          // Fallback for older browsers
          mq.removeListener(checkHighContrast)
        }
      })
      document.documentElement.classList.remove('high-contrast')
    }
  }, [])

  return isHighContrast.current
}