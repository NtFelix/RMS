import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentationSearch } from '@/components/documentation/documentation-search';

// Mock the debounce hook
jest.mock('@/hooks/use-debounce', () => ({
  useDebounce: (value: string, delay: number) => value
}));

describe('DocumentationSearch', () => {
  const mockOnSearch = jest.fn();

  beforeEach(() => {
    mockOnSearch.mockClear();
  });

  it('renders with default placeholder', () => {
    render(<DocumentationSearch onSearch={mockOnSearch} />);
    
    expect(screen.getByPlaceholderText('Dokumentation durchsuchen...')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(
      <DocumentationSearch 
        onSearch={mockOnSearch} 
        placeholder="Custom placeholder" 
      />
    );
    
    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  it('calls onSearch when user types', async () => {
    const user = userEvent.setup();
    render(<DocumentationSearch onSearch={mockOnSearch} />);
    
    const input = screen.getByRole('textbox');
    await user.type(input, 'test query');
    
    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('test query');
    });
  });

  it('shows clear button when there is text', async () => {
    const user = userEvent.setup();
    render(<DocumentationSearch onSearch={mockOnSearch} />);
    
    const input = screen.getByRole('textbox');
    await user.type(input, 'test');
    
    expect(screen.getByRole('button', { name: /suche löschen/i })).toBeInTheDocument();
  });

  it('does not show clear button when input is empty', () => {
    render(<DocumentationSearch onSearch={mockOnSearch} />);
    
    expect(screen.queryByRole('button', { name: /suche löschen/i })).not.toBeInTheDocument();
  });

  it('clears input when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(<DocumentationSearch onSearch={mockOnSearch} />);
    
    const input = screen.getByRole('textbox');
    await user.type(input, 'test');
    
    const clearButton = screen.getByRole('button', { name: /suche löschen/i });
    await user.click(clearButton);
    
    expect(input).toHaveValue('');
    expect(mockOnSearch).toHaveBeenCalledWith('');
  });

  it('applies custom className', () => {
    const { container } = render(
      <DocumentationSearch onSearch={mockOnSearch} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('has proper accessibility attributes', () => {
    render(<DocumentationSearch onSearch={mockOnSearch} />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'text');
    
    const clearButton = screen.queryByRole('button', { name: /suche löschen/i });
    if (clearButton) {
      expect(clearButton).toHaveAttribute('aria-label');
    }
  });
});