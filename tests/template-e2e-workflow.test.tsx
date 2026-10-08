import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplatesModal } from '@/components/templates/templates-modal';
import { TemplateEditorModal } from '@/components/templates/template-editor-modal';
import { useTemplates, useTemplateFilters } from '@/hooks/use-templates';
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
const mockUseTemplateFilters = useTemplateFilters as jest.MockedFunction<typeof useTemplateFilters>;

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
        erstellt_von: 'user1',
        organisation_id: 'org1',
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
        erstellt_von: 'user1',
        organisation_id: 'org1',
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

    mockUseTemplateFilters.mockReturnValue({
      searchQuery: '',
      setSearchQuery: jest.fn(),
      selectedCategory: 'all',
      setSelectedCategory: jest.fn(),
      filteredTemplates: mockTemplates,
      groupedTemplates: { 'Dokumente': mockTemplates },
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
        erstellt_von: 'user1',
        organisation_id: 'org1',
        kategorie: 'Mail',
        kontext_anforderungen: [],
        erstellungsdatum: '2024-01-03T00:00:00Z',
        aktualisiert_am: '2024-01-03T00:00:00Z',
      };

      mockCreateTemplate.mockResolvedValue(newTemplate);

      const handleSave = jest.fn(async (templateData: Partial<Template>) => {
        await mockCreateTemplate(templateData);
      });

      mockUseModalStore.mockReturnValue({
        ...mockUseModalStore(),
        isTemplateEditorModalDirty: true,
        closeTemplateEditorModal: jest.fn(),
      } as any);

      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={jest.fn()}
          onSave={handleSave}
        />
      );

      // Step 1: Select category
      expect(screen.getByText('Was möchten Sie erstellen?')).toBeInTheDocument();

      const mailCategoryButton = screen.getByText('E-Mail Vorlage');
      await user.click(mailCategoryButton);

      await user.click(screen.getByText('Weiter'));

      // Step 2: Fill in template details
      const titleInput = screen.getByLabelText('Titel der Vorlage');
      await user.type(titleInput, 'Neue Kündigung');

      const editorTextarea = screen.getByTestId('editor-textarea');
      await user.type(editorTextarea, 'Hiermit kündigen wir den Mietvertrag.');

      // Step 3: Save template
      await user.click(screen.getByText('Vorlage erstellen'));

      await waitFor(() => {
        expect(mockCreateTemplate).toHaveBeenCalled();
      });

      expect(mockCreateTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          titel: 'Neue Kündigung',
          kategorie: 'Mail',
        })
      );
    });

    it('handles validation errors during creation', async () => {
      const user = userEvent.setup();

      mockUseModalStore.mockReturnValue({
        ...mockUseModalStore(),
        isTemplateEditorModalDirty: true,
      } as any);

      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn()}
        />
      );

      // Select a category and proceed
      await user.click(screen.getByText('E-Mail Vorlage'));
      await user.click(screen.getByText('Weiter'));

      // Try to save without title
      const saveButton = await screen.findByText('Vorlage erstellen', undefined, { timeout: 3000 });
      await user.click(saveButton);

      expect(screen.getByText('Der Titel muss mindestens 3 Zeichen lang sein.')).toBeInTheDocument();

      // Add invalid title (too short)
      const titleInput = screen.getByLabelText('Titel der Vorlage');
      await user.type(titleInput, 'ab');
      await user.click(await screen.findByText('Vorlage erstellen', undefined, { timeout: 3000 }));

      expect(screen.getByText('Der Titel muss mindestens 3 Zeichen lang sein.')).toBeInTheDocument();
    });

    it('handles server errors during creation', async () => {
      const user = userEvent.setup();

      const partialTemplate: Template = {
        id: 'new',
        titel: '',
        inhalt: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test content' }] }],
        },
        kategorie: 'Mail',
        erstellungsdatum: new Date().toISOString(),
        aktualisiert_am: new Date().toISOString(),
      } as Template;

      const serverError = new Error('Server error');
      mockUseModalStore.mockReturnValue({
        ...mockUseModalStore(),
        isTemplateEditorModalDirty: true,
      } as any);

      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={jest.fn()}
          onSave={jest.fn().mockRejectedValue(serverError)}
          template={partialTemplate}
        />
      );

      // Fill in title (template already has kategorie and inhalt, so we're in editor step)
      const titleInput = await screen.findByLabelText('Titel der Vorlage', undefined, { timeout: 3000 });
      await user.type(titleInput, 'Test Template');

      // Save
      await user.click(await screen.findByText('Änderungen speichern', undefined, { timeout: 3000 }));

      // Should show error toast on server failure
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalled();
      });
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

      mockUseModalStore.mockReturnValue({
        ...mockUseModalStore(),
        isTemplateEditorModalDirty: true,
      } as any);

      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={jest.fn()}
          template={existingTemplate}
          onSave={mockOnSave}
        />
      );

      // Should skip category selection for existing template
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
            kategorie: 'Dokumente',
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
      expect(screen.getByText('Dokument')).toBeInTheDocument();
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
      const deleteButtons = screen.getAllByTitle(/Vorlage.*löschen/i);
      await user.click(deleteButtons[0]);

      // Verify confirmation modal was opened
      expect(mockOpenConfirmationModal).toHaveBeenCalledWith({
        title: 'Vorlage löschen',
        description: expect.stringContaining('Mietvertrag Vorlage'),
        confirmText: 'Löschen',
        cancelText: 'Abbrechen',
        variant: 'destructive',
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

      let onConfirmCallback: (() => Promise<void>) | null = null;
      const mockOpenConfirmationModal = jest.fn((config: any) => {
        onConfirmCallback = config.onConfirm;
      });

      mockUseModalStore.mockReturnValue({
        ...mockUseModalStore(),
        openConfirmationModal: mockOpenConfirmationModal,
        closeConfirmationModal: jest.fn(),
      } as any);

      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      const deleteButtons = screen.getAllByTitle(/Vorlage.*löschen/i);
      await user.click(deleteButtons[0]);

      expect(mockOpenConfirmationModal).toHaveBeenCalled();

      // Trigger the confirmation callback
      if (onConfirmCallback) {
        await (onConfirmCallback as () => Promise<void>)();
      }

      expect(mockDeleteTemplate).toHaveBeenCalledWith('1');
    });
  });

  describe('Template Search and Filtering Workflow', () => {
    it('filters templates by search and category', async () => {
      const setSearchQuery = jest.fn();
      const setSelectedCategory = jest.fn();

      mockUseTemplateFilters.mockReturnValue({
        searchQuery: '',
        setSearchQuery,
        selectedCategory: 'all',
        setSelectedCategory,
        filteredTemplates: mockTemplates,
        groupedTemplates: { 'Dokumente': mockTemplates },
      });

      const { rerender } = render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      // Initially shows all templates
      expect(screen.getByText('Mietvertrag Vorlage')).toBeInTheDocument();
      expect(screen.getByText('Mahnung Vorlage')).toBeInTheDocument();

      // Simulate search by updating the mock and re-rendering
      const filteredTemplates = [mockTemplates[0]];
      mockUseTemplateFilters.mockReturnValue({
        searchQuery: 'Mietvertrag',
        setSearchQuery,
        selectedCategory: 'all',
        setSelectedCategory,
        filteredTemplates,
        groupedTemplates: { 'Dokumente': filteredTemplates },
      });

      rerender(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      expect(screen.getByText('Mietvertrag Vorlage')).toBeInTheDocument();
      expect(screen.queryByText('Mahnung Vorlage')).not.toBeInTheDocument();
    });

    it('shows template count and active filters', () => {
      mockUseTemplateFilters.mockReturnValue({
        searchQuery: 'Mietvertrag',
        setSearchQuery: jest.fn(),
        selectedCategory: 'all',
        setSelectedCategory: jest.fn(),
        filteredTemplates: [mockTemplates[0]],
        groupedTemplates: { Dokumente: [mockTemplates[0]] },
      });

      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      // Shows total count (from useTemplates mock, which still has 2)
      expect(screen.getByText('1 von 2 Vorlagen')).toBeInTheDocument();

      // Active filter badge with search term
      expect(screen.getAllByText(/Mietvertrag/).length).toBeGreaterThanOrEqual(1);
    });

    it('clears all filters', async () => {
      const user = userEvent.setup();
      const setSearchQuery = jest.fn();
      const setSelectedCategory = jest.fn();

      mockUseTemplateFilters.mockReturnValue({
        searchQuery: 'Test',
        setSearchQuery,
        selectedCategory: 'Dokumente',
        setSelectedCategory,
        filteredTemplates: mockTemplates,
        groupedTemplates: { Dokumente: mockTemplates },
      });

      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      // Active filters area is shown
      expect(screen.getByText(/Test/)).toBeInTheDocument();

      // Click "Zurücksetzen" to clear filters
      await user.click(screen.getByText('Zurücksetzen'));

      expect(setSearchQuery).toHaveBeenCalledWith('');
      expect(setSelectedCategory).toHaveBeenCalledWith('all');
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
      expect(document.querySelectorAll('[role="status"]').length).toBeGreaterThan(0);
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

      mockUseTemplateFilters.mockReturnValue({
        searchQuery: '',
        setSearchQuery: jest.fn(),
        selectedCategory: 'all',
        setSelectedCategory: jest.fn(),
        filteredTemplates: [],
        groupedTemplates: {},
      });

      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      expect(screen.getByText('Noch keine Vorlagen erstellt')).toBeInTheDocument();
      expect(screen.getByText('Erste Vorlage erstellen')).toBeInTheDocument();
    });
  });

  describe('Responsive Design and Accessibility', () => {
    it('adapts to mobile viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('max-w-[98vw]');
    });

    it('provides proper keyboard navigation', async () => {
      const user = userEvent.setup();

      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      const searchInput = screen.getByPlaceholderText('Vorlagen durchsuchen...');
      searchInput.focus();

      expect(document.activeElement).toBe(searchInput);

      await user.tab();
      expect(document.activeElement).not.toBe(searchInput);
    });

    it('provides proper ARIA labels and roles', () => {
      render(<TemplatesModal isOpen={true} onClose={jest.fn()} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      expect(screen.getByLabelText(/durchsuchen/i)).toBeInTheDocument();
    });
  });
});
