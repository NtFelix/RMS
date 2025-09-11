/**
 * Comprehensive test suite for template error handling system
 * Tests error boundaries, error handlers, and recovery mechanisms
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from '@/hooks/use-toast'
import { TemplateErrorBoundary, TemplateOperationErrorBoundary, useErrorHandler } from '@/components/template-error-boundary'
import { useTemplateErrorHandling, useTemplateLoadingErrorHandling, useTemplateDeletionErrorHandling, useTemplateSearchErrorHandling, useNetworkErrorHandling } from '@/hooks/use-template-error-handling'
import { TemplatesModalErrorHandler, TemplatesModalErrorType } from '@/lib/template-error-handler'

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
  useToast: () => ({ toast: jest.fn() })
}))

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

beforeEach(() => {
  console.error = jest.fn()
  console.warn = jest.fn()
  jest.clearAllMocks()
  TemplatesModalErrorHandler.clearErrorLog()
})

afterEach(() => {
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
})

describe('TemplatesModalErrorHandler', () => {
  describe('Error Logging', () => {
    test('should log errors with proper structure', () => {
      const testError = new Error('Test error')
      
      TemplatesModalErrorHandler.handleLoadError(testError)
      
      const errorLog = TemplatesModalErrorHandler.getErrorLog()
      expect(errorLog).toHaveLength(1)
      expect(errorLog[0]).toMatchObject({
        type: TemplatesModalErrorType.LOAD_TEMPLATES_ERROR,
        message: 'Test error',
        recoverable: true,
        userMessage: 'Vorlagen konnten nicht geladen werden'
      })
      expect(errorLog[0].timestamp).toBeInstanceOf(Date)
    })

    test('should maintain error log size limit', () => {
      // Add more than 100 errors
      for (let i = 0; i < 105; i++) {
        TemplatesModalErrorHandler.handleLoadError(new Error(`Error ${i}`))
      }
      
      const errorLog = TemplatesModalErrorHandler.getErrorLog()
      expect(errorLog).toHaveLength(100)
      expect(errorLog[0].message).toBe('Error 5') // First 5 should be removed
    })

    test('should clear error log', () => {
      TemplatesModalErrorHandler.handleLoadError(new Error('Test'))
      expect(TemplatesModalErrorHandler.getErrorLog()).toHaveLength(1)
      
      TemplatesModalErrorHandler.clearErrorLog()
      expect(TemplatesModalErrorHandler.getErrorLog()).toHaveLength(0)
    })
  })

  describe('Specific Error Handlers', () => {
    test('should handle load errors correctly', () => {
      const testError = new Error('Load failed')
      
      TemplatesModalErrorHandler.handleLoadError(testError, { userId: 'test-user' })
      
      expect(toast).toHaveBeenCalledWith({
        title: 'Fehler beim Laden der Vorlagen',
        description: 'Die Vorlagen konnten nicht geladen werden. Bitte versuchen Sie es erneut.',
        variant: 'destructive',
        action: {
          altText: 'Erneut versuchen',
          onClick: expect.any(Function)
        }
      })
    })

    test('should handle delete errors with retry callback', () => {
      const testError = new Error('Delete failed')
      const retryCallback = jest.fn()
      
      TemplatesModalErrorHandler.handleDeleteError(testError, 'Test Template', retryCallback)
      
      expect(toast).toHaveBeenCalledWith({
        title: 'Löschen fehlgeschlagen',
        description: 'Die Vorlage "Test Template" konnte nicht gelöscht werden. Bitte versuchen Sie es erneut.',
        variant: 'destructive',
        action: {
          altText: 'Erneut versuchen',
          onClick: retryCallback
        }
      })
    })

    test('should handle search errors', () => {
      const testError = new Error('Search failed')
      
      TemplatesModalErrorHandler.handleSearchError(testError, 'test query')
      
      expect(toast).toHaveBeenCalledWith({
        title: 'Suche fehlgeschlagen',
        description: 'Die Suche konnte nicht ausgeführt werden. Bitte versuchen Sie es erneut.',
        variant: 'destructive'
      })
    })

    test('should handle network errors', () => {
      const testError = new Error('Network error')
      
      TemplatesModalErrorHandler.handleNetworkError(testError, 'load templates')
      
      expect(toast).toHaveBeenCalledWith({
        title: 'Verbindungsfehler',
        description: 'Es gab ein Problem mit der Internetverbindung. Bitte überprüfen Sie Ihre Verbindung und versuchen Sie es erneut.',
        variant: 'destructive',
        action: {
          altText: 'Erneut versuchen',
          onClick: expect.any(Function)
        }
      })
    })

    test('should handle permission errors', () => {
      const testError = new Error('Permission denied')
      
      TemplatesModalErrorHandler.handlePermissionError(testError, 'delete template')
      
      expect(toast).toHaveBeenCalledWith({
        title: 'Keine Berechtigung',
        description: 'Sie haben keine Berechtigung für diese Aktion. Bitte wenden Sie sich an den Administrator.',
        variant: 'destructive'
      })
    })
  })

  describe('Generic Error Handler', () => {
    test('should detect error types from error messages', () => {
      const networkError = new Error('network timeout')
      TemplatesModalErrorHandler.handleGenericError(networkError, 'test operation')
      
      const errorLog = TemplatesModalErrorHandler.getErrorLog()
      expect(errorLog[0].type).toBe(TemplatesModalErrorType.NETWORK_ERROR)
    })

    test('should detect permission errors', () => {
      const permissionError = new Error('unauthorized access')
      TemplatesModalErrorHandler.handleGenericError(permissionError, 'test operation')
      
      const errorLog = TemplatesModalErrorHandler.getErrorLog()
      expect(errorLog[0].type).toBe(TemplatesModalErrorType.PERMISSION_ERROR)
    })

    test('should detect operation-specific errors', () => {
      const searchError = new Error('search failed')
      TemplatesModalErrorHandler.handleGenericError(searchError, 'search templates')
      
      const errorLog = TemplatesModalErrorHandler.getErrorLog()
      expect(errorLog[0].type).toBe(TemplatesModalErrorType.SEARCH_ERROR)
    })
  })

  describe('Retry Mechanism', () => {
    test('should create retry mechanism with exponential backoff', async () => {
      let attempts = 0
      const operation = jest.fn().mockImplementation(async () => {
        attempts++
        if (attempts < 3) {
          throw new Error('Operation failed')
        }
        return 'success'
      })

      const retryOperation = TemplatesModalErrorHandler.createRetryMechanism(operation, 3, 100)
      
      const startTime = Date.now()
      await retryOperation() // Don't expect return value, just that it completes
      const endTime = Date.now()
      
      expect(attempts).toBe(3)
      expect(endTime - startTime).toBeGreaterThan(300) // Should have delays
    })

    test('should throw error after max retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Always fails'))
      const retryOperation = TemplatesModalErrorHandler.createRetryMechanism(operation, 2, 50)
      
      await expect(retryOperation()).rejects.toThrow('Always fails')
      expect(operation).toHaveBeenCalledTimes(2)
    })
  })
})

describe('TemplateErrorBoundary', () => {
  // Component that throws an error
  const ErrorComponent = ({ shouldError }: { shouldError: boolean }) => {
    if (shouldError) {
      throw new Error('Test error')
    }
    return <div>No error</div>
  }

  test('should render children when no error occurs', () => {
    render(
      <TemplateErrorBoundary>
        <ErrorComponent shouldError={false} />
      </TemplateErrorBoundary>
    )
    
    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  test('should render error UI when error occurs', () => {
    render(
      <TemplateErrorBoundary>
        <ErrorComponent shouldError={true} />
      </TemplateErrorBoundary>
    )
    
    expect(screen.getByText('Vorlagen konnten nicht geladen werden')).toBeInTheDocument()
    expect(screen.getByText('Erneut versuchen')).toBeInTheDocument()
    expect(screen.getByText('Seite neu laden')).toBeInTheDocument()
  })

  test('should call onError callback when error occurs', () => {
    const onError = jest.fn()
    
    render(
      <TemplateErrorBoundary onError={onError}>
        <ErrorComponent shouldError={true} />
      </TemplateErrorBoundary>
    )
    
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    )
  })

  test('should render custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>
    
    render(
      <TemplateErrorBoundary fallback={customFallback}>
        <ErrorComponent shouldError={true} />
      </TemplateErrorBoundary>
    )
    
    expect(screen.getByText('Custom error message')).toBeInTheDocument()
  })

  test('should recover when retry button is clicked', async () => {
    const user = userEvent.setup()
    
    const { rerender } = render(
      <TemplateErrorBoundary>
        <ErrorComponent shouldError={true} />
      </TemplateErrorBoundary>
    )
    
    expect(screen.getByText('Vorlagen konnten nicht geladen werden')).toBeInTheDocument()
    
    const retryButton = screen.getByText('Erneut versuchen')
    await user.click(retryButton)
    
    // Re-render with no error
    rerender(
      <TemplateErrorBoundary>
        <ErrorComponent shouldError={false} />
      </TemplateErrorBoundary>
    )
    
    expect(screen.getByText('No error')).toBeInTheDocument()
  })
})

describe('TemplateOperationErrorBoundary', () => {
  const ErrorComponent = ({ shouldError }: { shouldError: boolean }) => {
    if (shouldError) {
      throw new Error('Operation error')
    }
    return <div>Operation successful</div>
  }

  test('should render operation-specific error message', () => {
    const onRetry = jest.fn()
    
    render(
      <TemplateOperationErrorBoundary operation="test operation" onRetry={onRetry}>
        <ErrorComponent shouldError={true} />
      </TemplateOperationErrorBoundary>
    )
    
    expect(screen.getByText('Fehler bei: test operation')).toBeInTheDocument()
    expect(screen.getByText('Erneut versuchen')).toBeInTheDocument()
  })

  test('should call onRetry when retry button is clicked', async () => {
    const user = userEvent.setup()
    const onRetry = jest.fn()
    
    render(
      <TemplateOperationErrorBoundary operation="test operation" onRetry={onRetry}>
        <ErrorComponent shouldError={true} />
      </TemplateOperationErrorBoundary>
    )
    
    const retryButton = screen.getByText('Erneut versuchen')
    await user.click(retryButton)
    
    expect(onRetry).toHaveBeenCalled()
  })
})

describe('useTemplateErrorHandling', () => {
  const TestComponent = () => {
    const { executeWithErrorHandling, isLoading, error, retryCount } = useTemplateErrorHandling({
      maxRetries: 2,
      retryDelay: 50
    })
    
    const [result, setResult] = React.useState<string | null>(null)
    
    const handleOperation = async () => {
      const operation = async () => {
        if (Math.random() > 0.5) {
          throw new Error('Random error')
        }
        return 'success'
      }
      
      const result = await executeWithErrorHandling(operation, 'test operation')
      setResult(result)
    }
    
    return (
      <div>
        <button onClick={handleOperation}>Execute Operation</button>
        <div>Loading: {isLoading.toString()}</div>
        <div>Error: {error?.message || 'none'}</div>
        <div>Retry Count: {retryCount}</div>
        <div>Result: {result || 'none'}</div>
      </div>
    )
  }

  test('should handle successful operations', async () => {
    const user = userEvent.setup()
    
    // Mock Math.random to always succeed
    jest.spyOn(Math, 'random').mockReturnValue(0.3)
    
    render(<TestComponent />)
    
    const button = screen.getByText('Execute Operation')
    await user.click(button)
    
    await waitFor(() => {
      expect(screen.getByText('Result: success')).toBeInTheDocument()
      expect(screen.getByText('Loading: false')).toBeInTheDocument()
      expect(screen.getByText('Error: none')).toBeInTheDocument()
    })
    
    jest.restoreAllMocks()
  })

  test('should handle failed operations with retries', async () => {
    const user = userEvent.setup()
    
    // Mock Math.random to always fail
    jest.spyOn(Math, 'random').mockReturnValue(0.8)
    
    render(<TestComponent />)
    
    const button = screen.getByText('Execute Operation')
    await user.click(button)
    
    await waitFor(() => {
      expect(screen.getByText('Loading: false')).toBeInTheDocument()
      expect(screen.getByText('Error: Random error')).toBeInTheDocument()
      expect(screen.getByText('Retry Count: 3')).toBeInTheDocument() // 2 retries + 1 initial attempt
    }, { timeout: 5000 })
    
    jest.restoreAllMocks()
  })
})

describe('useNetworkErrorHandling', () => {
  const TestComponent = () => {
    const { isOnline, handleNetworkError } = useNetworkErrorHandling()
    
    const handleError = () => {
      handleNetworkError(new Error('Network error'), 'test operation')
    }
    
    return (
      <div>
        <div>Online: {isOnline.toString()}</div>
        <button onClick={handleError}>Trigger Network Error</button>
      </div>
    )
  }

  test('should detect online status', () => {
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    })
    
    render(<TestComponent />)
    
    expect(screen.getByText('Online: true')).toBeInTheDocument()
  })

  test('should handle network errors when offline', async () => {
    const user = userEvent.setup()
    
    // Mock navigator.onLine as false
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    })
    
    render(<TestComponent />)
    
    expect(screen.getByText('Online: false')).toBeInTheDocument()
    
    const button = screen.getByText('Trigger Network Error')
    await user.click(button)
    
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Verbindungsfehler'
      })
    )
  })
})

describe('Error Scenarios Integration', () => {
  test('should handle cascading errors gracefully', async () => {
    let errorCount = 0
    
    const ProblematicComponent = () => {
      errorCount++
      if (errorCount <= 2) {
        throw new Error(`Error ${errorCount}`)
      }
      return <div>Finally working</div>
    }
    
    const { rerender } = render(
      <TemplateErrorBoundary>
        <ProblematicComponent />
      </TemplateErrorBoundary>
    )
    
    // First error
    expect(screen.getByText('Vorlagen konnten nicht geladen werden')).toBeInTheDocument()
    
    // Retry
    const retryButton = screen.getByText('Erneut versuchen')
    fireEvent.click(retryButton)
    
    // Re-render to simulate retry
    rerender(
      <TemplateErrorBoundary>
        <ProblematicComponent />
      </TemplateErrorBoundary>
    )
    
    // Should still show error for second failure
    expect(screen.getByText('Vorlagen konnten nicht geladen werden')).toBeInTheDocument()
    
    // Another retry
    fireEvent.click(screen.getByText('Erneut versuchen'))
    
    rerender(
      <TemplateErrorBoundary>
        <ProblematicComponent />
      </TemplateErrorBoundary>
    )
    
    // Should finally work
    expect(screen.getByText('Finally working')).toBeInTheDocument()
  })

  test('should maintain error log across multiple errors', () => {
    const errors = [
      new Error('Load error'),
      new Error('Delete error'),
      new Error('Search error')
    ]
    
    TemplatesModalErrorHandler.handleLoadError(errors[0])
    TemplatesModalErrorHandler.handleDeleteError(errors[1], 'Test Template')
    TemplatesModalErrorHandler.handleSearchError(errors[2], 'test query')
    
    const errorLog = TemplatesModalErrorHandler.getErrorLog()
    expect(errorLog).toHaveLength(3)
    expect(errorLog[0].type).toBe(TemplatesModalErrorType.LOAD_TEMPLATES_ERROR)
    expect(errorLog[1].type).toBe(TemplatesModalErrorType.DELETE_TEMPLATE_ERROR)
    expect(errorLog[2].type).toBe(TemplatesModalErrorType.SEARCH_ERROR)
  })
})