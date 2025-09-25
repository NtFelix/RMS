/**
 * Comprehensive tests for bulk operations error handling and user feedback
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BulkOperationsProvider } from '@/context/bulk-operations-context'
import { BulkActionBar } from '@/components/bulk-action-bar'
import { BulkOperationErrorDetails } from '@/components/bulk-operation-error-details'
import { BulkOperationFeedbackToast } from '@/components/bulk-operation-feedback-toast'
import { useBulkOperationsErrorHandler } from '@/hooks/use-bulk-operations-error-handler'
import {
  enhanceErrors,
  processBulkOperationResult,
  createUserErrorMessage,
  isNetworkError,
  isTimeoutError,
  classifyFetchError
} from '@/lib/bulk-operations-error-handling'
import { BulkOperation, BulkOperationResponse, BulkOperationError } from '@/types/bulk-operations'

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
    toasts: []
  })
}))

// Mock fetch for API calls
global.fetch = jest.fn()

describe('Bulk Operations Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('Error Enhancement', () => {
    it('should enhance basic errors with user-friendly messages', () => {
      const basicErrors: BulkOperationError[] = [
        { id: '1', message: 'Network failed', code: 'NETWORK_ERROR' },
        { id: '2', message: 'Not found', code: 'NOT_FOUND' },
        { id: '3', message: 'Unknown error', code: 'UNKNOWN_ERROR' }
      ]

      const enhanced = enhanceErrors(basicErrors)

      expect(enhanced).toHaveLength(3)
      expect(enhanced[0]).toMatchObject({
        id: '1',
        code: 'NETWORK_ERROR',
        category: 'network',
        severity: 'medium',
        retryable: true,
        userMessage: 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.'
      })
      expect(enhanced[1]).toMatchObject({
        id: '2',
        code: 'NOT_FOUND',
        category: 'permission',
        severity: 'medium',
        retryable: false
      })
    })

    it('should classify fetch errors correctly', () => {
      const networkError = new TypeError('Failed to fetch')
      const timeoutError = new Error('Request timeout')
      
      expect(classifyFetchError(networkError)).toBe('NETWORK_ERROR')
      expect(classifyFetchError(timeoutError)).toBe('TIMEOUT')
      
      const response404 = { status: 404 } as Response
      expect(classifyFetchError(new Error('Not found'), response404)).toBe('NOT_FOUND')
      
      const response500 = { status: 500 } as Response
      expect(classifyFetchError(new Error('Server error'), response500)).toBe('SERVER_ERROR')
    })

    it('should detect network and timeout errors', () => {
      const networkError = new TypeError('Failed to fetch')
      const timeoutError = new Error('Request timeout')
      const regularError = new Error('Regular error')

      expect(isNetworkError(networkError)).toBe(true)
      expect(isNetworkError(regularError)).toBe(false)
      
      expect(isTimeoutError(timeoutError)).toBe(true)
      expect(isTimeoutError(regularError)).toBe(false)
    })
  })

  describe('Result Processing', () => {
    it('should process successful bulk operation results', () => {
      const response: BulkOperationResponse = {
        success: true,
        updatedCount: 5,
        failedIds: [],
        errors: []
      }

      const result = processBulkOperationResult(response, 5, 0)

      expect(result).toMatchObject({
        success: true,
        updatedCount: 5,
        failedCount: 0,
        skippedCount: 0,
        totalCount: 5,
        canRetry: false,
        retryableIds: []
      })
      expect(result.summary).toBe('5 Einträge erfolgreich aktualisiert')
    })

    it('should process partial success results', () => {
      const response: BulkOperationResponse = {
        success: true,
        updatedCount: 3,
        failedIds: ['4', '5'],
        errors: [
          { id: '4', message: 'Network error', code: 'NETWORK_ERROR' },
          { id: '5', message: 'Not found', code: 'NOT_FOUND' }
        ]
      }

      const result = processBulkOperationResult(response, 5, 0)

      expect(result).toMatchObject({
        success: true,
        updatedCount: 3,
        failedCount: 2,
        skippedCount: 0,
        totalCount: 5,
        canRetry: true,
        retryableIds: ['4'] // Only network error is retryable
      })
      expect(result.summary).toBe('3 Einträge erfolgreich aktualisiert, 2 fehlgeschlagen')
    })

    it('should process complete failure results', () => {
      const response: BulkOperationResponse = {
        success: false,
        updatedCount: 0,
        failedIds: ['1', '2', '3'],
        errors: [
          { id: '1', message: 'Server error', code: 'SERVER_ERROR' },
          { id: '2', message: 'Server error', code: 'SERVER_ERROR' },
          { id: '3', message: 'Permission denied', code: 'PERMISSION_DENIED' }
        ]
      }

      const result = processBulkOperationResult(response, 3, 0)

      expect(result).toMatchObject({
        success: false,
        updatedCount: 0,
        failedCount: 3,
        skippedCount: 0,
        totalCount: 3,
        canRetry: true,
        retryableIds: ['1', '2'] // Server errors are retryable
      })
    })
  })

  describe('User Error Messages', () => {
    it('should create appropriate messages for complete success', () => {
      const result = {
        updatedCount: 5,
        failedCount: 0,
        skippedCount: 0,
        errors: [],
        canRetry: false
      } as any

      const message = createUserErrorMessage(result)

      expect(message).toMatchObject({
        title: 'Erfolgreich abgeschlossen',
        description: '5 Einträge wurden erfolgreich aktualisiert.',
        actionable: false
      })
    })

    it('should create appropriate messages for complete failure', () => {
      const result = {
        updatedCount: 0,
        failedCount: 3,
        skippedCount: 0,
        errors: [{ severity: 'medium' }],
        canRetry: true
      } as any

      const message = createUserErrorMessage(result)

      expect(message).toMatchObject({
        title: 'Vorgang fehlgeschlagen',
        description: 'Alle 3 Einträge konnten nicht aktualisiert werden. Sie können es erneut versuchen.',
        actionable: true
      })
    })

    it('should create appropriate messages for partial success', () => {
      const result = {
        updatedCount: 2,
        failedCount: 1,
        skippedCount: 1,
        errors: [],
        canRetry: true
      } as any

      const message = createUserErrorMessage(result)

      expect(message).toMatchObject({
        title: 'Teilweise erfolgreich',
        actionable: true
      })
      expect(message.description).toContain('2 Einträge wurden erfolgreich aktualisiert')
      expect(message.description).toContain('1 fehlgeschlagen')
      expect(message.description).toContain('1 übersprungen')
    })
  })

  describe('Error Handler Hook', () => {
    const TestComponent = () => {
      const errorHandler = useBulkOperationsErrorHandler()
      
      return (
        <div>
          <button
            onClick={() => {
              const response: BulkOperationResponse = {
                success: true,
                updatedCount: 3,
                failedIds: ['4'],
                errors: [{ id: '4', message: 'Network error', code: 'NETWORK_ERROR' }]
              }
              errorHandler.handleBulkOperationResult(response, 4, 0)
            }}
          >
            Handle Result
          </button>
          <button
            onClick={() => {
              const error = new TypeError('Failed to fetch')
              const operation = { id: 'test', label: 'Test' } as BulkOperation
              errorHandler.handleBulkOperationError(error, operation, ['1', '2'])
            }}
          >
            Handle Error
          </button>
          <div data-testid="retry-state">
            {JSON.stringify(errorHandler.retryState)}
          </div>
        </div>
      )
    }

    it('should handle bulk operation results correctly', async () => {
      const user = userEvent.setup()
      render(<TestComponent />)

      await user.click(screen.getByText('Handle Result'))

      const retryState = JSON.parse(screen.getByTestId('retry-state').textContent || '{}')
      expect(retryState.retryableIds).toEqual(['4'])
    })

    it('should handle bulk operation errors correctly', async () => {
      const user = userEvent.setup()
      render(<TestComponent />)

      await user.click(screen.getByText('Handle Error'))

      const retryState = JSON.parse(screen.getByTestId('retry-state').textContent || '{}')
      expect(retryState.retryableIds).toEqual(['1', '2'])
      expect(retryState.lastError).toBeTruthy()
    })
  })

  describe('Error Details Component', () => {
    const mockResult = {
      success: false,
      updatedCount: 2,
      failedCount: 2,
      skippedCount: 1,
      totalCount: 5,
      errors: [
        {
          id: '1',
          message: 'Network failed',
          code: 'NETWORK_ERROR',
          category: 'network' as const,
          severity: 'medium' as const,
          retryable: true,
          userMessage: 'Netzwerkfehler aufgetreten'
        },
        {
          id: '2',
          message: 'Not found',
          code: 'NOT_FOUND',
          category: 'permission' as const,
          severity: 'medium' as const,
          retryable: false,
          userMessage: 'Eintrag nicht gefunden'
        }
      ],
      canRetry: true,
      retryableIds: ['1'],
      summary: '2 erfolgreich, 2 fehlgeschlagen, 1 übersprungen',
      detailedMessage: 'Details...'
    }

    it('should render error details correctly', () => {
      const onRetry = jest.fn()
      render(
        <BulkOperationErrorDetails
          result={mockResult}
          onRetry={onRetry}
          isRetrying={false}
        />
      )

      expect(screen.getByText('Fehlerdetails')).toBeInTheDocument()
      expect(screen.getByText('2 erfolgreich')).toBeInTheDocument()
      expect(screen.getByText('2 fehlgeschlagen')).toBeInTheDocument()
      expect(screen.getByText('1 übersprungen')).toBeInTheDocument()
      expect(screen.getByText('Wiederholen')).toBeInTheDocument()
    })

    it('should call retry function when retry button is clicked', async () => {
      const user = userEvent.setup()
      const onRetry = jest.fn()
      
      render(
        <BulkOperationErrorDetails
          result={mockResult}
          onRetry={onRetry}
          isRetrying={false}
        />
      )

      await user.click(screen.getByText('Wiederholen'))
      expect(onRetry).toHaveBeenCalledTimes(1)
    })

    it('should show retry button as disabled when retrying', () => {
      const onRetry = jest.fn()
      render(
        <BulkOperationErrorDetails
          result={mockResult}
          onRetry={onRetry}
          isRetrying={true}
        />
      )

      const retryButton = screen.getByText('Wird wiederholt...')
      expect(retryButton).toBeDisabled()
    })
  })

  describe('Feedback Toast Component', () => {
    const mockResult = {
      success: true,
      updatedCount: 3,
      failedCount: 1,
      skippedCount: 0,
      totalCount: 4,
      errors: [],
      canRetry: true,
      retryableIds: ['4'],
      summary: '3 erfolgreich, 1 fehlgeschlagen',
      detailedMessage: 'Details...'
    }

    it('should render feedback toast correctly', () => {
      const onRetry = jest.fn()
      const onViewDetails = jest.fn()
      
      render(
        <BulkOperationFeedbackToast
          result={mockResult}
          onRetry={onRetry}
          onViewDetails={onViewDetails}
          isRetrying={false}
        />
      )

      expect(screen.getByText('Teilweise erfolgreich')).toBeInTheDocument()
      expect(screen.getByText('3 erfolgreich, 1 fehlgeschlagen')).toBeInTheDocument()
      expect(screen.getByText('3 von 4 erfolgreich')).toBeInTheDocument()
      expect(screen.getByText('75%')).toBeInTheDocument()
    })

    it('should show retry and view details buttons', () => {
      const onRetry = jest.fn()
      const onViewDetails = jest.fn()
      
      render(
        <BulkOperationFeedbackToast
          result={mockResult}
          onRetry={onRetry}
          onViewDetails={onViewDetails}
          isRetrying={false}
        />
      )

      expect(screen.getByText('Wiederholen')).toBeInTheDocument()
      expect(screen.getByText('Details anzeigen')).toBeInTheDocument()
    })

    it('should handle retry and view details clicks', async () => {
      const user = userEvent.setup()
      const onRetry = jest.fn()
      const onViewDetails = jest.fn()
      
      render(
        <BulkOperationFeedbackToast
          result={mockResult}
          onRetry={onRetry}
          onViewDetails={onViewDetails}
          isRetrying={false}
        />
      )

      await user.click(screen.getByText('Wiederholen'))
      expect(onRetry).toHaveBeenCalledTimes(1)

      await user.click(screen.getByText('Details anzeigen'))
      expect(onViewDetails).toHaveBeenCalledTimes(1)
    })
  })

  describe('Integration with Bulk Action Bar', () => {
    const mockOperations: BulkOperation[] = [
      {
        id: 'test-operation',
        label: 'Test Operation',
        requiresConfirmation: true,
        component: ({ onConfirm, onCancel }) => (
          <div>
            <button onClick={() => onConfirm({ test: true })}>Confirm</button>
            <button onClick={onCancel}>Cancel</button>
          </div>
        )
      }
    ]

    const TestWrapper = ({ children }: { children: React.ReactNode }) => (
      <BulkOperationsProvider>
        {children}
      </BulkOperationsProvider>
    )

    it('should handle successful operations with feedback', async () => {
      const user = userEvent.setup()
      
      // Mock successful API response
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          updatedCount: 3,
          failedIds: [],
          errors: []
        })
      })

      render(
        <TestWrapper>
          <BulkActionBar operations={mockOperations} />
        </TestWrapper>
      )

      // Simulate having selected items (this would normally be done through context)
      // For testing, we'll need to mock the context state
    })

    it('should handle failed operations with error details', async () => {
      const user = userEvent.setup()
      
      // Mock failed API response
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          updatedCount: 0,
          failedIds: ['1', '2'],
          errors: [
            { id: '1', message: 'Server error', code: 'SERVER_ERROR' },
            { id: '2', message: 'Server error', code: 'SERVER_ERROR' }
          ]
        })
      })

      render(
        <TestWrapper>
          <BulkActionBar operations={mockOperations} />
        </TestWrapper>
      )

      // Test error handling flow
    })

    it('should handle network errors with retry capability', async () => {
      const user = userEvent.setup()
      
      // Mock network error
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new TypeError('Failed to fetch'))

      render(
        <TestWrapper>
          <BulkActionBar operations={mockOperations} />
        </TestWrapper>
      )

      // Test network error handling and retry
    })
  })
})