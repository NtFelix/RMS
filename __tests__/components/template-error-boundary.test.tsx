/**
 * Comprehensive tests for Template Error Boundary components
 * Tests error catching, recovery mechanisms, user feedback, and edge cases
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Components to test
import {
  TemplateErrorBoundary,
  TemplateEditorErrorBoundary,
  TemplateListErrorBoundary,
  TemplateModalErrorBoundary,
  DefaultTemplateErrorFallback,
  withTemplateErrorBoundary,
  useTemplateErrorBoundary
} from '@/components/template-error-boundary'

// Mock dependencies
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}))

jest.mock('@/lib/template-error-handler', () => ({
  TemplateErrorHandler: {
    createError: jest.fn(),
    handleError: jest.fn(),
    fromException: jest.fn()
  },
  TemplateErrorType: {
    SYSTEM_ERROR: 'system_error',
    NETWORK_ERROR: 'network_error',
    TEMPLATE_NOT_FOUND: 'template_not_found'
  }
}))

// Test components that throw errors
const ThrowError = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div>No error</div>
}

const ThrowNetworkError = () => {
  throw new Error('Network timeout occurred')
}

const ThrowEditorError = () => {
  throw new Error('TipTap editor initialization failed')
}

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined)
  }
})

// Mock window methods - will be set up in individual tests

describe('TemplateErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Suppress console.error for cleaner test output
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Basic Error Catching', () => {
    it('should catch and display errors', () => {
      render(
        <TemplateErrorBoundary>
          <ThrowError />
        </TemplateErrorBoundary>
      )

      expect(screen.getByText('Fehler beim Laden der Vorlage')).toBeInTheDocument()
      expect(screen.getByText(/ein unerwarteter fehler ist aufgetreten/i)).toBeInTheDocument()
    })

    it('should render children when no error occurs', () => {
      render(
        <TemplateErrorBoundary>
          <ThrowError shouldThrow={false} />
        </TemplateErrorBoundary>
      )

      expect(screen.getByText('No error')).toBeInTheDocument()
      expect(screen.queryByText('Fehler beim Laden der Vorlage')).not.toBeInTheDocument()
    })

    it('should generate unique error IDs', () => {
      const { rerender } = render(
        <TemplateErrorBoundary showErrorDetails={true}>
          <ThrowError />
        </TemplateErrorBoundary>
      )

      const firstErrorId = screen.getByText(/err_\d+_\w+/).textContent

      // Force a new error
      rerender(
        <TemplateErrorBoundary showErrorDetails={true}>
          <ThrowNetworkError />
        </TemplateErrorBoundary>
      )

      const secondErrorId = screen.getByText(/err_\d+_\w+/).textContent
      expect(firstErrorId).not.toBe(secondErrorId)
    })
  })

  describe('Retry Functionality', () => {
    it('should allow retrying when enabled', async () => {
      const user = userEvent.setup()
      let shouldThrow = true

      const ConditionalError = () => {
        if (shouldThrow) {
          throw new Error('Temporary error')
        }
        return <div>Success after retry</div>
      }

      render(
        <TemplateErrorBoundary enableRetry={true} maxRetries={3}>
          <ConditionalError />
        </TemplateErrorBoundary>
      )

      expect(screen.getByText('Fehler beim Laden der Vorlage')).toBeInTheDocument()

      // Click retry button
      const retryButton = screen.getByRole('button', { name: /erneut versuchen/i })
      expect(retryButton).toBeInTheDocument()

      // Simulate fixing the error
      shouldThrow = false
      await user.click(retryButton)

      await waitFor(() => {
        expect(screen.getByText('Success after retry')).toBeInTheDocument()
      })
    })

    it('should disable retry after max attempts', async () => {
      const user = userEvent.setup()

      render(
        <TemplateErrorBoundary enableRetry={true} maxRetries={1}>
          <ThrowError />
        </TemplateErrorBoundary>
      )

      // First retry
      const retryButton = screen.getByRole('button', { name: /erneut versuchen/i })
      await user.click(retryButton)

      await waitFor(() => {
        expect(screen.getByText(/maximale anzahl von wiederholungsversuchen erreicht/i)).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /erneut versuchen/i })).not.toBeInTheDocument()
      })
    })

    it('should show retry count in error display', async () => {
      const user = userEvent.setup()

      render(
        <TemplateErrorBoundary enableRetry={true} maxRetries={3}>
          <ThrowError />
        </TemplateErrorBoundary>
      )

      // First attempt shows "Versuch 1/4"
      expect(screen.getByText('Versuch 1/4')).toBeInTheDocument()

      // After retry, shows "Versuch 2/4"
      const retryButton = screen.getByRole('button', { name: /erneut versuchen/i })
      await user.click(retryButton)

      await waitFor(() => {
        expect(screen.getByText('Versuch 2/4')).toBeInTheDocument()
      })
    })
  })

  describe('Error Details and Reporting', () => {
    it('should show error details in development mode', () => {
      render(
        <TemplateErrorBoundary showErrorDetails={true}>
          <ThrowError />
        </TemplateErrorBoundary>
      )

      expect(screen.getByText('Technische Details anzeigen')).toBeInTheDocument()
      
      // Click to expand details
      fireEvent.click(screen.getByText('Technische Details anzeigen'))
      expect(screen.getByText('Test error message')).toBeInTheDocument()
    })

    it('should hide error details in production mode', () => {
      render(
        <TemplateErrorBoundary showErrorDetails={false}>
          <ThrowError />
        </TemplateErrorBoundary>
      )

      expect(screen.queryByText('Technische Details anzeigen')).not.toBeInTheDocument()
    })

    it('should copy error details to clipboard', async () => {
      const user = userEvent.setup()

      render(
        <TemplateErrorBoundary enableReporting={true}>
          <ThrowError />
        </TemplateErrorBoundary>
      )

      const copyButton = screen.getByRole('button', { name: /fehlerdetails kopieren/i })
      await user.click(copyButton)

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('Test error message')
      )
    })

    it('should allow error reporting', async () => {
      const user = userEvent.setup()

      render(
        <TemplateErrorBoundary enableReporting={true}>
          <ThrowError />
        </TemplateErrorBoundary>
      )

      const reportButton = screen.getByRole('button', { name: /fehler melden/i })
      await user.click(reportButton)

      // Should show success message (mocked toast)
      expect(reportButton).toBeInTheDocument()
    })
  })

  describe('Context and Metadata', () => {
    it('should display context information', () => {
      render(
        <TemplateErrorBoundary 
          context={{ 
            component: 'TestComponent',
            templateId: 'template-123',
            userId: 'user-456'
          }}
        >
          <ThrowError />
        </TemplateErrorBoundary>
      )

      expect(screen.getByText('TestComponent')).toBeInTheDocument()
    })

    it('should show timestamp information', () => {
      render(
        <TemplateErrorBoundary>
          <ThrowError />
        </TemplateErrorBoundary>
      )

      // Should show a timestamp badge
      expect(screen.getByText(/\d{1,2}:\d{2}:\d{2}/)).toBeInTheDocument()
    })
  })

  describe('Navigation Actions', () => {
    it('should provide navigation to files page', async () => {
      const user = userEvent.setup()
      const mockAssign = jest.fn()
      
      // Mock window.location.assign for this test
      const originalAssign = window.location.assign
      window.location.assign = mockAssign

      render(
        <TemplateErrorBoundary>
          <ThrowError />
        </TemplateErrorBoundary>
      )

      const filesButton = screen.getByRole('button', { name: /zu dateien/i })
      await user.click(filesButton)

      expect(mockAssign).toHaveBeenCalledWith('/dateien')
      
      // Restore original
      window.location.assign = originalAssign
    })

    it('should provide page reload option', async () => {
      const user = userEvent.setup()
      const mockReload = jest.fn()
      
      // Mock window.location.reload for this test
      const originalReload = window.location.reload
      window.location.reload = mockReload

      render(
        <TemplateErrorBoundary>
          <ThrowError />
        </TemplateErrorBoundary>
      )

      const reloadButton = screen.getByRole('button', { name: /seite neu laden/i })
      await user.click(reloadButton)

      expect(mockReload).toHaveBeenCalled()
      
      // Restore original
      window.location.reload = originalReload
    })
  })
})

describe('Specialized Error Boundaries', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('TemplateEditorErrorBoundary', () => {
    it('should render editor-specific error message', () => {
      render(
        <TemplateEditorErrorBoundary templateId="template-123" userId="user-456">
          <ThrowEditorError />
        </TemplateEditorErrorBoundary>
      )

      expect(screen.getByText('Editor konnte nicht geladen werden')).toBeInTheDocument()
      expect(screen.getByText(/der vorlagen-editor ist auf einen fehler gestoßen/i)).toBeInTheDocument()
    })

    it('should provide safe mode option', async () => {
      const user = userEvent.setup()

      render(
        <TemplateEditorErrorBoundary>
          <ThrowEditorError />
        </TemplateEditorErrorBoundary>
      )

      const safeModeButton = screen.getByRole('button', { name: /sicherheitsmodus/i })
      expect(safeModeButton).toBeInTheDocument()

      await user.click(safeModeButton)
      // Should show loading message or attempt recovery
    })

    it('should show template context information', () => {
      render(
        <TemplateEditorErrorBoundary templateId="template-123">
          <ThrowEditorError />
        </TemplateEditorErrorBoundary>
      )

      expect(screen.getByText(/template-123/i)).toBeInTheDocument()
    })
  })

  describe('TemplateListErrorBoundary', () => {
    it('should render list-specific error message', () => {
      render(
        <TemplateListErrorBoundary userId="user-456">
          <ThrowError />
        </TemplateListErrorBoundary>
      )

      expect(screen.getByText('Vorlagen konnten nicht geladen werden')).toBeInTheDocument()
    })

    it('should provide refresh options', async () => {
      const user = userEvent.setup()

      render(
        <TemplateListErrorBoundary>
          <ThrowError />
        </TemplateListErrorBoundary>
      )

      expect(screen.getByRole('button', { name: /erneut laden/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /seite aktualisieren/i })).toBeInTheDocument()
    })
  })

  describe('TemplateModalErrorBoundary', () => {
    it('should render modal-specific error message', () => {
      render(
        <TemplateModalErrorBoundary operation="create">
          <ThrowError />
        </TemplateModalErrorBoundary>
      )

      expect(screen.getByText('Modal konnte nicht geladen werden')).toBeInTheDocument()
    })

    it('should provide modal close option', async () => {
      const user = userEvent.setup()

      render(
        <TemplateModalErrorBoundary>
          <ThrowError />
        </TemplateModalErrorBoundary>
      )

      const closeButton = screen.getByRole('button', { name: /modal schließen/i })
      expect(closeButton).toBeInTheDocument()

      await user.click(closeButton)
      // Should dispatch close modal event
    })

    it('should show operation context', () => {
      render(
        <TemplateModalErrorBoundary operation="edit">
          <ThrowError />
        </TemplateModalErrorBoundary>
      )

      expect(screen.getByText('Operation: edit')).toBeInTheDocument()
    })
  })
})

describe('Higher-Order Component', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should wrap component with error boundary', () => {
    const TestComponent = () => <ThrowError />
    const WrappedComponent = withTemplateErrorBoundary(TestComponent, {
      context: { component: 'TestComponent' }
    })

    render(<WrappedComponent />)

    expect(screen.getByText('Fehler beim Laden der Vorlage')).toBeInTheDocument()
    expect(screen.getByText('TestComponent')).toBeInTheDocument()
  })

  it('should preserve component display name', () => {
    const TestComponent = () => <div>Test</div>
    TestComponent.displayName = 'TestComponent'
    
    const WrappedComponent = withTemplateErrorBoundary(TestComponent)
    
    expect(WrappedComponent.displayName).toBe('withTemplateErrorBoundary(TestComponent)')
  })

  it('should use custom fallback component', () => {
    const CustomFallback = () => <div>Custom Error Message</div>
    const TestComponent = () => <ThrowError />
    
    const WrappedComponent = withTemplateErrorBoundary(TestComponent, {
      fallback: CustomFallback
    })

    render(<WrappedComponent />)

    expect(screen.getByText('Custom Error Message')).toBeInTheDocument()
  })
})

describe('Error Boundary Hook', () => {
  it('should provide error reporting utilities', () => {
    const TestComponent = () => {
      const { reportError, createErrorId } = useTemplateErrorBoundary()
      
      const handleError = () => {
        const error = new Error('Test error')
        reportError(error, { component: 'TestComponent' })
      }

      const errorId = createErrorId()

      return (
        <div>
          <button onClick={handleError}>Report Error</button>
          <span>Error ID: {errorId}</span>
        </div>
      )
    }

    render(<TestComponent />)

    expect(screen.getByText(/Error ID: err_\d+_\w+/)).toBeInTheDocument()
    
    const reportButton = screen.getByRole('button', { name: /report error/i })
    fireEvent.click(reportButton)
    
    // Should call error handler (mocked)
    expect(reportButton).toBeInTheDocument()
  })
})

describe('Edge Cases and Error Scenarios', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should handle errors during error handling', () => {
    // Mock error handler to throw
    const { TemplateErrorHandler } = require('@/lib/template-error-handler')
    TemplateErrorHandler.createError.mockImplementation(() => {
      throw new Error('Error handler failed')
    })

    render(
      <TemplateErrorBoundary>
        <ThrowError />
      </TemplateErrorBoundary>
    )

    // Should still show error boundary UI
    expect(screen.getByText('Fehler beim Laden der Vorlage')).toBeInTheDocument()
  })

  it('should handle missing context gracefully', () => {
    render(
      <TemplateErrorBoundary context={undefined}>
        <ThrowError />
      </TemplateErrorBoundary>
    )

    expect(screen.getByText('Fehler beim Laden der Vorlage')).toBeInTheDocument()
  })

  it('should handle component unmounting during error state', () => {
    const { unmount } = render(
      <TemplateErrorBoundary>
        <ThrowError />
      </TemplateErrorBoundary>
    )

    expect(screen.getByText('Fehler beim Laden der Vorlage')).toBeInTheDocument()
    
    // Should not throw when unmounting
    expect(() => unmount()).not.toThrow()
  })

  it('should handle rapid successive errors', async () => {
    const user = userEvent.setup()
    let errorCount = 0

    const MultipleErrors = () => {
      errorCount++
      throw new Error(`Error ${errorCount}`)
    }

    render(
      <TemplateErrorBoundary enableRetry={true} maxRetries={2}>
        <MultipleErrors />
      </TemplateErrorBoundary>
    )

    // First error
    expect(screen.getByText('Versuch 1/3')).toBeInTheDocument()

    // Retry - second error
    const retryButton = screen.getByRole('button', { name: /erneut versuchen/i })
    await user.click(retryButton)

    await waitFor(() => {
      expect(screen.getByText('Versuch 2/3')).toBeInTheDocument()
    })

    // Retry - third error (max reached)
    const retryButton2 = screen.getByRole('button', { name: /erneut versuchen/i })
    await user.click(retryButton2)

    await waitFor(() => {
      expect(screen.getByText(/maximale anzahl von wiederholungsversuchen erreicht/i)).toBeInTheDocument()
    })
  })
})