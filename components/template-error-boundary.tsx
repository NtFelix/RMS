'use client'

/**
 * Template Error Boundary Components
 * 
 * Provides error boundaries specifically for template components
 * with graceful fallbacks and recovery options.
 */

import React, { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home, FileText } from 'lucide-react'
import { TemplateErrorHandler, TemplateErrorType } from '@/lib/template-error-handler'

// Error Boundary Props
interface TemplateErrorBoundaryProps {
  children: ReactNode
  fallback?: React.ComponentType<TemplateErrorFallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  context?: {
    templateId?: string
    userId?: string
    component?: string
  }
}

// Error Boundary State
interface TemplateErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

// Error Fallback Props
export interface TemplateErrorFallbackProps {
  error: Error
  errorInfo?: React.ErrorInfo
  retry: () => void
  context?: TemplateErrorBoundaryProps['context']
}

/**
 * Main Template Error Boundary
 */
export class TemplateErrorBoundary extends Component<
  TemplateErrorBoundaryProps,
  TemplateErrorBoundaryState
> {
  constructor(props: TemplateErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): TemplateErrorBoundaryState {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error
    const templateError = TemplateErrorHandler.createError(
      TemplateErrorType.SYSTEM_ERROR,
      `Template component error: ${error.message}`,
      { error, errorInfo },
      this.props.context
    )
    
    TemplateErrorHandler.handleError(templateError)
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)
    
    this.setState({ errorInfo })
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultTemplateErrorFallback
      
      return (
        <FallbackComponent
          error={this.state.error!}
          errorInfo={this.state.errorInfo}
          retry={this.retry}
          context={this.props.context}
        />
      )
    }

    return this.props.children
  }
}

/**
 * Default Template Error Fallback Component
 */
export function DefaultTemplateErrorFallback({
  error,
  retry,
  context
}: TemplateErrorFallbackProps) {
  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <CardTitle className="text-red-900">Fehler beim Laden der Vorlage</CardTitle>
        <CardDescription>
          Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {process.env.NODE_ENV === 'development' && (
          <details className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
            <summary className="cursor-pointer font-medium">Fehlerdetails</summary>
            <pre className="mt-2 whitespace-pre-wrap text-xs">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
        
        <div className="flex gap-2 justify-center">
          <Button onClick={retry} variant="default" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Erneut versuchen
          </Button>
          <Button 
            onClick={() => window.location.href = '/dateien'} 
            variant="outline" 
            size="sm"
          >
            <Home className="w-4 h-4 mr-2" />
            Zu Dateien
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Template Editor Error Boundary
 */
export function TemplateEditorErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <TemplateErrorBoundary
      fallback={TemplateEditorErrorFallback}
      context={{ component: 'TemplateEditor' }}
    >
      {children}
    </TemplateErrorBoundary>
  )
}

/**
 * Template Editor Error Fallback
 */
function TemplateEditorErrorFallback({ error, retry }: TemplateErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
      <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Editor konnte nicht geladen werden
      </h3>
      <p className="text-gray-600 text-center mb-6 max-w-md">
        Der Vorlagen-Editor ist auf einen Fehler gestoßen. Bitte versuchen Sie es erneut oder laden Sie die Seite neu.
      </p>
      <div className="flex gap-3">
        <Button onClick={retry} variant="default">
          <RefreshCw className="w-4 h-4 mr-2" />
          Editor neu laden
        </Button>
        <Button onClick={() => window.location.reload()} variant="outline">
          Seite neu laden
        </Button>
      </div>
    </div>
  )
}

/**
 * Template List Error Boundary
 */
export function TemplateListErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <TemplateErrorBoundary
      fallback={TemplateListErrorFallback}
      context={{ component: 'TemplateList' }}
    >
      {children}
    </TemplateErrorBoundary>
  )
}

/**
 * Template List Error Fallback
 */
function TemplateListErrorFallback({ error, retry }: TemplateErrorFallbackProps) {
  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <FileText className="w-12 h-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Vorlagen konnten nicht geladen werden
        </h3>
        <p className="text-gray-600 text-center mb-6 max-w-md">
          Beim Laden der Vorlagen ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.
        </p>
        <Button onClick={retry} variant="default">
          <RefreshCw className="w-4 h-4 mr-2" />
          Erneut laden
        </Button>
      </CardContent>
    </Card>
  )
}

/**
 * Template Modal Error Boundary
 */
export function TemplateModalErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <TemplateErrorBoundary
      fallback={TemplateModalErrorFallback}
      context={{ component: 'TemplateModal' }}
    >
      {children}
    </TemplateErrorBoundary>
  )
}

/**
 * Template Modal Error Fallback
 */
function TemplateModalErrorFallback({ error, retry }: TemplateErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
      <h2 className="text-xl font-semibold text-gray-900 mb-2">
        Modal konnte nicht geladen werden
      </h2>
      <p className="text-gray-600 text-center mb-6 max-w-md">
        Beim Öffnen des Modals ist ein Fehler aufgetreten. Bitte schließen Sie das Modal und versuchen Sie es erneut.
      </p>
      <div className="flex gap-3">
        <Button onClick={retry} variant="default">
          <RefreshCw className="w-4 h-4 mr-2" />
          Erneut versuchen
        </Button>
        <Button 
          onClick={() => window.history.back()} 
          variant="outline"
        >
          Zurück
        </Button>
      </div>
    </div>
  )
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export function withTemplateErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  context?: TemplateErrorBoundaryProps['context']
) {
  const WrappedComponent = (props: P) => (
    <TemplateErrorBoundary context={context}>
      <Component {...props} />
    </TemplateErrorBoundary>
  )
  
  WrappedComponent.displayName = `withTemplateErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}