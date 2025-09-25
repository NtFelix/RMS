'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useBulkOperations } from '@/context/bulk-operations-context'
import { 
  KEYBOARD_SHORTCUTS, 
  SCREEN_READER_ANNOUNCEMENTS,
  announceToScreenReader,
  findFocusableElement,
  manageFocus
} from '@/lib/accessibility-constants'

interface UseBulkOperationsKeyboardNavigationOptions {
  /**
   * Whether keyboard navigation is enabled
   */
  enabled?: boolean
  
  /**
   * Container element for focus management
   */
  containerRef?: React.RefObject<HTMLElement | null>
  
  /**
   * Callback when Escape key is pressed
   */
  onEscape?: () => void
  
  /**
   * Callback when Ctrl+A is pressed
   */
  onSelectAll?: (allIds: string[]) => void
  
  /**
   * All available IDs for select all functionality
   */
  allIds?: string[]
}

/**
 * Custom hook for keyboard navigation in bulk operations
 */
export function useBulkOperationsKeyboardNavigation({
  enabled = true,
  containerRef,
  onEscape,
  onSelectAll,
  allIds = []
}: UseBulkOperationsKeyboardNavigationOptions = {}) {
  const { state, clearSelection, selectAll } = useBulkOperations()
  const lastFocusedElementRef = useRef<HTMLElement | null>(null)

  // Handle global keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    // Don't handle shortcuts when user is typing in an input
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return
    }

    switch (event.key) {
      case 'Escape':
        if (state.selectedIds.size > 0) {
          event.preventDefault()
          clearSelection()
          announceToScreenReader(SCREEN_READER_ANNOUNCEMENTS.selectionCleared, 'polite')
          
          if (onEscape) {
            onEscape()
          }
        }
        break

      case 'a':
      case 'A':
        if (event.ctrlKey || event.metaKey) {
          if (allIds.length > 0) {
            event.preventDefault()
            
            if (onSelectAll) {
              onSelectAll(allIds)
            } else {
              selectAll(allIds)
            }
            
            announceToScreenReader(
              SCREEN_READER_ANNOUNCEMENTS.allRowsSelected(allIds.length),
              'polite'
            )
          }
        }
        break

      case 'Tab':
        // Enhanced tab navigation within bulk operations
        if (containerRef?.current && state.selectedIds.size > 0) {
          const container = containerRef.current
          const focusableElements = container.querySelectorAll(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
          
          if (focusableElements.length > 0) {
            const currentIndex = Array.from(focusableElements).indexOf(document.activeElement as HTMLElement)
            
            if (event.shiftKey) {
              // Shift+Tab - go to previous element
              if (currentIndex <= 0) {
                event.preventDefault()
                manageFocus(focusableElements[focusableElements.length - 1] as HTMLElement)
              }
            } else {
              // Tab - go to next element
              if (currentIndex >= focusableElements.length - 1) {
                event.preventDefault()
                manageFocus(focusableElements[0] as HTMLElement)
              }
            }
          }
        }
        break

      case 'ArrowUp':
      case 'ArrowDown':
        // Navigate between table rows when bulk operations are active
        if (containerRef?.current && state.selectedIds.size > 0) {
          const container = containerRef.current
          const currentElement = document.activeElement as HTMLElement
          
          if (currentElement && container.contains(currentElement)) {
            event.preventDefault()
            
            const direction = event.key === 'ArrowUp' ? 'previous' : 'next'
            const nextElement = findFocusableElement(container, direction, currentElement)
            
            if (nextElement) {
              manageFocus(nextElement)
            }
          }
        }
        break

      case 'Home':
        // Go to first focusable element
        if (containerRef?.current && state.selectedIds.size > 0) {
          event.preventDefault()
          const container = containerRef.current
          const firstElement = findFocusableElement(container, 'next')
          
          if (firstElement) {
            manageFocus(firstElement)
          }
        }
        break

      case 'End':
        // Go to last focusable element
        if (containerRef?.current && state.selectedIds.size > 0) {
          event.preventDefault()
          const container = containerRef.current
          const lastElement = findFocusableElement(container, 'previous')
          
          if (lastElement) {
            manageFocus(lastElement)
          }
        }
        break
    }
  }, [enabled, state.selectedIds, clearSelection, selectAll, onEscape, onSelectAll, allIds, containerRef])

  // Handle checkbox-specific keyboard navigation
  const handleCheckboxKeyDown = useCallback((event: KeyboardEvent, rowId: string, selectRowCallback: (id: string) => void) => {
    if (!enabled) return

    if (event.key === ' ') {
      event.preventDefault()
      event.stopPropagation()
      selectRowCallback(rowId)
    }
  }, [enabled])

  // Focus management for bulk action bar
  const focusBulkActionBar = useCallback(() => {
    if (!enabled || state.selectedIds.size === 0) return

    const bulkActionBar = document.querySelector('[data-bulk-action-bar]') as HTMLElement
    if (bulkActionBar) {
      // Store the currently focused element
      lastFocusedElementRef.current = document.activeElement as HTMLElement
      
      // Focus the first focusable element in the bulk action bar
      const firstFocusable = findFocusableElement(bulkActionBar, 'next')
      if (firstFocusable) {
        manageFocus(firstFocusable)
      }
    }
  }, [enabled, state.selectedIds.size])

  // Restore focus when bulk operations are cleared
  const restoreFocus = useCallback(() => {
    if (lastFocusedElementRef.current) {
      manageFocus(lastFocusedElementRef.current)
      lastFocusedElementRef.current = null
    }
  }, [])

  // Set up global keyboard event listeners
  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, handleKeyDown])

  // Auto-focus bulk action bar when selections are made
  useEffect(() => {
    if (state.selectedIds.size > 0) {
      // Small delay to ensure the bulk action bar is rendered
      const timeoutId = setTimeout(() => {
        focusBulkActionBar()
      }, 100)
      
      return () => clearTimeout(timeoutId)
    } else {
      // Restore focus when selections are cleared
      restoreFocus()
    }
  }, [state.selectedIds.size, focusBulkActionBar, restoreFocus])

  return {
    handleCheckboxKeyDown,
    focusBulkActionBar,
    restoreFocus,
    isKeyboardNavigationEnabled: enabled
  }
}