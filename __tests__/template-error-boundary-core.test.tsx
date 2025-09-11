/**
 * Core tests for Template Error Boundary functionality
 * Tests the essential error catching and recovery mechanisms
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
  TemplateModalErrorBoundary
} from '@/components/template-error-boundary'

// Mock dependencies
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}))

jest.mock('@/lib/template-error-handler', () => ({
  TemplateErrorHandler: {
    createError: jest.fn().mockReturnValue({
      type: 'system_error',
      message: 'Test error',
      recoverable: true,
      timestamp: new Date()
    }),
    handleError: jest.fn()
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

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined)
  }
})

describe('Template Error Boundary Core Functionality', () => {
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

    it('should show error ID and timestamp', () => {
      render(
        <TemplateErrorBoundary>
          <ThrowError />
        </TemplateErrorBoundary>
      )

      // Should show error ID badge (use getAllByText since it appears in multiple places)
      expect(screen.getAllByText(/err_\d+_\w+/)).toHaveLength(2) // Badge and help text
      
      // Should show timestamp
      expect(screen.getByText(/\d{1,2}\/\d{1,2}\/\d{4}/)).toBeInTheDocument()
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
  })

  describe('Error Details and Context', () => {
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

    it('should display context information', () => {
      render(
        <TemplateErrorBoundary 
          context={{ 
            component: 'TestComponent',
            templateId: 'template-123'
          }}
        >
          <ThrowError />
        </TemplateErrorBoundary>
      )

      expect(screen.getByText('TestComponent')).toBeInTheDocument()
    })
  })

  describe('Action Buttons', () => {
    it('should provide basic action buttons', () => {
      render(
        <TemplateErrorBoundary enableRetry={true}>
          <ThrowError />
        </TemplateErrorBoundary>
      )

      expect(screen.getByRole('button', { name: /erneut versuchen/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /seite neu laden/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /zu dateien/i })).toBeInTheDocument()
    })

    it('should provide error reporting when enabled', () => {
      render(
        <TemplateErrorBoundary enableReporting={true}>
          <ThrowError />
        </TemplateErrorBoundary>
      )

      expect(screen.getByRole('button', { name: /fehler melden/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /fehlerdetails kopieren/i })).toBeInTheDocument()
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
          <ThrowError />
        </TemplateEditorErrorBoundary>
      )

      expect(screen.getByText('Editor konnte nicht geladen werden')).toBeInTheDocument()
      expect(screen.getByText(/der vorlagen-editor ist auf einen fehler gestoßen/i)).toBeInTheDocument()
    })

    it('should provide editor-specific actions', () => {
      render(
        <TemplateEditorErrorBoundary>
          <ThrowError />
        </TemplateEditorErrorBoundary>
      )

      expect(screen.getByRole('button', { name: /editor neu laden/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sicherheitsmodus/i })).toBeInTheDocument()
    })

    it('should show template context when provided', () => {
      render(
        <TemplateEditorErrorBoundary templateId="template-123">
          <ThrowError />
        </TemplateEditorErrorBoundary>
      )

      // Should show truncated template ID
      expect(screen.getByText(/template:/i)).toBeInTheDocument()
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

    it('should provide list-specific actions', () => {
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

    it('should provide modal-specific actions', () => {
      render(
        <TemplateModalErrorBoundary>
          <ThrowError />
        </TemplateModalErrorBoundary>
      )

      expect(screen.getByRole('button', { name: /modal schließen/i })).toBeInTheDocument()
    })

    it('should show operation context when provided', () => {
      render(
        <TemplateModalErrorBoundary operation="edit">
          <ThrowError />
        </TemplateModalErrorBoundary>
      )

      expect(screen.getByText('Operation: edit')).toBeInTheDocument()
    })
  })
})

describe('Error Boundary Configuration', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should respect enableRetry configuration', () => {
    render(
      <TemplateErrorBoundary enableRetry={false}>
        <ThrowError />
      </TemplateErrorBoundary>
    )

    expect(screen.queryByRole('button', { name: /erneut versuchen/i })).not.toBeInTheDocument()
  })

  it('should respect enableReporting configuration', () => {
    render(
      <TemplateErrorBoundary enableReporting={false}>
        <ThrowError />
      </TemplateErrorBoundary>
    )

    expect(screen.queryByRole('button', { name: /fehler melden/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /fehlerdetails kopieren/i })).not.toBeInTheDocument()
  })

  it('should respect showErrorDetails configuration', () => {
    render(
      <TemplateErrorBoundary showErrorDetails={false}>
        <ThrowError />
      </TemplateErrorBoundary>
    )

    expect(screen.queryByText('Technische Details anzeigen')).not.toBeInTheDocument()
  })

  it('should use default configuration values', () => {
    render(
      <TemplateErrorBoundary>
        <ThrowError />
      </TemplateErrorBoundary>
    )

    // Should have default retry enabled
    expect(screen.getByRole('button', { name: /erneut versuchen/i })).toBeInTheDocument()
    
    // Should have default reporting enabled
    expect(screen.getByRole('button', { name: /fehler melden/i })).toBeInTheDocument()
  })
})

describe('Error Recovery Scenarios', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should handle network errors appropriately', () => {
    render(
      <TemplateErrorBoundary>
        <ThrowNetworkError />
      </TemplateErrorBoundary>
    )

    expect(screen.getByText('Fehler beim Laden der Vorlage')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /erneut versuchen/i })).toBeInTheDocument()
  })

  it('should provide help text with error ID', () => {
    render(
      <TemplateErrorBoundary>
        <ThrowError />
      </TemplateErrorBoundary>
    )

    expect(screen.getByText(/falls das problem weiterhin besteht/i)).toBeInTheDocument()
    expect(screen.getByText(/fehler-id:/i)).toBeInTheDocument()
  })

  it('should handle component unmounting gracefully', () => {
    const { unmount } = render(
      <TemplateErrorBoundary>
        <ThrowError />
      </TemplateErrorBoundary>
    )

    expect(screen.getByText('Fehler beim Laden der Vorlage')).toBeInTheDocument()
    
    // Should not throw when unmounting
    expect(() => unmount()).not.toThrow()
  })
})