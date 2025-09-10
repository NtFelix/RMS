/**
 * Tests for TiptapTemplateEditor content update functionality
 * 
 * This test suite verifies that the editor properly handles:
 * - Initial content loading with various formats
 * - Content updates when initialContent changes
 * - Error handling for malformed content
 * - Content comparison to avoid unnecessary updates
 */

import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { TiptapTemplateEditor } from '@/components/editor/tiptap-template-editor'
import { parseTemplateContent } from '@/lib/template-content-parser'

// Mock the toast hook
const mockToast = jest.fn()
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}))

// Mock the content parser
jest.mock('@/lib/template-content-parser', () => ({
  parseTemplateContent: jest.fn(),
  TiptapContent: {},
  ParseResult: {}
}))

// Mock the Tiptap editor
const mockEditor = {
  getJSON: jest.fn(),
  commands: {
    setContent: jest.fn(() => true)
  },
  on: jest.fn(),
  off: jest.fn(),
  destroy: jest.fn()
}

jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(() => mockEditor),
  EditorContent: ({ editor, className }: any) => (
    <div data-testid="editor-content" className={className}>
      {editor ? 'Editor loaded' : 'Loading...'}
    </div>
  )
}))

// Mock performance hooks
jest.mock('@/hooks/use-editor-performance', () => ({
  useOptimizedVariableExtraction: jest.fn(() => []),
  useMemoizedEditorExtensions: jest.fn(() => []),
  usePerformanceMonitor: jest.fn()
}))

// Mock other hooks
jest.mock('@/hooks/use-debounced-save', () => ({
  useDebouncedSave: jest.fn(() => ({ markDirty: jest.fn() })),
  SaveIndicator: () => <div data-testid="save-indicator">Save indicator</div>
}))

jest.mock('@/hooks/use-debounce', () => ({
  useDebounce: jest.fn((value) => value)
}))

describe('TiptapTemplateEditor Content Updates', () => {
  const mockParseTemplateContent = parseTemplateContent as jest.MockedFunction<typeof parseTemplateContent>
  
  beforeEach(() => {
    jest.clearAllMocks()
    mockEditor.getJSON.mockReturnValue({
      type: 'doc',
      content: [{ type: 'paragraph', content: [] }]
    })
  })

  describe('Initial Content Loading', () => {
    it('should parse and load valid JSON content', async () => {
      const validContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Hello World' }]
          }
        ]
      }

      mockParseTemplateContent.mockReturnValue({
        success: true,
        content: validContent,
        errors: [],
        warnings: [],
        wasRecovered: false
      })

      render(<TiptapTemplateEditor initialContent={validContent} />)

      await waitFor(() => {
        expect(mockParseTemplateContent).toHaveBeenCalledWith(validContent)
        expect(screen.getByTestId('editor-content')).toBeInTheDocument()
      })
    })

    it('should handle string content parsing', async () => {
      const stringContent = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Test"}]}]}'
      const parsedContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Test' }]
          }
        ]
      }

      mockParseTemplateContent.mockReturnValue({
        success: true,
        content: parsedContent,
        errors: [],
        warnings: [],
        wasRecovered: false
      })

      render(<TiptapTemplateEditor initialContent={stringContent} />)

      await waitFor(() => {
        expect(mockParseTemplateContent).toHaveBeenCalledWith(stringContent)
      })
    })

    it('should handle null/undefined content', async () => {
      const emptyContent = {
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }]
      }

      mockParseTemplateContent.mockReturnValue({
        success: true,
        content: emptyContent,
        errors: [],
        warnings: ['Content is null or undefined, using empty document'],
        wasRecovered: true
      })

      render(<TiptapTemplateEditor initialContent={null} />)

      await waitFor(() => {
        expect(mockParseTemplateContent).toHaveBeenCalledWith(null)
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Inhalt teilweise wiederhergestellt"
          })
        )
      })
    })

    it('should handle malformed content with error recovery', async () => {
      const malformedContent = { invalid: 'content' }
      const fallbackContent = {
        type: 'doc',
        content: [{ type: 'paragraph', content: [] }]
      }

      mockParseTemplateContent.mockReturnValue({
        success: false,
        content: fallbackContent,
        errors: ['Invalid content structure'],
        warnings: [],
        wasRecovered: true
      })

      render(<TiptapTemplateEditor initialContent={malformedContent} />)

      await waitFor(() => {
        expect(mockParseTemplateContent).toHaveBeenCalledWith(malformedContent)
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Fehler beim Laden des Inhalts",
            variant: "destructive"
          })
        )
      })
    })

    it('should show loading state while parsing content', async () => {
      mockParseTemplateContent.mockReturnValue({
        success: true,
        content: { type: 'doc', content: [] },
        errors: [],
        warnings: [],
        wasRecovered: false
      })

      render(<TiptapTemplateEditor initialContent={{}} />)

      // Should show loading state initially
      expect(screen.getByText('Inhalt wird geladen...')).toBeInTheDocument()
      
      // Wait for parsing to complete
      await waitFor(() => {
        expect(screen.getByTestId('editor-content')).toBeInTheDocument()
      })
    })
  })

  describe('Content Updates', () => {
    it('should update editor content when initialContent changes', async () => {
      const initialContent1 = {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'First' }] }]
      }
      
      const initialContent2 = {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Second' }] }]
      }

      // Mock editor to return different content for comparison
      mockEditor.getJSON
        .mockReturnValueOnce(initialContent1)
        .mockReturnValueOnce(initialContent1)
        .mockReturnValueOnce(initialContent1)
        .mockReturnValueOnce(initialContent2)

      mockParseTemplateContent
        .mockReturnValueOnce({
          success: true,
          content: initialContent1,
          errors: [],
          warnings: [],
          wasRecovered: false
        })
        .mockReturnValueOnce({
          success: true,
          content: initialContent2,
          errors: [],
          warnings: [],
          wasRecovered: false
        })

      const { rerender } = render(<TiptapTemplateEditor initialContent={initialContent1} />)

      await waitFor(() => {
        expect(mockParseTemplateContent).toHaveBeenCalledWith(initialContent1)
      })

      // Change the initial content
      rerender(<TiptapTemplateEditor initialContent={initialContent2} />)

      await waitFor(() => {
        expect(mockParseTemplateContent).toHaveBeenCalledWith(initialContent2)
        expect(mockEditor.commands.setContent).toHaveBeenCalledWith(initialContent2)
      })
    })

    it('should not update editor if content is the same', async () => {
      const content = {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Same' }] }]
      }

      mockParseTemplateContent.mockReturnValue({
        success: true,
        content: content,
        errors: [],
        warnings: [],
        wasRecovered: false
      })

      const { rerender } = render(<TiptapTemplateEditor initialContent={content} />)

      await waitFor(() => {
        expect(mockParseTemplateContent).toHaveBeenCalledTimes(1)
      })

      // Re-render with same content
      rerender(<TiptapTemplateEditor initialContent={content} />)

      // Should not parse again since content is the same
      await waitFor(() => {
        expect(mockParseTemplateContent).toHaveBeenCalledTimes(1)
      })
    })

    it('should handle editor content update failures', async () => {
      const content = {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test' }] }]
      }

      mockParseTemplateContent.mockReturnValue({
        success: true,
        content: content,
        errors: [],
        warnings: [],
        wasRecovered: false
      })

      // Mock setContent to fail
      mockEditor.commands.setContent.mockReturnValue(false)

      render(<TiptapTemplateEditor initialContent={content} />)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Fehler beim Aktualisieren",
            description: "Der Editor-Inhalt konnte nicht aktualisiert werden.",
            variant: "destructive"
          })
        )
      })
    })
  })

  describe('Complex Content Formats', () => {
    it('should handle rich text content with formatting', async () => {
      const richContent = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Title' }]
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Bold ', marks: [{ type: 'bold' }] },
              { type: 'text', text: 'and italic', marks: [{ type: 'italic' }] }
            ]
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'List item' }]
                  }
                ]
              }
            ]
          }
        ]
      }

      mockParseTemplateContent.mockReturnValue({
        success: true,
        content: richContent,
        errors: [],
        warnings: [],
        wasRecovered: false
      })

      render(<TiptapTemplateEditor initialContent={richContent} />)

      await waitFor(() => {
        expect(mockParseTemplateContent).toHaveBeenCalledWith(richContent)
        expect(screen.getByTestId('editor-content')).toBeInTheDocument()
      })
    })

    it('should handle content with variables/mentions', async () => {
      const contentWithVariables = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Hello ' },
              {
                type: 'mention',
                attrs: { id: 'tenant_name', label: 'Mieter Name' }
              },
              { type: 'text', text: ', welcome!' }
            ]
          }
        ]
      }

      mockParseTemplateContent.mockReturnValue({
        success: true,
        content: contentWithVariables,
        errors: [],
        warnings: [],
        wasRecovered: false
      })

      render(<TiptapTemplateEditor initialContent={contentWithVariables} />)

      await waitFor(() => {
        expect(mockParseTemplateContent).toHaveBeenCalledWith(contentWithVariables)
      })
    })
  })

  describe('Error Handling', () => {
    it('should show error state when parsing fails completely', async () => {
      mockParseTemplateContent.mockReturnValue({
        success: false,
        content: null as any,
        errors: ['Critical parsing error'],
        warnings: [],
        wasRecovered: false
      })

      render(<TiptapTemplateEditor initialContent="invalid" />)

      await waitFor(() => {
        expect(screen.getByText('Fehler beim Laden des Inhalts')).toBeInTheDocument()
        expect(screen.getByText('Critical parsing error')).toBeInTheDocument()
        expect(screen.getByText('Erneut versuchen')).toBeInTheDocument()
      })
    })

    it('should allow retry when content loading fails', async () => {
      let callCount = 0
      mockParseTemplateContent.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return {
            success: false,
            content: null as any,
            errors: ['Network error'],
            warnings: [],
            wasRecovered: false
          }
        } else {
          return {
            success: true,
            content: { type: 'doc', content: [] },
            errors: [],
            warnings: [],
            wasRecovered: false
          }
        }
      })

      render(<TiptapTemplateEditor initialContent="test" />)

      await waitFor(() => {
        expect(screen.getByText('Erneut versuchen')).toBeInTheDocument()
      })

      // Click retry button
      const retryButton = screen.getByText('Erneut versuchen')
      await userEvent.click(retryButton)

      await waitFor(() => {
        expect(mockParseTemplateContent).toHaveBeenCalledTimes(2)
        expect(screen.getByTestId('editor-content')).toBeInTheDocument()
      })
    })

    it('should handle unexpected errors during parsing', async () => {
      mockParseTemplateContent.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      render(<TiptapTemplateEditor initialContent={{}} />)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Unerwarteter Fehler",
            variant: "destructive"
          })
        )
      }, { timeout: 3000 })
    })
  })

  describe('Content Change Callbacks', () => {
    it('should call onContentChange with parsed content and variables', async () => {
      const mockOnContentChange = jest.fn()
      const content = {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test' }] }]
      }

      mockParseTemplateContent.mockReturnValue({
        success: true,
        content: content,
        errors: [],
        warnings: [],
        wasRecovered: false
      })

      render(
        <TiptapTemplateEditor 
          initialContent={content}
          onContentChange={mockOnContentChange}
        />
      )

      await waitFor(() => {
        expect(mockOnContentChange).toHaveBeenCalledWith(content, [])
      })
    })
  })

  describe('Warning Indicators', () => {
    it('should show warning indicator when content was recovered', async () => {
      const content = { type: 'doc', content: [] }

      mockParseTemplateContent.mockReturnValue({
        success: true,
        content: content,
        errors: [],
        warnings: ['Content was repaired'],
        wasRecovered: true
      })

      render(<TiptapTemplateEditor initialContent={content} />)

      await waitFor(() => {
        expect(screen.getByText(/Der Inhalt wurde automatisch repariert/)).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })
})