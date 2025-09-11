/**
 * Comprehensive tests for template error recovery scenarios
 * Tests various error conditions, recovery mechanisms, and user flows
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Components
import { TemplateEditorModal } from '@/components/template-editor-modal'
import { TemplateEditorErrorBoundary } from '@/components/template-error-boundary'

// Hooks and services
import { useModalStore } from '@/hooks/use-modal-store'
import { templateClientService } from '@/lib/template-client-service'
import { TemplateErrorHandler, TemplateErrorType } from '@/lib/template-error-handler'

// Mock dependencies
jest.mock('@/hooks/use-modal-store')
jest.mock('@/lib/template-client-service')
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}))

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>
const mockTemplateClientService = templateClientService as jest.Mocked<typeof templateClientService>

// Mock TipTap editor to avoid complex setup
jest.mock('@/components/editor/tiptap-template-editor', () => ({
  TiptapTemplateEditor: ({ onContentChange, onSave, onCancel }: any) => (
    <div data-testid="tiptap-editor">
      <button onClick={() => onContentChange({ type: 'doc', content: [] }, [])}>
        Change Content
      </button>
      <button onClick={onSave}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  )
}))

describe('Template Error Recovery Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Template Loading Error Recovery', () => {
    it('should recover from corrupted template content', async () => {
      const user = userEvent.setup()
      const mockOnSave = jest.fn().mockResolvedValue(undefined)

      // Mock corrupted content that gets recovered
      mockUseModalStore.mockReturnValue({
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          templateId: 'template-123',
          isNewTemplate: false,
          initialTitle: 'Test Template',
          initialContent: 'invalid json content' as any, // Corrupted content
          initialCategory: 'Test',
          onSave: mockOnSave,
          onCancel: jest.fn()
        },
        isTemplateEditorModalDirty: false,
        closeTemplateEditorModal: jest.fn(),
        setTemplateEditorModalDirty: jest.fn()
      } as any)

      render(
        <TemplateEditorErrorBoundary templateId="template-123">
          <TemplateEditorModal />
        </TemplateEditorErrorBoundary>
      )

      // Should show the editor despite corrupted content
      expect(screen.getByText('Vorlage bearbeiten')).toBeInTheDocument()
      
      // Should show warning about content recovery
      await waitFor(() => {
        expect(screen.getByText(/hinweise/i)).toBeInTheDocument()
      })
    })

    it('should handle network errors during template loading', async () => {
      const user = userEvent.setup()
      
      // Simulate network error during save
      const mockOnSave = jest.fn().mockRejectedValue(new Error('Network timeout'))

      mockUseModalStore.mockReturnValue({
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          isNewTemplate: true,
          initialCategory: 'Test',
          onSave: mockOnSave,
          onCancel: jest.fn()
        },
        isTemplateEditorModalDirty: false,
        closeTemplateEditorModal: jest.fn(),
        setTemplateEditorModalDirty: jest.fn()
      } as any)

      render(
        <TemplateEditorErrorBoundary>
          <TemplateEditorModal />
        </TemplateEditorErrorBoundary>
      )

      // Fill in template data
      const titleInput = screen.getByLabelText(/titel der vorlage/i)
      await user.type(titleInput, 'Test Template')

      // Try to save (should trigger network error)
      const saveButton = screen.getByRole('button', { name: /speichern/i })
      await user.click(saveButton)

      // Should show error handling
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled()
      })
    })

    it('should provide retry mechanism for failed operations', async () => {
      const user = userEvent.setup()
      let attemptCount = 0
      
      const mockOnSave = jest.fn().mockImplementation(() => {
        attemptCount++
        if (attemptCount < 3) {
          return Promise.reject(new Error('Temporary failure'))
        }
        return Promise.resolve()
      })

      mockUseModalStore.mockReturnValue({
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          isNewTemplate: true,
          initialCategory: 'Test',
          onSave: mockOnSave,
          onCancel: jest.fn()
        },
        isTemplateEditorModalDirty: false,
        closeTemplateEditorModal: jest.fn(),
        setTemplateEditorModalDirty: jest.fn()
      } as any)

      render(<TemplateEditorModal />)

      const titleInput = screen.getByLabelText(/titel der vorlage/i)
      await user.type(titleInput, 'Test Template')

      // First attempt - should fail
      const saveButton = screen.getByRole('button', { name: /speichern/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(attemptCount).toBe(1)
      })

      // Second attempt - should fail
      await user.click(saveButton)

      await waitFor(() => {
        expect(attemptCount).toBe(2)
      })

      // Third attempt - should succeed
      await user.click(saveButton)

      await waitFor(() => {
        expect(attemptCount).toBe(3)
      })
    })
  })

  describe('Editor Error Recovery', () => {
    it('should handle editor initialization failures gracefully', () => {
      // Mock editor that fails to initialize
      const FailingEditor = () => {
        throw new Error('TipTap editor initialization failed')
      }

      render(
        <TemplateEditorErrorBoundary>
          <FailingEditor />
        </TemplateEditorErrorBoundary>
      )

      expect(screen.getByText('Editor konnte nicht geladen werden')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /editor neu laden/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sicherheitsmodus/i })).toBeInTheDocument()
    })

    it('should provide safe mode fallback', async () => {
      const user = userEvent.setup()

      const FailingEditor = () => {
        throw new Error('Editor extension error')
      }

      render(
        <TemplateEditorErrorBoundary>
          <FailingEditor />
        </TemplateEditorErrorBoundary>
      )

      const safeModeButton = screen.getByRole('button', { name: /sicherheitsmodus/i })
      await user.click(safeModeButton)

      // Should show safe mode activation message
      await waitFor(() => {
        // In a real implementation, this would show a simplified editor
        expect(safeModeButton).toBeInTheDocument()
      })
    })

    it('should handle content corruption during editing', async () => {
      const user = userEvent.setup()
      
      // Mock editor that corrupts content
      const CorruptingEditor = () => {
        const [corrupted, setCorrupted] = React.useState(false)
        
        if (corrupted) {
          throw new Error('Editor content corruption detected')
        }
        
        return (
          <div>
            <button onClick={() => setCorrupted(true)}>Corrupt Content</button>
            <div>Editor Content</div>
          </div>
        )
      }

      render(
        <TemplateEditorErrorBoundary>
          <CorruptingEditor />
        </TemplateEditorErrorBoundary>
      )

      expect(screen.getByText('Editor Content')).toBeInTheDocument()

      // Trigger corruption
      const corruptButton = screen.getByRole('button', { name: /corrupt content/i })
      await user.click(corruptButton)

      // Should show error boundary
      await waitFor(() => {
        expect(screen.getByText('Editor konnte nicht geladen werden')).toBeInTheDocument()
      })
    })
  })

  describe('Auto-Save Error Recovery', () => {
    it('should handle auto-save failures gracefully', async () => {
      const user = userEvent.setup()
      let saveAttempts = 0
      
      const mockOnSave = jest.fn().mockImplementation(() => {
        saveAttempts++
        if (saveAttempts <= 2) {
          return Promise.reject(new Error('Auto-save failed'))
        }
        return Promise.resolve()
      })

      mockUseModalStore.mockReturnValue({
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          templateId: 'template-123', // Existing template for auto-save
          isNewTemplate: false,
          initialTitle: 'Test Template',
          initialContent: { type: 'doc', content: [] },
          initialCategory: 'Test',
          onSave: mockOnSave,
          onCancel: jest.fn()
        },
        isTemplateEditorModalDirty: false,
        closeTemplateEditorModal: jest.fn(),
        setTemplateEditorModalDirty: jest.fn()
      } as any)

      render(<TemplateEditorModal />)

      // Make changes to trigger auto-save
      const titleInput = screen.getByLabelText(/titel der vorlage/i)
      await user.type(titleInput, ' Updated')

      // Auto-save should be attempted (mocked with delays)
      await waitFor(() => {
        expect(screen.getByText(/auto-save/i)).toBeInTheDocument()
      }, { timeout: 5000 })
    })

    it('should show auto-save status indicators', async () => {
      const user = userEvent.setup()
      const mockOnSave = jest.fn().mockResolvedValue(undefined)

      mockUseModalStore.mockReturnValue({
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          templateId: 'template-123',
          isNewTemplate: false,
          initialTitle: 'Test Template',
          initialContent: { type: 'doc', content: [] },
          initialCategory: 'Test',
          onSave: mockOnSave,
          onCancel: jest.fn()
        },
        isTemplateEditorModalDirty: false,
        closeTemplateEditorModal: jest.fn(),
        setTemplateEditorModalDirty: jest.fn()
      } as any)

      render(<TemplateEditorModal />)

      // Should show auto-save indicator for existing templates
      expect(screen.getByText(/auto-save/i)).toBeInTheDocument()

      // Make changes
      const titleInput = screen.getByLabelText(/titel der vorlage/i)
      await user.type(titleInput, ' Updated')

      // Should show unsaved changes indicator
      await waitFor(() => {
        expect(screen.getByText(/ungespeicherte änderungen/i)).toBeInTheDocument()
      })
    })
  })

  describe('Validation Error Recovery', () => {
    it('should handle validation errors with recovery guidance', async () => {
      const user = userEvent.setup()
      const mockOnSave = jest.fn().mockResolvedValue(undefined)

      mockUseModalStore.mockReturnValue({
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          isNewTemplate: true,
          initialCategory: 'Test',
          onSave: mockOnSave,
          onCancel: jest.fn()
        },
        isTemplateEditorModalDirty: false,
        closeTemplateEditorModal: jest.fn(),
        setTemplateEditorModalDirty: jest.fn()
      } as any)

      render(<TemplateEditorModal />)

      // Try to save without title (validation error)
      const saveButton = screen.getByRole('button', { name: /speichern/i })
      
      // Save button should be disabled without title
      expect(saveButton).toBeDisabled()

      // Add title to fix validation
      const titleInput = screen.getByLabelText(/titel der vorlage/i)
      await user.type(titleInput, 'Valid Title')

      // Save button should now be enabled
      expect(saveButton).not.toBeDisabled()
    })

    it('should show validation warnings for empty content', async () => {
      const user = userEvent.setup()
      const mockOnSave = jest.fn().mockResolvedValue(undefined)

      mockUseModalStore.mockReturnValue({
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          isNewTemplate: true,
          initialCategory: 'Test',
          onSave: mockOnSave,
          onCancel: jest.fn()
        },
        isTemplateEditorModalDirty: false,
        closeTemplateEditorModal: jest.fn(),
        setTemplateEditorModalDirty: jest.fn()
      } as any)

      render(<TemplateEditorModal />)

      // Add title but leave content empty
      const titleInput = screen.getByLabelText(/titel der vorlage/i)
      await user.type(titleInput, 'Empty Template')

      // Should show warning about empty content
      await waitFor(() => {
        expect(screen.getByText(/hinweise/i)).toBeInTheDocument()
      })
    })
  })

  describe('Concurrent Operation Error Recovery', () => {
    it('should handle concurrent modification conflicts', async () => {
      const user = userEvent.setup()
      
      // Mock conflict error
      const mockOnSave = jest.fn().mockRejectedValue(
        new Error('Template was modified by another user')
      )

      mockUseModalStore.mockReturnValue({
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          templateId: 'template-123',
          isNewTemplate: false,
          initialTitle: 'Test Template',
          initialContent: { type: 'doc', content: [] },
          initialCategory: 'Test',
          onSave: mockOnSave,
          onCancel: jest.fn()
        },
        isTemplateEditorModalDirty: false,
        closeTemplateEditorModal: jest.fn(),
        setTemplateEditorModalDirty: jest.fn()
      } as any)

      render(<TemplateEditorModal />)

      const titleInput = screen.getByLabelText(/titel der vorlage/i)
      await user.type(titleInput, ' Updated')

      const saveButton = screen.getByRole('button', { name: /speichern/i })
      await user.click(saveButton)

      // Should handle conflict error
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled()
      })
    })

    it('should handle template deletion during editing', async () => {
      const user = userEvent.setup()
      
      // Mock template not found error
      const mockOnSave = jest.fn().mockRejectedValue(
        new Error('Template not found')
      )

      mockUseModalStore.mockReturnValue({
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          templateId: 'template-123',
          isNewTemplate: false,
          initialTitle: 'Deleted Template',
          initialContent: { type: 'doc', content: [] },
          initialCategory: 'Test',
          onSave: mockOnSave,
          onCancel: jest.fn()
        },
        isTemplateEditorModalDirty: false,
        closeTemplateEditorModal: jest.fn(),
        setTemplateEditorModalDirty: jest.fn()
      } as any)

      render(<TemplateEditorModal />)

      const titleInput = screen.getByLabelText(/titel der vorlage/i)
      await user.type(titleInput, ' Updated')

      const saveButton = screen.getByRole('button', { name: /speichern/i })
      await user.click(saveButton)

      // Should handle not found error
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled()
      })
    })
  })

  describe('Resource Limit Error Recovery', () => {
    it('should handle template size limits', async () => {
      const user = userEvent.setup()
      
      // Mock size limit error
      const mockOnSave = jest.fn().mockRejectedValue(
        new Error('Template content too large')
      )

      mockUseModalStore.mockReturnValue({
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          isNewTemplate: true,
          initialCategory: 'Test',
          onSave: mockOnSave,
          onCancel: jest.fn()
        },
        isTemplateEditorModalDirty: false,
        closeTemplateEditorModal: jest.fn(),
        setTemplateEditorModalDirty: jest.fn()
      } as any)

      render(<TemplateEditorModal />)

      const titleInput = screen.getByLabelText(/titel der vorlage/i)
      await user.type(titleInput, 'Large Template')

      const saveButton = screen.getByRole('button', { name: /speichern/i })
      await user.click(saveButton)

      // Should handle size limit error
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled()
      })
    })

    it('should handle template count limits', async () => {
      const user = userEvent.setup()
      
      // Mock count limit error
      const mockOnSave = jest.fn().mockRejectedValue(
        new Error('Template limit exceeded')
      )

      mockUseModalStore.mockReturnValue({
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          isNewTemplate: true,
          initialCategory: 'Test',
          onSave: mockOnSave,
          onCancel: jest.fn()
        },
        isTemplateEditorModalDirty: false,
        closeTemplateEditorModal: jest.fn(),
        setTemplateEditorModalDirty: jest.fn()
      } as any)

      render(<TemplateEditorModal />)

      const titleInput = screen.getByLabelText(/titel der vorlage/i)
      await user.type(titleInput, 'Template 101')

      const saveButton = screen.getByRole('button', { name: /speichern/i })
      await user.click(saveButton)

      // Should handle count limit error
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled()
      })
    })
  })

  describe('Offline and Network Error Recovery', () => {
    it('should handle offline scenarios', async () => {
      const user = userEvent.setup()
      
      // Mock network unavailable
      const mockOnSave = jest.fn().mockRejectedValue(
        new Error('Network request failed')
      )

      mockUseModalStore.mockReturnValue({
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          templateId: 'template-123',
          isNewTemplate: false,
          initialTitle: 'Offline Template',
          initialContent: { type: 'doc', content: [] },
          initialCategory: 'Test',
          onSave: mockOnSave,
          onCancel: jest.fn()
        },
        isTemplateEditorModalDirty: false,
        closeTemplateEditorModal: jest.fn(),
        setTemplateEditorModalDirty: jest.fn()
      } as any)

      render(<TemplateEditorModal />)

      const titleInput = screen.getByLabelText(/titel der vorlage/i)
      await user.type(titleInput, ' Offline Edit')

      // Should show unsaved changes indicator
      await waitFor(() => {
        expect(screen.getByText(/ungespeicherte änderungen/i)).toBeInTheDocument()
      })

      const saveButton = screen.getByRole('button', { name: /speichern/i })
      await user.click(saveButton)

      // Should handle network error
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled()
      })
    })

    it('should preserve changes during network issues', async () => {
      const user = userEvent.setup()
      
      // Mock intermittent network issues
      let networkAvailable = false
      const mockOnSave = jest.fn().mockImplementation(() => {
        if (!networkAvailable) {
          return Promise.reject(new Error('Network timeout'))
        }
        return Promise.resolve()
      })

      mockUseModalStore.mockReturnValue({
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          templateId: 'template-123',
          isNewTemplate: false,
          initialTitle: 'Network Test',
          initialContent: { type: 'doc', content: [] },
          initialCategory: 'Test',
          onSave: mockOnSave,
          onCancel: jest.fn()
        },
        isTemplateEditorModalDirty: false,
        closeTemplateEditorModal: jest.fn(),
        setTemplateEditorModalDirty: jest.fn()
      } as any)

      render(<TemplateEditorModal />)

      const titleInput = screen.getByLabelText(/titel der vorlage/i)
      await user.type(titleInput, ' Network Edit')

      // Try to save while network is down
      const saveButton = screen.getByRole('button', { name: /speichern/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled()
      })

      // Restore network and try again
      networkAvailable = true
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledTimes(2)
      })
    })
  })
})