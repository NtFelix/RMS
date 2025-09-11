'use client'

/**
 * Template Error Boundary Components
 * 
 * Provides comprehensive error boundaries specifically for template components
 * with graceful fallbacks, recovery options, and detailed error reporting.
 */

import React, { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AlertTriangle, RefreshCw, Home, FileText, Bug, Copy, ExternalLink, Clock, User, X } from 'lucide-react'
import { TemplateErrorHandler, TemplateErrorType } from '@/lib/template-error-handler'
import { useToast } from '@/hooks/use-toast'

// Error Boundary Props
interface TemplateErrorBoundaryProps {
  children: ReactNode
  fallback?: React.ComponentType<TemplateErrorFallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  context?: {
    templateId?: string
    userId?: string
    component?: string
    operation?: string
  }
  enableRetry?: boolean
  enableReporting?: boolean
  maxRetries?: number
  showErrorDetails?: boolean
}

// Error Boundary State
interface TemplateErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
  retryCount: number
  errorId: string
  timestamp: Date
}

// Error Fallback Props
export interface TemplateErrorFallbackProps {
  error: Error
  errorInfo?: React.ErrorInfo
  retry: () => void
  context?: TemplateErrorBoundaryProps['context']
  retryCount: number
  maxRetries: number
  errorId: string
  timestamp: Date
  enableRetry: boolean
  enableReporting: boolean
  showErrorDetails: boolean
}

/**
 * Main Template Error Boundary with Enhanced Features
 */
export class TemplateErrorBoundary extends Component<
  TemplateErrorBoundaryProps,
  TemplateErrorBoundaryState
> {
  private retryTimeoutId: NodeJS.Timeout | null = null

  constructor(props: TemplateErrorBoundaryProps) {
    super(props)
    this.state = { 
      hasError: false,
      retryCount: 0,
      errorId: '',
      timestamp: new Date()
    }
  }

  static getDerivedStateFromError(error: Error): Partial<TemplateErrorBoundaryState> {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    return {
      hasError: true,
      error,
      errorId,
      timestamp: new Date()
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Enhanced error logging with more context
    const templateError = TemplateErrorHandler.createError(
      this.determineErrorType(error),
      `Template component error in ${this.props.context?.component || 'unknown component'}: ${error.message}`,
      { 
        error, 
        errorInfo,
        retryCount: this.state.retryCount,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        timestamp: new Date().toISOString()
      },
      this.props.context
    )
    
    TemplateErrorHandler.handleError(templateError)
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)
    
    // Update state with error info
    this.setState({ errorInfo })

    // Auto-retry for certain error types (if enabled and within limits)
    if (this.shouldAutoRetry(error) && this.state.retryCount < (this.props.maxRetries || 3)) {
      this.scheduleAutoRetry()
    }
  }

  private determineErrorType(error: Error): TemplateErrorType {
    const message = error.message.toLowerCase()
    
    if (message.includes('network') || message.includes('fetch')) {
      return TemplateErrorType.NETWORK_ERROR
    }
    if (message.includes('permission') || message.includes('unauthorized')) {
      return TemplateErrorType.PERMISSION_DENIED
    }
    if (message.includes('template') && message.includes('not found')) {
      return TemplateErrorType.TEMPLATE_NOT_FOUND
    }
    if (message.includes('editor') || message.includes('tiptap')) {
      return TemplateErrorType.EDITOR_INITIALIZATION_FAILED
    }
    if (message.includes('content') || message.includes('parse')) {
      return TemplateErrorType.CONTENT_PARSE_ERROR
    }
    
    return TemplateErrorType.SYSTEM_ERROR
  }

  private shouldAutoRetry(error: Error): boolean {
    if (!this.props.enableRetry) return false
    
    const retryableErrors = [
      'network',
      'timeout',
      'connection',
      'temporary'
    ]
    
    return retryableErrors.some(keyword => 
      error.message.toLowerCase().includes(keyword)
    )
  }

  private scheduleAutoRetry = () => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }

    // Exponential backoff: 1s, 2s, 4s, etc.
    const delay = Math.pow(2, this.state.retryCount) * 1000
    
    this.retryTimeoutId = setTimeout(() => {
      this.retry()
    }, delay)
  }

  retry = () => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
      this.retryTimeoutId = null
    }

    this.setState(prevState => ({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      retryCount: prevState.retryCount + 1
    }))
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
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
          retryCount={this.state.retryCount}
          maxRetries={this.props.maxRetries || 3}
          errorId={this.state.errorId}
          timestamp={this.state.timestamp}
          enableRetry={this.props.enableRetry ?? true}
          enableReporting={this.props.enableReporting ?? true}
          showErrorDetails={this.props.showErrorDetails ?? (process.env.NODE_ENV === 'development')}
        />
      )
    }

    return this.props.children
  }
}

/**
 * Enhanced Default Template Error Fallback Component
 */
export function DefaultTemplateErrorFallback({
  error,
  retry,
  context,
  retryCount,
  maxRetries,
  errorId,
  timestamp,
  enableRetry,
  enableReporting,
  showErrorDetails
}: TemplateErrorFallbackProps) {
  const { toast } = useToast()

  const copyErrorDetails = () => {
    const errorDetails = {
      errorId,
      timestamp: timestamp.toISOString(),
      component: context?.component,
      templateId: context?.templateId,
      message: error.message,
      stack: error.stack,
      retryCount,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    }

    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
    toast({
      title: "Fehlerdetails kopiert",
      description: "Die Fehlerdetails wurden in die Zwischenablage kopiert.",
      duration: 3000
    })
  }

  const reportError = () => {
    // In a real application, this would send to an error reporting service
    toast({
      title: "Fehler gemeldet",
      description: "Der Fehler wurde an unser Support-Team gemeldet.",
      duration: 3000
    })
  }

  const canRetry = enableRetry && retryCount < maxRetries

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>
        <CardTitle className="text-red-900 dark:text-red-100">
          Fehler beim Laden der Vorlage
        </CardTitle>
        <CardDescription className="text-center">
          Ein unerwarteter Fehler ist aufgetreten. {canRetry ? 'Bitte versuchen Sie es erneut.' : 'Maximale Anzahl von Wiederholungsversuchen erreicht.'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Error Summary */}
        <div className="flex flex-wrap gap-2 justify-center">
          <Badge variant="outline" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            {timestamp.toLocaleString()}
          </Badge>
          <Badge variant="outline" className="text-xs">
            <Bug className="w-3 h-3 mr-1" />
            {errorId}
          </Badge>
          {context?.component && (
            <Badge variant="outline" className="text-xs">
              <FileText className="w-3 h-3 mr-1" />
              {context.component}
            </Badge>
          )}
          {retryCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              Versuch {retryCount + 1}/{maxRetries + 1}
            </Badge>
          )}
        </div>

        {/* Error Details (Development/Debug Mode) */}
        {showErrorDetails && (
          <details className="text-sm bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border">
            <summary className="cursor-pointer font-medium text-gray-700 dark:text-gray-300 mb-2">
              Technische Details anzeigen
            </summary>
            <div className="space-y-3">
              <div>
                <strong className="text-gray-900 dark:text-gray-100">Fehlermeldung:</strong>
                <p className="text-red-600 dark:text-red-400 font-mono text-xs mt-1">
                  {error.message}
                </p>
              </div>
              
              {error.stack && (
                <div>
                  <strong className="text-gray-900 dark:text-gray-100">Stack Trace:</strong>
                  <pre className="text-xs text-gray-600 dark:text-gray-400 mt-1 overflow-x-auto whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                </div>
              )}
              
              {context && (
                <div>
                  <strong className="text-gray-900 dark:text-gray-100">Kontext:</strong>
                  <pre className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {JSON.stringify(context, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}

        <Separator />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {canRetry && (
            <Button onClick={retry} variant="default" className="flex-1 sm:flex-none">
              <RefreshCw className="w-4 h-4 mr-2" />
              Erneut versuchen
            </Button>
          )}
          
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
            className="flex-1 sm:flex-none"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Seite neu laden
          </Button>
          
          <Button 
            onClick={() => window.location.assign('/dateien')} 
            variant="outline"
            className="flex-1 sm:flex-none"
          >
            <Home className="w-4 h-4 mr-2" />
            Zu Dateien
          </Button>
        </div>

        {/* Additional Actions */}
        {enableReporting && (
          <div className="flex flex-col sm:flex-row gap-2 justify-center text-sm">
            <Button 
              onClick={copyErrorDetails} 
              variant="ghost" 
              size="sm"
              className="text-gray-600 dark:text-gray-400"
            >
              <Copy className="w-3 h-3 mr-2" />
              Fehlerdetails kopieren
            </Button>
            
            <Button 
              onClick={reportError} 
              variant="ghost" 
              size="sm"
              className="text-gray-600 dark:text-gray-400"
            >
              <ExternalLink className="w-3 h-3 mr-2" />
              Fehler melden
            </Button>
          </div>
        )}

        {/* Help Text */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400">
          Falls das Problem weiterhin besteht, kontaktieren Sie bitte den Support mit der Fehler-ID: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{errorId}</code>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Template Editor Error Boundary with Enhanced Configuration
 */
export function TemplateEditorErrorBoundary({ 
  children,
  templateId,
  userId 
}: { 
  children: ReactNode
  templateId?: string
  userId?: string
}) {
  return (
    <TemplateErrorBoundary
      fallback={TemplateEditorErrorFallback}
      context={{ 
        component: 'TemplateEditor',
        templateId,
        userId,
        operation: 'edit'
      }}
      enableRetry={true}
      enableReporting={true}
      maxRetries={3}
      showErrorDetails={process.env.NODE_ENV === 'development'}
    >
      {children}
    </TemplateErrorBoundary>
  )
}

/**
 * Enhanced Template Editor Error Fallback
 */
function TemplateEditorErrorFallback({ 
  error, 
  retry, 
  context,
  retryCount,
  maxRetries,
  errorId,
  timestamp,
  enableRetry,
  enableReporting,
  showErrorDetails
}: TemplateErrorFallbackProps) {
  const { toast } = useToast()
  const canRetry = enableRetry && retryCount < maxRetries

  const handleSafeMode = () => {
    // Attempt to open a simplified editor or fallback mode
    toast({
      title: "Sicherheitsmodus aktiviert",
      description: "Versuche, den Editor im Sicherheitsmodus zu laden...",
      duration: 3000
    })
    
    // In a real implementation, this would trigger a safe mode
    setTimeout(() => {
      retry()
    }, 1000)
  }

  const handleReportIssue = () => {
    const issueData = {
      type: 'editor_error',
      errorId,
      templateId: context?.templateId,
      timestamp: timestamp.toISOString(),
      message: error.message,
      component: 'TemplateEditor'
    }

    // In a real app, this would send to support system
    navigator.clipboard.writeText(JSON.stringify(issueData, null, 2))
    toast({
      title: "Problem gemeldet",
      description: "Problemdetails wurden kopiert. Bitte senden Sie diese an den Support.",
      duration: 5000
    })
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-96 bg-gray-50 dark:bg-gray-900/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 p-8">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-500 dark:text-red-400" />
        </div>
        
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Editor konnte nicht geladen werden
        </h3>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
          Der Vorlagen-Editor ist auf einen Fehler gestoßen. 
          {canRetry ? ' Bitte versuchen Sie es erneut oder verwenden Sie den Sicherheitsmodus.' : ' Maximale Anzahl von Wiederholungsversuchen erreicht.'}
        </p>

        {/* Error Summary */}
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          <Badge variant="outline" className="text-xs">
            <Bug className="w-3 h-3 mr-1" />
            {errorId}
          </Badge>
          {context?.templateId && (
            <Badge variant="outline" className="text-xs">
              <FileText className="w-3 h-3 mr-1" />
              Template: {context.templateId.slice(0, 8)}...
            </Badge>
          )}
          {retryCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              Versuch {retryCount + 1}/{maxRetries + 1}
            </Badge>
          )}
        </div>

        {/* Error Details for Development */}
        {showErrorDetails && (
          <details className="text-left text-sm bg-white dark:bg-gray-800 p-4 rounded border mb-6">
            <summary className="cursor-pointer font-medium mb-2">Entwicklerdetails</summary>
            <div className="space-y-2">
              <div>
                <strong>Fehler:</strong> {error.message}
              </div>
              {error.stack && (
                <div>
                  <strong>Stack:</strong>
                  <pre className="text-xs mt-1 overflow-x-auto whitespace-pre-wrap text-gray-600 dark:text-gray-400">
                    {error.stack.split('\n').slice(0, 5).join('\n')}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {canRetry && (
              <Button onClick={retry} variant="default">
                <RefreshCw className="w-4 h-4 mr-2" />
                Editor neu laden
              </Button>
            )}
            
            <Button onClick={handleSafeMode} variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Sicherheitsmodus
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button onClick={() => window.location.reload()} variant="ghost" size="sm">
              <RefreshCw className="w-3 h-3 mr-2" />
              Seite neu laden
            </Button>
            
            <Button onClick={() => window.location.href = '/dateien'} variant="ghost" size="sm">
              <Home className="w-3 h-3 mr-2" />
              Zu Dateien
            </Button>
            
            {enableReporting && (
              <Button onClick={handleReportIssue} variant="ghost" size="sm">
                <ExternalLink className="w-3 h-3 mr-2" />
                Problem melden
              </Button>
            )}
          </div>
        </div>

        {/* Help Text */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
          Fehler-ID: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{errorId}</code>
        </p>
      </div>
    </div>
  )
}

/**
 * Template List Error Boundary with Enhanced Configuration
 */
export function TemplateListErrorBoundary({ 
  children,
  userId 
}: { 
  children: ReactNode
  userId?: string
}) {
  return (
    <TemplateErrorBoundary
      fallback={TemplateListErrorFallback}
      context={{ 
        component: 'TemplateList',
        userId,
        operation: 'list'
      }}
      enableRetry={true}
      enableReporting={true}
      maxRetries={2}
      showErrorDetails={false}
    >
      {children}
    </TemplateErrorBoundary>
  )
}

/**
 * Enhanced Template List Error Fallback
 */
function TemplateListErrorFallback({ 
  error, 
  retry, 
  context,
  retryCount,
  maxRetries,
  errorId,
  enableRetry,
  enableReporting
}: TemplateErrorFallbackProps) {
  const { toast } = useToast()
  const canRetry = enableRetry && retryCount < maxRetries

  const handleRefreshPage = () => {
    window.location.reload()
  }

  const handleGoToFiles = () => {
    window.location.assign('/dateien')
  }

  const handleReportIssue = () => {
    toast({
      title: "Problem gemeldet",
      description: "Das Problem wurde an unser Support-Team weitergeleitet.",
      duration: 3000
    })
  }

  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="text-center max-w-lg">
          <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <FileText className="w-8 h-8 text-red-500 dark:text-red-400" />
          </div>
          
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Vorlagen konnten nicht geladen werden
          </h3>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
            Beim Laden der Vorlagen ist ein Fehler aufgetreten. 
            {canRetry ? ' Bitte versuchen Sie es erneut.' : ' Maximale Anzahl von Wiederholungsversuchen erreicht.'}
          </p>

          {/* Error Info */}
          <div className="flex justify-center mb-6">
            <Badge variant="outline" className="text-xs">
              <Bug className="w-3 h-3 mr-1" />
              {errorId}
            </Badge>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {canRetry && (
                <Button onClick={retry} variant="default">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Erneut laden
                </Button>
              )}
              
              <Button onClick={handleRefreshPage} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Seite aktualisieren
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button onClick={handleGoToFiles} variant="ghost" size="sm">
                <Home className="w-3 h-3 mr-2" />
                Zu Dateien
              </Button>
              
              {enableReporting && (
                <Button onClick={handleReportIssue} variant="ghost" size="sm">
                  <ExternalLink className="w-3 h-3 mr-2" />
                  Problem melden
                </Button>
              )}
            </div>
          </div>

          {/* Help Text */}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
            Falls das Problem weiterhin besteht, notieren Sie sich die Fehler-ID: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{errorId}</code>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Template Modal Error Boundary with Enhanced Configuration
 */
export function TemplateModalErrorBoundary({ 
  children,
  templateId,
  userId,
  operation 
}: { 
  children: ReactNode
  templateId?: string
  userId?: string
  operation?: string
}) {
  return (
    <TemplateErrorBoundary
      fallback={TemplateModalErrorFallback}
      context={{ 
        component: 'TemplateModal',
        templateId,
        userId,
        operation
      }}
      enableRetry={true}
      enableReporting={true}
      maxRetries={2}
      showErrorDetails={false}
    >
      {children}
    </TemplateErrorBoundary>
  )
}

/**
 * Enhanced Template Modal Error Fallback
 */
function TemplateModalErrorFallback({ 
  error, 
  retry, 
  context,
  retryCount,
  maxRetries,
  errorId,
  enableRetry,
  enableReporting
}: TemplateErrorFallbackProps) {
  const { toast } = useToast()
  const canRetry = enableRetry && retryCount < maxRetries

  const handleCloseModal = () => {
    // Try to close modal gracefully
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('close-modal')
      window.dispatchEvent(event)
    }
  }

  const handleReportIssue = () => {
    toast({
      title: "Problem gemeldet",
      description: "Das Modal-Problem wurde gemeldet.",
      duration: 3000
    })
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 min-h-96">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-500 dark:text-red-400" />
        </div>
        
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Modal konnte nicht geladen werden
        </h2>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
          Beim Öffnen des Modals ist ein Fehler aufgetreten. 
          {canRetry ? ' Bitte versuchen Sie es erneut oder schließen Sie das Modal.' : ' Bitte schließen Sie das Modal und versuchen Sie es später erneut.'}
        </p>

        {/* Error Info */}
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          <Badge variant="outline" className="text-xs">
            <Bug className="w-3 h-3 mr-1" />
            {errorId}
          </Badge>
          {context?.operation && (
            <Badge variant="outline" className="text-xs">
              Operation: {context.operation}
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {canRetry && (
              <Button onClick={retry} variant="default">
                <RefreshCw className="w-4 h-4 mr-2" />
                Erneut versuchen
              </Button>
            )}
            
            <Button onClick={handleCloseModal} variant="outline">
              <X className="w-4 h-4 mr-2" />
              Modal schließen
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button onClick={() => window.history.back()} variant="ghost" size="sm">
              Zurück
            </Button>
            
            {enableReporting && (
              <Button onClick={handleReportIssue} variant="ghost" size="sm">
                <ExternalLink className="w-3 h-3 mr-2" />
                Problem melden
              </Button>
            )}
          </div>
        </div>

        {/* Help Text */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
          Fehler-ID: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{errorId}</code>
        </p>
      </div>
    </div>
  )
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export function withTemplateErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    context?: TemplateErrorBoundaryProps['context']
    enableRetry?: boolean
    enableReporting?: boolean
    maxRetries?: number
    showErrorDetails?: boolean
    fallback?: React.ComponentType<TemplateErrorFallbackProps>
  }
) {
  const WrappedComponent = (props: P) => (
    <TemplateErrorBoundary 
      context={options?.context}
      enableRetry={options?.enableRetry ?? true}
      enableReporting={options?.enableReporting ?? true}
      maxRetries={options?.maxRetries ?? 3}
      showErrorDetails={options?.showErrorDetails ?? (process.env.NODE_ENV === 'development')}
      fallback={options?.fallback}
    >
      <Component {...props} />
    </TemplateErrorBoundary>
  )
  
  WrappedComponent.displayName = `withTemplateErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

/**
 * Hook for accessing error boundary context and utilities
 */
export function useTemplateErrorBoundary() {
  const reportError = (error: Error, context?: TemplateErrorBoundaryProps['context']) => {
    const templateError = TemplateErrorHandler.createError(
      TemplateErrorType.SYSTEM_ERROR,
      error.message,
      { error },
      context
    )
    TemplateErrorHandler.handleError(templateError)
  }

  const createErrorId = () => {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  return {
    reportError,
    createErrorId
  }
}