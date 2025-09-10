/**
 * Test suite for template content loading functionality
 * Verifies that template content is properly loaded and displayed in the editor
 */

import { render, screen, waitFor } from '@testing-library/react'
import { TemplateEditorModal } from '@/components/template-editor-modal'
import { useModalStore } from '@/hooks/use-modal-store'

// Mock the modal store
jest.mock('@/hooks/use-modal-store')
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>

// Mock the Tiptap editor
jest.mock('@/components/editor/tiptap-template-editor', () => ({
  TiptapTemplateEditor: ({ initialContent, onContentChange }: any) => (
    <div data-testid="tiptap-editor">
      <div data-testid="editor-content">{JSON.stringify(initialContent)}</div>
      <button 
        onClick={() => onContentChange?.(initialContent, [])}
        data-testid="trigger-change"
      >
        Trigger Change
      </button>
    </div>
  )
}))

// Mock other dependencies
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() })
}))

jest.mock('@/lib/template-variable-extraction', () => ({
  extractVariablesFromContent: jest.fn(() => ['test_variable']),
  hasContentMeaning: jest.fn(() => true)
}))

describe('Template Content Loading', () => {
  const mockTemplateEditorData = {
    templateId: 'test-template-id',
    isNewTemplate: false,
    initialTitle: 'Test Template',
    initialCategory: 'Mietverträge',
    initialContent: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hallo ' },
            {
              type: 'mention',
              attrs: {
                id: 'tenant_name',
                label: 'Mieter Name',
                mentionSuggestionChar: '@'
              }
            },
            { type: 'text', text: ',' }
          ]
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'das hier ist ein Test' }
          ]
        }
      ]
    },
    onSave: jest.fn(),
    onCancel: jest.fn()
  }

  beforeEach(() => {
    mockUseModalStore.mockReturnValue({
      isTemplateEditorModalOpen: true,
      templateEditorData: mockTemplateEditorData,
      isTemplateEditorModalDirty: false,
      closeTemplateEditorModal: jest.fn(),
      setTemplateEditorModalDirty: jest.fn(),
      // Add other required properties with default values
      isCategorySelectionModalOpen: false,
      categorySelectionData: null,
      openCategorySelectionModal: jest.fn(),
      closeCategorySelectionModal: jest.fn(),
      openTemplateEditorModal: jest.fn(),
    } as any)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should load template content correctly in the editor', async () => {
    render(<TemplateEditorModal />)

    // Wait for the component to mount and load content
    await waitFor(() => {
      expect(screen.getByTestId('tiptap-editor')).toBeInTheDocument()
    })

    // Check that the initial content is passed to the editor
    const editorContent = screen.getByTestId('editor-content')
    expect(editorContent).toBeInTheDocument()
    
    // Verify the content structure is preserved
    const contentText = editorContent.textContent
    expect(contentText).toContain('"type":"doc"')
    expect(contentText).toContain('"type":"paragraph"')
    expect(contentText).toContain('"type":"mention"')
    expect(contentText).toContain('tenant_name')
    expect(contentText).toContain('Mieter Name')
  })

  it('should display the template title correctly', async () => {
    render(<TemplateEditorModal />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Template')).toBeInTheDocument()
    })
  })

  it('should display the template category correctly', async () => {
    render(<TemplateEditorModal />)

    await waitFor(() => {
      expect(screen.getByText('Mietverträge')).toBeInTheDocument()
    })
  })

  it('should handle empty content gracefully', async () => {
    const emptyContentData = {
      ...mockTemplateEditorData,
      initialContent: undefined
    }

    mockUseModalStore.mockReturnValue({
      isTemplateEditorModalOpen: true,
      templateEditorData: emptyContentData,
      isTemplateEditorModalDirty: false,
      closeTemplateEditorModal: jest.fn(),
      setTemplateEditorModalDirty: jest.fn(),
      isCategorySelectionModalOpen: false,
      categorySelectionData: null,
      openCategorySelectionModal: jest.fn(),
      closeCategorySelectionModal: jest.fn(),
      openTemplateEditorModal: jest.fn(),
    } as any)

    render(<TemplateEditorModal />)

    await waitFor(() => {
      expect(screen.getByTestId('tiptap-editor')).toBeInTheDocument()
    })

    // Should fall back to default empty document structure
    const editorContent = screen.getByTestId('editor-content')
    const contentText = editorContent.textContent
    expect(contentText).toContain('"type":"doc"')
    expect(contentText).toContain('"type":"paragraph"')
  })

  it('should extract variables from initial content', async () => {
    render(<TemplateEditorModal />)

    await waitFor(() => {
      expect(screen.getByText(/Verwendete Variablen/)).toBeInTheDocument()
    })

    // Should show the extracted variable
    expect(screen.getByText('@test_variable')).toBeInTheDocument()
  })
})