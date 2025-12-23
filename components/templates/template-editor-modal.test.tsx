import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateEditorModal } from '@/components/templates/template-editor-modal';
import { Template } from '@/types/template';

// Mock the TemplateEditor component
jest.mock('@/components/templates/template-editor', () => ({
  TemplateEditor: ({ onChange, placeholder }: any) => (
    <div data-testid="template-editor">
      <textarea
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value, { type: 'doc', content: [] })}
      />
    </div>
  ),
}));

describe('TemplateEditorModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders category selection step for new template', () => {
    render(
      <TemplateEditorModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Neue Vorlage erstellen')).toBeInTheDocument();
    expect(screen.getByText('Schritt 1 von 2: Wählen Sie eine Kategorie für Ihre Vorlage')).toBeInTheDocument();
    expect(screen.getByText('Kategorie auswählen...')).toBeInTheDocument();
  });

  it('renders editor step directly for existing template', () => {
    const existingTemplate: Template = {
      id: '1',
      titel: 'Test Template',
      inhalt: { type: 'doc', content: [] },
      user_id: 'user1',
      kategorie: 'Mail',
      kontext_anforderungen: [],
      erstellungsdatum: '2024-01-01',
      aktualisiert_am: '2024-01-01',
    };

    render(
      <TemplateEditorModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        template={existingTemplate}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Template')).toBeInTheDocument();
    expect(screen.getByText('Mail')).toBeInTheDocument();
    expect(screen.getByText('Bearbeitung der Vorlage')).toBeInTheDocument();
  });

  it('allows category selection and proceeds to editor', async () => {
    const user = userEvent.setup();
    
    render(
      <TemplateEditorModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    // Click on category dropdown trigger
    const selectTrigger = screen.getByRole('combobox');
    await user.click(selectTrigger);
    
    // Select a category
    await user.click(screen.getByRole('option', { name: 'Mail' }));
    
    // Click continue button
    await user.click(screen.getByText('Weiter'));

    // Should now be on editor step
    await waitFor(() => {
      expect(screen.getByText('Schritt 2 von 2: Vorlage erstellen')).toBeInTheDocument();
    });
    
    expect(screen.getByLabelText('Titel der Vorlage')).toBeInTheDocument();
    expect(screen.getByTestId('template-editor')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    
    render(
      <TemplateEditorModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    // Try to continue without selecting category
    await user.click(screen.getByText('Weiter'));

    await waitFor(() => {
      expect(screen.getByText('Bitte wählen Sie eine Kategorie aus.')).toBeInTheDocument();
    });
  });

  it('validates template title length', async () => {
    const user = userEvent.setup();
    
    render(
      <TemplateEditorModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    // Select category and proceed to editor
    const selectTrigger = screen.getByRole('combobox');
    await user.click(selectTrigger);
    await user.click(screen.getByRole('option', { name: 'Mail' }));
    await user.click(screen.getByText('Weiter'));

    // Enter too short title
    const titleInput = screen.getByLabelText('Titel der Vorlage');
    await user.type(titleInput, 'ab');

    // Try to save
    await user.click(screen.getByText('Vorlage erstellen'));

    await waitFor(() => {
      expect(screen.getByText('Der Titel muss mindestens 3 Zeichen lang sein.')).toBeInTheDocument();
    });
  });

  it('calls onSave with correct data', async () => {
    const user = userEvent.setup();
    
    render(
      <TemplateEditorModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    // Select category and proceed to editor
    const selectTrigger = screen.getByRole('combobox');
    await user.click(selectTrigger);
    await user.click(screen.getByRole('option', { name: 'Mail' }));
    await user.click(screen.getByText('Weiter'));

    // Fill in template details
    const titleInput = screen.getByLabelText('Titel der Vorlage');
    await user.type(titleInput, 'Test Template');

    // Add content to editor
    const editorTextarea = screen.getByTestId('template-editor').querySelector('textarea');
    if (editorTextarea) {
      await user.type(editorTextarea, 'Test content');
    }

    // Save template
    await user.click(screen.getByText('Vorlage erstellen'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        titel: 'Test Template',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Mail',
        kontext_anforderungen: [],
      });
    });
  });

  it('allows going back to category selection for new templates', async () => {
    const user = userEvent.setup();
    
    render(
      <TemplateEditorModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    // Select category and proceed to editor
    const selectTrigger = screen.getByRole('combobox');
    await user.click(selectTrigger);
    await user.click(screen.getByRole('option', { name: 'Mail' }));
    await user.click(screen.getByText('Weiter'));

    // Click back button
    const backButton = screen.getByRole('button', { name: 'Zurück zur Kategorieauswahl' });
    await user.click(backButton);

    // Should be back to category selection
    expect(screen.getByText('Schritt 1 von 2: Wählen Sie eine Kategorie für Ihre Vorlage')).toBeInTheDocument();
  });

  it('does not show back button for existing templates', () => {
    const existingTemplate: Template = {
      id: '1',
      titel: 'Test Template',
      inhalt: { type: 'doc', content: [] },
      user_id: 'user1',
      kategorie: 'Mail',
      kontext_anforderungen: [],
      erstellungsdatum: '2024-01-01',
      aktualisiert_am: '2024-01-01',
    };

    render(
      <TemplateEditorModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        template={existingTemplate}
      />
    );

    // Should not have back button for existing templates
    expect(screen.queryByRole('button', { name: 'Zurück zur Kategorieauswahl' })).not.toBeInTheDocument();
  });
});