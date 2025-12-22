"use client"

import React, { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StorageError, ErrorSeverity, errorLogger } from '@/lib/storage-error-handling'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: StorageError) => void
}

interface State {
  hasError: boolean
  error: StorageError | null
  errorId: string | null
}

/**
 * Error boundary component for cloud storage operations
 * Catches JavaScript errors anywhere in the child component tree and displays a fallback UI
 */
export class StorageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    // Map the error to a StorageError
    const storageError: StorageError = {
      type: 'UNKNOWN_ERROR' as any,
      severity: ErrorSeverity.HIGH,
      message: error.message,
      userMessage: 'Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu.',
      timestamp: new Date(),
      operation: 'component_render',
      retryable: true,
      details: {
        name: error.name,
        stack: error.stack,
      },
    }

    // Generate unique error ID for tracking
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return {
      hasError: true,
      error: storageError,
      errorId,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error
    if (this.state.error) {
      errorLogger.log({
        ...this.state.error,
        details: {
          ...this.state.error.details,
          componentStack: errorInfo.componentStack,
          errorBoundary: true,
        },
      })
    }

    // Call the onError callback if provided
    if (this.props.onError && this.state.error) {
      this.props.onError(this.state.error)
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('StorageErrorBoundary caught an error:', error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: null,
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-xl">Fehler aufgetreten</CardTitle>
              <CardDescription>
                {this.state.error.userMessage}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Error details for development */}
              {process.env.NODE_ENV === 'development' && (
                <div className="rounded-md bg-muted p-3">
                  <p className="text-sm font-medium mb-2">Entwickler-Info:</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {this.state.error.message}
                  </p>
                  {this.state.errorId && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Error ID: {this.state.errorId}
                    </p>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col space-y-2">
                {this.state.error.retryable && (
                  <Button onClick={this.handleRetry} className="w-full">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Erneut versuchen
                  </Button>
                )}
                
                <Button variant="outline" onClick={this.handleReload} className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Seite neu laden
                </Button>
                
                <Button variant="ghost" onClick={this.handleGoHome} className="w-full">
                  <Home className="mr-2 h-4 w-4" />
                  Zur Startseite
                </Button>
              </div>

              {/* Error reporting */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Wenn das Problem weiterhin besteht, wenden Sie sich an den Support.
                </p>
                {this.state.errorId && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Fehler-ID: {this.state.errorId}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Hook-based error boundary for functional components
 */
export function useStorageErrorBoundary() {
  const [error, setError] = React.useState<StorageError | null>(null)

  const resetError = () => setError(null)

  const captureError = (error: any, operation?: string) => {
    const storageError: StorageError = {
      type: 'UNKNOWN_ERROR' as any,
      severity: ErrorSeverity.MEDIUM,
      message: error?.message || 'Unknown error',
      userMessage: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
      timestamp: new Date(),
      operation: operation || 'unknown',
      retryable: true,
      details: error,
    }

    setError(storageError)
    errorLogger.log(storageError)
  }

  return {
    error,
    resetError,
    captureError,
    hasError: error !== null,
  }
}

/**
 * Async error boundary component for handling promise rejections
 */
interface AsyncErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: StorageError, retry: () => void) => ReactNode
  onError?: (error: StorageError) => void
}

export function AsyncErrorBoundary({ children, fallback, onError }: AsyncErrorBoundaryProps) {
  const [error, setError] = React.useState<StorageError | null>(null)

  const handleError = React.useCallback((error: any, operation?: string) => {
    const storageError: StorageError = {
      type: 'UNKNOWN_ERROR' as any,
      severity: ErrorSeverity.MEDIUM,
      message: error?.message || 'Async operation failed',
      userMessage: 'Ein Fehler ist bei der Ausführung aufgetreten.',
      timestamp: new Date(),
      operation: operation || 'async_operation',
      retryable: true,
      details: error,
    }

    setError(storageError)
    errorLogger.log(storageError)
    onError?.(storageError)
  }, [onError])

  const retry = React.useCallback(() => {
    setError(null)
  }, [])

  // Listen for unhandled promise rejections
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      handleError(event.reason, 'unhandled_promise_rejection')
      event.preventDefault()
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [handleError])

  if (error) {
    if (fallback) {
      return fallback(error, retry)
    }

    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
        <div className="flex items-center space-x-2 mb-3">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <h3 className="font-medium text-destructive">Fehler</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          {error.userMessage}
        </p>
        {error.retryable && (
          <Button size="sm" onClick={retry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Erneut versuchen
          </Button>
        )}
      </div>
    )
  }

  return <>{children}</>
}

/**
 * Loading error boundary for handling loading states with errors
 */
interface LoadingErrorBoundaryProps {
  children: ReactNode
  isLoading: boolean
  error: string | null
  onRetry?: () => void
  loadingComponent?: ReactNode
  emptyComponent?: ReactNode
  isEmpty?: boolean
}

export function LoadingErrorBoundary({
  children,
  isLoading,
  error,
  onRetry,
  loadingComponent,
  emptyComponent,
  isEmpty = false,
}: LoadingErrorBoundaryProps) {
  if (isLoading) {
    return loadingComponent || (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Wird geladen...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-destructive mb-3" />
        <h3 className="font-medium text-destructive mb-2">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        {onRetry && (
          <Button size="sm" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Erneut versuchen
          </Button>
        )}
      </div>
    )
  }

  if (isEmpty) {
    return emptyComponent || (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Keine Daten verfügbar</p>
      </div>
    )
  }

  return <>{children}</>
}