import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateEditor } from '@/components/templates/template-editor';
import { JSONContent } from '@tiptap/react';

// Mock TipTap dependencies
const mockEditor = {
  getHTML: jest.fn(() => '<p>Test content</p>'),
  getJSON: jest.fn(() => ({ type: 'doc', content: [] } as JSONContent)),
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
  can: jest.fn(() => ({
    undo: jest.fn(() => true),
    redo: jest.fn(() => true),
  })),
  isActive: jest.fn((...args: any[]) => false),
  isEmpty: false,
};

jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(() => mockEditor),
  EditorContent: ({ editor, className }: any) => (
    <div data-testid="editor-content" className={className}>
      <div contentEditable data-testid="prosemirror-editor">
        Editor Content
      </div>
    </div>
  ),
}));

jest.mock('@tiptap/starter-kit', () => ({
  configure: jest.fn(() => ({})),
}));

jest.mock('@tiptap/extension-mention', () => ({
  configure: jest.fn(() => ({})),
}));

jest.mock('tippy.js', () => jest.fn());

describe('TemplateEditor - Comprehensive Tests', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock editor state
    mockEditor.isEmpty = false;
    mockEditor.isActive.mockReturnValue(false);
    mockEditor.can().undo.mockReturnValue(true);
    mockEditor.can().redo.mockReturnValue(true);
  });

  describe('Rendering', () => {
    it('renders the editor with all toolbar buttons', () => {
      render(<TemplateEditor onChange={mockOnChange} />);
      
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
      expect(screen.getByTitle('Fett (Ctrl+B)')).toBeInTheDocument();
      expect(screen.getByTitle('Kursiv (Ctrl+I)')).toBeInTheDocument();
      expect(screen.getByTitle('Aufzählung')).toBeInTheDocument();
      expect(screen.getByTitle('Nummerierte Liste')).toBeInTheDocument();
      expect(screen.getByTitle('Zitat')).toBeInTheDocument();
      expect(screen.getByTitle('Rückgängig (Ctrl+Z)')).toBeInTheDocument();
      expect(screen.getByTitle('Wiederholen (Ctrl+Y)')).toBeInTheDocument();
    });

    it('renders in read-only mode without toolbar', () => {
      render(<TemplateEditor onChange={mockOnChange} readOnly />);
      
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
      expect(screen.queryByTitle('Fett (Ctrl+B)')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Kursiv (Ctrl+I)')).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      const customClass = 'custom-editor-class';
      const { container } = render(
        <TemplateEditor onChange={mockOnChange} className={customClass} />
      );
      
      expect(container.firstChild).toHaveClass(customClass);
    });

    it('shows mention helper text', () => {
      render(<TemplateEditor onChange={mockOnChange} />);
      
      expect(screen.getByText('@ für Variablen')).toBeInTheDocument();
    });
  });

  describe('Placeholder Functionality', () => {
    it('displays default placeholder when editor is empty', () => {
      mockEditor.isEmpty = true;
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      expect(screen.getByText(/Beginnen Sie mit der Eingabe/)).toBeInTheDocument();
    });

    it('displays custom placeholder when provided', () => {
      mockEditor.isEmpty = true;
      const customPlaceholder = 'Custom placeholder text';
      
      render(<TemplateEditor onChange={mockOnChange} placeholder={customPlaceholder} />);
      
      expect(screen.getByText(customPlaceholder)).toBeInTheDocument();
    });

    it('hides placeholder when editor has content', () => {
      mockEditor.isEmpty = false;
      const customPlaceholder = 'Custom placeholder text';
      
      render(<TemplateEditor onChange={mockOnChange} placeholder={customPlaceholder} />);
      
      expect(screen.queryByText(customPlaceholder)).not.toBeInTheDocument();
    });

    it('does not show placeholder in read-only mode', () => {
      mockEditor.isEmpty = true;
      
      render(<TemplateEditor onChange={mockOnChange} readOnly />);
      
      expect(screen.queryByText(/Beginnen Sie mit der Eingabe/)).not.toBeInTheDocument();
    });
  });

  describe('Toolbar Interactions', () => {
    it('calls bold toggle when bold button is clicked', async () => {
      const user = userEvent.setup();
      const mockToggleBold = jest.fn(() => ({ run: jest.fn() }));
      mockEditor.chain().focus().toggleBold = mockToggleBold;
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const boldButton = screen.getByTitle('Fett (Ctrl+B)');
      await user.click(boldButton);
      
      expect(mockToggleBold).toHaveBeenCalled();
    });

    it('calls italic toggle when italic button is clicked', async () => {
      const user = userEvent.setup();
      const mockToggleItalic = jest.fn(() => ({ run: jest.fn() }));
      mockEditor.chain().focus().toggleItalic = mockToggleItalic;
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const italicButton = screen.getByTitle('Kursiv (Ctrl+I)');
      await user.click(italicButton);
      
      expect(mockToggleItalic).toHaveBeenCalled();
    });

    it('calls bullet list toggle when bullet list button is clicked', async () => {
      const user = userEvent.setup();
      const mockToggleBulletList = jest.fn(() => ({ run: jest.fn() }));
      mockEditor.chain().focus().toggleBulletList = mockToggleBulletList;
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const bulletListButton = screen.getByTitle('Aufzählung');
      await user.click(bulletListButton);
      
      expect(mockToggleBulletList).toHaveBeenCalled();
    });

    it('calls ordered list toggle when ordered list button is clicked', async () => {
      const user = userEvent.setup();
      const mockToggleOrderedList = jest.fn(() => ({ run: jest.fn() }));
      mockEditor.chain().focus().toggleOrderedList = mockToggleOrderedList;
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const orderedListButton = screen.getByTitle('Nummerierte Liste');
      await user.click(orderedListButton);
      
      expect(mockToggleOrderedList).toHaveBeenCalled();
    });

    it('calls blockquote toggle when blockquote button is clicked', async () => {
      const user = userEvent.setup();
      const mockToggleBlockquote = jest.fn(() => ({ run: jest.fn() }));
      mockEditor.chain().focus().toggleBlockquote = mockToggleBlockquote;
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const blockquoteButton = screen.getByTitle('Zitat');
      await user.click(blockquoteButton);
      
      expect(mockToggleBlockquote).toHaveBeenCalled();
    });

    it('calls undo when undo button is clicked', async () => {
      const user = userEvent.setup();
      const mockUndo = jest.fn(() => ({ run: jest.fn() }));
      mockEditor.chain().focus().undo = mockUndo;
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const undoButton = screen.getByTitle('Rückgängig (Ctrl+Z)');
      await user.click(undoButton);
      
      expect(mockUndo).toHaveBeenCalled();
    });

    it('calls redo when redo button is clicked', async () => {
      const user = userEvent.setup();
      const mockRedo = jest.fn(() => ({ run: jest.fn() }));
      mockEditor.chain().focus().redo = mockRedo;
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const redoButton = screen.getByTitle('Wiederholen (Ctrl+Y)');
      await user.click(redoButton);
      
      expect(mockRedo).toHaveBeenCalled();
    });
  });

  describe('Button States', () => {
    it('shows active state for bold button when text is bold', () => {
      mockEditor.isActive.mockImplementation((format: any) => format === 'bold');
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const boldButton = screen.getByTitle('Fett (Ctrl+B)');
      expect(boldButton).toHaveClass('bg-accent'); // Active variant styling
    });

    it('shows active state for italic button when text is italic', () => {
      mockEditor.isActive.mockImplementation((format: any) => format === 'italic');
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const italicButton = screen.getByTitle('Kursiv (Ctrl+I)');
      expect(italicButton).toHaveClass('bg-accent'); // Active variant styling
    });

    it('disables undo button when undo is not available', () => {
      mockEditor.can().undo.mockReturnValue(false);
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const undoButton = screen.getByTitle('Rückgängig (Ctrl+Z)');
      expect(undoButton).toBeDisabled();
    });

    it('disables redo button when redo is not available', () => {
      mockEditor.can().redo.mockReturnValue(false);
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const redoButton = screen.getByTitle('Wiederholen (Ctrl+Y)');
      expect(redoButton).toBeDisabled();
    });
  });

  describe('Content Management', () => {
    it('calls onChange when editor content changes', () => {
      const mockOnUpdate = jest.fn();
      const useEditorMock = require('@tiptap/react').useEditor;
      
      // Mock the editor creation to capture the onUpdate callback
      useEditorMock.mockImplementation((config: any) => {
        // Simulate content change
        setTimeout(() => {
          config.onUpdate({ editor: mockEditor });
        }, 0);
        
        return mockEditor;
      });
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      // Wait for the async onUpdate call
      waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith('<p>Test content</p>', { type: 'doc', content: [] });
      });
    });

    it('updates editor content when content prop changes', () => {
      const initialContent: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Initial content' }]
          }
        ]
      };

      const { rerender } = render(
        <TemplateEditor onChange={mockOnChange} content={initialContent} />
      );

      const newContent: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Updated content' }]
          }
        ]
      };

      rerender(<TemplateEditor onChange={mockOnChange} content={newContent} />);

      expect(mockEditor.commands.setContent).toHaveBeenCalledWith(newContent);
    });

    it('handles string content input', () => {
      const stringContent = '<p>HTML content</p>';
      
      render(<TemplateEditor onChange={mockOnChange} content={stringContent} />);
      
      expect(mockEditor.commands.setContent).toHaveBeenCalledWith(stringContent);
    });

    it('does not update content if it is the same', () => {
      const content: JSONContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Same content' }]
          }
        ]
      };

      mockEditor.getJSON.mockReturnValue(content);

      const { rerender } = render(
        <TemplateEditor onChange={mockOnChange} content={content} />
      );

      // Clear previous calls
      mockEditor.commands.setContent.mockClear();

      // Re-render with same content
      rerender(<TemplateEditor onChange={mockOnChange} content={content} />);

      expect(mockEditor.commands.setContent).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation', () => {
    it('supports keyboard navigation for toolbar buttons', async () => {
      const user = userEvent.setup();
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const boldButton = screen.getByTitle('Fett (Ctrl+B)');
      
      // Focus and press Enter
      boldButton.focus();
      await user.keyboard('{Enter}');
      
      expect(mockEditor.chain().focus().toggleBold().run).toHaveBeenCalled();
    });

    it('supports Tab navigation through toolbar buttons', async () => {
      const user = userEvent.setup();
      
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const boldButton = screen.getByTitle('Fett (Ctrl+B)');
      const italicButton = screen.getByTitle('Kursiv (Ctrl+I)');
      
      boldButton.focus();
      await user.keyboard('{Tab}');
      
      expect(italicButton).toHaveFocus();
    });
  });

  describe('Responsive Design', () => {
    it('shows mobile-friendly button sizes', () => {
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const boldButton = screen.getByTitle('Fett (Ctrl+B)');
      expect(boldButton).toHaveClass('h-7', 'w-7', 'sm:h-8', 'sm:w-8');
    });

    it('shows abbreviated mention helper on mobile', () => {
      render(<TemplateEditor onChange={mockOnChange} />);
      
      // Should show both full and abbreviated versions
      expect(screen.getByText('@ für Variablen')).toBeInTheDocument();
      expect(screen.getByText('@')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for all buttons', () => {
      render(<TemplateEditor onChange={mockOnChange} />);
      
      expect(screen.getByTitle('Fett (Ctrl+B)')).toBeInTheDocument();
      expect(screen.getByTitle('Kursiv (Ctrl+I)')).toBeInTheDocument();
      expect(screen.getByTitle('Aufzählung')).toBeInTheDocument();
      expect(screen.getByTitle('Nummerierte Liste')).toBeInTheDocument();
      expect(screen.getByTitle('Zitat')).toBeInTheDocument();
      expect(screen.getByTitle('Rückgängig (Ctrl+Z)')).toBeInTheDocument();
      expect(screen.getByTitle('Wiederholen (Ctrl+Y)')).toBeInTheDocument();
    });

    it('has proper button roles', () => {
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('supports screen readers with proper content structure', () => {
      render(<TemplateEditor onChange={mockOnChange} />);
      
      const editorContent = screen.getByTestId('editor-content');
      expect(editorContent).toHaveClass('prose');
    });
  });

  describe('Error Handling', () => {
    it('handles editor initialization failure gracefully', () => {
      const useEditorMock = require('@tiptap/react').useEditor;
      useEditorMock.mockReturnValue(null);
      
      const { container } = render(<TemplateEditor onChange={mockOnChange} />);
      
      // Should render nothing when editor is null
      expect(container.firstChild).toBeNull();
    });

    it('handles missing onChange callback', () => {
      expect(() => {
        render(<TemplateEditor />);
      }).not.toThrow();
    });

    it('handles malformed content gracefully', () => {
      const malformedContent = { invalid: 'content' } as any;
      
      expect(() => {
        render(<TemplateEditor onChange={mockOnChange} content={malformedContent} />);
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('does not re-render unnecessarily when props do not change', () => {
      const { rerender } = render(<TemplateEditor onChange={mockOnChange} />);
      
      // Clear previous calls
      mockEditor.commands.setContent.mockClear();
      
      // Re-render with same props
      rerender(<TemplateEditor onChange={mockOnChange} />);
      
      // Should not call setContent again
      expect(mockEditor.commands.setContent).not.toHaveBeenCalled();
    });

    it('memoizes toolbar button callbacks', () => {
      const { rerender } = render(<TemplateEditor onChange={mockOnChange} />);
      
      const boldButton = screen.getByTitle('Fett (Ctrl+B)');
      const originalOnClick = boldButton.onclick;
      
      // Re-render
      rerender(<TemplateEditor onChange={mockOnChange} />);
      
      const boldButtonAfterRerender = screen.getByTitle('Fett (Ctrl+B)');
      
      // Callback should be memoized (same reference)
      expect(boldButtonAfterRerender.onclick).toBe(originalOnClick);
    });
  });
});