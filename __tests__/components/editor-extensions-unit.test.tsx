/**
 * Unit tests for Tiptap Editor Extensions
 * Tests slash command extension, mention extension, and editor functionality
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { TiptapTemplateEditor } from '@/components/editor/tiptap-template-editor'
import { extractVariablesFromContent } from '@/lib/template-variable-extraction'

// Mock Tiptap dependencies
const mockEditor = {
  getJSON: jest.fn(),
  commands: {
    setContent: jest.fn(),
    insertContent: jest.fn(),
    focus: jest.fn()
  },
  on: jest.fn(),
  off: jest.fn(),
  destroy: jest.fn(),
  isActive: jest.fn(),
  can: jest.fn(),
  chain: jest.fn(() => ({
    focus: jest.fn(() => ({ run: jest.fn() }))
  }))
}

jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(() => mockEditor),
  EditorContent: ({ editor, className, ...props }: any) => (
    <div 
      data-testid="editor-content" 
      className={className}
      contentEditable={editor ? true : false}
      {...props}
    >
      {editor ? 'Editor loaded' : 'Editor loading...'}
    </div>
  ),
}))

// Mock editor extensions
jest.mock('@tiptap/starter-kit', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(() => ({ name: 'StarterKit' }))
  }
}))

jest.mock('@tiptap/extension-underline', () => ({
  __esModule: true,
  default: { name: 'Underline' }
}))

// Mock custom extensions
jest.mock('../../components/editor/slash-command-extension', () => ({
  SlashCommandExtension: { name: 'SlashCommand' }
}))

jest.mock('../../components/editor/mention-extension', () => ({
  MentionExtension: jest.fn(() => ({ name: 'Mention' })),
  PREDEFINED_VARIABLES: [
    {
      id: 'tenant_name',
      label: 'Mieter Name',
      category: 'Mieter',
      description: 'Name des Mieters'
    },
    {
      id: 'landlord_name',
      label: 'Vermieter Name',
      category: 'Vermieter',
      description: 'Name des Vermieters'
    }
  ]
}))

// Mock performance hooks
jest.mock('../../hooks/use-editor-performance', () => ({
  useOptimizedVariableExtraction: jest.fn((content, extractor) => {
    return extractor ? extractor(content) : []
  }),
  useMemoizedEditorExtensions: jest.fn((extensions) => {
    return extensions.map((ext: any) => typeof ext === 'function' ? ext() : ext)
  }),
  usePerformanceMonitor: jest.fn()
}))

jest.mock('../../hooks/use-debounced-save', () => ({
  useDebouncedSave: jest.fn(() => ({
    markDirty: jest.fn(),
    isDirty: false,
    isSaving: false,
    lastSaved: null
  })),
  SaveIndicator: ({ saveState }: any) => (
    <div data-testid="save-indicator">
      {saveState.isSaving ? 'Saving...' : 'Saved'}
    </div>
  )
}))

jest.mock('../../hooks/use-debounce', () => ({
  useDebounce: jest.fn((value) => value)
}))

describe('Editor Extensions Unit Tests', () => {
  const mockOnContentChange = jest.fn()
  const mockOnSave = jest.fn()
  const mockOnCancel = jest.fn()
  const mockOnVariableInsert = jest.fn()
  const mockOnVariableRemove = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mock implementations
    mockEditor.getJSON.mockReturnValue({
      type: 'doc',
      content: [{ type: 'paragraph', content: [] }]
    })
  })

  describe('TiptapTemplateEditor Component', () => {
    it('should render editor with loading state initially', () => {
      const { useEditor } = require('@tiptap/react')
      useEditor.mockReturnValueOnce(null)

      render(<TiptapTemplateEditor />)
      
      expect(screen.getByText('Editor wird geladen...')).toBeInTheDocument()
    })

    it('should render editor content when loaded', () => {
      render(<TiptapTemplateEditor />)
      
      expect(screen.getByTestId('editor-content')).toBeInTheDocument()
      expect(screen.getByText('Editor loaded')).toBeInTheDocument()
    })

    it('should initialize with correct extensions', () => {
      const { useEditor } = require('@tiptap/react')
      
      render(<TiptapTemplateEditor />)
      
      expect(useEditor).toHaveBeenCalledWith(
        expect.objectContaining({
          extensions: expect.arrayContaining([
            expect.objectContaining({ name: 'StarterKit' }),
            expect.objectContaining({ name: 'Underline' }),
            expect.objectContaining({ name: 'SlashCommand' }),
            expect.objectContaining({ name: 'Mention' })
          ])
        }),
        expect.any(Array)
      )
    })

    it('should handle initial content', () => {
      const initialContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Initial content' }]
          }
        ]
      }

      const { useEditor } = require('@tiptap/react')
      
      render(<TiptapTemplateEditor initialContent={initialContent} />)
      
      expect(useEditor).toHaveBeenCalledWith(
        expect.objectContaining({
          content: initialContent
        }),
        expect.any(Array)
      )
    })

    it('should call onContentChange when content changes', async () => {
      const { useEditor } = require('@tiptap/react')
      let onUpdateCallback: any

      useEditor.mockImplementation((config) => {
        onUpdateCallback = config.onUpdate
        return mockEditor
      })

      render(
        <TiptapTemplateEditor 
          onContentChange={mockOnContentChange}
        />
      )

      // Simulate content change
      const newContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: { id: 'tenant_name', label: 'Mieter Name' }
              }
            ]
          }
        ]
      }
      mockEditor.getJSON.mockReturnValue(newContent)

      // Trigger the onUpdate callback
      onUpdateCallback({ editor: mockEditor })

      await waitFor(() => {
        expect(mockOnContentChange).toHaveBeenCalledWith(
          newContent,
          ['tenant_name']
        )
      })
    })

    it('should handle keyboard shortcuts', async () => {
      const user = userEvent.setup()
      
      render(
        <TiptapTemplateEditor 
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      )

      const editorContent = screen.getByTestId('editor-content')

      // Test save shortcut (Ctrl+S)
      await user.keyboard('{Control>}s{/Control}')
      expect(mockOnSave).toHaveBeenCalled()

      // Test cancel shortcut (Escape)
      await user.keyboard('{Escape}')
      expect(mockOnCancel).toHaveBeenCalled()
    })

    it('should handle variable insertion callback', () => {
      const { MentionExtension } = require('../../components/editor/mention-extension')
      
      render(
        <TiptapTemplateEditor 
          onVariableInsert={mockOnVariableInsert}
          onVariableRemove={mockOnVariableRemove}
        />
      )

      expect(MentionExtension).toHaveBeenCalledWith(
        expect.objectContaining({
          onVariableInsert: mockOnVariableInsert,
          onVariableRemove: mockOnVariableRemove
        })
      )
    })

    it('should show save indicator when auto-save is enabled', () => {
      render(
        <TiptapTemplateEditor 
          enableAutoSave={true}
          showSaveIndicator={true}
          autoSaveFunction={jest.fn()}
        />
      )

      expect(screen.getByTestId('save-indicator')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      render(<TiptapTemplateEditor className="custom-editor" />)
      
      const container = screen.getByTestId('editor-content').parentElement
      expect(container).toHaveClass('custom-editor')
    })

    it('should handle editable prop', () => {
      const { useEditor } = require('@tiptap/react')
      
      render(<TiptapTemplateEditor editable={false} />)
      
      expect(useEditor).toHaveBeenCalledWith(
        expect.objectContaining({
          editable: false
        }),
        expect.any(Array)
      )
    })

    it('should handle custom placeholder', () => {
      const customPlaceholder = 'Custom placeholder text'
      const { useEditor } = require('@tiptap/react')
      
      render(<TiptapTemplateEditor placeholder={customPlaceholder} />)
      
      expect(useEditor).toHaveBeenCalledWith(
        expect.objectContaining({
          editorProps: expect.objectContaining({
            attributes: expect.objectContaining({
              'data-placeholder': customPlaceholder
            })
          })
        }),
        expect.any(Array)
      )
    })
  })

  describe('Variable Extraction Integration', () => {
    it('should extract variables from content correctly', () => {
      const content = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: { id: 'tenant_name', label: 'Mieter Name' }
              },
              { type: 'text', text: ' and ' },
              {
                type: 'mention',
                attrs: { id: 'landlord_name', label: 'Vermieter Name' }
              }
            ]
          }
        ]
      }

      const variables = extractVariablesFromContent(content)
      expect(variables).toEqual(['landlord_name', 'tenant_name'])
    })

    it('should handle content updates with variable extraction', async () => {
      const { useEditor } = require('@tiptap/react')
      let onUpdateCallback: any

      useEditor.mockImplementation((config) => {
        onUpdateCallback = config.onUpdate
        return mockEditor
      })

      render(
        <TiptapTemplateEditor 
          onContentChange={mockOnContentChange}
        />
      )

      const contentWithVariables = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: { id: 'tenant_name', label: 'Mieter Name' }
              }
            ]
          }
        ]
      }

      mockEditor.getJSON.mockReturnValue(contentWithVariables)
      onUpdateCallback({ editor: mockEditor })

      await waitFor(() => {
        expect(mockOnContentChange).toHaveBeenCalledWith(
          contentWithVariables,
          ['tenant_name']
        )
      })
    })
  })

  describe('Performance Optimizations', () => {
    it('should use optimized variable extraction', () => {
      const { useOptimizedVariableExtraction } = require('../../hooks/use-editor-performance')
      
      render(<TiptapTemplateEditor />)
      
      expect(useOptimizedVariableExtraction).toHaveBeenCalledWith(
        expect.any(Object),
        extractVariablesFromContent,
        300 // default variableExtractionDelay
      )
    })

    it('should use memoized editor extensions', () => {
      const { useMemoizedEditorExtensions } = require('../../hooks/use-editor-performance')
      
      render(<TiptapTemplateEditor />)
      
      expect(useMemoizedEditorExtensions).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(Array) // dependencies
      )
    })

    it('should monitor performance in development', () => {
      const { usePerformanceMonitor } = require('../../hooks/use-editor-performance')
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      render(<TiptapTemplateEditor />)
      
      expect(usePerformanceMonitor).toHaveBeenCalledWith('TiptapTemplateEditor', true)
      
      process.env.NODE_ENV = originalEnv
    })

    it('should use debounced content changes', () => {
      const { useDebounce } = require('../../hooks/use-debounce')
      
      render(<TiptapTemplateEditor contentChangeDelay={500} />)
      
      expect(useDebounce).toHaveBeenCalledWith(
        expect.any(Object),
        500
      )
    })
  })

  describe('Auto-save Functionality', () => {
    it('should setup debounced save when enabled', () => {
      const { useDebouncedSave } = require('../../hooks/use-debounced-save')
      const mockAutoSaveFunction = jest.fn()
      
      render(
        <TiptapTemplateEditor 
          enableAutoSave={true}
          autoSaveFunction={mockAutoSaveFunction}
          showSaveIndicator={true}
        />
      )
      
      expect(useDebouncedSave).toHaveBeenCalledWith(
        expect.any(Object),
        mockAutoSaveFunction,
        expect.objectContaining({
          delay: 3000,
          maxDelay: 15000,
          saveOnUnmount: true,
          showSaveIndicator: true
        })
      )
    })

    it('should mark as dirty on content change when auto-save enabled', async () => {
      const { useEditor } = require('@tiptap/react')
      const { useDebouncedSave } = require('../../hooks/use-debounced-save')
      
      const mockMarkDirty = jest.fn()
      useDebouncedSave.mockReturnValue({
        markDirty: mockMarkDirty,
        isDirty: false,
        isSaving: false,
        lastSaved: null
      })

      let onUpdateCallback: any
      useEditor.mockImplementation((config) => {
        onUpdateCallback = config.onUpdate
        return mockEditor
      })

      render(
        <TiptapTemplateEditor 
          enableAutoSave={true}
          autoSaveFunction={jest.fn()}
        />
      )

      // Trigger content change
      onUpdateCallback({ editor: mockEditor })

      expect(mockMarkDirty).toHaveBeenCalled()
    })
  })

  describe('Content Synchronization', () => {
    it('should update editor content when initialContent changes', () => {
      const initialContent1 = {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Content 1' }] }
        ]
      }

      const initialContent2 = {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Content 2' }] }
        ]
      }

      const { rerender } = render(
        <TiptapTemplateEditor initialContent={initialContent1} />
      )

      // Change initial content
      rerender(
        <TiptapTemplateEditor initialContent={initialContent2} />
      )

      expect(mockEditor.commands.setContent).toHaveBeenCalledWith(initialContent2)
    })

    it('should not update editor if content is the same', () => {
      const initialContent = {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Same content' }] }
        ]
      }

      mockEditor.getJSON.mockReturnValue(initialContent)

      const { rerender } = render(
        <TiptapTemplateEditor initialContent={initialContent} />
      )

      // Re-render with same content
      rerender(
        <TiptapTemplateEditor initialContent={initialContent} />
      )

      expect(mockEditor.commands.setContent).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle editor initialization failure gracefully', () => {
      const { useEditor } = require('@tiptap/react')
      useEditor.mockReturnValue(null)

      render(<TiptapTemplateEditor />)
      
      expect(screen.getByText('Editor wird geladen...')).toBeInTheDocument()
      expect(screen.queryByTestId('editor-content')).not.toBeInTheDocument()
    })

    it('should handle variable extraction errors gracefully', () => {
      const { useOptimizedVariableExtraction } = require('../../hooks/use-editor-performance')
      
      // Mock extraction to throw error
      useOptimizedVariableExtraction.mockImplementation(() => {
        throw new Error('Extraction failed')
      })

      // Should not crash the component
      expect(() => {
        render(<TiptapTemplateEditor />)
      }).not.toThrow()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<TiptapTemplateEditor />)
      
      const editorContent = screen.getByTestId('editor-content')
      expect(editorContent).toHaveAttribute('contentEditable', 'true')
    })

    it('should handle keyboard navigation', async () => {
      const user = userEvent.setup()
      
      render(<TiptapTemplateEditor />)
      
      const editorContent = screen.getByTestId('editor-content')
      
      // Should be focusable
      await user.click(editorContent)
      expect(editorContent).toHaveFocus()
    })
  })
})