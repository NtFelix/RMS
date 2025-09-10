/**
 * Template Error Logging and Reporting System
 * 
 * Provides comprehensive error logging, monitoring, and reporting
 * for template operations with integration to external services.
 */

import { TemplateError, TemplateErrorType } from './template-error-handler'

// Log Entry Interface
export interface TemplateErrorLogEntry {
  id: string
  timestamp: Date
  error: TemplateError
  userAgent?: string
  url?: string
  userId?: string
  sessionId?: string
  buildVersion?: string
  environment: 'development' | 'staging' | 'production'
}

// Error Statistics
export interface ErrorStatistics {
  totalErrors: number
  errorsByType: Record<TemplateErrorType, number>
  errorsByComponent: Record<string, number>
  errorsByUser: Record<string, number>
  recentErrors: TemplateErrorLogEntry[]
  criticalErrors: TemplateErrorLogEntry[]
}

// Reporting Configuration
interface ReportingConfig {
  enableConsoleLogging: boolean
  enableLocalStorage: boolean
  enablePostHog: boolean
  enableSentry: boolean
  maxLocalStorageEntries: number
  reportingThreshold: number
  batchSize: number
  flushInterval: number
}

const DEFAULT_REPORTING_CONFIG: ReportingConfig = {
  enableConsoleLogging: process.env.NODE_ENV === 'development',
  enableLocalStorage: true,
  enablePostHog: true,
  enableSentry: false,
  maxLocalStorageEntries: 100,
  reportingThreshold: 5, // Report after 5 errors
  batchSize: 10,
  flushInterval: 30000 // 30 seconds
}

/**
 * Template Error Logger Class
 */
export class TemplateErrorLogger {
  private static instance: TemplateErrorLogger
  private config: ReportingConfig
  private errorQueue: TemplateErrorLogEntry[] = []
  private flushTimer?: NodeJS.Timeout
  private sessionId: string
  
  private constructor(config?: Partial<ReportingConfig>) {
    this.config = { ...DEFAULT_REPORTING_CONFIG, ...config }
    this.sessionId = this.generateSessionId()
    this.startFlushTimer()
    
    // Initialize error reporting services
    this.initializeServices()
  }
  
  static getInstance(config?: Partial<ReportingConfig>): TemplateErrorLogger {
    if (!TemplateErrorLogger.instance) {
      TemplateErrorLogger.instance = new TemplateErrorLogger(config)
    }
    return TemplateErrorLogger.instance
  }
  
  /**
   * Log a template error
   */
  logError(error: TemplateError): void {
    const logEntry: TemplateErrorLogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      error,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userId: error.context?.userId,
      sessionId: this.sessionId,
      buildVersion: process.env.NEXT_PUBLIC_BUILD_VERSION,
      environment: this.getEnvironment()
    }
    
    // Add to queue
    this.errorQueue.push(logEntry)
    
    // Immediate logging for critical errors
    if (this.isCriticalError(error.type)) {
      this.flushImmediately(logEntry)
    }
    
    // Console logging
    if (this.config.enableConsoleLogging) {
      this.logToConsole(logEntry)
    }
    
    // Local storage logging
    if (this.config.enableLocalStorage) {
      this.logToLocalStorage(logEntry)
    }
    
    // Check if we should flush the queue
    if (this.errorQueue.length >= this.config.reportingThreshold) {
      this.flush()
    }
  }
  
  /**
   * Get error statistics
   */
  getStatistics(): ErrorStatistics {
    const logs = this.getStoredLogs()
    
    const stats: ErrorStatistics = {
      totalErrors: logs.length,
      errorsByType: {} as Record<TemplateErrorType, number>,
      errorsByComponent: {},
      errorsByUser: {},
      recentErrors: logs.slice(-10),
      criticalErrors: logs.filter(log => this.isCriticalError(log.error.type))
    }
    
    // Calculate statistics
    logs.forEach(log => {
      // By type
      stats.errorsByType[log.error.type] = (stats.errorsByType[log.error.type] || 0) + 1
      
      // By component
      const component = log.error.context?.component || 'unknown'
      stats.errorsByComponent[component] = (stats.errorsByComponent[component] || 0) + 1
      
      // By user
      const userId = log.userId || 'anonymous'
      stats.errorsByUser[userId] = (stats.errorsByUser[userId] || 0) + 1
    })
    
    return stats
  }
  
  /**
   * Clear error logs
   */
  clearLogs(): void {
    this.errorQueue = []
    if (typeof window !== 'undefined') {
      localStorage.removeItem('template_error_logs')
    }
  }
  
  /**
   * Export error logs
   */
  exportLogs(): TemplateErrorLogEntry[] {
    return this.getStoredLogs()
  }
  
  /**
   * Flush error queue immediately
   */
  flush(): void {
    if (this.errorQueue.length === 0) return
    
    const batch = this.errorQueue.splice(0, this.config.batchSize)
    
    // Send to external services
    this.sendToPostHog(batch)
    this.sendToSentry(batch)
    
    // Continue flushing if there are more errors
    if (this.errorQueue.length > 0) {
      setTimeout(() => this.flush(), 100)
    }
  }
  
  /**
   * Initialize error reporting services
   */
  private initializeServices(): void {
    // PostHog initialization is handled by the app
    // Sentry would be initialized here if enabled
    if (this.config.enableSentry) {
      // Initialize Sentry SDK
      console.log('Sentry error reporting would be initialized here')
    }
  }
  
  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  /**
   * Generate unique log ID
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  /**
   * Get current environment
   */
  private getEnvironment(): 'development' | 'staging' | 'production' {
    if (process.env.NODE_ENV === 'development') return 'development'
    if (process.env.NEXT_PUBLIC_VERCEL_ENV === 'preview') return 'staging'
    return 'production'
  }
  
  /**
   * Check if error is critical
   */
  private isCriticalError(type: TemplateErrorType): boolean {
    const criticalErrors = [
      TemplateErrorType.SYSTEM_ERROR,
      TemplateErrorType.DATABASE_ERROR,
      TemplateErrorType.EDITOR_CONTENT_CORRUPTION,
      TemplateErrorType.PERMISSION_DENIED
    ]
    return criticalErrors.includes(type)
  }
  
  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      if (this.errorQueue.length > 0) {
        this.flush()
      }
    }, this.config.flushInterval)
  }
  
  /**
   * Flush immediately for critical errors
   */
  private flushImmediately(logEntry: TemplateErrorLogEntry): void {
    this.sendToPostHog([logEntry])
    this.sendToSentry([logEntry])
  }
  
  /**
   * Log to console
   */
  private logToConsole(logEntry: TemplateErrorLogEntry): void {
    const { error } = logEntry
    
    console.group(`🔴 Template Error: ${error.type}`)
    console.error('Message:', error.message)
    console.error('Details:', error.details)
    console.error('Context:', error.context)
    console.error('Timestamp:', logEntry.timestamp.toISOString())
    console.error('Session:', logEntry.sessionId)
    if (logEntry.url) console.error('URL:', logEntry.url)
    console.groupEnd()
  }
  
  /**
   * Log to local storage
   */
  private logToLocalStorage(logEntry: TemplateErrorLogEntry): void {
    if (typeof window === 'undefined') return
    
    try {
      const existingLogs = this.getStoredLogs()
      const updatedLogs = [...existingLogs, logEntry]
        .slice(-this.config.maxLocalStorageEntries)
      
      localStorage.setItem('template_error_logs', JSON.stringify(updatedLogs))
    } catch (error) {
      console.warn('Failed to store error log in localStorage:', error)
    }
  }
  
  /**
   * Get stored logs from local storage
   */
  private getStoredLogs(): TemplateErrorLogEntry[] {
    if (typeof window === 'undefined') return []
    
    try {
      const stored = localStorage.getItem('template_error_logs')
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.warn('Failed to retrieve error logs from localStorage:', error)
      return []
    }
  }
  
  /**
   * Send errors to PostHog
   */
  private sendToPostHog(logs: TemplateErrorLogEntry[]): void {
    if (!this.config.enablePostHog || typeof window === 'undefined') return
    
    const posthog = (window as any).posthog
    if (!posthog) return
    
    logs.forEach(log => {
      posthog.capture('template_error', {
        error_type: log.error.type,
        error_message: log.error.message,
        error_context: log.error.context,
        error_recoverable: log.error.recoverable,
        session_id: log.sessionId,
        timestamp: log.timestamp.toISOString(),
        environment: log.environment,
        build_version: log.buildVersion,
        url: log.url,
        user_agent: log.userAgent
      })
    })
  }
  
  /**
   * Send errors to Sentry
   */
  private sendToSentry(logs: TemplateErrorLogEntry[]): void {
    if (!this.config.enableSentry) return
    
    // Sentry integration would go here
    logs.forEach(log => {
      console.log('Would send to Sentry:', log)
    })
  }
  
  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    this.flush() // Final flush
  }
}

/**
 * Error Reporting Utilities
 */
export class TemplateErrorReporter {
  private static logger = TemplateErrorLogger.getInstance()
  
  /**
   * Report template error
   */
  static reportError(error: TemplateError): void {
    this.logger.logError(error)
  }
  
  /**
   * Get error dashboard data
   */
  static getDashboardData(): ErrorStatistics {
    return this.logger.getStatistics()
  }
  
  /**
   * Generate error report
   */
  static generateReport(): {
    summary: string
    statistics: ErrorStatistics
    recommendations: string[]
  } {
    const stats = this.logger.getStatistics()
    
    const summary = `
Template Error Report
Generated: ${new Date().toISOString()}
Total Errors: ${stats.totalErrors}
Critical Errors: ${stats.criticalErrors.length}
Most Common Error: ${this.getMostCommonError(stats.errorsByType)}
    `.trim()
    
    const recommendations = this.generateRecommendations(stats)
    
    return {
      summary,
      statistics: stats,
      recommendations
    }
  }
  
  /**
   * Get most common error type
   */
  private static getMostCommonError(errorsByType: Record<TemplateErrorType, number>): string {
    const entries = Object.entries(errorsByType)
    if (entries.length === 0) return 'None'
    
    const [mostCommon] = entries.reduce((a, b) => a[1] > b[1] ? a : b)
    return mostCommon
  }
  
  /**
   * Generate recommendations based on error patterns
   */
  private static generateRecommendations(stats: ErrorStatistics): string[] {
    const recommendations: string[] = []
    
    // Check for high error rates
    if (stats.totalErrors > 50) {
      recommendations.push('High error rate detected - consider reviewing template system stability')
    }
    
    // Check for critical errors
    if (stats.criticalErrors.length > 0) {
      recommendations.push('Critical errors detected - immediate attention required')
    }
    
    // Check for specific error patterns
    const saveErrors = stats.errorsByType[TemplateErrorType.TEMPLATE_SAVE_FAILED] || 0
    if (saveErrors > 10) {
      recommendations.push('High number of save failures - check database connectivity and permissions')
    }
    
    const loadErrors = stats.errorsByType[TemplateErrorType.TEMPLATE_LOAD_FAILED] || 0
    if (loadErrors > 10) {
      recommendations.push('High number of load failures - check data integrity and access permissions')
    }
    
    const editorErrors = stats.errorsByType[TemplateErrorType.EDITOR_INITIALIZATION_FAILED] || 0
    if (editorErrors > 5) {
      recommendations.push('Editor initialization issues - check browser compatibility and dependencies')
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Error levels are within normal parameters')
    }
    
    return recommendations
  }
}

// Initialize global error logger
if (typeof window !== 'undefined') {
  // Initialize logger when in browser environment
  TemplateErrorLogger.getInstance()
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    TemplateErrorLogger.getInstance().destroy()
  })
}