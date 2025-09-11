'use client'

import React, { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface ScreenReaderOnlyProps {
  children: React.ReactNode
  className?: string
}

/**
 * Content that is only visible to screen readers
 */
export function ScreenReaderOnly({ children, className }: ScreenReaderOnlyProps) {
  return (
    <span
      className={cn(
        'sr-only absolute -m-px h-px w-px overflow-hidden whitespace-nowrap border-0 p-0',
        className
      )}
    >
      {children}
    </span>
  )
}

interface LiveRegionProps {
  children: React.ReactNode
  politeness?: 'polite' | 'assertive' | 'off'
  atomic?: boolean
  relevant?: 'additions' | 'removals' | 'text' | 'all'
  className?: string
}

/**
 * ARIA live region for announcing dynamic content changes
 */
export function LiveRegion({
  children,
  politeness = 'polite',
  atomic = false,
  relevant = 'all',
  className
}: LiveRegionProps) {
  return (
    <div
      aria-live={politeness}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className={cn('sr-only', className)}
    >
      {children}
    </div>
  )
}

interface ValidationAnnouncerProps {
  errors: string[]
  warnings: string[]
  fieldName: string
}

/**
 * Announces validation changes to screen readers
 */
export function ValidationAnnouncer({ errors, warnings, fieldName }: ValidationAnnouncerProps) {
  const [announcement, setAnnouncement] = useState('')
  const previousErrorsRef = useRef<string[]>([])
  const previousWarningsRef = useRef<string[]>([])

  useEffect(() => {
    const previousErrors = previousErrorsRef.current
    const previousWarnings = previousWarningsRef.current

    // Check for new errors
    const newErrors = errors.filter(error => !previousErrors.includes(error))
    const newWarnings = warnings.filter(warning => !previousWarnings.includes(warning))

    if (newErrors.length > 0 || newWarnings.length > 0) {
      let message = `${fieldName}: `
      
      if (newErrors.length > 0) {
        message += `${newErrors.length} neue Fehler. ${newErrors.join('. ')}`
      }
      
      if (newWarnings.length > 0) {
        if (newErrors.length > 0) message += '. '
        message += `${newWarnings.length} neue Warnungen. ${newWarnings.join('. ')}`
      }

      setAnnouncement(message)
      
      // Clear announcement after a delay to allow for re-announcements
      setTimeout(() => setAnnouncement(''), 100)
    }

    // Check if errors/warnings were resolved
    if (previousErrors.length > 0 && errors.length === 0) {
      setAnnouncement(`${fieldName}: Alle Fehler behoben`)
      setTimeout(() => setAnnouncement(''), 100)
    }

    previousErrorsRef.current = errors
    previousWarningsRef.current = warnings
  }, [errors, warnings, fieldName])

  return (
    <LiveRegion politeness="assertive">
      {announcement}
    </LiveRegion>
  )
}

interface KeyboardNavigationProps {
  children: React.ReactNode
  onKeyDown?: (event: React.KeyboardEvent) => void
  trapFocus?: boolean
  restoreFocus?: boolean
  className?: string
}

/**
 * Enhanced keyboard navigation wrapper
 */
export function KeyboardNavigation({
  children,
  onKeyDown,
  trapFocus = false,
  restoreFocus = false,
  className
}: KeyboardNavigationProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousActiveElementRef = useRef<Element | null>(null)

  useEffect(() => {
    if (restoreFocus) {
      previousActiveElementRef.current = document.activeElement
    }

    return () => {
      if (restoreFocus && previousActiveElementRef.current) {
        (previousActiveElementRef.current as HTMLElement).focus?.()
      }
    }
  }, [restoreFocus])

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (trapFocus && event.key === 'Tab') {
      const container = containerRef.current
      if (!container) return

      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      
      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }

    onKeyDown?.(event)
  }

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className={className}
    >
      {children}
    </div>
  )
}

interface SkipLinkProps {
  href: string
  children: React.ReactNode
  className?: string
}

/**
 * Skip link for keyboard navigation
 */
export function SkipLink({ href, children, className }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50',
        'bg-primary text-primary-foreground px-4 py-2 rounded-md',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        className
      )}
    >
      {children}
    </a>
  )
}

interface FormFieldProps {
  children: React.ReactNode
  label: string
  description?: string
  error?: string
  warning?: string
  required?: boolean
  fieldId: string
  className?: string
}

/**
 * Accessible form field wrapper with proper ARIA attributes
 */
export function AccessibleFormField({
  children,
  label,
  description,
  error,
  warning,
  required = false,
  fieldId,
  className
}: FormFieldProps) {
  const descriptionId = description ? `${fieldId}-description` : undefined
  const errorId = error ? `${fieldId}-error` : undefined
  const warningId = warning ? `${fieldId}-warning` : undefined

  const describedBy = [descriptionId, errorId, warningId]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={cn('space-y-2', className)}>
      <label
        htmlFor={fieldId}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {label}
        {required && (
          <span className="text-destructive ml-1" aria-label="erforderlich">
            *
          </span>
        )}
      </label>

      {description && (
        <p
          id={descriptionId}
          className="text-sm text-muted-foreground"
        >
          {description}
        </p>
      )}

      <div className="relative">
        {React.cloneElement(children as React.ReactElement, {
          id: fieldId,
          'aria-describedby': describedBy || undefined,
          'aria-invalid': error ? 'true' : 'false',
          'aria-required': required
        })}
      </div>

      {error && (
        <p
          id={errorId}
          className="text-sm text-destructive"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}

      {warning && !error && (
        <p
          id={warningId}
          className="text-sm text-yellow-600 dark:text-yellow-400"
          role="alert"
          aria-live="polite"
        >
          {warning}
        </p>
      )}

      <ValidationAnnouncer
        errors={error ? [error] : []}
        warnings={warning ? [warning] : []}
        fieldName={label}
      />
    </div>
  )
}

interface ProgressIndicatorProps {
  value: number
  max?: number
  label: string
  description?: string
  className?: string
}

/**
 * Accessible progress indicator
 */
export function AccessibleProgressIndicator({
  value,
  max = 100,
  label,
  description,
  className
}: ProgressIndicatorProps) {
  const percentage = Math.round((value / max) * 100)

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">{percentage}%</span>
      </div>
      
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
        aria-describedby={description ? `${label}-description` : undefined}
        className="w-full bg-secondary rounded-full h-2"
      >
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {description && (
        <p
          id={`${label}-description`}
          className="text-xs text-muted-foreground"
        >
          {description}
        </p>
      )}
      
      <ScreenReaderOnly>
        {label}: {percentage} Prozent abgeschlossen
      </ScreenReaderOnly>
    </div>
  )
}

interface StatusAnnouncerProps {
  status: 'idle' | 'loading' | 'success' | 'error'
  message?: string
  operation?: string
}

/**
 * Announces status changes for operations
 */
export function StatusAnnouncer({ status, message, operation = 'Operation' }: StatusAnnouncerProps) {
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    let newAnnouncement = ''

    switch (status) {
      case 'loading':
        newAnnouncement = `${operation} wird ausgeführt...`
        break
      case 'success':
        newAnnouncement = message || `${operation} erfolgreich abgeschlossen`
        break
      case 'error':
        newAnnouncement = message || `${operation} fehlgeschlagen`
        break
      case 'idle':
        newAnnouncement = ''
        break
    }

    setAnnouncement(newAnnouncement)
  }, [status, message, operation])

  return (
    <LiveRegion politeness={status === 'error' ? 'assertive' : 'polite'}>
      {announcement}
    </LiveRegion>
  )
}

interface ExpandableContentProps {
  children: React.ReactNode
  summary: string
  expanded?: boolean
  onToggle?: (expanded: boolean) => void
  className?: string
}

/**
 * Accessible expandable content using details/summary
 */
export function AccessibleExpandableContent({
  children,
  summary,
  expanded = false,
  onToggle,
  className
}: ExpandableContentProps) {
  const [isExpanded, setIsExpanded] = useState(expanded)

  const handleToggle = () => {
    const newExpanded = !isExpanded
    setIsExpanded(newExpanded)
    onToggle?.(newExpanded)
  }

  return (
    <details
      open={isExpanded}
      onToggle={handleToggle}
      className={cn('group', className)}
    >
      <summary
        className="cursor-pointer list-none flex items-center justify-between p-2 rounded hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        aria-expanded={isExpanded}
      >
        <span>{summary}</span>
        <span
          className="transition-transform duration-200 group-open:rotate-180"
          aria-hidden="true"
        >
          ▼
        </span>
      </summary>
      <div className="mt-2 p-2">
        {children}
      </div>
    </details>
  )
}

interface FocusManagerProps {
  children: React.ReactNode
  autoFocus?: boolean
  restoreFocus?: boolean
  className?: string
}

/**
 * Manages focus for modal dialogs and complex components
 */
export function FocusManager({
  children,
  autoFocus = false,
  restoreFocus = false,
  className
}: FocusManagerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousActiveElementRef = useRef<Element | null>(null)

  useEffect(() => {
    if (restoreFocus) {
      previousActiveElementRef.current = document.activeElement
    }

    if (autoFocus && containerRef.current) {
      const firstFocusable = containerRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement
      
      if (firstFocusable) {
        firstFocusable.focus()
      }
    }

    return () => {
      if (restoreFocus && previousActiveElementRef.current) {
        (previousActiveElementRef.current as HTMLElement).focus?.()
      }
    }
  }, [autoFocus, restoreFocus])

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  )
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

/**
 * Accessible error boundary with screen reader announcements
 */
export class AccessibleErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  { hasError: boolean; error?: Error }
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="p-4 border border-destructive rounded-md bg-destructive/10"
        >
          {this.props.fallback || (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-destructive">
                Ein Fehler ist aufgetreten
              </h2>
              <p className="text-sm text-muted-foreground">
                Die Anwendung konnte nicht ordnungsgemäß geladen werden.
                Bitte laden Sie die Seite neu oder kontaktieren Sie den Support.
              </p>
              <ScreenReaderOnly>
                Fehlerdetails: {this.state.error?.message}
              </ScreenReaderOnly>
            </div>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

interface TableProps {
  children: React.ReactNode
  caption?: string
  className?: string
}

/**
 * Accessible table wrapper with proper ARIA attributes
 */
export function AccessibleTable({ children, caption, className }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table
        className={cn('w-full border-collapse', className)}
        role="table"
      >
        {caption && (
          <caption className="sr-only">
            {caption}
          </caption>
        )}
        {children}
      </table>
    </div>
  )
}

// Export all accessibility utilities
export {
  ScreenReaderOnly,
  LiveRegion,
  ValidationAnnouncer,
  KeyboardNavigation,
  SkipLink,
  AccessibleFormField,
  AccessibleProgressIndicator,
  StatusAnnouncer,
  AccessibleExpandableContent,
  FocusManager,
  AccessibleErrorBoundary,
  AccessibleTable
}