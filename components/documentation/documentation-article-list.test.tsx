import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentationArticleList, Article } from '@/components/documentation/documentation-article-list';

describe('DocumentationArticleList', () => {
  const mockArticles: Article[] = [
    {
      id: '1',
      titel: 'Getting Started Guide',
      kategorie: 'Tutorials',
      seiteninhalt: 'This is a comprehensive guide to getting started with our platform. It covers all the basics you need to know.',
      meta: { created_time: '2024-01-01T00:00:00Z' }
    },
    {
      id: '2',
      titel: 'API Documentation',
      kategorie: 'Reference',
      seiteninhalt: 'Complete API reference with examples and best practices.',
      meta: null
    },
    {
      id: '3',
      titel: 'Advanced Features',
      kategorie: null,
      seiteninhalt: null,
      meta: {}
    }
  ];

  const mockOnArticleSelect = jest.fn();

  beforeEach(() => {
    mockOnArticleSelect.mockClear();
  });

  it('renders loading state', () => {
    render(
      <DocumentationArticleList
        articles={[]}
        onArticleSelect={mockOnArticleSelect}
        selectedArticle={null}
        isLoading={true}
      />
    );

    // Should show skeleton loaders
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0); // Should show skeleton loaders
  });

  it('renders empty state without search query', () => {
    render(
      <DocumentationArticleList
        articles={[]}
        onArticleSelect={mockOnArticleSelect}
        selectedArticle={null}
        isLoading={false}
      />
    );

    expect(screen.getByText('Keine Artikel verfügbar')).toBeInTheDocument();
    expect(screen.getByText('In dieser Kategorie sind noch keine Artikel vorhanden.')).toBeInTheDocument();
  });

  it('renders empty state with search query', () => {
    render(
      <DocumentationArticleList
        articles={[]}
        onArticleSelect={mockOnArticleSelect}
        selectedArticle={null}
        searchQuery="nonexistent"
        isLoading={false}
      />
    );

    expect(screen.getByText('Keine Ergebnisse gefunden')).toBeInTheDocument();
    expect(screen.getByText('Keine Artikel gefunden für "nonexistent". Versuchen Sie andere Suchbegriffe.')).toBeInTheDocument();
  });

  it('renders articles with titles and categories', () => {
    render(
      <DocumentationArticleList
        articles={mockArticles}
        onArticleSelect={mockOnArticleSelect}
        selectedArticle={null}
      />
    );

    expect(screen.getByText('Getting Started Guide')).toBeInTheDocument();
    expect(screen.getByText('API Documentation')).toBeInTheDocument();
    expect(screen.getByText('Advanced Features')).toBeInTheDocument();
    
    expect(screen.getByText('Tutorials')).toBeInTheDocument();
    expect(screen.getByText('Reference')).toBeInTheDocument();
  });

  it('renders article previews', () => {
    render(
      <DocumentationArticleList
        articles={mockArticles}
        onArticleSelect={mockOnArticleSelect}
      />
    );

    expect(screen.getByText(/This is a comprehensive guide/)).toBeInTheDocument();
    expect(screen.getByText(/Complete API reference/)).toBeInTheDocument();
  });

  it('highlights search terms in titles', () => {
    render(
      <DocumentationArticleList
        articles={mockArticles}
        onArticleSelect={mockOnArticleSelect}
        searchQuery="API"
      />
    );

    const highlightedElements = screen.getAllByText('API');
    expect(highlightedElements.some(el => el.tagName === 'MARK')).toBe(true);
  });

  it('highlights search terms in content preview', () => {
    render(
      <DocumentationArticleList
        articles={mockArticles}
        onArticleSelect={mockOnArticleSelect}
        searchQuery="guide"
      />
    );

    const highlightedElements = screen.getAllByText('guide');
    expect(highlightedElements.some(el => el.tagName === 'MARK')).toBe(true);
  });

  it('calls onArticleSelect when article is clicked', async () => {
    const user = userEvent.setup();
    render(
      <DocumentationArticleList
        articles={mockArticles}
        onArticleSelect={mockOnArticleSelect}
      />
    );

    await user.click(screen.getByText('Getting Started Guide'));
    expect(mockOnArticleSelect).toHaveBeenCalledWith(mockArticles[0]);
  });

  it('truncates long content previews', () => {
    const longArticle: Article = {
      id: '4',
      titel: 'Long Article',
      kategorie: 'Test',
      seiteninhalt: 'A'.repeat(200) + ' This should be truncated',
      meta: null
    };

    render(
      <DocumentationArticleList
        articles={[longArticle]}
        onArticleSelect={mockOnArticleSelect}
      />
    );

    const preview = screen.getByText(/A{150}.*\.\.\./);
    expect(preview).toBeInTheDocument();
  });

  it('handles articles without content', () => {
    render(
      <DocumentationArticleList
        articles={[mockArticles[2]]} // Article with null content
        onArticleSelect={mockOnArticleSelect}
      />
    );

    expect(screen.getByText('Advanced Features')).toBeInTheDocument();
    // Should not render content section for articles without content
  });

  it('removes HTML tags from content preview', () => {
    const htmlArticle: Article = {
      id: '5',
      titel: 'HTML Article',
      kategorie: 'Test',
      seiteninhalt: '<p>This is <strong>bold</strong> text with <a href="#">links</a></p>',
      meta: null
    };

    render(
      <DocumentationArticleList
        articles={[htmlArticle]}
        onArticleSelect={mockOnArticleSelect}
      />
    );

    expect(screen.getByText(/This is bold text with links/)).toBeInTheDocument();
    expect(screen.queryByText('<p>')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <DocumentationArticleList
        articles={mockArticles}
        onArticleSelect={mockOnArticleSelect}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles case-insensitive search highlighting', () => {
    render(
      <DocumentationArticleList
        articles={mockArticles}
        onArticleSelect={mockOnArticleSelect}
        searchQuery="getting"
      />
    );

    const highlightedElements = screen.getAllByText('Getting');
    expect(highlightedElements.some(el => el.tagName === 'MARK')).toBe(true);
  });

  it('escapes special regex characters in search query', () => {
    render(
      <DocumentationArticleList
        articles={[{
          id: '6',
          titel: 'Test (parentheses) and [brackets]',
          kategorie: 'Test',
          seiteninhalt: 'Content with special chars',
          meta: null
        }]}
        onArticleSelect={mockOnArticleSelect}
        selectedArticle={null}
        searchQuery="(parentheses)"
      />
    );

    const highlightedElements = screen.getAllByText('(parentheses)');
    expect(highlightedElements.some(el => el.tagName === 'MARK')).toBe(true);
  });

  describe('article selection states', () => {
    const selectedArticle = mockArticles[0];
    let articleCards: HTMLElement[];

    beforeEach(() => {
      render(
        <DocumentationArticleList
          articles={mockArticles}
          onArticleSelect={mockOnArticleSelect}
          selectedArticle={selectedArticle}
        />
      );
      articleCards = screen.getAllByRole('button');
    });

    it('shows active state for selected article', () => {
      const selectedCard = articleCards.find(card => 
        card.getAttribute('aria-label')?.includes(selectedArticle.titel)
      );
      
      expect(selectedCard).toHaveClass('bg-primary/5', 'border-primary');
    });

    it('shows normal state for non-selected articles', () => {
      const nonSelectedCard = articleCards.find(card => 
        card.getAttribute('aria-label')?.includes(mockArticles[1].titel)
      );
      
      expect(nonSelectedCard).toHaveClass('bg-background', 'border-input');
    });
  });
});