import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentationArticleViewer } from '@/components/documentation/documentation-article-viewer';
import { Article } from '@/components/documentation/documentation-article-list';

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
  });

  it('renders article title and category', () => {
    render(
      <DocumentationArticleViewer
        article={mockArticle}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('Getting Started Guide')).toBeInTheDocument();
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

  it('renders article content with proper formatting', () => {
    render(
      <DocumentationArticleViewer
        article={mockArticle}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText(/This is the main content/)).toBeInTheDocument();
    expect(screen.getByText(/It has multiple paragraphs/)).toBeInTheDocument();
    expect(screen.getByText(/And some formatting/)).toBeInTheDocument();
  });

  it('renders creation date and author', () => {
    render(
      <DocumentationArticleViewer
        article={mockArticle}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText(/Erstellt: 15\. Januar 2024/)).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders last edited date and author when different from creation', () => {
    render(
      <DocumentationArticleViewer
        article={mockArticle}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText(/Bearbeitet: 20\. Januar 2024/)).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('renders additional metadata', () => {
    render(
      <DocumentationArticleViewer
        article={mockArticle}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('Zusätzliche Informationen')).toBeInTheDocument();
    expect(screen.getByText('custom field')).toBeInTheDocument();
    expect(screen.getByText('Custom value')).toBeInTheDocument();
    expect(screen.getByText('tags')).toBeInTheDocument();
  });

  it('handles article without category', () => {
    const articleWithoutCategory = { ...mockArticle, kategorie: null };
    render(
      <DocumentationArticleViewer
        article={articleWithoutCategory}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('Getting Started Guide')).toBeInTheDocument();
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

  it('handles article without metadata', () => {
    const articleWithoutMeta = { ...mockArticle, meta: null };
    render(
      <DocumentationArticleViewer
        article={articleWithoutMeta}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('Getting Started Guide')).toBeInTheDocument();
    expect(screen.queryByText('Zusätzliche Informationen')).not.toBeInTheDocument();
  });

  it('handles empty metadata object', () => {
    const articleWithEmptyMeta = { ...mockArticle, meta: {} };
    render(
      <DocumentationArticleViewer
        article={articleWithEmptyMeta}
        onBack={mockOnBack}
      />
    );

    expect(screen.queryByText('Zusätzliche Informationen')).not.toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    render(
      <DocumentationArticleViewer
        article={mockArticle}
        onBack={mockOnBack}
      />
    );

    // German date format: DD. Month YYYY
    expect(screen.getByText(/15\. Januar 2024/)).toBeInTheDocument();
    expect(screen.getByText(/20\. Januar 2024/)).toBeInTheDocument();
  });

  it('handles invalid date strings gracefully', () => {
    const articleWithInvalidDate = {
      ...mockArticle,
      meta: { ...mockArticle.meta, created_time: 'invalid-date' }
    };

    render(
      <DocumentationArticleViewer
        article={articleWithInvalidDate}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText(/Erstellt:/)).toBeInTheDocument();
    // The invalid date should be displayed as the original string since formatDate catches the error
    expect(screen.getAllByText((content, element) => {
      return element?.textContent?.includes('invalid-date') || false;
    })[0]).toBeInTheDocument();
  });

  it('does not show last edited info if same as creation', () => {
    const articleSameDate = {
      ...mockArticle,
      meta: {
        ...mockArticle.meta,
        last_edited_time: mockArticle.meta?.created_time,
        last_edited_by: mockArticle.meta?.created_by
      }
    };

    render(
      <DocumentationArticleViewer
        article={articleSameDate}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText(/Erstellt:/)).toBeInTheDocument();
    expect(screen.queryByText(/Bearbeitet:/)).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <DocumentationArticleViewer
        article={mockArticle}
        onBack={mockOnBack}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles complex metadata objects', () => {
    const articleWithComplexMeta = {
      ...mockArticle,
      meta: {
        ...mockArticle.meta,
        complex_object: { nested: { value: 'test' } },
        array_field: ['item1', 'item2']
      }
    };

    render(
      <DocumentationArticleViewer
        article={articleWithComplexMeta}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('complex object')).toBeInTheDocument();
    expect(screen.getByText('array field')).toBeInTheDocument();
  });

  it('excludes system metadata fields from additional info', () => {
    render(
      <DocumentationArticleViewer
        article={mockArticle}
        onBack={mockOnBack}
      />
    );

    // System fields should not appear in additional info
    expect(screen.queryByText('created time')).not.toBeInTheDocument();
    expect(screen.queryByText('last edited time')).not.toBeInTheDocument();
    expect(screen.queryByText('created by')).not.toBeInTheDocument();
    expect(screen.queryByText('last edited by')).not.toBeInTheDocument();

    // But custom fields should appear
    expect(screen.getByText('custom field')).toBeInTheDocument();
    expect(screen.getByText('tags')).toBeInTheDocument();
  });
});