"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
}

const MAX_RETRY_COUNT = 3

export class SearchErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Call the optional error callback
    this.props.onError?.(error, errorInfo)

    // Log error for debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Search Error Boundary caught an error:', error, errorInfo)
    }
  }

  componentDidUpdate(prevProps: Props) {
    // Reset error state when children change
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: 0
      })
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < MAX_RETRY_COUNT) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }))
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    })
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="flex flex-col items-center justify-center py-8 px-4">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Suchfehler</AlertTitle>
            <AlertDescription className="mt-2">
              {this.state.error?.message === 'Network Error' || 
               this.state.error?.message?.includes('fetch') ? (
                'Die Suche ist vorübergehend nicht verfügbar. Bitte überprüfen Sie Ihre Internetverbindung.'
              ) : this.state.error?.message?.includes('timeout') ? (
                'Die Suche dauert zu lange. Bitte versuchen Sie es mit einem anderen Suchbegriff.'
              ) : this.state.error?.message?.includes('permission') || 
                   this.state.error?.message?.includes('unauthorized') ? (
                'Sie haben keine Berechtigung für diese Suche. Bitte melden Sie sich erneut an.'
              ) : (
                'Bei der Suche ist ein unerwarteter Fehler aufgetreten.'
              )}
            </AlertDescription>
            
            <div className="flex gap-2 mt-4">
              {this.state.retryCount < MAX_RETRY_COUNT && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={this.handleRetry}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-3 w-3" />
                  Erneut versuchen ({MAX_RETRY_COUNT - this.state.retryCount} verbleibend)
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
              >
                Zurücksetzen
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-xs">
                <summary className="cursor-pointer text-muted-foreground">
                  Technische Details (nur in Entwicklung)
                </summary>
                <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </Alert>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook version for functional components
export function useSearchErrorHandler() {
  const handleError = React.useCallback((error: Error, errorInfo?: ErrorInfo) => {
    // Log error for debugging
    if (process.env.NODE_ENV === 'development') {
      console.error('Search error:', error, errorInfo)
    }

    // Could integrate with error reporting service here
    // Example: Sentry.captureException(error, { extra: errorInfo })
  }, [])

  return { handleError }
}