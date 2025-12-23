import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateEditorModal } from '@/components/templates/template-editor-modal';
import { Template } from '@/types/template';
import { TEMPLATE_CATEGORIES } from '@/lib/template-constants';

// Mock dependencies
jest.mock('@/components/templates/template-editor', () => ({
  TemplateEditor: ({ onChange, placeholder, content }: any) => (
    <div data-testid="template-editor">
      <textarea
        data-testid="editor-textarea"
        placeholder={placeholder}
        defaultValue={content ? JSON.stringify(content) : ''}
        onChange={(e) => {
          const value = e.target.value;
          const jsonContent = value ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }] } : { type: 'doc', content: [] };
          onChange?.(value, jsonContent);
        }}
      />
    </div>
  ),
}));

jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: () => ({
    setTemplateEditorModalDirty: jest.fn(),
    isTemplateEditorModalDirty: false,
  }),
}));

jest.mock('@/hooks/use-modal-keyboard-navigation', () => ({
  useModalKeyboardNavigation: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}));

const createMockTemplate = (overrides: Partial<Template> = {}): Template => ({
  id: '123',
  titel: 'Test Template',
  inhalt: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Test content' }],
      },
    ],
  },
  user_id: 'user-123',
  kategorie: 'Mail',
  kontext_anforderungen: [],
  erstellungsdatum: '2024-01-01T10:00:00Z',
  aktualisiert_am: '2024-01-01T12:00:00Z',
  ...overrides,
});

describe('TemplateEditorModal - Comprehensive Tests', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('New Template Creation Flow', () => {
    it('renders category selection step for new template', () => {
      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      expect(screen.getByText('Neue Vorlage erstellen')).toBeInTheDocument();
      expect(screen.getByText(/Schritt 1 von 2/)).toBeInTheDocument();
      expect(screen.getByText('Kategorie auswählen...')).toBeInTheDocument();
    });

    it('shows all available categories in dropdown', async () => {
      const user = userEvent.setup();
      
      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);

      // Check all categories are present
      for (const category of TEMPLATE_CATEGORIES) {
        expect(screen.getByRole('option', { name: category })).toBeInTheDocument();
      }
    });

    it('validates category selection before proceeding', async () => {
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

    it('proceeds to editor step after category selection', async () => {
      const user = userEvent.setup();
      
      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      // Select category
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);
      await user.click(screen.getByRole('option', { name: 'Mail' }));
      
      // Continue to editor
      await user.click(screen.getByText('Weiter'));

      await waitFor(() => {
        expect(screen.getByText(/Schritt 2 von 2/)).toBeInTheDocument();
        expect(screen.getByLabelText('Titel der Vorlage')).toBeInTheDocument();
        expect(screen.getByTestId('template-editor')).toBeInTheDocument();
      });
    });

    it('allows going back to category selection', async () => {
      const user = userEvent.setup();
      
      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      // Go to editor step
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);
      await user.click(screen.getByRole('option', { name: 'Mail' }));
      await user.click(screen.getByText('Weiter'));

      // Go back
      const backButton = screen.getByRole('button', { name: 'Zurück zur Kategorieauswahl' });
      await user.click(backButton);

      expect(screen.getByText(/Schritt 1 von 2/)).toBeInTheDocument();
    });
  });

  describe('Existing Template Editing Flow', () => {
    it('renders editor step directly for existing template', () => {
      const template = createMockTemplate();
      
      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          template={template}
        />
      );

      expect(screen.getByText('Vorlage bearbeiten')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Template')).toBeInTheDocument();
      expect(screen.getByText('Mail')).toBeInTheDocument();
      expect(screen.queryByText(/Schritt 1 von 2/)).not.toBeInTheDocument();
    });

    it('does not show back button for existing templates', () => {
      const template = createMockTemplate();
      
      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          template={template}
        />
      );

      expect(screen.queryByRole('button', { name: 'Zurück zur Kategorieauswahl' })).not.toBeInTheDocument();
    });

    it('populates form with existing template data', () => {
      const template = createMockTemplate({
        titel: 'Existing Template Title',
        kategorie: 'Vertrag',
      });
      
      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          template={template}
        />
      );

      expect(screen.getByDisplayValue('Existing Template Title')).toBeInTheDocument();
      expect(screen.getByText('Vertrag')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('validates template title is required', async () => {
      const user = userEvent.setup();
      
      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      // Go to editor step
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);
      await user.click(screen.getByRole('option', { name: 'Mail' }));
      await user.click(screen.getByText('Weiter'));

      // Try to save without title
      await user.click(screen.getByText('Vorlage erstellen'));

      await waitFor(() => {
        expect(screen.getByText(/Der Titel muss mindestens 3 Zeichen lang sein/)).toBeInTheDocument();
      });
    });

    it('validates template title minimum length', async () => {
      const user = userEvent.setup();
      
      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      // Go to editor step
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);
      await user.click(screen.getByRole('option', { name: 'Mail' }));
      await user.click(screen.getByText('Weiter'));

      // Enter too short title
      const titleInput = screen.getByLabelText('Titel der Vorlage');
      await user.type(titleInput, 'ab');

      await user.click(screen.getByText('Vorlage erstellen'));

      await waitFor(() => {
        expect(screen.getByText('Der Titel muss mindestens 3 Zeichen lang sein.')).toBeInTheDocument();
      });
    });

    it('validates template title maximum length', async () => {
      const user = userEvent.setup();
      
      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      // Go to editor step
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);
      await user.click(screen.getByRole('option', { name: 'Mail' }));
      await user.click(screen.getByText('Weiter'));

      // Enter too long title
      const titleInput = screen.getByLabelText('Titel der Vorlage');
      await user.type(titleInput, 'a'.repeat(101));

      await user.click(screen.getByText('Vorlage erstellen'));

      await waitFor(() => {
        expect(screen.getByText('Der Titel darf maximal 100 Zeichen lang sein.')).toBeInTheDocument();
      });
    });

    it('validates template title contains valid characters', async () => {
      const user = userEvent.setup();
      
      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      // Go to editor step
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);
      await user.click(screen.getByRole('option', { name: 'Mail' }));
      await user.click(screen.getByText('Weiter'));

      // Enter invalid characters
      const titleInput = screen.getByLabelText('Titel der Vorlage');
      await user.type(titleInput, 'Invalid<>Title');

      await user.click(screen.getByText('Vorlage erstellen'));

      await waitFor(() => {
        expect(screen.getByText('Der Titel enthält ungültige Zeichen.')).toBeInTheDocument();
      });
    });

    it('validates template content is not empty', async () => {
      const user = userEvent.setup();
      
      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      // Go to editor step
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);
      await user.click(screen.getByRole('option', { name: 'Mail' }));
      await user.click(screen.getByText('Weiter'));

      // Enter valid title but no content
      const titleInput = screen.getByLabelText('Titel der Vorlage');
      await user.type(titleInput, 'Valid Title');

      await user.click(screen.getByText('Vorlage erstellen'));

      await waitFor(() => {
        expect(screen.getByText('Der Inhalt darf nicht leer sein.')).toBeInTheDocument();
      });
    });
  });

  describe('Save Functionality', () => {
    it('calls onSave with correct data for new template', async () => {
      const user = userEvent.setup();
      
      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      // Complete the form
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);
      await user.click(screen.getByRole('option', { name: 'Mail' }));
      await user.click(screen.getByText('Weiter'));

      const titleInput = screen.getByLabelText('Titel der Vorlage');
      await user.type(titleInput, 'Test Template');

      const editorTextarea = screen.getByTestId('editor-textarea');
      await user.type(editorTextarea, 'Test content');

      await user.click(screen.getByText('Vorlage erstellen'));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          titel: 'Test Template',
          inhalt: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Test content' }],
              },
            ],
          },
          kategorie: 'Mail',
          kontext_anforderungen: [],
        });
      });
    });

    it('calls onSave with correct data for existing template', async () => {
      const user = userEvent.setup();
      const template = createMockTemplate();
      
      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          template={template}
        />
      );

      // Modify the template
      const titleInput = screen.getByDisplayValue('Test Template');
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Template');

      const editorTextarea = screen.getByTestId('editor-textarea');
      await user.clear(editorTextarea);
      await user.type(editorTextarea, 'Updated content');

      await user.click(screen.getByText('Änderungen speichern'));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          titel: 'Updated Template',
          inhalt: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Updated content' }],
              },
            ],
          },
          kategorie: 'Mail',
          kontext_anforderungen: [],
        });
      });
    });

    it('shows loading state during save', async () => {
      const user = userEvent.setup();
      
      // Mock onSave to return a pending promise
      let resolveSave: () => void;
      const savePromise = new Promise<void>((resolve) => {
        resolveSave = resolve;
      });
      mockOnSave.mockReturnValue(savePromise);
      
      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      // Complete the form
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);
      await user.click(screen.getByRole('option', { name: 'Mail' }));
      await user.click(screen.getByText('Weiter'));

      const titleInput = screen.getByLabelText('Titel der Vorlage');
      await user.type(titleInput, 'Test Template');

      const editorTextarea = screen.getByTestId('editor-textarea');
      await user.type(editorTextarea, 'Test content');

      await user.click(screen.getByText('Vorlage erstellen'));

      // Should show loading state
      expect(screen.getByText('Speichert...')).toBeInTheDocument();
      
      // Button should be disabled
      const saveButton = screen.getByText('Speichert...');
      expect(saveButton).toBeDisabled();

      // Resolve the save
      resolveSave!();
      
      await waitFor(() => {
        expect(screen.queryByText('Speichert...')).not.toBeInTheDocument();
      });
    });

    it('handles save errors gracefully', async () => {
      const user = userEvent.setup();
      const saveError = new Error('Save failed');
      mockOnSave.mockRejectedValue(saveError);
      
      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      // Complete the form
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);
      await user.click(screen.getByRole('option', { name: 'Mail' }));
      await user.click(screen.getByText('Weiter'));

      const titleInput = screen.getByLabelText('Titel der Vorlage');
      await user.type(titleInput, 'Test Template');

      const editorTextarea = screen.getByTestId('editor-textarea');
      await user.type(editorTextarea, 'Test content');

      await user.click(screen.getByText('Vorlage erstellen'));

      await waitFor(() => {
        expect(screen.getByText('Validierungsfehler')).toBeInTheDocument();
        expect(screen.getByText('Save failed')).toBeInTheDocument();
      });
    });
  });

  describe('Modal Behavior', () => {
    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      await user.click(screen.getByText('Abbrechen'));
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('resets form when modal is reopened', () => {
      const { rerender } = render(
        <TemplateEditorModal
          isOpen={false}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      // Open modal
      rerender(
        <TemplateEditorModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      // Should be back to category selection
      expect(screen.getByText(/Schritt 1 von 2/)).toBeInTheDocument();
    });

    it('handles modal close during different steps', async () => {
      const user = userEvent.setup();
      
      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      // Go to editor step
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);
      await user.click(screen.getByRole('option', { name: 'Mail' }));
      await user.click(screen.getByText('Weiter'));

      // Close from editor step
      await user.click(screen.getByText('Abbrechen'));
      
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper dialog structure', () => {
      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has proper form labels', async () => {
      const user = userEvent.setup();
      
      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      // Go to editor step
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);
      await user.click(screen.getByRole('option', { name: 'Mail' }));
      await user.click(screen.getByText('Weiter'));

      expect(screen.getByLabelText('Titel der Vorlage')).toBeInTheDocument();
      expect(screen.getByLabelText('Inhalt')).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      // Should be able to tab through form elements
      await user.keyboard('{Tab}');
      expect(screen.getByRole('combobox')).toHaveFocus();
    });
  });

  describe('Responsive Design', () => {
    it('shows mobile-friendly text on small screens', () => {
      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      // Should show both full and abbreviated text
      expect(screen.getByText('Neue Vorlage erstellen')).toBeInTheDocument();
      expect(screen.getByText('Erstellen')).toBeInTheDocument();
    });

    it('adapts button text for mobile', async () => {
      const user = userEvent.setup();
      
      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      // Go to editor step
      const selectTrigger = screen.getByRole('combobox');
      await user.click(selectTrigger);
      await user.click(screen.getByRole('option', { name: 'Mail' }));
      await user.click(screen.getByText('Weiter'));

      // Should show both full and abbreviated button text
      expect(screen.getByText('Vorlage erstellen')).toBeInTheDocument();
      expect(screen.getByText('Erstellen')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles all template categories', async () => {
      const user = userEvent.setup();
      
      for (const category of TEMPLATE_CATEGORIES) {
        const { rerender } = render(
          <TemplateEditorModal
            isOpen={true}
            onClose={mockOnClose}
            onSave={mockOnSave}
          />
        );

        const selectTrigger = screen.getByRole('combobox');
        await user.click(selectTrigger);
        await user.click(screen.getByRole('option', { name: category }));
        await user.click(screen.getByText('Weiter'));

        expect(screen.getByText(category)).toBeInTheDocument();

        // Clean up for next iteration
        rerender(<div />);
      }
    });

    it('handles template with all possible fields', () => {
      const complexTemplate = createMockTemplate({
        titel: 'Complex Template with Special Characters äöü',
        kategorie: 'Kündigung',
        kontext_anforderungen: ['mieter', 'wohnung', 'haus'],
        inhalt: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Hello ' },
                { type: 'mention', attrs: { id: 'mieter.name' } },
                { type: 'text', text: '!' },
              ],
            },
          ],
        },
      });

      render(
        <TemplateEditorModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          template={complexTemplate}
        />
      );

      expect(screen.getByDisplayValue('Complex Template with Special Characters äöü')).toBeInTheDocument();
      expect(screen.getByText('Kündigung')).toBeInTheDocument();
    });

    it('handles rapid modal open/close cycles', () => {
      const { rerender } = render(
        <TemplateEditorModal
          isOpen={false}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      // Rapid open/close cycles
      for (let i = 0; i < 5; i++) {
        rerender(
          <TemplateEditorModal
            isOpen={true}
            onClose={mockOnClose}
            onSave={mockOnSave}
          />
        );

        rerender(
          <TemplateEditorModal
            isOpen={false}
            onClose={mockOnClose}
            onSave={mockOnSave}
          />
        );
      }

      // Should not crash
      expect(true).toBe(true);
    });
  });
});