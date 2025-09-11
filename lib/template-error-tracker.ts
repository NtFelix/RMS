/**
 * Template Error Tracking and Alerting System
 * 
 * Provides comprehensive error tracking, alerting, and recovery
 * for template operations with integration to monitoring services.
 */

import { getPerformanceMonitor } from './template-performance-monitor'

// Error types and interfaces
export interface TemplateError {
  id: string
  type: TemplateErrorType
  message: string
  stack?: string
  timestamp: number
  userId?: string
  sessionId?: string
  component?: string
  operation?: string
  metadata?: Record<string, any>
  severity: ErrorSeverity
  recoverable: boolean
  recovered?: boolean
  recoveryAttempts?: number
}

export enum TemplateErrorType {
  PARSE_ERROR = 'parse_error',
  SAVE_ERROR = 'save_error',
  LOAD_ERROR = 'load_error',
  VALIDATION_ERROR = 'validation_error',
  NETWORK_ERROR = 'network_error',
  PERMISSION_ERROR = 'permission_error',
  QUOTA_ERROR = 'quota_error',
  TIMEOUT_ERROR = 'timeout_error',
  UNKNOWN_ERROR = 'unknown_error'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorAlert {
  id: string
  errorId: string
  type: AlertType
  message: string
  timestamp: number
  acknowledged: boolean
  resolvedAt?: number
}

export enum AlertType {
  ERROR_RATE_HIGH = 'error_rate_high',
  CRITICAL_ERROR = 'critical_error',
  REPEATED_ERROR = 'repeated_error',
  PERFORMANCE_DEGRADATION = 'performance_degradation',
  QUOTA_EXCEEDED = 'quota_exceeded'
}

// Error recovery strategies
export interface RecoveryStrategy {
  type: TemplateErrorType
  strategy: (error: TemplateError) => Promise<boolean>
  maxAttempts: number
  backoffMs: number
}

class TemplateErrorTracker {
  private errors: TemplateError[] = []
  private alerts: ErrorAlert[] = []
  private recoveryStrategies: Map<TemplateErrorType, RecoveryStrategy> = new Map()
  private errorCounts: Map<string, number> = new Map()
  private sessionId: string
  private userId?: string
  private maxErrors: number = 1000
  private alertThresholds = {
    errorRate: 10, // errors per minute
    criticalErrors: 1,
    repeatedErrors: 3
  }

  constructor() {
    this.sessionId = this.generateSessionId()
    this.initializeRecoveryStrategies()
    this.startErrorRateMonitoring()
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private initializeRecoveryStrategies() {
    // Parse error recovery
    this.recoveryStrategies.set(TemplateErrorType.PARSE_ERROR, {
      type: TemplateErrorType.PARSE_ERROR,
      strategy: async (error) => {
        try {
          // Attempt to recover with fallback content
          const fallbackContent = {
            type: 'doc',
            content: [{ type: 'paragraph', content: [] }]
          }
          
          // Store fallback content in metadata for recovery
          error.metadata = { ...error.metadata, fallbackContent }
          error.recovered = true
          
          return true
        } catch {
          return false
        }
      },
      maxAttempts: 1,
      backoffMs: 0
    })

    // Save error recovery
    this.recoveryStrategies.set(TemplateErrorType.SAVE_ERROR, {
      type: TemplateErrorType.SAVE_ERROR,
      strategy: async (error) => {
        try {
          // Retry save with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // Attempt to save to local storage as backup
          if (error.metadata?.content) {
            const backupKey = `template_backup_${Date.now()}`
            localStorage.setItem(backupKey, JSON.stringify(error.metadata.content))
            error.metadata = { ...error.metadata, backupKey }
          }
          
          return false // Don't mark as recovered, just backed up
        } catch {
          return false
        }
      },
      maxAttempts: 3,
      backoffMs: 1000
    })

    // Network error recovery
    this.recoveryStrategies.set(TemplateErrorType.NETWORK_ERROR, {
      type: TemplateErrorType.NETWORK_ERROR,
      strategy: async (error) => {
        try {
          // Check network connectivity
          if (!navigator.onLine) {
            return false
          }

          // Retry with exponential backoff
          const attempt = error.recoveryAttempts || 0
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
          await new Promise(resolve => setTimeout(resolve, delay))
          
          return true // Allow retry
        } catch {
          return false
        }
      },
      maxAttempts: 5,
      backoffMs: 1000
    })
  }

  private startErrorRateMonitoring() {
    setInterval(() => {
      this.checkErrorRate()
    }, 60000) // Check every minute
  }

  private checkErrorRate() {
    const oneMinuteAgo = Date.now() - 60000
    const recentErrors = this.errors.filter(e => e.timestamp >= oneMinuteAgo)
    
    if (recentErrors.length >= this.alertThresholds.errorRate) {
      this.createAlert(AlertType.ERROR_RATE_HIGH, `High error rate: ${recentErrors.length} errors in the last minute`)
    }
  }

  // Track error with automatic recovery attempt
  async trackError(
    type: TemplateErrorType,
    message: string,
    options: {
      error?: Error
      component?: string
      operation?: string
      metadata?: Record<string, any>
      severity?: ErrorSeverity
      userId?: string
    } = {}
  ): Promise<TemplateError> {
    const errorId = this.generateErrorId()
    const templateError: TemplateError = {
      id: errorId,
      type,
      message,
      stack: options.error?.stack,
      timestamp: Date.now(),
      userId: options.userId || this.userId,
      sessionId: this.sessionId,
      component: options.component,
      operation: options.operation,
      metadata: options.metadata,
      severity: options.severity || this.determineSeverity(type),
      recoverable: this.isRecoverable(type),
      recoveryAttempts: 0
    }

    // Add to errors list
    this.errors.push(templateError)
    
    // Limit errors array size
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors / 2)
    }

    // Update error counts
    const errorKey = `${type}_${options.component || 'unknown'}`
    this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1)

    // Check for repeated errors
    if (this.errorCounts.get(errorKey)! >= this.alertThresholds.repeatedErrors) {
      this.createAlert(AlertType.REPEATED_ERROR, `Repeated error: ${message}`)
    }

    // Create critical error alert
    if (templateError.severity === ErrorSeverity.CRITICAL) {
      this.createAlert(AlertType.CRITICAL_ERROR, `Critical error: ${message}`)
    }

    // Attempt recovery if possible
    if (templateError.recoverable) {
      await this.attemptRecovery(templateError)
    }

    // Send to external services
    this.sendToErrorTracking(templateError)
    this.recordPerformanceImpact(templateError)

    return templateError
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private determineSeverity(type: TemplateErrorType): ErrorSeverity {
    switch (type) {
      case TemplateErrorType.PARSE_ERROR:
      case TemplateErrorType.SAVE_ERROR:
        return ErrorSeverity.HIGH
      case TemplateErrorType.LOAD_ERROR:
      case TemplateErrorType.VALIDATION_ERROR:
        return ErrorSeverity.MEDIUM
      case TemplateErrorType.NETWORK_ERROR:
      case TemplateErrorType.TIMEOUT_ERROR:
        return ErrorSeverity.MEDIUM
      case TemplateErrorType.PERMISSION_ERROR:
      case TemplateErrorType.QUOTA_ERROR:
        return ErrorSeverity.HIGH
      default:
        return ErrorSeverity.LOW
    }
  }

  private isRecoverable(type: TemplateErrorType): boolean {
    return [
      TemplateErrorType.PARSE_ERROR,
      TemplateErrorType.SAVE_ERROR,
      TemplateErrorType.NETWORK_ERROR,
      TemplateErrorType.TIMEOUT_ERROR
    ].includes(type)
  }

  private async attemptRecovery(error: TemplateError): Promise<void> {
    const strategy = this.recoveryStrategies.get(error.type)
    if (!strategy || (error.recoveryAttempts || 0) >= strategy.maxAttempts) {
      return
    }

    error.recoveryAttempts = (error.recoveryAttempts || 0) + 1

    try {
      // Apply backoff delay
      if (strategy.backoffMs > 0 && error.recoveryAttempts > 1) {
        const delay = strategy.backoffMs * Math.pow(2, error.recoveryAttempts - 1)
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      const recovered = await strategy.strategy(error)
      if (recovered) {
        error.recovered = true
        console.log(`Successfully recovered from error: ${error.id}`)
      }
    } catch (recoveryError) {
      console.warn(`Recovery failed for error ${error.id}:`, recoveryError)
    }
  }

  private createAlert(type: AlertType, message: string, errorId?: string): ErrorAlert {
    const alert: ErrorAlert = {
      id: this.generateErrorId(),
      errorId: errorId || '',
      type,
      message,
      timestamp: Date.now(),
      acknowledged: false
    }

    this.alerts.push(alert)
    
    // Send alert to monitoring services
    this.sendAlert(alert)
    
    return alert
  }

  private sendToErrorTracking(error: TemplateError) {
    // Send to PostHog if available
    if (typeof window !== 'undefined' && (window as any).posthog) {
      (window as any).posthog.capture('template_error', {
        error_id: error.id,
        error_type: error.type,
        error_message: error.message,
        error_severity: error.severity,
        component: error.component,
        operation: error.operation,
        recoverable: error.recoverable,
        recovered: error.recovered,
        session_id: error.sessionId,
        user_id: error.userId
      })
    }

    // Send to external error tracking service
    if (process.env.NEXT_PUBLIC_ERROR_TRACKING_ENDPOINT) {
      fetch(process.env.NEXT_PUBLIC_ERROR_TRACKING_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'template_error',
          error,
          environment: process.env.NODE_ENV,
          timestamp: Date.now()
        })
      }).catch(err => {
        console.warn('Failed to send error to tracking service:', err)
      })
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Template Error:', error)
    }
  }

  private sendAlert(alert: ErrorAlert) {
    // Send to monitoring service
    if (process.env.NEXT_PUBLIC_MONITORING_ENDPOINT) {
      fetch(process.env.NEXT_PUBLIC_MONITORING_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'template_alert',
          alert,
          environment: process.env.NODE_ENV,
          timestamp: Date.now()
        })
      }).catch(err => {
        console.warn('Failed to send alert to monitoring service:', err)
      })
    }

    // Show user notification for critical alerts
    if (alert.type === AlertType.CRITICAL_ERROR && typeof window !== 'undefined') {
      // You could integrate with your toast system here
      console.error('Critical Template Error Alert:', alert.message)
    }
  }

  private recordPerformanceImpact(error: TemplateError) {
    const monitor = getPerformanceMonitor()
    monitor.recordMetric('interaction', 0, {
      type: 'error_impact',
      errorType: error.type,
      severity: error.severity,
      component: error.component,
      operation: error.operation
    })
  }

  // Get error statistics
  getErrorStats(timeWindow?: number): {
    total: number
    byType: Record<TemplateErrorType, number>
    bySeverity: Record<ErrorSeverity, number>
    recoveryRate: number
    recentErrors: TemplateError[]
  } {
    const now = Date.now()
    const windowStart = timeWindow ? now - timeWindow : 0
    
    const relevantErrors = this.errors.filter(e => e.timestamp >= windowStart)
    
    const byType = {} as Record<TemplateErrorType, number>
    const bySeverity = {} as Record<ErrorSeverity, number>
    let recoveredCount = 0

    relevantErrors.forEach(error => {
      byType[error.type] = (byType[error.type] || 0) + 1
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1
      if (error.recovered) recoveredCount++
    })

    return {
      total: relevantErrors.length,
      byType,
      bySeverity,
      recoveryRate: relevantErrors.length > 0 ? recoveredCount / relevantErrors.length : 0,
      recentErrors: relevantErrors.slice(-10)
    }
  }

  // Get active alerts
  getActiveAlerts(): ErrorAlert[] {
    return this.alerts.filter(a => !a.acknowledged && !a.resolvedAt)
  }

  // Acknowledge alert
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.acknowledged = true
      return true
    }
    return false
  }

  // Resolve alert
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolvedAt = Date.now()
      return true
    }
    return false
  }

  // Set user ID for tracking
  setUserId(userId: string) {
    this.userId = userId
  }

  // Clear old errors and alerts
  cleanup(maxAge: number = 24 * 60 * 60 * 1000) { // 24 hours default
    const cutoff = Date.now() - maxAge
    
    this.errors = this.errors.filter(e => e.timestamp >= cutoff)
    this.alerts = this.alerts.filter(a => a.timestamp >= cutoff)
    
    // Clear old error counts
    this.errorCounts.clear()
  }

  // Generate error report
  generateErrorReport(): string {
    const stats = this.getErrorStats()
    const activeAlerts = this.getActiveAlerts()
    
    let report = '# Template Error Tracking Report\n\n'
    
    report += `## Error Summary\n`
    report += `- Total Errors: ${stats.total}\n`
    report += `- Recovery Rate: ${(stats.recoveryRate * 100).toFixed(1)}%\n`
    report += `- Active Alerts: ${activeAlerts.length}\n\n`
    
    report += `## Errors by Type\n`
    Object.entries(stats.byType).forEach(([type, count]) => {
      report += `- ${type}: ${count}\n`
    })
    report += '\n'
    
    report += `## Errors by Severity\n`
    Object.entries(stats.bySeverity).forEach(([severity, count]) => {
      report += `- ${severity}: ${count}\n`
    })
    report += '\n'
    
    if (activeAlerts.length > 0) {
      report += `## Active Alerts\n`
      activeAlerts.forEach(alert => {
        report += `- **${alert.type}**: ${alert.message}\n`
        report += `  - Created: ${new Date(alert.timestamp).toISOString()}\n`
      })
      report += '\n'
    }
    
    if (stats.recentErrors.length > 0) {
      report += `## Recent Errors\n`
      stats.recentErrors.forEach(error => {
        report += `- **${error.type}** (${error.severity}): ${error.message}\n`
        report += `  - Component: ${error.component || 'Unknown'}\n`
        report += `  - Recovered: ${error.recovered ? 'Yes' : 'No'}\n`
        report += `  - Time: ${new Date(error.timestamp).toISOString()}\n\n`
      })
    }
    
    return report
  }
}

// Global error tracker instance
let globalErrorTracker: TemplateErrorTracker | null = null

export function getErrorTracker(): TemplateErrorTracker {
  if (!globalErrorTracker) {
    globalErrorTracker = new TemplateErrorTracker()
  }
  return globalErrorTracker
}

// Convenience functions
export async function trackTemplateError(
  type: TemplateErrorType,
  message: string,
  options?: Parameters<TemplateErrorTracker['trackError']>[2]
): Promise<TemplateError> {
  return getErrorTracker().trackError(type, message, options)
}

export function getTemplateErrorStats(timeWindow?: number) {
  return getErrorTracker().getErrorStats(timeWindow)
}

export function getActiveTemplateAlerts() {
  return getErrorTracker().getActiveAlerts()
}

// Error boundary integration
export function createErrorBoundaryHandler(component: string) {
  return (error: Error, errorInfo: any) => {
    trackTemplateError(TemplateErrorType.UNKNOWN_ERROR, error.message, {
      error,
      component,
      metadata: { errorInfo },
      severity: ErrorSeverity.HIGH
    })
  }
}

export { TemplateErrorTracker }