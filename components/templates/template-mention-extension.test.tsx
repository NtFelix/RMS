import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateEditor } from '@/components/templates/template-editor';
import { MENTION_VARIABLES } from '@/lib/template-constants';
import { JSONContent } from '@tiptap/react';

// Mock TipTap with mention functionality
jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(),
  EditorContent: ({ editor }: any) => (
    <div data-testid="editor-content">
      <div data-testid="editor-html">{editor?.getHTML?.() || ''}</div>
      <div data-testid="editor-json">{JSON.stringify(editor?.getJSON?.() || {})}</div>
    </div>
  ),
  JSONContent: {} as any,
}));

jest.mock('@tiptap/starter-kit', () => ({
  configure: jest.fn(() => ({})),
}));

jest.mock('@tiptap/extension-mention', () => ({
  configure: jest.fn((config) => ({
    name: 'mention',
    config,
  })),
}));

jest.mock('tippy.js', () => {
  return jest.fn(() => ({
    setProps: jest.fn(),
    hide: jest.fn(),
    destroy: jest.fn(),
  }));
});

const { useEditor } = require('@tiptap/react');
const Mention = require('@tiptap/extension-mention');

describe('Template Mention Extension', () => {
  let mockEditor: any;
  let mentionConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockEditor = {
      getHTML: jest.fn(() => '<p>Test content with <span class="mention-variable">@Mieter.Name</span></p>'),
      getJSON: jest.fn(() => ({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Test content with ' },
              { type: 'mention', attrs: { id: 'mieter.name', label: '@Mieter.Name' } },
            ],
          },
        ],
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
      isActive: jest.fn(() => false),
      can: jest.fn(() => ({
        undo: jest.fn(() => true),
        redo: jest.fn(() => true),
      })),
      isEmpty: false,
    };

    useEditor.mockImplementation((config: any) => {
      const mentionExtension = config.extensions.find((ext: any) => ext.name === 'mention');
      if (mentionExtension) {
        mentionConfig = mentionExtension.config;
      }
      return mockEditor;
    });

    Mention.configure.mockImplementation((config: any) => ({
      name: 'mention',
      config,
    }));
  });

  it('configures mention extension with correct variables', () => {
    render(<TemplateEditor onChange={jest.fn()} />);

    expect(Mention.configure).toHaveBeenCalledWith(
      expect.objectContaining({
        HTMLAttributes: {
          class: 'mention-variable bg-primary/10 text-primary px-1 py-0.5 rounded font-medium',
        },
        suggestion: expect.objectContaining({
          items: expect.any(Function),
          render: expect.any(Function),
        }),
      })
    );
  });

  it('filters mention variables based on query', () => {
    render(<TemplateEditor onChange={jest.fn()} />);

    const mentionConfig = Mention.configure.mock.calls[0][0];
    const itemsFunction = mentionConfig.suggestion.items;

    // Test filtering with 'mieter' query
    const mieterResults = itemsFunction({ query: 'mieter' });
    expect(mieterResults.length).toBeGreaterThan(0);
    expect(mieterResults.every((item: any) => 
      item.label.toLowerCase().includes('mieter') || 
      item.description.toLowerCase().includes('mieter')
    )).toBe(true);

    // Test filtering with 'wohnung' query
    const wohnungResults = itemsFunction({ query: 'wohnung' });
    expect(wohnungResults.length).toBeGreaterThan(0);
    expect(wohnungResults.every((item: any) => 
      item.label.toLowerCase().includes('wohnung') || 
      item.description.toLowerCase().includes('wohnung')
    )).toBe(true);

    // Test empty query returns all variables (limited to 10)
    const allResults = itemsFunction({ query: '' });
    expect(allResults.length).toBeLessThanOrEqual(10);

    // Test non-matching query
    const noResults = itemsFunction({ query: 'xyz123' });
    expect(noResults.length).toBe(0);
  });

  it('includes all expected mention variables', () => {
    render(<TemplateEditor onChange={jest.fn()} />);

    const mentionConfig = Mention.configure.mock.calls[0][0];
    const itemsFunction = mentionConfig.suggestion.items;
    const allResults = itemsFunction({ query: '' });

    // Check that key variables are available
    const variableIds = allResults.map((item: any) => item.id);
    
    expect(variableIds).toContain('mieter.name');
    expect(variableIds).toContain('mieter.email');
    expect(variableIds).toContain('wohnung.adresse');
    expect(variableIds).toContain('haus.name');
    expect(variableIds).toContain('datum.heute');
    expect(variableIds).toContain('vermieter.name');
  });

  it('renders mention dropdown component', () => {
    render(<TemplateEditor onChange={jest.fn()} />);

    const mentionConfig = Mention.configure.mock.calls[0][0];
    const renderFunction = mentionConfig.suggestion.render;

    // Mock render function should return object with lifecycle methods
    const renderResult = renderFunction();
    
    expect(renderResult).toHaveProperty('onStart');
    expect(renderResult).toHaveProperty('onUpdate');
    expect(renderResult).toHaveProperty('onKeyDown');
    expect(renderResult).toHaveProperty('onExit');
    
    expect(typeof renderResult.onStart).toBe('function');
    expect(typeof renderResult.onUpdate).toBe('function');
    expect(typeof renderResult.onKeyDown).toBe('function');
    expect(typeof renderResult.onExit).toBe('function');
  });

  it('handles mention dropdown lifecycle', () => {
    render(<TemplateEditor onChange={jest.fn()} />);

    const mentionConfig = Mention.configure.mock.calls[0][0];
    const renderFunction = mentionConfig.suggestion.render;
    const renderResult = renderFunction();

    // Mock props for mention dropdown
    const mockProps = {
      items: MENTION_VARIABLES.slice(0, 3),
      command: jest.fn(),
      clientRect: () => ({ top: 100, left: 100, width: 200, height: 20 }),
    };

    // Test onStart
    expect(() => renderResult.onStart(mockProps)).not.toThrow();

    // Test onUpdate
    const updatedProps = { ...mockProps, items: MENTION_VARIABLES.slice(0, 2) };
    expect(() => renderResult.onUpdate(updatedProps)).not.toThrow();

    // Test onKeyDown with different keys
    const keyDownProps = {
      event: { key: 'ArrowDown' },
    };
    expect(renderResult.onKeyDown(keyDownProps)).toBe(true);

    const escapeProps = {
      event: { key: 'Escape' },
    };
    expect(renderResult.onKeyDown(escapeProps)).toBe(true);

    const enterProps = {
      event: { key: 'Enter' },
    };
    expect(renderResult.onKeyDown(enterProps)).toBe(true);

    const otherKeyProps = {
      event: { key: 'a' },
    };
    expect(renderResult.onKeyDown(otherKeyProps)).toBe(false);

    // Test onExit
    expect(() => renderResult.onExit()).not.toThrow();
  });

  it('renders content with mentions correctly', () => {
    const contentWithMentions: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Sehr geehrte/r ' },
            { type: 'mention', attrs: { id: 'mieter.name', label: '@Mieter.Name' } },
            { type: 'text', text: ', die Miete für ' },
            { type: 'mention', attrs: { id: 'wohnung.adresse', label: '@Wohnung.Adresse' } },
            { type: 'text', text: ' ist fällig.' },
          ],
        },
      ],
    };

    mockEditor.getJSON.mockReturnValue(contentWithMentions);
    mockEditor.getHTML.mockReturnValue(
      '<p>Sehr geehrte/r <span class="mention-variable">@Mieter.Name</span>, die Miete für <span class="mention-variable">@Wohnung.Adresse</span> ist fällig.</p>'
    );

    render(<TemplateEditor content={contentWithMentions} onChange={jest.fn()} />);

    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    
    // Verify that the editor was initialized with the mention content
    expect(useEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        content: contentWithMentions,
      })
    );
  });

  it('calls onChange with mention content', async () => {
    const mockOnChange = jest.fn();
    
    useEditor.mockImplementation((config: any) => {
      // Simulate editor update with mention content
      setTimeout(() => {
        config.onUpdate?.({ editor: mockEditor });
      }, 0);
      return mockEditor;
    });

    render(<TemplateEditor onChange={mockOnChange} />);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(
        '<p>Test content with <span class="mention-variable">@Mieter.Name</span></p>',
        expect.objectContaining({
          type: 'doc',
          content: expect.arrayContaining([
            expect.objectContaining({
              type: 'paragraph',
              content: expect.arrayContaining([
                expect.objectContaining({ type: 'mention' }),
              ]),
            }),
          ]),
        })
      );
    });
  });

  it('applies correct CSS classes to mentions', () => {
    render(<TemplateEditor onChange={jest.fn()} />);

    const mentionConfig = Mention.configure.mock.calls[0][0];
    
    expect(mentionConfig.HTMLAttributes.class).toBe(
      'mention-variable bg-primary/10 text-primary px-1 py-0.5 rounded font-medium'
    );
  });

  it('limits mention suggestions to 10 items', () => {
    render(<TemplateEditor onChange={jest.fn()} />);

    const mentionConfig = Mention.configure.mock.calls[0][0];
    const itemsFunction = mentionConfig.suggestion.items;

    // Test with empty query (should return all variables but limited to 10)
    const results = itemsFunction({ query: '' });
    expect(results.length).toBeLessThanOrEqual(10);
  });

  it('handles case-insensitive mention filtering', () => {
    render(<TemplateEditor onChange={jest.fn()} />);

    const mentionConfig = Mention.configure.mock.calls[0][0];
    const itemsFunction = mentionConfig.suggestion.items;

    // Test case-insensitive filtering
    const lowerCaseResults = itemsFunction({ query: 'mieter' });
    const upperCaseResults = itemsFunction({ query: 'MIETER' });
    const mixedCaseResults = itemsFunction({ query: 'Mieter' });

    expect(lowerCaseResults.length).toBeGreaterThan(0);
    expect(upperCaseResults.length).toBe(lowerCaseResults.length);
    expect(mixedCaseResults.length).toBe(lowerCaseResults.length);
  });

  it('filters by both label and description', () => {
    render(<TemplateEditor onChange={jest.fn()} />);

    const mentionConfig = Mention.configure.mock.calls[0][0];
    const itemsFunction = mentionConfig.suggestion.items;

    // Test filtering by label
    const labelResults = itemsFunction({ query: 'Name' });
    expect(labelResults.length).toBeGreaterThan(0);

    // Test filtering by description
    const descriptionResults = itemsFunction({ query: 'Vollständiger' });
    expect(descriptionResults.length).toBeGreaterThan(0);

    // Verify that results include items matching either label or description
    const allResults = itemsFunction({ query: 'Name' });
    const hasLabelMatch = allResults.some((item: any) => 
      item.label.toLowerCase().includes('name')
    );
    const hasDescriptionMatch = allResults.some((item: any) => 
      item.description.toLowerCase().includes('name')
    );
    
    expect(hasLabelMatch || hasDescriptionMatch).toBe(true);
  });

  it('validates mention variable structure', () => {
    render(<TemplateEditor onChange={jest.fn()} />);

    const mentionConfig = Mention.configure.mock.calls[0][0];
    const itemsFunction = mentionConfig.suggestion.items;
    const results = itemsFunction({ query: '' });

    // Verify each mention variable has required properties
    results.forEach((variable: any) => {
      expect(variable).toHaveProperty('id');
      expect(variable).toHaveProperty('label');
      expect(variable).toHaveProperty('description');
      expect(typeof variable.id).toBe('string');
      expect(typeof variable.label).toBe('string');
      expect(typeof variable.description).toBe('string');
      expect(variable.id.length).toBeGreaterThan(0);
      expect(variable.label.length).toBeGreaterThan(0);
      expect(variable.description.length).toBeGreaterThan(0);
    });
  });
});