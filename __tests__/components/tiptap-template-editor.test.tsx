import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { TiptapTemplateEditor } from '@/components/editor/tiptap-template-editor'

// Mock the Tiptap editor to avoid complex DOM manipulation in tests
jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(() => null),
  EditorContent: ({ editor, ...props }: any) => (
    <div data-testid="editor-content" {...props}>
      {editor ? 'Editor loaded' : 'Editor loading...'}
    </div>
  ),
}))

describe('TiptapTemplateEditor', () => {
  it('renders loading state when editor is not ready', () => {
    render(<TiptapTemplateEditor />)
    
    expect(screen.getByText('Editor wird geladen...')).toBeInTheDocument()
  })

  it('accepts initial content prop', () => {
    const initialContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Test content' }],
        },
      ],
    }

    render(<TiptapTemplateEditor initialContent={initialContent} />)
    
    // Component should render without errors
    expect(screen.getByText('Editor wird geladen...')).toBeInTheDocument()
  })

  it('accepts placeholder prop', () => {
    const placeholder = 'Custom placeholder text'
    
    render(<TiptapTemplateEditor placeholder={placeholder} />)
    
    // Component should render without errors
    expect(screen.getByText('Editor wird geladen...')).toBeInTheDocument()
  })

  it('accepts className prop', () => {
    const customClass = 'custom-editor-class'
    
    render(<TiptapTemplateEditor className={customClass} />)
    
    // Component should render with custom class
    const container = screen.getByText('Editor wird geladen...').parentElement
    expect(container).toHaveClass(customClass)
  })

  it('accepts callback props', () => {
    const onContentChange = jest.fn()
    const onSave = jest.fn()
    const onCancel = jest.fn()
    
    render(
      <TiptapTemplateEditor
        onContentChange={onContentChange}
        onSave={onSave}
        onCancel={onCancel}
      />
    )
    
    // Component should render without errors
    expect(screen.getByText('Editor wird geladen...')).toBeInTheDocument()
  })
})