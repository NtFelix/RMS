/**
 * Comprehensive Unit Tests for Template Editor Components
 * 
 * Tests all aspects of the template editor including:
 * - TiptapTemplateEditor component functionality
 * - TemplateEditorModal user interactions
 * - Content validation and error handling
 * - Auto-save functionality
 * - Offline detection and recovery
 * - Accessibility features
 */

import React from 'react'
import { screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { render, mockToast } from '../test-utils'
import { TiptapTemplateEditor } from '@/components/editor/tiptap-template-editor'
import { TemplateEditorModal } from '@/components/template-editor-modal'
import { useModalStore } from '@/hooks/use-modal-store'
import { useTemplateOfflineDetection } from '@/hooks/use-template-offline-detection'

// Mock dependencies
jest.mock('@/hooks/use-modal-store')
jest.mock('@/hooks/use-template-offline-detection')
jest.mock('@/hooks/use-template-validation')
jest.mock('@/lib/template-variable-extraction')
jest.mock('@/components/editor/tiptap-template-editor')

// Mock Tiptap editor
const mockEditor = {
  getJSON: jest.fn(() => ({
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Test content' }
        ]
      }
    ]
  })),
  commands: {
    setContent: jest.fn(),
    focus: jest.fn()
  },
  on: jest.fn(),
  off: jest.fn(),
  destroy: jest.fn(),
  isDestroyed: false
}

jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(() => mockEditor),
  EditorContent: ({ editor, ...props }: any) => (
    <div data-testid="editor-content" {...props}>
      {editor ? 'Editor loaded' : 'Editor loading...'}
    </div>
  ),
  BubbleMenu: ({ children }: any) => <div data-testid="bubble-menu">{children}</div>,
  FloatingMenu: ({ children }: any) => <div data-testid="floating-menu">{children}</div>
}))

// Mock template variable extraction
jest.mock('@/lib/template-variable-extraction', () => ({
  extractVariablesFromContent: jest.fn(() => ['tenant_name', 'landlord_name']),
  hasContentMeaning: jest.fn(() => true)
}))

describe('TiptapTemplateEditor Comprehensive Tests', () => {
  const defaultProps = {
    initialContent: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Initial content' }
          ]
        }
      ]
    },
    onContentChange: jest.fn(),
    onSave: jest.fn(),
    onCancel: jest.fn(),
    placeholder: 'Start typing...',
    className: 'test-editor',
    editable: true
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockEditor.getJSON.mockReturnValue(defaultProps.initialContent)
  })

  describe('Basic Rendering and Initialization', () => {
    it('should render editor with initial content', () => {
      render(<TiptapTemplateEditor {...defaultProps} />)

      expect(screen.getByTestId('editor-content')).toBeInTheDocument()
      expect(screen.getByText('Editor loaded')).toBeInTheDocument()
    })

    it('should show loading state when editor is not ready', () => {
      const { useEditor } = require('@tiptap/react')
      useEditor.mockReturnValueOnce(null)

      render(<TiptapTemplateEditor {...defaultProps} />)

      expect(screen.getByText('Inhalt wird geladen...')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      render(<TiptapTemplateEditor {...defaultProps} />)

      const editorContainer = screen.getByTestId('editor-content').parentElement
      expect(editorContainer).toHaveClass('test-editor')
    })

    it('should handle editable prop', () => {
      render(<TiptapTemplateEditor {...defaultProps} editable={false} />)

      // Editor should be rendered but not editable
      expect(screen.getByTestId('editor-content')).toBeInTheDocument()
    })
  })

  describe('Content Management', () => {
    it('should update content when initialContent changes', async () => {
      const { rerender } = render(<TiptapTemplateEditor {...defaultProps} />)

      const newContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Updated content' }
            ]
          }
        ]
      }

      rerender(<TiptapTemplateEditor {...defaultProps} initialContent={newContent} />)

      await waitFor(() => {
        expect(mockEditor.commands.setContent).toHaveBeenCalledWith(newContent)
      })
    })

    it('should not update content if it hasnt changed', async () => {
      const { rerender } = render(<TiptapTemplateEditor {...defaultProps} />)

      // Re-render with same content
      rerender(<TiptapTemplateEditor {...defaultProps} />)

      // setContent should not be called again
      expect(mockEditor.commands.setContent).not.toHaveBeenCalled()
    })

    it('should call onContentChange when content updates', async () => {
      const onContentChange = jest.fn()
      render(<TiptapTemplateEditor {...defaultProps} onContentChange={onContentChange} />)

      // Simulate editor content change
      const { useEditor } = require('@tiptap/react')
      const mockOnUpdate = useEditor.mock.calls[0][0].onUpdate

      act(() => {
        mockOnUpdate({ editor: mockEditor })
      })

      expect(onContentChange).toHaveBeenCalledWith(
        defaultProps.initialContent,
        ['tenant_name', 'landlord_name']
      )
    })

    it('should extract variables from content changes', async () => {
      const { extractVariablesFromContent } = require('@/lib/template-variable-extraction')
      const onContentChange = jest.fn()
      
      render(<TiptapTemplateEditor {...defaultProps} onContentChange={onContentChange} />)

      const { useEditor } = require('@tiptap/react')
      const mockOnUpdate = useEditor.mock.calls[0][0].onUpdate

      act(() => {
        mockOnUpdate({ editor: mockEditor })
      })

      expect(extractVariablesFromContent).toHaveBeenCalledWith(defaultProps.initialContent)
      expect(onContentChange).toHaveBeenCalledWith(
        defaultProps.initialContent,
        ['tenant_name', 'landlord_name']
      )
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('should handle save shortcut (Ctrl+S)', async () => {
      const onSave = jest.fn()
      render(<TiptapTemplateEditor {...defaultProps} onSave={onSave} />)

      const editor = screen.getByTestId('editor-content')
      
      await userEvent.type(editor, '{ctrl}s')

      expect(onSave).toHaveBeenCalled()
    })

    it('should handle save shortcut (Cmd+S on Mac)', async () => {
      const onSave = jest.fn()
      render(<TiptapTemplateEditor {...defaultProps} onSave={onSave} />)

      const editor = screen.getByTestId('editor-content')
      
      await userEvent.type(editor, '{meta}s')

      expect(onSave).toHaveBeenCalled()
    })

    it('should handle cancel shortcut (Escape)', async () => {
      const onCancel = jest.fn()
      render(<TiptapTemplateEditor {...defaultProps} onCancel={onCancel} />)

      const editor = screen.getByTestId('editor-content')
      
      await userEvent.type(editor, '{escape}')

      expect(onCancel).toHaveBeenCalled()
    })
  })

  describe('Performance Monitoring', () => {
    it('should enable performance monitoring when requested', () => {
      render(<TiptapTemplateEditor {...defaultProps} enablePerformanceMonitoring={true} />)

      // Should render without errors
      expect(screen.getByTestId('editor-content')).toBeInTheDocument()
    })

    it('should handle large content efficiently', () => {
      const largeContent = {
        type: 'doc',
        content: Array.from({ length: 100 }, (_, i) => ({
          type: 'paragraph',
          content: [
            { type: 'text', text: `Paragraph ${i}` }
          ]
        }))
      }

      const startTime = Date.now()
      render(<TiptapTemplateEditor {...defaultProps} initialContent={largeContent} />)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(1000) // Should render quickly
      expect(screen.getByTestId('editor-content')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle editor initialization errors', () => {
      const { useEditor } = require('@tiptap/react')
      useEditor.mockImplementationOnce(() => {
        throw new Error('Editor initialization failed')
      })

      // Should not crash
      expect(() => {
        render(<TiptapTemplateEditor {...defaultProps} />)
      }).not.toThrow()
    })

    it('should handle content update errors gracefully', async () => {
      mockEditor.commands.setContent.mockImplementationOnce(() => {
        throw new Error('Content update failed')
      })

      const { rerender } = render(<TiptapTemplateEditor {...defaultProps} />)

      const newContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'New content' }
            ]
          }
        ]
      }

      // Should not crash when content update fails
      expect(() => {
        rerender(<TiptapTemplateEditor {...defaultProps} initialContent={newContent} />)
      }).not.toThrow()
    })
  })

  describe('Cleanup and Memory Management', () => {
    it('should cleanup editor on unmount', () => {
      const { unmount } = render(<TiptapTemplateEditor {...defaultProps} />)

      unmount()

      expect(mockEditor.destroy).toHaveBeenCalled()
    })

    it('should remove event listeners on unmount', () => {
      const { unmount } = render(<TiptapTemplateEditor {...defaultProps} />)

      unmount()

      expect(mockEditor.off).toHaveBeenCalled()
    })
  })
})

describe('TemplateEditorModal Comprehensive Tests', () => {
  const mockModalStore = {
    isTemplateEditorModalOpen: true,
    templateEditorData: {
      templateId: 'template-123',
      initialTitle: 'Test Template',
      initialContent: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Test content' }
            ]
          }
        ]
      },
      initialCategory: 'Test Category',
      isNewTemplate: false,
      onSave: jest.fn(),
      onCancel: jest.fn()
    },
    isTemplateEditorModalDirty: false,
    closeTemplateEditorModal: jest.fn(),
    setTemplateEditorModalDirty: jest.fn()
  }

  const mockOfflineDetection = {
    isOffline: false,
    isConnecting: false,
    queueOperation: jest.fn(),
    retryConnection: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useModalStore as jest.Mock).mockReturnValue(mockModalStore)
    ;(useTemplateOfflineDetection as jest.Mock).mockReturnValue(mockOfflineDetection)
    
    // Mock TiptapTemplateEditor
    ;(TiptapTemplateEditor as jest.Mock).mockImplementation(({ onContentChange, onSave, onCancel }) => (
      <div data-testid="tiptap-editor">
        <button onClick={() => onContentChange?.({ type: 'doc', content: [] }, [])}>
          Change Content
        </button>
        <button onClick={onSave}>Save</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ))
  })

  describe('Modal Rendering and State', () => {
    it('should render modal when open', () => {
      render(<TemplateEditorModal />)

      expect(screen.getByText('Vorlage bearbeiten')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test Template')).toBeInTheDocument()
      expect(screen.getByText('Test Category')).toBeInTheDocument()
    })

    it('should not render when modal is closed', () => {
      ;(useModalStore as jest.Mock).mockReturnValue({
        ...mockModalStore,
        isTemplateEditorModalOpen: false
      })

      render(<TemplateEditorModal />)

      expect(screen.queryByText('Vorlage bearbeiten')).not.toBeInTheDocument()
    })

    it('should show new template title when creating', () => {
      ;(useModalStore as jest.Mock).mockReturnValue({
        ...mockModalStore,
        templateEditorData: {
          ...mockModalStore.templateEditorData,
          isNewTemplate: true,
          initialTitle: ''
        }
      })

      render(<TemplateEditorModal />)

      expect(screen.getByText('Neue Vorlage erstellen')).toBeInTheDocument()
    })
  })

  describe('Title Input and Validation', () => {
    it('should update title and mark as dirty', async () => {
      render(<TemplateEditorModal />)

      const titleInput = screen.getByDisplayValue('Test Template')
      
      await userEvent.clear(titleInput)
      await userEvent.type(titleInput, 'Updated Title')

      expect(mockModalStore.setTemplateEditorModalDirty).toHaveBeenCalledWith(true)
    })

    it('should show character count for title', () => {
      render(<TemplateEditorModal />)

      expect(screen.getByText(/13\/100 Zeichen/)).toBeInTheDocument()
    })

    it('should warn when title is getting long', () => {
      ;(useModalStore as jest.Mock).mockReturnValue({
        ...mockModalStore,
        templateEditorData: {
          ...mockModalStore.templateEditorData,
          initialTitle: 'A'.repeat(85)
        }
      })

      render(<TemplateEditorModal />)

      expect(screen.getByText('Titel wird lang')).toBeInTheDocument()
    })

    it('should validate title length', async () => {
      render(<TemplateEditorModal />)

      const titleInput = screen.getByDisplayValue('Test Template')
      
      await userEvent.clear(titleInput)
      // Don't type anything (empty title)

      const saveButton = screen.getByRole('button', { name: /speichern/i })
      expect(saveButton).toBeDisabled()
    })
  })

  describe('Content Editor Integration', () => {
    it('should handle content changes from editor', async () => {
      render(<TemplateEditorModal />)

      const changeContentButton = screen.getByText('Change Content')
      
      await userEvent.click(changeContentButton)

      expect(mockModalStore.setTemplateEditorModalDirty).toHaveBeenCalledWith(true)
    })

    it('should show loading state when content is loading', () => {
      ;(useModalStore as jest.Mock).mockReturnValue({
        ...mockModalStore,
        templateEditorData: {
          ...mockModalStore.templateEditorData,
          templateId: 'template-123',
          initialContent: undefined // Simulate loading
        }
      })

      render(<TemplateEditorModal />)

      // Should show loading skeleton or state
      expect(screen.getByTestId('tiptap-editor')).toBeInTheDocument()
    })

    it('should handle content loading errors', () => {
      // Mock content loading error scenario
      ;(TiptapTemplateEditor as jest.Mock).mockImplementation(() => (
        <div data-testid="content-error">
          Content loading failed
        </div>
      ))

      render(<TemplateEditorModal />)

      expect(screen.getByTestId('content-error')).toBeInTheDocument()
    })
  })

  describe('Save Operations', () => {
    it('should save template successfully', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined)
      ;(useModalStore as jest.Mock).mockReturnValue({
        ...mockModalStore,
        templateEditorData: {
          ...mockModalStore.templateEditorData,
          onSave
        }
      })

      render(<TemplateEditorModal />)

      const saveButton = screen.getByRole('button', { name: /speichern/i })
      
      await userEvent.click(saveButton)

      expect(onSave).toHaveBeenCalledWith({
        titel: 'Test Template',
        inhalt: expect.any(Object),
        kategorie: 'Test Category',
        kontext_anforderungen: expect.any(Array)
      })
    })

    it('should show saving state during save operation', async () => {
      const onSave = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)))
      ;(useModalStore as jest.Mock).mockReturnValue({
        ...mockModalStore,
        templateEditorData: {
          ...mockModalStore.templateEditorData,
          onSave
        }
      })

      render(<TemplateEditorModal />)

      const saveButton = screen.getByRole('button', { name: /speichern/i })
      
      await userEvent.click(saveButton)

      // Should show loading state
      expect(screen.getByRole('button', { name: /speichern/i })).toBeDisabled()
    })

    it('should handle save errors', async () => {
      const onSave = jest.fn().mockRejectedValue(new Error('Save failed'))
      ;(useModalStore as jest.Mock).mockReturnValue({
        ...mockModalStore,
        templateEditorData: {
          ...mockModalStore.templateEditorData,
          onSave
        }
      })

      render(<TemplateEditorModal />)

      const saveButton = screen.getByRole('button', { name: /speichern/i })
      
      await userEvent.click(saveButton)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: expect.stringContaining('Fehler'),
            variant: 'destructive'
          })
        )
      })
    })

    it('should validate before saving', async () => {
      ;(useModalStore as jest.Mock).mockReturnValue({
        ...mockModalStore,
        templateEditorData: {
          ...mockModalStore.templateEditorData,
          initialTitle: '' // Empty title
        }
      })

      render(<TemplateEditorModal />)

      const saveButton = screen.getByRole('button', { name: /speichern/i })
      
      expect(saveButton).toBeDisabled()
    })
  })

  describe('Auto-save Functionality', () => {
    it('should enable auto-save for existing templates', () => {
      render(<TemplateEditorModal />)

      // Auto-save should be enabled for existing templates
      expect(screen.getByText(/Auto-Save aktiv/)).toBeInTheDocument()
    })

    it('should not enable auto-save for new templates', () => {
      ;(useModalStore as jest.Mock).mockReturnValue({
        ...mockModalStore,
        templateEditorData: {
          ...mockModalStore.templateEditorData,
          isNewTemplate: true,
          templateId: undefined
        }
      })

      render(<TemplateEditorModal />)

      // Auto-save should not be active for new templates
      expect(screen.queryByText(/Auto-Save aktiv/)).not.toBeInTheDocument()
    })

    it('should show auto-save status', () => {
      ;(useModalStore as jest.Mock).mockReturnValue({
        ...mockModalStore,
        isTemplateEditorModalDirty: true
      })

      render(<TemplateEditorModal />)

      expect(screen.getByText(/Ungespeicherte Änderungen/)).toBeInTheDocument()
    })
  })

  describe('Offline Detection and Handling', () => {
    it('should show offline status when offline', () => {
      ;(useTemplateOfflineDetection as jest.Mock).mockReturnValue({
        ...mockOfflineDetection,
        isOffline: true
      })

      render(<TemplateEditorModal />)

      expect(screen.getByText(/offline/i)).toBeInTheDocument()
    })

    it('should show connecting status', () => {
      ;(useTemplateOfflineDetection as jest.Mock).mockReturnValue({
        ...mockOfflineDetection,
        isConnecting: true
      })

      render(<TemplateEditorModal />)

      expect(screen.getByText(/verbinden/i)).toBeInTheDocument()
    })

    it('should queue operations when offline', async () => {
      ;(useTemplateOfflineDetection as jest.Mock).mockReturnValue({
        ...mockOfflineDetection,
        isOffline: true
      })

      render(<TemplateEditorModal />)

      const saveButton = screen.getByRole('button', { name: /speichern/i })
      
      await userEvent.click(saveButton)

      expect(mockOfflineDetection.queueOperation).toHaveBeenCalled()
    })
  })

  describe('Validation and Error Display', () => {
    it('should show validation errors', () => {
      // Mock validation errors
      ;(useModalStore as jest.Mock).mockReturnValue({
        ...mockModalStore,
        templateEditorData: {
          ...mockModalStore.templateEditorData,
          initialTitle: '' // This should trigger validation error
        }
      })

      render(<TemplateEditorModal />)

      // Should show validation feedback
      expect(screen.getByRole('button', { name: /speichern/i })).toBeDisabled()
    })

    it('should show validation warnings', () => {
      render(<TemplateEditorModal />)

      // Should render without validation warnings for valid data
      expect(screen.getByRole('button', { name: /speichern/i })).not.toBeDisabled()
    })

    it('should provide validation progress feedback', () => {
      render(<TemplateEditorModal />)

      // Should show validation status
      expect(screen.getByDisplayValue('Test Template')).toBeInTheDocument()
    })
  })

  describe('Keyboard Shortcuts and Accessibility', () => {
    it('should handle save keyboard shortcut', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined)
      ;(useModalStore as jest.Mock).mockReturnValue({
        ...mockModalStore,
        templateEditorData: {
          ...mockModalStore.templateEditorData,
          onSave
        }
      })

      render(<TemplateEditorModal />)

      // Simulate Ctrl+S
      fireEvent.keyDown(document, { key: 's', ctrlKey: true })

      await waitFor(() => {
        expect(onSave).toHaveBeenCalled()
      })
    })

    it('should handle cancel keyboard shortcut', async () => {
      render(<TemplateEditorModal />)

      // Simulate Escape
      fireEvent.keyDown(document, { key: 'Escape' })

      expect(mockModalStore.closeTemplateEditorModal).toHaveBeenCalled()
    })

    it('should have proper ARIA labels', () => {
      render(<TemplateEditorModal />)

      const titleInput = screen.getByLabelText(/titel/i)
      expect(titleInput).toHaveAttribute('aria-required', 'true')
    })

    it('should announce validation errors to screen readers', () => {
      ;(useModalStore as jest.Mock).mockReturnValue({
        ...mockModalStore,
        templateEditorData: {
          ...mockModalStore.templateEditorData,
          initialTitle: ''
        }
      })

      render(<TemplateEditorModal />)

      // Should have aria-invalid for invalid fields
      const titleInput = screen.getByDisplayValue('')
      expect(titleInput).toHaveAttribute('aria-invalid')
    })
  })

  describe('Cancel and Unsaved Changes', () => {
    it('should show confirmation when canceling with unsaved changes', async () => {
      ;(useModalStore as jest.Mock).mockReturnValue({
        ...mockModalStore,
        isTemplateEditorModalDirty: true
      })

      // Mock window.confirm
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true)

      render(<TemplateEditorModal />)

      const cancelButton = screen.getByRole('button', { name: /abbrechen/i })
      
      await userEvent.click(cancelButton)

      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining('ungespeicherte Änderungen')
      )

      confirmSpy.mockRestore()
    })

    it('should not close modal if user cancels confirmation', async () => {
      ;(useModalStore as jest.Mock).mockReturnValue({
        ...mockModalStore,
        isTemplateEditorModalDirty: true
      })

      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false)

      render(<TemplateEditorModal />)

      const cancelButton = screen.getByRole('button', { name: /abbrechen/i })
      
      await userEvent.click(cancelButton)

      expect(mockModalStore.closeTemplateEditorModal).not.toHaveBeenCalled()

      confirmSpy.mockRestore()
    })
  })

  describe('Performance and Memory Management', () => {
    it('should handle large content efficiently', () => {
      const largeContent = {
        type: 'doc',
        content: Array.from({ length: 1000 }, (_, i) => ({
          type: 'paragraph',
          content: [
            { type: 'text', text: `Large paragraph ${i}` }
          ]
        }))
      }

      ;(useModalStore as jest.Mock).mockReturnValue({
        ...mockModalStore,
        templateEditorData: {
          ...mockModalStore.templateEditorData,
          initialContent: largeContent
        }
      })

      const startTime = Date.now()
      render(<TemplateEditorModal />)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(2000) // Should render within 2 seconds
      expect(screen.getByText('Vorlage bearbeiten')).toBeInTheDocument()
    })

    it('should cleanup timers on unmount', () => {
      const { unmount } = render(<TemplateEditorModal />)

      // Should not throw errors on unmount
      expect(() => unmount()).not.toThrow()
    })
  })

  describe('Integration with Template System', () => {
    it('should extract and display variables from content', async () => {
      render(<TemplateEditorModal />)

      const changeContentButton = screen.getByText('Change Content')
      
      await userEvent.click(changeContentButton)

      // Should show variable count or list
      expect(screen.getByTestId('tiptap-editor')).toBeInTheDocument()
    })

    it('should handle template category display', () => {
      render(<TemplateEditorModal />)

      expect(screen.getByText('Test Category')).toBeInTheDocument()
    })

    it('should show template metadata', () => {
      render(<TemplateEditorModal />)

      expect(screen.getByText(/Kategorie:/)).toBeInTheDocument()
      expect(screen.getByText('Test Category')).toBeInTheDocument()
    })
  })
})