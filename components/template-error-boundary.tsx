"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TemplatesModalErrorHandler, TemplatesModalErrorType } from '@/lib/template-error-handler'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
}

/**
 * Error boundary specifically designed for the templates modal
 * Provides graceful error handling and recovery options
 */
export class TemplateErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error using our error handler
    TemplatesModalErrorHandler.handleModalInitializationError(error)
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    this.setState({
      error,
      errorInfo
    })
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="flex items-center justify-center min-h-[400px] p-8">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-lg">
                Vorlagen konnten nicht geladen werden
              </CardTitle>
              <CardDescription>
                Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie eine der folgenden Optionen.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={this.handleRetry}
                  className="w-full"
                  variant="default"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Erneut versuchen
                </Button>
                <Button 
                  onClick={this.handleReload}
                  className="w-full"
                  variant="outline"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Seite neu laden
                </Button>
                <Button 
                  onClick={this.handleGoHome}
                  className="w-full"
                  variant="ghost"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Zur Startseite
                </Button>
              </div>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-sm">
                  <summary className="cursor-pointer font-medium text-muted-foreground">
                    Technische Details (nur in Entwicklung sichtbar)
                  </summary>
                  <div className="mt-2 rounded bg-muted p-2 font-mono text-xs">
                    <div className="mb-2">
                      <strong>Error ID:</strong> {this.state.errorId}
                    </div>
                    <div className="mb-2">
                      <strong>Error:</strong> {this.state.error.message}
                    </div>
                    <div className="mb-2">
                      <strong>Stack:</strong>
                      <pre className="mt-1 whitespace-pre-wrap">
                        {this.state.error.stack}
                      </pre>
                    </div>
                    {this.state.errorInfo && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="mt-1 whitespace-pre-wrap">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
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
export function useErrorHandler() {
  const handleError = React.useCallback((error: Error, context?: Record<string, any>) => {
    TemplatesModalErrorHandler.handleGenericError(error, 'component_error', context)
  }, [])

  return { handleError }
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const WrappedComponent = (props: P) => (
    <TemplateErrorBoundary fallback={fallback}>
      <Component {...props} />
    </TemplateErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

/**
 * Specialized error boundary for template operations
 */
interface TemplateOperationErrorBoundaryProps {
  children: ReactNode
  operation: string
  onRetry?: () => void
}

export function TemplateOperationErrorBoundary({ 
  children, 
  operation, 
  onRetry 
}: TemplateOperationErrorBoundaryProps) {
  return (
    <TemplateErrorBoundary
      fallback={
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mb-3" />
          <h3 className="text-sm font-medium mb-2">
            Fehler bei: {operation}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Diese Aktion konnte nicht ausgeführt werden.
          </p>
          {onRetry && (
            <Button size="sm" onClick={onRetry} variant="outline">
              <RefreshCw className="mr-2 h-3 w-3" />
              Erneut versuchen
            </Button>
          )}
        </div>
      }
      onError={(error) => {
        TemplatesModalErrorHandler.handleGenericError(error, operation)
      }}
    >
      {children}
    </TemplateErrorBoundary>
  )
}