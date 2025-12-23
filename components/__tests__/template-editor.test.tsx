import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateEditor } from '@/components/templates/template-editor';

// Mock TipTap dependencies
jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(() => ({
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
    can: jest.fn(() => ({
      undo: jest.fn(() => true),
      redo: jest.fn(() => true),
    })),
    isActive: jest.fn(() => false),
    isEmpty: false,
  })),
  EditorContent: ({ editor, className }: any) => (
    <div data-testid="editor-content" className={className}>
      Editor Content
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

describe('TemplateEditor', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the editor with toolbar', () => {
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
  });

  it('displays custom placeholder when editor is empty', () => {
    const customPlaceholder = 'Custom placeholder text';
    
    // Mock the editor to be empty
    const mockUseEditor = require('@tiptap/react').useEditor;
    mockUseEditor.mockReturnValueOnce({
      ...mockUseEditor(),
      isEmpty: true,
    });
    
    render(<TemplateEditor onChange={mockOnChange} placeholder={customPlaceholder} />);
    
    expect(screen.getByText(customPlaceholder)).toBeInTheDocument();
  });

  it('shows mention helper text', () => {
    render(<TemplateEditor onChange={mockOnChange} />);
    
    expect(screen.getByText('@ für Variablen')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const customClass = 'custom-editor-class';
    const { container } = render(
      <TemplateEditor onChange={mockOnChange} className={customClass} />
    );
    
    expect(container.firstChild).toHaveClass(customClass);
  });
});