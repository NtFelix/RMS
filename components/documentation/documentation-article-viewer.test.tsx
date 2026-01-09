import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentationArticleViewer } from '@/components/documentation/documentation-article-viewer';
import { Article } from '@/components/documentation/documentation-article-list';

// Mock marked to avoid ESM issues and simplify testing
jest.mock('marked', () => ({
  marked: {
    parse: jest.fn((text) => text),
    setOptions: jest.fn(),
  },
}));

// Mock useToast
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

describe('DocumentationArticleViewer', () => {
  const mockArticle: Article = {
    id: '1',
    titel: 'Getting Started Guide',
    kategorie: 'Tutorials',
    seiteninhalt: 'This is the main content of the article.\n\nIt has multiple paragraphs.\n\nAnd some formatting.',
    meta: {
      created_time: '2024-01-15T10:30:00Z',
      last_edited_time: '2024-01-20T14:45:00Z',
      created_by: { name: 'John Doe' },
      last_edited_by: { name: 'Jane Smith' },
      custom_field: 'Custom value',
      tags: ['tutorial', 'beginner']
    }
  };

  const mockOnBack = jest.fn();

  beforeEach(() => {
    mockOnBack.mockClear();
    jest.clearAllMocks();
  });

  it('renders article title and category', () => {
    render(
      <DocumentationArticleViewer
        article={mockArticle}
        onBack={mockOnBack}
      />
    );

    // Use getByRole for heading to distinguish from breadcrumbs
    expect(screen.getByRole('heading', { name: 'Getting Started Guide', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Tutorials')).toBeInTheDocument();
  });

  it('renders back button and calls onBack when clicked', async () => {
    const user = userEvent.setup();
    render(
      <DocumentationArticleViewer
        article={mockArticle}
        onBack={mockOnBack}
      />
    );

    const backButton = screen.getByText('Zurück zur Übersicht');
    expect(backButton).toBeInTheDocument();

    await user.click(backButton);
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it('renders article content', () => {
    render(
      <DocumentationArticleViewer
        article={mockArticle}
        onBack={mockOnBack}
      />
    );

    // Since we mocked marked to return text as-is
    expect(screen.getByText(/This is the main content/)).toBeInTheDocument();
  });

  it('handles article without category', () => {
    const articleWithoutCategory = { ...mockArticle, kategorie: null };
    render(
      <DocumentationArticleViewer
        article={articleWithoutCategory}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByRole('heading', { name: 'Getting Started Guide', level: 1 })).toBeInTheDocument();
    expect(screen.queryByText('Tutorials')).not.toBeInTheDocument();
  });

  it('handles article without content', () => {
    const articleWithoutContent = { ...mockArticle, seiteninhalt: null };
    render(
      <DocumentationArticleViewer
        article={articleWithoutContent}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('Kein Inhalt verfügbar für diesen Artikel.')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <DocumentationArticleViewer
        article={mockArticle}
        onBack={mockOnBack}
        className="custom-class"
      />
    );

    // The component wrapper might not be the direct firstChild if there are other wrappers, 
    // but the class should be present on the main div.
    // Based on the component code: <div className={className}>
    expect(container.firstChild).toHaveClass('custom-class');
  });
});