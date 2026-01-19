import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateEditor } from '@/components/templates/template-editor';
import { JSONContent } from '@tiptap/react';

// Mock TipTap dependencies
jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(),
  EditorContent: ({ editor }: any) => (
    <div data-testid="editor-content">
      {editor?.getHTML?.() || 'Editor content'}
    </div>
  ),
  JSONContent: {} as any,
}));

jest.mock('@tiptap/starter-kit', () => ({
  configure: jest.fn(() => ({})),
}));

jest.mock('@tiptap/extension-mention', () => ({
  configure: jest.fn(() => ({})),
}));

jest.mock('tippy.js', () => jest.fn());

const { useEditor } = require('@tiptap/react');

describe('TemplateEditor', () => {
  const mockEditor = {
    getHTML: jest.fn(() => '<p>Test content</p>'),
    getJSON: jest.fn(() => ({ type: 'doc', content: [] })),
    commands: {
      setContent: jest.fn(),
    },
    chain: jest.fn(() => ({
      focus: jest.fn(() => ({
        toggleBold: jest.fn(() => ({ run: jest.fn() })),
        toggleItalic: jest.fn(() => ({ run: jest.fn() })),
        toggleBulletList: jest.fn(() => ({ run: jest.fn() })),
        toggleOrderedList: jest.fn(() => ({ run: jest.fn() })),
        toggleBlockquote: jest.fn(() => ({ run: jest.fn() })),
        undo: jest.fn(() => ({ run: jest.fn() })),
        redo: jest.fn(() => ({ run: jest.fn() })),
      })),
    })),
    isActive: jest.fn(() => false),
    can: jest.fn(() => ({
      undo: jest.fn(() => true),
      redo: jest.fn(() => true),
    })),
    isEmpty: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useEditor.mockReturnValue(mockEditor);
  });

  it('renders editor with toolbar', () => {
    render(<TemplateEditor onChange={jest.fn()} />);

    // Check toolbar buttons
    expect(screen.getByTitle('Fett (Ctrl+B)')).toBeInTheDocument();
    expect(screen.getByTitle('Kursiv (Ctrl+I)')).toBeInTheDocument();
    expect(screen.getByTitle('Aufzählung')).toBeInTheDocument();
    expect(screen.getByTitle('Nummerierte Liste')).toBeInTheDocument();
    expect(screen.getByTitle('Zitat')).toBeInTheDocument();
    expect(screen.getByTitle('Rückgängig (Ctrl+Z)')).toBeInTheDocument();
    expect(screen.getByTitle('Wiederholen (Ctrl+Y)')).toBeInTheDocument();

    // Check editor content
    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
  });

  it('renders placeholder when editor is empty', () => {
    const emptyEditor = {
      ...mockEditor,
      isEmpty: true,
    };
    useEditor.mockReturnValue(emptyEditor);

    render(
      <TemplateEditor 
        onChange={jest.fn()} 
        placeholder="Custom placeholder"
      />
    );

    expect(screen.getByText('Custom placeholder')).toBeInTheDocument();
  });

  it('does not render toolbar in read-only mode', () => {
    render(<TemplateEditor onChange={jest.fn()} readOnly={true} />);

    expect(screen.queryByTitle('Fett (Ctrl+B)')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Kursiv (Ctrl+I)')).not.toBeInTheDocument();
  });

  it('calls onChange when editor content changes', async () => {
    const mockOnChange = jest.fn();
    const editorWithUpdate = {
      ...mockEditor,
      onUpdate: undefined, // Will be set by useEditor
    };

    useEditor.mockImplementation((config: any) => {
      // Simulate editor update
      setTimeout(() => {
        config.onUpdate?.({ editor: editorWithUpdate });
      }, 0);
      return editorWithUpdate;
    });

    render(<TemplateEditor onChange={mockOnChange} />);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        '<p>Test content</p>',
        { type: 'doc', content: [] }
      );
    });
  });

  it('handles toolbar button clicks', async () => {
    const user = userEvent.setup();
    render(<TemplateEditor onChange={jest.fn()} />);

    // Test bold button
    const boldButton = screen.getByTitle('Fett (Ctrl+B)');
    await user.click(boldButton);

    expect(mockEditor.chain).toHaveBeenCalled();
  });

  it('shows active state for formatting buttons', () => {
    const activeEditor = {
      ...mockEditor,
      isActive: jest.fn((format) => format === 'bold'),
    };
    useEditor.mockReturnValue(activeEditor);

    render(<TemplateEditor onChange={jest.fn()} />);

    const boldButton = screen.getByTitle('Fett (Ctrl+B)');
    expect(boldButton).toHaveClass('bg-primary'); // Active state styling
  });

  it('disables undo/redo buttons when not available', () => {
    const editorWithoutHistory = {
      ...mockEditor,
      can: jest.fn(() => ({
        undo: jest.fn(() => false),
        redo: jest.fn(() => false),
      })),
    };
    useEditor.mockReturnValue(editorWithoutHistory);

    render(<TemplateEditor onChange={jest.fn()} />);

    const undoButton = screen.getByTitle('Rückgängig (Ctrl+Z)');
    const redoButton = screen.getByTitle('Wiederholen (Ctrl+Y)');

    expect(undoButton).toBeDisabled();
    expect(redoButton).toBeDisabled();
  });

  it('updates content when content prop changes', () => {
    const initialContent: JSONContent = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Initial' }] }]
    };

    const { rerender } = render(
      <TemplateEditor content={initialContent} onChange={jest.fn()} />
    );

    const newContent: JSONContent = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Updated' }] }]
    };

    rerender(<TemplateEditor content={newContent} onChange={jest.fn()} />);

    expect(mockEditor.commands.setContent).toHaveBeenCalledWith(newContent);
  });

  it('applies custom className', () => {
    const { container } = render(
      <TemplateEditor onChange={jest.fn()} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles mention variables in content', () => {
    const contentWithMention: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ' },
            {
              type: 'mention',
              attrs: { id: 'mieter.name', label: '@Mieter.Name' }
            },
            { type: 'text', text: '!' }
          ]
        }
      ]
    };

    render(<TemplateEditor content={contentWithMention} onChange={jest.fn()} />);

    // Editor should be initialized with mention content
    expect(useEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        content: contentWithMention
      })
    );
  });

  it('configures mention extension correctly', () => {
    render(<TemplateEditor onChange={jest.fn()} />);

    const editorConfig = useEditor.mock.calls[0][0];
    expect(editorConfig.extensions).toBeDefined();
    
    // Should include StarterKit and Mention extensions
    expect(editorConfig.extensions.length).toBeGreaterThan(1);
  });

  it('handles mobile responsive design', () => {
    render(<TemplateEditor onChange={jest.fn()} />);

    // Check for responsive classes - toolbar should have flex layout
    const toolbar = screen.getByTitle('Fett (Ctrl+B)').closest('div');
    expect(toolbar).toHaveClass('flex'); // Mobile-friendly toolbar
  });
});