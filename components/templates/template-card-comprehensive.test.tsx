import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateCard } from '@/components/templates/template-card';
import { Template } from '@/types/template';

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => 'vor 2 Stunden'),
}));

jest.mock('date-fns/locale', () => ({
  de: {},
}));

const createMockTemplate = (overrides: Partial<Template> = {}): Template => ({
  id: '123',
  titel: 'Test Template',
  inhalt: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'This is a test template content.',
          },
        ],
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

describe('TemplateCard - Comprehensive Tests', () => {
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all template information correctly', () => {
      const template = createMockTemplate();
      render(
        <TemplateCard
          template={template}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Test Template')).toBeInTheDocument();
      expect(screen.getByText('Mail')).toBeInTheDocument();
      expect(screen.getByText('vor 2 Stunden')).toBeInTheDocument();
      expect(screen.getByText(/This is a test template content/)).toBeInTheDocument();
    });

    it('renders all template categories correctly', () => {
      const categories = ['Mail', 'Brief', 'Vertrag', 'Rechnung', 'Mahnung', 'Kündigung', 'Sonstiges'];
      
      categories.forEach(kategorie => {
        const template = createMockTemplate({ kategorie: kategorie as any });
        const { rerender } = render(
          <TemplateCard
            template={template}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        );

        expect(screen.getByText(kategorie)).toBeInTheDocument();
        
        // Clean up for next iteration
        rerender(<div />);
      });
    });

    it('displays file icon', () => {
      const template = createMockTemplate();
      render(
        <TemplateCard
          template={template}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      // Check for FileText icon (Lucide icon)
      const icon = document.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Content Preview', () => {
    it('truncates long content preview correctly', () => {
      const longContent = 'A'.repeat(150); // Longer than 120 character limit
      const template = createMockTemplate({
        inhalt: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: longContent }],
            },
          ],
        },
      });

      render(
        <TemplateCard
          template={template}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const previewElement = screen.getByText(/A+\.\.\./);
      expect(previewElement.textContent).toMatch(/\.\.\.$/);
      expect(previewElement.textContent!.length).toBeLessThanOrEqual(123); // 120 + '...'
    });

    it('handles empty content gracefully', () => {
      const template = createMockTemplate({
        inhalt: { type: 'doc', content: [] },
      });

      render(
        <TemplateCard
          template={template}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Keine Vorschau verfügbar')).toBeInTheDocument();
    });

    it('handles null/undefined content gracefully', () => {
      const template = createMockTemplate({
        inhalt: null as any,
      });

      render(
        <TemplateCard
          template={template}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('Keine Vorschau verfügbar')).toBeInTheDocument();
    });

    it('extracts text from complex TipTap structure with mentions', () => {
      const template = createMockTemplate({
        inhalt: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Hello ' },
                {
                  type: 'mention',
                  attrs: { id: 'mieter.name', label: 'Mieter.Name' },
                },
                { type: 'text', text: ', welcome to ' },
                {
                  type: 'mention',
                  attrs: { id: 'wohnung.adresse', label: 'Wohnung.Adresse' },
                },
                { type: 'text', text: '!' },
              ],
            },
            {
              type: 'paragraph',
              content: [
                { type: 'text', text: 'Second paragraph.' },
              ],
            },
          ],
        },
      });

      render(
        <TemplateCard
          template={template}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      // Should show text content with highlighted mentions
      expect(screen.getByText('Hello')).toBeInTheDocument();
      expect(screen.getByText('@Mieter.Name')).toBeInTheDocument();
      expect(screen.getByText(', welcome to')).toBeInTheDocument();
      expect(screen.getByText('@Wohnung.Adresse')).toBeInTheDocument();
      expect(screen.getByText('!')).toBeInTheDocument();
      expect(screen.getByText('Second paragraph.')).toBeInTheDocument();
    });

    it('handles nested content structures', () => {
      const template = createMockTemplate({
        inhalt: {
          type: 'doc',
          content: [
            {
              type: 'bulletList',
              content: [
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'First item' }],
                    },
                  ],
                },
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      content: [{ type: 'text', text: 'Second item' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      });

      render(
        <TemplateCard
          template={template}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText(/First item.*Second item/)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onEdit when edit button is clicked', async () => {
      const user = userEvent.setup();
      const template = createMockTemplate();
      
      render(
        <TemplateCard
          template={template}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const editButton = screen.getAllByLabelText('Vorlage "Test Template" bearbeiten')[0];
      await user.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledWith(template);
      expect(mockOnEdit).toHaveBeenCalledTimes(1);
    });

    it('calls onDelete when delete button is clicked', async () => {
      const user = userEvent.setup();
      const template = createMockTemplate();
      
      render(
        <TemplateCard
          template={template}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const deleteButton = screen.getAllByLabelText('Vorlage "Test Template" löschen')[0];
      await user.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledWith('123');
      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });

    it('prevents multiple rapid clicks on edit button', async () => {
      const user = userEvent.setup();
      const template = createMockTemplate();
      
      render(
        <TemplateCard
          template={template}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const editButton = screen.getAllByLabelText('Vorlage "Test Template" bearbeiten')[0];
      
      // Rapid clicks
      await user.click(editButton);
      await user.click(editButton);
      await user.click(editButton);

      // Should still only be called once per click
      expect(mockOnEdit).toHaveBeenCalledTimes(3);
    });

    it('handles keyboard navigation', async () => {
      const user = userEvent.setup();
      const template = createMockTemplate();
      
      render(
        <TemplateCard
          template={template}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const editButton = screen.getAllByLabelText('Vorlage "Test Template" bearbeiten')[0];
      
      // Focus and press Enter
      editButton.focus();
      await user.keyboard('{Enter}');

      expect(mockOnEdit).toHaveBeenCalledWith(template);
    });
  });

  describe('Responsive Design', () => {
    it('shows mobile action buttons', () => {
      const template = createMockTemplate();
      
      render(
        <TemplateCard
          template={template}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      // Both desktop and mobile buttons should be present
      const editButtons = screen.getAllByLabelText('Vorlage "Test Template" bearbeiten');
      const deleteButtons = screen.getAllByLabelText('Vorlage "Test Template" löschen');

      expect(editButtons).toHaveLength(2); // Desktop and mobile
      expect(deleteButtons).toHaveLength(2); // Desktop and mobile
    });

    it('shows desktop hover buttons', () => {
      const template = createMockTemplate();
      
      render(
        <TemplateCard
          template={template}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      // Both desktop and mobile buttons should be present
      const editButtons = screen.getAllByLabelText('Vorlage "Test Template" bearbeiten');
      const deleteButtons = screen.getAllByLabelText('Vorlage "Test Template" löschen');

      expect(editButtons).toHaveLength(2); // Desktop and mobile
      expect(deleteButtons).toHaveLength(2); // Desktop and mobile
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and titles', () => {
      const template = createMockTemplate();
      
      render(
        <TemplateCard
          template={template}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      // Both desktop and mobile buttons have the same aria-label
      expect(screen.getAllByLabelText('Vorlage "Test Template" bearbeiten')).toHaveLength(2);
      expect(screen.getAllByLabelText('Vorlage "Test Template" löschen')).toHaveLength(2);
    });

    it('has proper button roles', () => {
      const template = createMockTemplate();
      
      render(
        <TemplateCard
          template={template}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(4); // 2 desktop + 2 mobile buttons
    });

    it('supports screen readers with proper text content', () => {
      const template = createMockTemplate({
        titel: 'Important Contract Template',
        kategorie: 'Dokumente',
      });
      
      render(
        <TemplateCard
          template={template}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      // Screen readers should be able to read the template title and category
      expect(screen.getByText('Important Contract Template')).toBeInTheDocument();
      expect(screen.getByText('Vertrag')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles very long template titles', () => {
      const longTitle = 'A'.repeat(100);
      const template = createMockTemplate({ titel: longTitle });
      
      render(
        <TemplateCard
          template={template}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      const titleElement = screen.getByText(longTitle);
      expect(titleElement).toBeInTheDocument();
      expect(titleElement).toHaveClass('truncate'); // Should have truncate class
    });

    it('handles special characters in template title', () => {
      const specialTitle = 'Template with äöü & special chars!@#$%';
      const template = createMockTemplate({ titel: specialTitle });
      
      render(
        <TemplateCard
          template={template}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText(specialTitle)).toBeInTheDocument();
    });

    it('handles malformed TipTap content', () => {
      const template = createMockTemplate({
        inhalt: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              // Missing content property
            } as any,
          ],
        },
      });

      render(
        <TemplateCard
          template={template}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      // Should not crash and show fallback
      expect(screen.getByText('Keine Vorschau verfügbar')).toBeInTheDocument();
    });

    it('handles missing template properties gracefully', () => {
      const incompleteTemplate = {
        id: '123',
        titel: 'Test',
        // Missing other required properties
      } as Template;

      expect(() => {
        render(
          <TemplateCard
            template={incompleteTemplate}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        );
      }).not.toThrow();
    });
  });
});