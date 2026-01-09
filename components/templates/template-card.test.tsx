import { render, screen, fireEvent } from '@testing-library/react';
import { TemplateCard } from '@/components/templates/template-card';
import { Template } from '@/types/template';

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => 'vor 2 Stunden'),
}));

jest.mock('date-fns/locale', () => ({
  de: {},
}));

const mockTemplate: Template = {
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
            text: 'This is a test template content that should be truncated if it is too long to display in the preview area.',
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
};

describe('TemplateCard', () => {
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders template information correctly', () => {
    render(
      <TemplateCard
        template={mockTemplate}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Test Template')).toBeInTheDocument();
    expect(screen.getByText('Mail')).toBeInTheDocument();
    expect(screen.getByText('vor 2 Stunden')).toBeInTheDocument();
    expect(screen.getByText(/This is a test template content/)).toBeInTheDocument();
  });

  it('truncates long content preview', () => {
    const longContentTemplate: Template = {
      ...mockTemplate,
      inhalt: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'This is a very long template content that should definitely be truncated because it exceeds the maximum length allowed for the preview area in the template card component.',
              },
            ],
          },
        ],
      },
    };

    render(
      <TemplateCard
        template={longContentTemplate}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const previewText = screen.getByText(/This is a very long template content/);
    expect(previewText.textContent).toMatch(/\.\.\.$/);
  });

  it('handles empty content gracefully', () => {
    const emptyContentTemplate: Template = {
      ...mockTemplate,
      inhalt: { type: 'doc', content: [] },
    };

    render(
      <TemplateCard
        template={emptyContentTemplate}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Keine Vorschau verfügbar')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    render(
      <TemplateCard
        template={mockTemplate}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const editButton = screen.getAllByLabelText('Vorlage "Test Template" bearbeiten')[0];
    fireEvent.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith(mockTemplate);
  });

  it('calls onDelete when delete button is clicked', () => {
    render(
      <TemplateCard
        template={mockTemplate}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = screen.getAllByLabelText('Vorlage "Test Template" löschen')[0];
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith('123');
  });

  it('shows action buttons in ActionMenu', () => {
    render(
      <TemplateCard
        template={mockTemplate}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const editButtons = screen.getAllByLabelText('Vorlage "Test Template" bearbeiten');
    const deleteButtons = screen.getAllByLabelText('Vorlage "Test Template" löschen');

    // ActionMenu renders a single set of buttons
    expect(editButtons).toHaveLength(1);
    expect(deleteButtons).toHaveLength(1);
  });

  it('displays category badge correctly', () => {
    const contractTemplate: Template = {
      ...mockTemplate,
      kategorie: 'Vertrag',
    };

    render(
      <TemplateCard
        template={contractTemplate}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Vertrag')).toBeInTheDocument();
  });

  it('handles complex TipTap content structure with mentions', () => {
    const complexContentTemplate: Template = {
      ...mockTemplate,
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
              { type: 'text', text: ', this is a test.' },
            ],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Second paragraph content.' },
            ],
          },
        ],
      },
    };

    render(
      <TemplateCard
        template={complexContentTemplate}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    // Should show text content with highlighted mentions
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('@Mieter.Name')).toBeInTheDocument();
    expect(screen.getByText(', this is a test.')).toBeInTheDocument();
    expect(screen.getByText('Second paragraph content.')).toBeInTheDocument();
  });
});