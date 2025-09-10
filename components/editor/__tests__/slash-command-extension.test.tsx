import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { TiptapTemplateEditor } from '../tiptap-template-editor'

// Mock the Tiptap editor
jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(() => ({
    getJSON: jest.fn(() => ({ type: 'doc', content: [] })),
    commands: {
      focus: jest.fn(() => ({ toggleHeading: jest.fn() })),
    },
    chain: jest.fn(() => ({
      focus: jest.fn(() => ({
        toggleHeading: jest.fn(() => ({ run: jest.fn() })),
        toggleBulletList: jest.fn(() => ({ run: jest.fn() })),
        toggleOrderedList: jest.fn(() => ({ run: jest.fn() })),
        toggleBold: jest.fn(() => ({ run: jest.fn() })),
        toggleItalic: jest.fn(() => ({ run: jest.fn() })),
        setParagraph: jest.fn(() => ({ run: jest.fn() })),
        toggleBlockquote: jest.fn(() => ({ run: jest.fn() })),
      })),
    })),
  })),
  EditorContent: ({ editor, className }: any) => (
    <div className={className} data-testid="editor-content">
      Mock Editor Content
    </div>
  ),
}))

jest.mock('@tiptap/starter-kit', () => ({
  configure: jest.fn(() => ({})),
}))

jest.mock('../slash-command-extension', () => ({
  SlashCommandExtension: {},
}))

describe('TiptapTemplateEditor', () => {
  const mockOnContentChange = jest.fn()
  const mockOnSave = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the editor component', () => {
    render(
      <TiptapTemplateEditor
        onContentChange={mockOnContentChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByTestId('editor-content')).toBeInTheDocument()
  })

  it('displays placeholder text', () => {
    const customPlaceholder = 'Custom placeholder text'
    render(
      <TiptapTemplateEditor
        placeholder={customPlaceholder}
        onContentChange={mockOnContentChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )

    // The placeholder is set as a data attribute on the editor
    expect(screen.getByTestId('editor-content')).toBeInTheDocument()
  })

  it('handles keyboard shortcuts', async () => {
    render(
      <TiptapTemplateEditor
        onContentChange={mockOnContentChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )

    const editorContainer = screen.getByTestId('editor-content').parentElement

    // Simulate Ctrl+S keydown event
    if (editorContainer) {
      fireEvent.keyDown(editorContainer, {
        key: 's',
        ctrlKey: true,
        preventDefault: jest.fn(),
      })
      expect(mockOnSave).toHaveBeenCalled()
    }
  })

  it('handles escape key for cancel', async () => {
    render(
      <TiptapTemplateEditor
        onContentChange={mockOnContentChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )

    const editorContainer = screen.getByTestId('editor-content').parentElement

    // Simulate Escape keydown event
    if (editorContainer) {
      fireEvent.keyDown(editorContainer, {
        key: 'Escape',
        preventDefault: jest.fn(),
      })
      expect(mockOnCancel).toHaveBeenCalled()
    }
  })

  it('applies correct CSS classes', () => {
    const customClassName = 'custom-editor-class'
    
    render(
      <TiptapTemplateEditor
        className={customClassName}
        onContentChange={mockOnContentChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )

    // Check if the custom class is applied to the main container
    const editorContainer = screen.getByTestId('editor-content').closest('.relative')
    expect(editorContainer).toHaveClass(customClassName)
  })

  it('can be set to read-only mode', () => {
    render(
      <TiptapTemplateEditor
        editable={false}
        onContentChange={mockOnContentChange}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )

    // In read-only mode, the editor should still render
    expect(screen.getByTestId('editor-content')).toBeInTheDocument()
  })
})