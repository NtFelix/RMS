import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplatesModal } from '@/components/templates/templates-modal';
import { TemplateEditorModal } from '@/components/templates/template-editor-modal';
import { useTemplates } from '@/hooks/use-templates';
import { useModalStore } from '@/hooks/use-modal-store';
import { Template, TemplatePayload } from '@/types/template';
import { toast } from '@/hooks/use-toast';

// Mock all dependencies
jest.mock('@/hooks/use-templates');
jest.mock('@/hooks/use-modal-store');
jest.mock('@/hooks/use-toast');
jest.mock('@/components/templates/template-editor', () => ({
  TemplateEditor: ({ onChange, content, placeholder }: any) => (
    <div data-testid="template-editor">
      <textarea
        data-testid="editor-textarea"
        placeholder={placeholder}
        defaultValue={content ? 'Existing content' : ''}
        onChange={(e) => {
          const mockContent = {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: e.target.value }],
              },
            ],
          };
          onChange?.(e.target.value, mockContent);
        }}
      />
    </div>
  ),
}));

const mockUseTemplates = useTemplates as jest.MockedFunction<typeof useTemplates>;
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>;
const mockToast = toast as jest.MockedFunction<typeof toast>;

describe('Template Management E2E Workflow', () => {
  let mockTemplates: Template[];
  let mockCreateTemplate: jest.Mock;
  let mockUpdateTemplate: jest.Mock;
  let mockDeleteTemplate: jest.Mock;
  let mockRefreshTemplates: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTemplates = [
      {
        id: '1',
        titel: 'Mietvertrag Vorlage',
        inhalt: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Sehr geehrte/r ' },
                { type: 'mention', attrs: { id: 'mieter.name', label: '@Mieter.Name' } },
                { type: 'text', text: ', hiermit bestätigen wir den Mietvertrag für ' },
                { type: 'mention', attrs: { id: 'wohnung.adresse', label: '@Wohnung.Adresse' } },
                { type: 'text', text: '.' },
              ],
            },
          ],
        },
        user_id: 'user1',
        kategorie: 'Dokumente',
        kontext_anforderungen: ['mieter', 'wohnung'],
        erstellungsdatum: '2024-01-01T00:00:00Z',
        aktualisiert_am: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        titel: 'Mahnung Vorlage',
        inhalt: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Sehr geehrte/r ' },
                { type: 'mention', attrs: { id: 'mieter.name', label: '@Mieter.Name' } },
                { type: 'text', text: ', die Miete ist überfällig.' },
              ],
            },
          ],
        },
        user_id: 'user1',
        kategorie: 'Dokumente',
        kontext_anforderungen: ['mieter'],
        erstellungsdatum: '2024-01-02T00:00:00Z',
        aktualisiert_am: '2024-01-02T00:00:00Z',
      },
    ];

    mockCreateTemplate = jest.fn();
    mockUpdateTemplate = jest.fn();
    mockDeleteTemplate = jest.fn();
    mockRefreshTemplates = jest.fn();

    mockUseTemplates.mockReturnValue({
      templates: mockTemplates,
      loading: false,
      error: null,
      createTemplate: mockCreateTemplate,
      updateTemplate: mockUpdateTemplate,
      deleteTemplate: mockDeleteTemplate,
      getTemplate: jest.fn(),
      refreshTemplates: mockRefreshTemplates,
    });

    mockUseModalStore.mockReturnValue({
      openConfirmationModal: jest.fn(),
      openTemplateEditorModal: jest.fn(),
      closeTemplateEditorModal: jest.fn(),
      isTemplateEditorModalOpen: false,
      templateEditorData: null,
      setTemplatesModalDirty: jest.fn(),
      isTemplatesModalDirty: false,
      setTemplateEditorModalDirty: jest.fn(),
      isTemplateEditorModalDirty: false,
    } as any);
  });

  describe('Complete Template Creation Workflow', () => {
    it('creates a new template from start to finish', async () => {
      const user = userEvent.setup();
      
      // Mock successful creation
      const newTemplate: Template = {
        id: '3',
        titel: 'Neue Kündigung',
        inhalt: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Hiermit kündigen wir den Mietvertrag.' }],
            },
          ],
        },
        user_id: 'user1',
        kategorie: 'Dokumente',
        kontext_anforderungen: [],
        erstellungsdatum: '2024-01-03T00:00:00Z',
        aktualisiert_am: '2024-01-03T00:00:00Z',
      };

      mockCreateTemplate.mockResolvedValue(newTemplate);

      // Render the complete workflow
      const TemplateWorkflow = () => {
        const [showEditor, setShowEditor] = React.useState(false);
        const [editingTemplate, setEditingTemplate] = React.useState<Template | undefined>();

        const handleCreateTemplate = () => {
          setEditingTemplate(undefined);
          setShowEditor(true);
        };

        const handleSaveTemplate = async (templateData: Partial<Template>) => {
          await mockCreateTemplate(templateData);
          setShowEditor(false);
          mockToast({
            title: 'Erfolg',
            description: 'Vorlage wurde erfolgreich erstellt.',
          });
        };

        return (
          <>
            <TemplatesModal isOpen={true} onClose={jest.fn()} />
            {showEditor && (
              <TemplateEditorModal
                isOpen={true}
                onClose={() => setShowEditor(false)}
                template={editingTemplate}
                onSave={handleSaveTemplate}
              />
            )}
            <button onClick={handleCreateTemplate} data-testid="trigger-create">
              Create Template
            </button>
          </>
        );
      };

      render(<TemplateWorkflow />);

      // Step 1: Open template creation
      await user.click(screen.getByTestId('trigger-create'));

      // Step 2: Select category
      expect(screen.getByText('Schritt 1 von 2: Wählen Sie eine Kategorie für Ihre Vorlage')).toBeInTheDocument();
      
      const categorySelect = screen.getByRole('combobox');
      await user.click(categorySelect);
      await user.click(screen.getByRole('option', { name: 'Kündigung' }));
      await user.click(screen.getByText('Weiter'));

      // Step 3: Fill in template details
      expect(screen.getByText('Schritt 2 von 2: Vorlage erstellen')).toBeInTheDocument();
      
      const titleInput = screen.getByLabelText('Titel der Vorlage');
      await user.type(titleInput, 'Neue Kündigung');

      const editorTextarea = screen.getByTestId('editor-textarea');
      await user.type(editorTextarea, 'Hiermit kündigen wir den Mietvertrag.');

      // Step 4: Save template
      await user.click(screen.getByText('Vorlage erstellen'));

      // Verify the creation was called with correct data
      await waitFor(() => {
        expect(mockCreateTemplate).toHaveBeenCalledWith({
          titel: 'Neue Kündigung',
          inhalt: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Hiermit kündigen wir den Mietvertrag.' }],
              },
            ],
          },
          kategorie: 'Kündigung',
          kontext_anforderungen: [],
        });
      });

      // Verify success toast
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Erfolg',
        description: 'Vorlage wurde erfolgreich erstellt.',
      });
    });

    it('handles validation errors during creation', async () => {
      const user = userEvent.setup();

      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      );

      // Try to proceed without selecting category
      await user.click(screen.getByText('Weiter'));

      expect(screen.getByText('Bitte wählen Sie eine Kategorie aus.')).toBeInTheDocument();

      // Select category and proceed
      const categorySelect = screen.getByRole('combobox');
      await user.click(categorySelect);
      await user.click(screen.getByRole('option', { name: 'Mail' }));
      await user.click(screen.getByText('Weiter'));

      // Try to save without title
      await user.click(screen.getByText('Vorlage erstellen'));

      expect(screen.getByText('Der Titel muss mindestens 3 Zeichen lang sein.')).toBeInTheDocument();

      // Add invalid title (too short)
      const titleInput = screen.getByLabelText('Titel der Vorlage');
      await user.type(titleInput, 'ab');
      await user.click(screen.getByText('Vorlage erstellen'));

      expect(screen.getByText('Der Titel muss mindestens 3 Zeichen lang sein.')).toBeInTheDocument();
    });

    it('handles server errors during creation', async () => {
      const user = userEvent.setup();
      
      mockCreateTemplate.mockRejectedValue(new Error('Server error'));

      const mockOnSave = jest.fn(async (data) => {
        await mockCreateTemplate(data);
      });

      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={jest.fn()}
          onSave={mockOnSave}
        />
      );

      // Complete the form
      const categorySelect = screen.getByRole('combobox');
      await user.click(categorySelect);
      await user.click(screen.getByRole('option', { name: 'Mail' }));
      await user.click(screen.getByText('Weiter'));

      const titleInput = screen.getByLabelText('Titel der Vorlage');
      await user.type(titleInput, 'Test Template');

      const editorTextarea = screen.getByTestId('editor-textarea');
      await user.type(editorTextarea, 'Test content');

      // Try to save
      await user.click(screen.getByText('Vorlage erstellen'));

      await waitFor(() => {
        expect(mockCreateTemplate).toHaveBeenCalled();
      });

      // Should show error state
      expect(screen.getByText('Speicherfehler')).toBeInTheDocument();
    });
  });

  describe('Complete Template Editing Workflow', () => {
    it('edits an existing template from start to finish', async () => {
      const user = userEvent.setup();
      const existingTemplate = mockTemplates[0];
      
      mockUpdateTemplate.mockResolvedValue({
        ...existingTemplate,
        titel: 'Updated Mietvertrag',
        aktualisiert_am: '2024-01-03T00:00:00Z',
      });

      const mockOnSave = jest.fn(async (data) => {
        await mockUpdateTemplate(existingTemplate.id, data);
      });

      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={jest.fn()}
          template={existingTemplate}
          onSave={mockOnSave}
        />
      );

      // Should skip category selection for existing template
      expect(screen.getByText('Bearbeitung der Vorlage')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Mietvertrag Vorlage')).toBeInTheDocument();

      // Modify the title
      const titleInput = screen.getByLabelText('Titel der Vorlage');
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Mietvertrag');

      // Modify the content
      const editorTextarea = screen.getByTestId('editor-textarea');
      await user.clear(editorTextarea);
      await user.type(editorTextarea, 'Updated content with new text.');

      // Save changes
      await user.click(screen.getByText('Änderungen speichern'));

      await waitFor(() => {
        expect(mockUpdateTemplate).toHaveBeenCalledWith(
          existingTemplate.id,
          expect.objectContaining({
            titel: 'Updated Mietvertrag',
            kategorie: 'Vertrag',
          })
        );
      });
    });

    it('preserves original data when editing', async () => {
      const existingTemplate = mockTemplates[0];

      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={jest.fn()}
          template={existingTemplate}
          onSave={jest.fn()}
        />
      );

      // Should show existing data
      expect(screen.getByDisplayValue('Mietvertrag Vorlage')).toBeInTheDocument();
      expect(screen.getByText('Vertrag')).toBeInTheDocument(); // Category badge
      expect(screen.getByText('Bearbeitung der Vorlage')).toBeInTheDocument();

      // Should not show back button for existing templates
      expect(screen.queryByRole('button', { name: 'Zurück zur Kategorieauswahl' })).not.toBeInTheDocument();
    });
  });

  describe('Complete Template Deletion Workflow', () => {
    it('deletes a template with confirmation', async () => {
      const user = userEvent.setup();
      
      mockDeleteTemplate.mockResolvedValue(undefined);

      let confirmationCallback: (() => Promise<void>) | null = null;
      const mockOpenConfirmationModal = jest.fn((config) => {
        confirmationCallback = config.onConfirm;
      });

      mockUseModalStore.mockReturnValue({
        ...mockUseModalStore(),
        openConfirmationModal: mockOpenConfirmationModal,
      } as any);

      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      // Find and click delete button for first template
      const deleteButtons = screen.getAllByTitle('Vorlage löschen');
      await user.click(deleteButtons[0]);

      // Verify confirmation modal was opened
      expect(mockOpenConfirmationModal).toHaveBeenCalledWith({
        title: 'Vorlage löschen',
        description: expect.stringContaining('Mietvertrag Vorlage'),
        confirmText: 'Löschen',
        cancelText: 'Abbrechen',
        onConfirm: expect.any(Function),
      });

      // Simulate user confirming deletion
      if (confirmationCallback) {
        await (confirmationCallback as any)();
      }

      expect(mockDeleteTemplate).toHaveBeenCalledWith('1');
    });

    it('handles deletion errors gracefully', async () => {
      const user = userEvent.setup();
      
      mockDeleteTemplate.mockRejectedValue(new Error('Cannot delete template'));

      let confirmationCallback: (() => Promise<void>) | null = null;
      const mockOpenConfirmationModal = jest.fn((config) => {
        confirmationCallback = config.onConfirm;
      });

      mockUseModalStore.mockReturnValue({
        ...mockUseModalStore(),
        openConfirmationModal: mockOpenConfirmationModal,
      } as any);

      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      const deleteButtons = screen.getAllByTitle('Vorlage löschen');
      await user.click(deleteButtons[0]);

      // Confirm deletion
      if (confirmationCallback) {
        await expect((confirmationCallback as any)()).rejects.toThrow('Cannot delete template');
      }

      expect(mockDeleteTemplate).toHaveBeenCalledWith('1');
    });
  });

  describe('Template Search and Filtering Workflow', () => {
    it('filters templates by search and category', async () => {
      const user = userEvent.setup();

      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      // Initially shows all templates
      expect(screen.getByText('Mietvertrag Vorlage')).toBeInTheDocument();
      expect(screen.getByText('Mahnung Vorlage')).toBeInTheDocument();

      // Search for 'Mietvertrag'
      const searchInput = screen.getByPlaceholderText('Vorlagen durchsuchen...');
      await user.type(searchInput, 'Mietvertrag');

      // Should filter to only show matching template
      expect(screen.getByText('Mietvertrag Vorlage')).toBeInTheDocument();
      expect(screen.queryByText('Mahnung Vorlage')).not.toBeInTheDocument();

      // Clear search
      await user.clear(searchInput);

      // Both templates should be visible again
      expect(screen.getByText('Mietvertrag Vorlage')).toBeInTheDocument();
      expect(screen.getByText('Mahnung Vorlage')).toBeInTheDocument();

      // Filter by category
      const categorySelect = screen.getByText('Alle Kategorien');
      await user.click(categorySelect);
      await user.click(screen.getByRole('option', { name: 'Vertrag' }));

      // Should show only Vertrag templates
      expect(screen.getByText('Mietvertrag Vorlage')).toBeInTheDocument();
      expect(screen.queryByText('Mahnung Vorlage')).not.toBeInTheDocument();
    });

    it('shows template count and active filters', async () => {
      const user = userEvent.setup();

      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      // Shows total count
      expect(screen.getByText('2 von 2 Vorlagen')).toBeInTheDocument();

      // Apply search filter
      const searchInput = screen.getByPlaceholderText('Vorlagen durchsuchen...');
      await user.type(searchInput, 'Mietvertrag');

      // Should show active filter
      expect(screen.getByText('Aktive Filter:')).toBeInTheDocument();
      expect(screen.getByText('"Mietvertrag"')).toBeInTheDocument();

      // Should show filtered count
      expect(screen.getByText('1 von 2 Vorlagen')).toBeInTheDocument();
    });

    it('clears all filters', async () => {
      const user = userEvent.setup();

      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      // Apply filters
      const searchInput = screen.getByPlaceholderText('Vorlagen durchsuchen...');
      await user.type(searchInput, 'Test');

      const categorySelect = screen.getByText('Alle Kategorien');
      await user.click(categorySelect);
      await user.click(screen.getByRole('option', { name: 'Vertrag' }));

      // Should show active filters
      expect(screen.getByText('Aktive Filter:')).toBeInTheDocument();

      // Clear filters
      await user.click(screen.getByText('Zurücksetzen'));

      // Should remove all filters
      expect(searchInput).toHaveValue('');
      expect(screen.getByText('Alle Kategorien')).toBeInTheDocument();
      expect(screen.queryByText('Aktive Filter:')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling and Loading States', () => {
    it('shows loading state during template operations', () => {
      mockUseTemplates.mockReturnValue({
        templates: [],
        loading: true,
        error: null,
        createTemplate: mockCreateTemplate,
        updateTemplate: mockUpdateTemplate,
        deleteTemplate: mockDeleteTemplate,
        getTemplate: jest.fn(),
        refreshTemplates: mockRefreshTemplates,
      });

      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      // Should show loading skeletons
      expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    });

    it('shows error state with retry functionality', async () => {
      const user = userEvent.setup();
      
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

      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      expect(screen.getByText('Fehler beim Laden der Vorlagen')).toBeInTheDocument();
      expect(screen.getByText('Failed to load templates')).toBeInTheDocument();

      // Click retry
      await user.click(screen.getByText('Erneut versuchen'));

      expect(mockRefreshTemplates).toHaveBeenCalled();
    });

    it('shows empty state when no templates exist', () => {
      mockUseTemplates.mockReturnValue({
        templates: [],
        loading: false,
        error: null,
        createTemplate: mockCreateTemplate,
        updateTemplate: mockUpdateTemplate,
        deleteTemplate: mockDeleteTemplate,
        getTemplate: jest.fn(),
        refreshTemplates: mockRefreshTemplates,
      });

      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      expect(screen.getByText('Noch keine Vorlagen erstellt')).toBeInTheDocument();
      expect(screen.getByText('Erste Vorlage erstellen')).toBeInTheDocument();
    });
  });

  describe('Responsive Design and Accessibility', () => {
    it('adapts to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      // Should show mobile-optimized layout
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('max-w-[95vw]');
    });

    it('provides proper keyboard navigation', async () => {
      const user = userEvent.setup();

      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      // Should be able to navigate with keyboard
      const searchInput = screen.getByPlaceholderText('Vorlagen durchsuchen...');
      searchInput.focus();
      
      expect(document.activeElement).toBe(searchInput);

      // Tab navigation should work
      await user.tab();
      expect(document.activeElement).not.toBe(searchInput);
    });

    it('provides proper ARIA labels and roles', () => {
      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      // Modal should have proper role
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Buttons should have proper labels
      expect(screen.getByRole('button', { name: /Neue Vorlage/i })).toBeInTheDocument();
      
      // Form controls should have proper labels
      expect(screen.getByLabelText(/durchsuchen/i)).toBeInTheDocument();
    });
  });
});