'use client'

import React, { useRef, useEffect } from 'react'
import { useBulkOperations } from '@/context/bulk-operations-context'
import { useBulkOperationsKeyboardNavigation } from '@/hooks/use-bulk-operations-keyboard-navigation'
import { 
  ARIA_LABELS, 
  SCREEN_READER_ANNOUNCEMENTS,
  announceToScreenReader 
} from '@/lib/accessibility-constants'

interface AccessibleBulkOperationsWrapperProps {
  children: React.ReactNode
  tableType?: string
  allIds?: string[]
  className?: string
  /**
   * Whether to announce selection changes
   */
  announceSelectionChanges?: boolean
  /**
   * Custom aria-label for the table region
   */
  ariaLabel?: string
}

/**
 * Wrapper component that adds accessibility features to bulk operations tables
 */
export function AccessibleBulkOperationsWrapper({
  children,
  tableType = 'Tabelle',
  allIds = [],
  className,
  announceSelectionChanges = true,
  ariaLabel
}: AccessibleBulkOperationsWrapperProps) {
  const { state } = useBulkOperations()
  const containerRef = useRef<HTMLDivElement>(null)
  const previousSelectionCountRef = useRef(0)

  // Set up keyboard navigation
  const { isKeyboardNavigationEnabled } = useBulkOperationsKeyboardNavigation({
    enabled: true,
    containerRef: containerRef as React.RefObject<HTMLElement | null>,
    allIds
  })

  // Announce selection changes to screen readers
  useEffect(() => {
    if (!announceSelectionChanges) return

    const currentSelectionCount = state.selectedIds.size
    const previousSelectionCount = previousSelectionCountRef.current

    // Only announce if the selection count actually changed
    if (currentSelectionCount !== previousSelectionCount) {
      if (currentSelectionCount === 0 && previousSelectionCount > 0) {
        // All selections cleared
        announceToScreenReader(SCREEN_READER_ANNOUNCEMENTS.selectionCleared, 'polite')
      } else if (currentSelectionCount > 0) {
        // Selection count changed
        const message = `${currentSelectionCount} ${currentSelectionCount === 1 ? 'Element' : 'Elemente'} ausgewählt`
        announceToScreenReader(message, 'polite')
      }

      previousSelectionCountRef.current = currentSelectionCount
    }
  }, [state.selectedIds.size, announceSelectionChanges])

  // Generate accessible label for the table region
  const tableAriaLabel = ariaLabel || `${tableType} mit Bulk-Operationen`

  return (
    <div
      ref={containerRef}
      className={className}
      role="region"
      aria-label={tableAriaLabel}
      aria-describedby="bulk-operations-instructions"
      data-bulk-operations-table
    >
      {/* Screen reader instructions */}
      <div 
        id="bulk-operations-instructions"
        className="sr-only"
        aria-live="polite"
      >
        {isKeyboardNavigationEnabled && (
          <>
            Verwenden Sie die Leertaste zum Auswählen von Zeilen. 
            Drücken Sie Escape zum Aufheben aller Auswahlen. 
            Verwenden Sie Strg+A zum Auswählen aller Zeilen. 
            Navigieren Sie mit Tab zwischen den Steuerelementen.
          </>
        )}
      </div>

      {/* Live region for selection announcements */}
      <div 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {state.selectedIds.size > 0 && (
          `${state.selectedIds.size} ${state.selectedIds.size === 1 ? 'Element' : 'Elemente'} ausgewählt`
        )}
      </div>

      {/* Error announcements */}
      {state.error && (
        <div 
          aria-live="assertive" 
          aria-atomic="true"
          className="sr-only"
          role="alert"
        >
          Fehler bei Bulk-Operation: {state.error}
        </div>
      )}

      {/* Loading announcements */}
      {state.isLoading && (
        <div 
          aria-live="polite" 
          aria-atomic="true"
          className="sr-only"
          role="status"
        >
          {ARIA_LABELS.bulkOperationProgress}
        </div>
      )}

      {children}
    </div>
  )
}

/**
 * Higher-order component that wraps a table component with accessibility features
 */
export function withAccessibleBulkOperations<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: {
    tableType?: string
    getAriaLabel?: (props: P) => string
    getAllIds?: (props: P) => string[]
  } = {}
) {
  const AccessibleComponent = (props: P) => {
    const { tableType = 'Tabelle', getAriaLabel, getAllIds } = options
    
    const ariaLabel = getAriaLabel ? getAriaLabel(props) : undefined
    const allIds = getAllIds ? getAllIds(props) : []

    return (
      <AccessibleBulkOperationsWrapper
        tableType={tableType}
        ariaLabel={ariaLabel}
        allIds={allIds}
      >
        <WrappedComponent {...props} />
      </AccessibleBulkOperationsWrapper>
    )
  }

  AccessibleComponent.displayName = `withAccessibleBulkOperations(${WrappedComponent.displayName || WrappedComponent.name})`

  return AccessibleComponent
}