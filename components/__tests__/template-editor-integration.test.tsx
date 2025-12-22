import { render, screen } from '@testing-library/react';
import { TemplateEditorDemo } from '@/components/templates/template-editor-demo';

// Mock TipTap dependencies for integration test
jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(() => ({
    getHTML: jest.fn(() => '<p>Test content with @Mieter.Name</p>'),
    getJSON: jest.fn(() => ({ 
      type: 'doc', 
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Test content with ' },
            { type: 'mention', attrs: { id: 'mieter.name', label: 'Mieter.Name' } }
          ]
        }
      ]
    })),
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
      <p>Test content with <span className="mention-variable">@Mieter.Name</span></p>
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

describe('TemplateEditor Integration', () => {
  it('renders the demo with all components', () => {
    render(<TemplateEditorDemo />);
    
    // Check main components are rendered
    expect(screen.getByText('Template Editor Demo')).toBeInTheDocument();
    expect(screen.getByText('Beispielinhalt laden')).toBeInTheDocument();
    expect(screen.getByText('Inhalt löschen')).toBeInTheDocument();
    
    // Check output sections
    expect(screen.getByText('HTML Output')).toBeInTheDocument();
    expect(screen.getByText('JSON Output')).toBeInTheDocument();
    
    // Check variables section
    expect(screen.getByText('Verfügbare Variablen')).toBeInTheDocument();
    expect(screen.getByText('Mieter')).toBeInTheDocument();
    expect(screen.getByText('Wohnung')).toBeInTheDocument();
    expect(screen.getByText('Sonstiges')).toBeInTheDocument();
    
    // Check some specific variables
    expect(screen.getAllByText('@Mieter.Name')).toHaveLength(2); // In editor and variables list
    expect(screen.getByText('@Wohnung.Adresse')).toBeInTheDocument(); // Only in variables list
    expect(screen.getByText('@Datum.Heute')).toBeInTheDocument(); // Only in variables list
  });

  it('displays mention variables in the available variables list', () => {
    render(<TemplateEditorDemo />);
    
    // Check that mention variables are displayed
    const mentionVariables = [
      '@Mieter.Name', '@Mieter.Email', '@Mieter.Telefon',
      '@Wohnung.Adresse', '@Wohnung.Straße', '@Wohnung.PLZ',
      '@Haus.Name', '@Datum.Heute', '@Vermieter.Name'
    ];
    
    mentionVariables.forEach(variable => {
      expect(screen.getAllByText(variable).length).toBeGreaterThanOrEqual(1);
    });
  });
});