import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentationCategories, Category } from '@/components/documentation/documentation-categories';

describe('DocumentationCategories', () => {
  const mockCategories: Category[] = [
    { name: 'Getting Started', articleCount: 5 },
    { name: 'API Reference', articleCount: 12 },
    { name: 'Tutorials', articleCount: 8 },
    { name: 'Empty Category', articleCount: 0 }
  ];

  const mockOnCategorySelect = jest.fn();

  beforeEach(() => {
    mockOnCategorySelect.mockClear();
  });

  it('renders loading state', () => {
    render(
      <DocumentationCategories
        categories={[]}
        onCategorySelect={mockOnCategorySelect}
        isLoading={true}
      />
    );

    // Should show skeleton loaders
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons).toHaveLength(7); // 2 title elements + 5 category skeletons
  });

  it('renders empty state when no categories', () => {
    render(
      <DocumentationCategories
        categories={[]}
        onCategorySelect={mockOnCategorySelect}
        isLoading={false}
      />
    );

    expect(screen.getByText('Keine Kategorien verfügbar')).toBeInTheDocument();
  });

  it('renders categories with article counts', () => {
    render(
      <DocumentationCategories
        categories={mockCategories}
        onCategorySelect={mockOnCategorySelect}
      />
    );

    expect(screen.getByText('Kategorien')).toBeInTheDocument();
    expect(screen.getByText('Getting Started')).toBeInTheDocument();
    expect(screen.getByText('API Reference')).toBeInTheDocument();
    expect(screen.getByText('Tutorials')).toBeInTheDocument();
    
    // Check article counts
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('renders "All Articles" button with total count', () => {
    render(
      <DocumentationCategories
        categories={mockCategories}
        onCategorySelect={mockOnCategorySelect}
      />
    );

    expect(screen.getByText('Alle Artikel')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument(); // 5 + 12 + 8 + 0
  });

  it('calls onCategorySelect when category is clicked', async () => {
    const user = userEvent.setup();
    render(
      <DocumentationCategories
        categories={mockCategories}
        onCategorySelect={mockOnCategorySelect}
      />
    );

    await user.click(screen.getByText('Getting Started'));
    expect(mockOnCategorySelect).toHaveBeenCalledWith('Getting Started');
  });

  it('calls onCategorySelect with null when "All Articles" is clicked', async () => {
    const user = userEvent.setup();
    render(
      <DocumentationCategories
        categories={mockCategories}
        onCategorySelect={mockOnCategorySelect}
      />
    );

    await user.click(screen.getByText('Alle Artikel'));
    expect(mockOnCategorySelect).toHaveBeenCalledWith(null);
  });

  it('highlights selected category', () => {
    render(
      <DocumentationCategories
        categories={mockCategories}
        onCategorySelect={mockOnCategorySelect}
        selectedCategory="Getting Started"
      />
    );

    const selectedButton = screen.getByRole('button', { name: /getting started/i });
    expect(selectedButton).toHaveClass('bg-primary'); // Default variant styling
  });

  it('highlights "All Articles" when no category selected', () => {
    render(
      <DocumentationCategories
        categories={mockCategories}
        onCategorySelect={mockOnCategorySelect}
        selectedCategory={null}
      />
    );

    const allArticlesButton = screen.getByRole('button', { name: /alle artikel/i });
    expect(allArticlesButton).toHaveClass('bg-primary'); // Default variant styling
  });

  it('disables categories with zero articles', () => {
    render(
      <DocumentationCategories
        categories={mockCategories}
        onCategorySelect={mockOnCategorySelect}
      />
    );

    const emptyCategory = screen.getByRole('button', { name: /empty category/i });
    expect(emptyCategory).toBeDisabled();
  });

  it('handles categories with null names', () => {
    const categoriesWithNull: Category[] = [
      { name: '', articleCount: 3 }
    ];

    render(
      <DocumentationCategories
        categories={categoriesWithNull}
        onCategorySelect={mockOnCategorySelect}
      />
    );

    expect(screen.getByText('Ohne Kategorie')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <DocumentationCategories
        categories={mockCategories}
        onCategorySelect={mockOnCategorySelect}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('truncates long category names', () => {
    const longCategories: Category[] = [
      { name: 'This is a very long category name that should be truncated', articleCount: 1 }
    ];

    render(
      <DocumentationCategories
        categories={longCategories}
        onCategorySelect={mockOnCategorySelect}
      />
    );

    const categoryButton = screen.getByText('This is a very long category name that should be truncated');
    expect(categoryButton).toHaveClass('truncate');
  });
});