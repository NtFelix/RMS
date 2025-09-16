import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplatesModal } from '@/components/templates-modal';
import { TemplateEditorModal } from '@/components/template-editor-modal';
import { useTemplates } from '@/hooks/use-templates';
import { useModalStore } from '@/hooks/use-modal-store';
import { Template, TemplatePayload } from '@/types/template';

// Mock dependencies
jest.mock('@/hooks/use-templates');
jest.mock('@/hooks/use-modal-store');
jest.mock('@/components/template-editor', () => ({
  TemplateEditor: ({ onChange, placeholder }: any) => (
    <div data-testid="template-editor">
      <textarea
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value, { type: 'doc', content: [] })}
      />
    </div>
  ),
}));

const mockUseTemplates = useTemplates as jest.MockedFunction<typeof useTemplates>;
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>;

describe('Template Integration Tests', () => {
  const mockTemplates: Template[] = [
    {
      id: '1',
      titel: 'Mietvertrag Standard',
      inhalt: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Sehr geehrte/r ' },
              { type: 'mention', attrs: { id: 'mieter.name', label: '@Mieter.Name' } },
              { type: 'text', text: ', hiermit bestätigen wir...' },
            ],
          },
        ],
      },
      user_id: 'user1',
      kategorie: 'Vertrag',
      kontext_anforderungen: ['mieter', 'wohnung'],
      erstellungsdatum: '2024-01-01T00:00:00Z',
      aktualisiert_am: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      titel: 'Mahnung Miete',
      inhalt: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Sehr geehrte/r ' },
              { type: 'mention', attrs: { id: 'mieter.name', label: '@Mieter.Name' } },
              { type: 'text', text: ', leider ist die Miete für ' },
              { type: 'mention', attrs: { id: 'wohnung.adresse', label: '@Wohnung.Adresse' } },
              { type: 'text', text: ' noch nicht eingegangen.' },
            ],
          },
        ],
      },
      user_id: 'user1',
      kategorie: 'Mahnung',
      kontext_anforderungen: ['mieter', 'wohnung'],
      erstellungsdatum: '2024-01-02T00:00:00Z',
      aktualisiert_am: '2024-01-02T00:00:00Z',
    },
  ];

  const mockCreateTemplate = jest.fn();
  const mockUpdateTemplate = jest.fn();
  const mockDeleteTemplate = jest.fn();
  const mockOpenConfirmationModal = jest.fn();
  const mockOpenTemplateEditorModal = jest.fn();
  const mockCloseTemplateEditorModal = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseTemplates.mockReturnValue({
      templates: mockTemplates,
      loading: false,
      error: null,
      createTemplate: mockCreateTemplate,
      updateTemplate: mockUpdateTemplate,
      deleteTemplate: mockDeleteTemplate,
      getTemplate: jest.fn(),
      refreshTemplates: jest.fn(),
    });

    mockUseModalStore.mockReturnValue({
      openConfirmationModal: mockOpenConfirmationModal,
      openTemplateEditorModal: mockOpenTemplateEditorModal,
      closeTemplateEditorModal: mockCloseTemplateEditorModal,
      isTemplateEditorModalOpen: false,
      templateEditorData: null,
      setTemplatesModalDirty: jest.fn(),
      isTemplatesModalDirty: false,
    } as any);
  });

  describe('Template Management Workflow', () => {
    it('displays templates grouped by category', async () => {
      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Vertrag')).toBeInTheDocument();
        expect(screen.getByText('Mahnung')).toBeInTheDocument();
        expect(screen.getByText('Mietvertrag Standard')).toBeInTheDocument();
        expect(screen.getByText('Mahnung Miete')).toBeInTheDocument();
      });
    });

    it('filters templates by search query', async () => {
      const user = userEvent.setup();
      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      const searchInput = screen.getByPlaceholderText('Vorlagen durchsuchen...');
      await user.type(searchInput, 'Mietvertrag');

      // Should show filtered results
      expect(screen.getByText('Mietvertrag Standard')).toBeInTheDocument();
      expect(screen.queryByText('Mahnung Miete')).not.toBeInTheDocument();
    });

    it('filters templates by category', async () => {
      const user = userEvent.setup();
      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      // Open category dropdown
      const categorySelect = screen.getByText('Alle Kategorien');
      await user.click(categorySelect);

      // Select Mahnung category
      await user.click(screen.getByRole('option', { name: 'Mahnung' }));

      // Should show only Mahnung templates
      expect(screen.getByText('Mahnung Miete')).toBeInTheDocument();
      expect(screen.queryByText('Mietvertrag Standard')).not.toBeInTheDocument();
    });

    it('opens template editor for new template', async () => {
      const user = userEvent.setup();
      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      const createButton = screen.getByText('Neue Vorlage');
      await user.click(createButton);

      expect(mockOpenTemplateEditorModal).toHaveBeenCalledWith(
        undefined,
        expect.any(Function)
      );
    });

    it('opens template editor for editing existing template', async () => {
      const user = userEvent.setup();
      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      // Find and click edit button for first template
      const editButtons = screen.getAllByTitle('Vorlage bearbeiten');
      await user.click(editButtons[0]);

      expect(mockOpenTemplateEditorModal).toHaveBeenCalledWith(
        mockTemplates[0],
        expect.any(Function)
      );
    });

    it('opens confirmation dialog for template deletion', async () => {
      const user = userEvent.setup();
      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      // Find and click delete button for first template
      const deleteButtons = screen.getAllByTitle('Vorlage löschen');
      await user.click(deleteButtons[0]);

      expect(mockOpenConfirmationModal).toHaveBeenCalledWith({
        title: 'Vorlage löschen',
        description: expect.stringContaining('Mietvertrag Standard'),
        confirmText: 'Löschen',
        cancelText: 'Abbrechen',
        onConfirm: expect.any(Function),
      });
    });

    it('shows template count', async () => {
      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('2 von 2 Vorlagen')).toBeInTheDocument();
      });
    });

    it('shows empty state when no templates', () => {
      mockUseTemplates.mockReturnValue({
        templates: [],
        loading: false,
        error: null,
        createTemplate: mockCreateTemplate,
        updateTemplate: mockUpdateTemplate,
        deleteTemplate: mockDeleteTemplate,
        getTemplate: jest.fn(),
        refreshTemplates: jest.fn(),
      });

      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      expect(screen.getByText('Noch keine Vorlagen erstellt')).toBeInTheDocument();
      expect(screen.getByText('Erste Vorlage erstellen')).toBeInTheDocument();
    });

    it('shows loading state', () => {
      mockUseTemplates.mockReturnValue({
        templates: [],
        loading: true,
        error: null,
        createTemplate: mockCreateTemplate,
        updateTemplate: mockUpdateTemplate,
        deleteTemplate: mockDeleteTemplate,
        getTemplate: jest.fn(),
        refreshTemplates: jest.fn(),
      });

      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      // Should show skeleton loading
      expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    });

    it('shows error state with retry option', async () => {
      const mockRefreshTemplates = jest.fn();
      mockUseTemplates.mockReturnValue({
        templates: [],
        loading: false,
        error: 'Failed to load templates',
        createTemplate: mockCreateTemplate,
        updateTemplate: mockUpdateTemplate,
        deleteTemplate: mockDeleteTemplate,
        getTemplate: jest.fn(),
        refreshTemplates: mockRefreshTemplates,
      });

      const user = userEvent.setup();
      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      expect(screen.getByText('Fehler beim Laden der Vorlagen')).toBeInTheDocument();
      expect(screen.getByText('Failed to load templates')).toBeInTheDocument();

      const retryButton = screen.getByText('Erneut versuchen');
      await user.click(retryButton);

      expect(mockRefreshTemplates).toHaveBeenCalled();
    });
  });

  describe('Template Editor Integration', () => {
    it('creates new template with category selection', async () => {
      const user = userEvent.setup();
      const mockOnSave = jest.fn();

      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={jest.fn()}
          onSave={mockOnSave}
        />
      );

      // Should start with category selection
      expect(screen.getByText('Schritt 1 von 2: Wählen Sie eine Kategorie für Ihre Vorlage')).toBeInTheDocument();

      // Select category
      const categorySelect = screen.getByRole('combobox');
      await user.click(categorySelect);
      await user.click(screen.getByRole('option', { name: 'Mail' }));

      // Continue to editor
      await user.click(screen.getByText('Weiter'));

      // Should now be on editor step
      expect(screen.getByText('Schritt 2 von 2: Vorlage erstellen')).toBeInTheDocument();

      // Fill in template details
      const titleInput = screen.getByLabelText('Titel der Vorlage');
      await user.type(titleInput, 'Test Template');

      // Add content
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

    it('edits existing template', async () => {
      const user = userEvent.setup();
      const mockOnSave = jest.fn();
      const existingTemplate = mockTemplates[0];

      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={jest.fn()}
          onSave={mockOnSave}
          template={existingTemplate}
        />
      );

      // Should skip category selection for existing template
      expect(screen.getByText('Bearbeitung der Vorlage')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Mietvertrag Standard')).toBeInTheDocument();

      // Modify title
      const titleInput = screen.getByLabelText('Titel der Vorlage');
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Mietvertrag');

      // Save changes
      await user.click(screen.getByText('Änderungen speichern'));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            titel: 'Updated Mietvertrag',
            kategorie: 'Vertrag',
          })
        );
      });
    });

    it('validates template form', async () => {
      const user = userEvent.setup();
      const mockOnSave = jest.fn();

      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={jest.fn()}
          onSave={mockOnSave}
        />
      );

      // Try to continue without selecting category
      await user.click(screen.getByText('Weiter'));

      expect(screen.getByText('Bitte wählen Sie eine Kategorie aus.')).toBeInTheDocument();

      // Select category and continue
      const categorySelect = screen.getByRole('combobox');
      await user.click(categorySelect);
      await user.click(screen.getByRole('option', { name: 'Mail' }));
      await user.click(screen.getByText('Weiter'));

      // Try to save without title
      await user.click(screen.getByText('Vorlage erstellen'));

      expect(screen.getByText('Der Titel muss mindestens 3 Zeichen lang sein.')).toBeInTheDocument();

      // Add short title
      const titleInput = screen.getByLabelText('Titel der Vorlage');
      await user.type(titleInput, 'ab');
      await user.click(screen.getByText('Vorlage erstellen'));

      expect(screen.getByText('Der Titel muss mindestens 3 Zeichen lang sein.')).toBeInTheDocument();
    });

    it('allows going back to category selection', async () => {
      const user = userEvent.setup();

      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      );

      // Select category and continue
      const categorySelect = screen.getByRole('combobox');
      await user.click(categorySelect);
      await user.click(screen.getByRole('option', { name: 'Mail' }));
      await user.click(screen.getByText('Weiter'));

      // Go back
      const backButton = screen.getByRole('button', { name: 'Zurück zur Kategorieauswahl' });
      await user.click(backButton);

      // Should be back to category selection
      expect(screen.getByText('Schritt 1 von 2: Wählen Sie eine Kategorie für Ihre Vorlage')).toBeInTheDocument();
    });

    it('does not show back button for existing templates', () => {
      const existingTemplate = mockTemplates[0];

      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
          template={existingTemplate}
        />
      );

      expect(screen.queryByRole('button', { name: 'Zurück zur Kategorieauswahl' })).not.toBeInTheDocument();
    });
  });

  describe('End-to-End Template Workflow', () => {
    it('completes full template creation workflow', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();

      // Start with templates modal
      render(<TemplatesModal isOpen={true} onClose={mockOnClose} />);

      // Click create new template
      const createButton = screen.getByText('Neue Vorlage');
      await user.click(createButton);

      // Verify editor modal would be opened
      expect(mockOpenTemplateEditorModal).toHaveBeenCalledWith(
        undefined,
        expect.any(Function)
      );

      // Simulate successful template creation
      const onSaveCallback = mockOpenTemplateEditorModal.mock.calls[0][1];
      const newTemplateData: TemplatePayload = {
        titel: 'New Template',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Mail',
        kontext_anforderungen: [],
      };

      await onSaveCallback(newTemplateData);

      expect(mockCreateTemplate).toHaveBeenCalledWith(newTemplateData);
    });

    it('completes full template editing workflow', async () => {
      const user = userEvent.setup();

      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      // Click edit on first template
      const editButtons = screen.getAllByTitle('Vorlage bearbeiten');
      await user.click(editButtons[0]);

      expect(mockOpenTemplateEditorModal).toHaveBeenCalledWith(
        mockTemplates[0],
        expect.any(Function)
      );

      // Simulate successful template update
      const onSaveCallback = mockOpenTemplateEditorModal.mock.calls[0][1];
      const updatedTemplateData: TemplatePayload = {
        titel: 'Updated Template',
        inhalt: mockTemplates[0].inhalt,
        kategorie: mockTemplates[0].kategorie,
        kontext_anforderungen: mockTemplates[0].kontext_anforderungen,
      };

      await onSaveCallback(updatedTemplateData);

      expect(mockUpdateTemplate).toHaveBeenCalledWith(mockTemplates[0].id, updatedTemplateData);
    });

    it('completes full template deletion workflow', async () => {
      const user = userEvent.setup();

      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      // Click delete on first template
      const deleteButtons = screen.getAllByTitle('Vorlage löschen');
      await user.click(deleteButtons[0]);

      expect(mockOpenConfirmationModal).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Vorlage löschen',
          onConfirm: expect.any(Function),
        })
      );

      // Simulate confirmation
      const onConfirmCallback = mockOpenConfirmationModal.mock.calls[0][0].onConfirm;
      await onConfirmCallback();

      expect(mockDeleteTemplate).toHaveBeenCalledWith(mockTemplates[0].id);
    });
  });
});