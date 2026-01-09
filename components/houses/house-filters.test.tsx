import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HouseFilters } from '@/components/houses/house-filters';

describe('HouseFilters', () => {
  const mockOnFilterChange = jest.fn();
  const mockOnSearchChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all filter buttons', () => {
      render(
        <HouseFilters
          onFilterChange={mockOnFilterChange}
          onSearchChange={mockOnSearchChange}
        />
      );

      expect(screen.getByRole('button', { name: 'Alle' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Voll' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Platz' })).toBeInTheDocument();
    });

    it('renders search input with correct placeholder', () => {
      render(
        <HouseFilters
          onFilterChange={mockOnFilterChange}
          onSearchChange={mockOnSearchChange}
        />
      );

      const searchInput = screen.getByPlaceholderText('Haus suchen...');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('type', 'search');
    });

    it('renders search icon', () => {
      render(
        <HouseFilters
          onFilterChange={mockOnFilterChange}
          onSearchChange={mockOnSearchChange}
        />
      );

      // The search icon should be present (though testing its exact position is complex)
      const searchInput = screen.getByPlaceholderText('Haus suchen...');
      expect(searchInput.parentElement).toHaveClass('relative');
    });

    it('has correct initial state with "Alle" button active', () => {
      render(
        <HouseFilters
          onFilterChange={mockOnFilterChange}
          onSearchChange={mockOnSearchChange}
        />
      );

      const alleButton = screen.getByRole('button', { name: 'Alle' });
      const vollButton = screen.getByRole('button', { name: 'Voll' });
      const platzButton = screen.getByRole('button', { name: 'Platz' });

      // "Alle" should have default variant (active)
      expect(alleButton).not.toHaveClass('border-input');
      
      // Others should have outline variant (inactive)
      expect(vollButton).toHaveClass('border-input');
      expect(platzButton).toHaveClass('border-input');
    });
  });

  describe('Filter functionality', () => {
    it('calls onFilterChange when "Alle" button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <HouseFilters
          onFilterChange={mockOnFilterChange}
          onSearchChange={mockOnSearchChange}
        />
      );

      const alleButton = screen.getByRole('button', { name: 'Alle' });
      await user.click(alleButton);

      expect(mockOnFilterChange).toHaveBeenCalledWith('all');
    });

    it('calls onFilterChange when "Voll" button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <HouseFilters
          onFilterChange={mockOnFilterChange}
          onSearchChange={mockOnSearchChange}
        />
      );

      const vollButton = screen.getByRole('button', { name: 'Voll' });
      await user.click(vollButton);

      expect(mockOnFilterChange).toHaveBeenCalledWith('full');
    });

    it('calls onFilterChange when "Platz" button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <HouseFilters
          onFilterChange={mockOnFilterChange}
          onSearchChange={mockOnSearchChange}
        />
      );

      const platzButton = screen.getByRole('button', { name: 'Platz' });
      await user.click(platzButton);

      expect(mockOnFilterChange).toHaveBeenCalledWith('vacant');
    });

    it('updates active filter state when different buttons are clicked', async () => {
      const user = userEvent.setup();
      render(
        <HouseFilters
          onFilterChange={mockOnFilterChange}
          onSearchChange={mockOnSearchChange}
        />
      );

      const alleButton = screen.getByRole('button', { name: 'Alle' });
      const vollButton = screen.getByRole('button', { name: 'Voll' });
      const platzButton = screen.getByRole('button', { name: 'Platz' });

      // Initially "Alle" is active
      expect(alleButton).not.toHaveClass('border-input');
      expect(vollButton).toHaveClass('border-input');

      // Click "Voll" button
      await user.click(vollButton);

      // Now "Voll" should be active and "Alle" inactive
      expect(alleButton).toHaveClass('border-input');
      expect(vollButton).not.toHaveClass('border-input');
      expect(platzButton).toHaveClass('border-input');

      // Click "Platz" button
      await user.click(platzButton);

      // Now "Platz" should be active
      expect(alleButton).toHaveClass('border-input');
      expect(vollButton).toHaveClass('border-input');
      expect(platzButton).not.toHaveClass('border-input');
    });

    it('can switch back to "Alle" filter', async () => {
      const user = userEvent.setup();
      render(
        <HouseFilters
          onFilterChange={mockOnFilterChange}
          onSearchChange={mockOnSearchChange}
        />
      );

      const alleButton = screen.getByRole('button', { name: 'Alle' });
      const vollButton = screen.getByRole('button', { name: 'Voll' });

      // Click "Voll" first
      await user.click(vollButton);
      expect(mockOnFilterChange).toHaveBeenCalledWith('full');

      // Then click "Alle" again
      await user.click(alleButton);
      expect(mockOnFilterChange).toHaveBeenCalledWith('all');

      // "Alle" should be active again
      expect(alleButton).not.toHaveClass('border-input');
      expect(vollButton).toHaveClass('border-input');
    });
  });

  describe('Search functionality', () => {
    it('calls onSearchChange when typing in search input', async () => {
      const user = userEvent.setup();
      render(
        <HouseFilters
          onFilterChange={mockOnFilterChange}
          onSearchChange={mockOnSearchChange}
        />
      );

      const searchInput = screen.getByPlaceholderText('Haus suchen...');
      await user.type(searchInput, 'test house');

      // Verify the final search value
      expect(mockOnSearchChange).toHaveBeenLastCalledWith('test house');
    });

    it('calls onSearchChange when clearing search input', async () => {
      const user = userEvent.setup();
      render(
        <HouseFilters
          onFilterChange={mockOnFilterChange}
          onSearchChange={mockOnSearchChange}
        />
      );

      const searchInput = screen.getByPlaceholderText('Haus suchen...');
      
      // Type something first
      await user.type(searchInput, 'test');
      expect(mockOnSearchChange).toHaveBeenLastCalledWith('test');

      // Clear the input
      await user.clear(searchInput);
      expect(mockOnSearchChange).toHaveBeenLastCalledWith('');
    });

    it('handles search input changes correctly', async () => {
      const user = userEvent.setup();
      render(
        <HouseFilters
          onFilterChange={mockOnFilterChange}
          onSearchChange={mockOnSearchChange}
        />
      );

      const searchInput = screen.getByPlaceholderText('Haus suchen...');
      
      // Type a search term
      await user.type(searchInput, 'Berlin');
      expect(searchInput).toHaveValue('Berlin');
      expect(mockOnSearchChange).toHaveBeenLastCalledWith('Berlin');

      // Modify the search term
      await user.clear(searchInput);
      await user.type(searchInput, 'München');
      expect(searchInput).toHaveValue('München');
      expect(mockOnSearchChange).toHaveBeenLastCalledWith('München');
    });

    it('handles special characters in search input', async () => {
      const user = userEvent.setup();
      render(
        <HouseFilters
          onFilterChange={mockOnFilterChange}
          onSearchChange={mockOnSearchChange}
        />
      );

      const searchInput = screen.getByPlaceholderText('Haus suchen...');
      const specialText = 'Haus-Müller & Co. (123)';
      
      await user.type(searchInput, specialText);
      expect(mockOnSearchChange).toHaveBeenLastCalledWith(specialText);
    });
  });

  describe('Layout and styling', () => {
    it('has responsive layout classes', () => {
      const { container } = render(
        <HouseFilters
          onFilterChange={mockOnFilterChange}
          onSearchChange={mockOnSearchChange}
        />
      );

      // Check for responsive flex layout
      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass('flex', 'flex-col', 'gap-4');

      // Check for responsive button container
      const buttonContainer = container.querySelector('.flex.flex-col.gap-4 > .flex');
      expect(buttonContainer).toHaveClass('sm:flex-row', 'sm:items-center', 'sm:justify-between');
    });

    it('has correct button styling', () => {
      render(
        <HouseFilters
          onFilterChange={mockOnFilterChange}
          onSearchChange={mockOnSearchChange}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveClass('h-9');
      });
    });

    it('has correct search input styling', () => {
      render(
        <HouseFilters
          onFilterChange={mockOnFilterChange}
          onSearchChange={mockOnSearchChange}
        />
      );

      const searchInput = screen.getByPlaceholderText('Haus suchen...');
      expect(searchInput).toHaveClass('pl-10'); // Left padding for search icon
      
      const searchContainer = searchInput.parentElement;
      expect(searchContainer).toHaveClass('relative', 'w-full', 'sm:w-auto', 'sm:min-w-[300px]');
    });

    it('positions search icon correctly', () => {
      const { container } = render(
        <HouseFilters
          onFilterChange={mockOnFilterChange}
          onSearchChange={mockOnSearchChange}
        />
      );

      const searchIcon = container.querySelector('.absolute.left-3.top-1\\/2.-translate-y-1\\/2');
      expect(searchIcon).toBeInTheDocument();
      expect(searchIcon).toHaveClass('h-4', 'w-4', 'text-muted-foreground');
    });
  });

  describe('Accessibility', () => {
    it('has proper button roles', () => {
      render(
        <HouseFilters
          onFilterChange={mockOnFilterChange}
          onSearchChange={mockOnSearchChange}
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);
      
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
        expect(button).not.toBeDisabled();
      });
    });

    it('has proper input attributes', () => {
      render(
        <HouseFilters
          onFilterChange={mockOnFilterChange}
          onSearchChange={mockOnSearchChange}
        />
      );

      const searchInput = screen.getByPlaceholderText('Haus suchen...');
      expect(searchInput).toHaveAttribute('type', 'search');
      expect(searchInput).not.toBeRequired();
      expect(searchInput).not.toBeDisabled();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(
        <HouseFilters
          onFilterChange={mockOnFilterChange}
          onSearchChange={mockOnSearchChange}
        />
      );

      const alleButton = screen.getByRole('button', { name: 'Alle' });
      const vollButton = screen.getByRole('button', { name: 'Voll' });

      // Tab to first button and press Enter
      alleButton.focus();
      await user.keyboard('{Enter}');
      expect(mockOnFilterChange).toHaveBeenCalledWith('all');

      // Tab to second button and press Space
      vollButton.focus();
      await user.keyboard(' ');
      expect(mockOnFilterChange).toHaveBeenCalledWith('full');
    });
  });

  describe('Integration', () => {
    it('can use both filter and search simultaneously', async () => {
      const user = userEvent.setup();
      render(
        <HouseFilters
          onFilterChange={mockOnFilterChange}
          onSearchChange={mockOnSearchChange}
        />
      );

      // Set a filter
      const vollButton = screen.getByRole('button', { name: 'Voll' });
      await user.click(vollButton);
      expect(mockOnFilterChange).toHaveBeenCalledWith('full');

      // Set a search term
      const searchInput = screen.getByPlaceholderText('Haus suchen...');
      await user.type(searchInput, 'Berlin');
      expect(mockOnSearchChange).toHaveBeenLastCalledWith('Berlin');

      // Both should be set independently
      expect(vollButton).not.toHaveClass('border-input'); // Active filter
      expect(searchInput).toHaveValue('Berlin'); // Search term
    });

    it('maintains filter state when searching', async () => {
      const user = userEvent.setup();
      render(
        <HouseFilters
          onFilterChange={mockOnFilterChange}
          onSearchChange={mockOnSearchChange}
        />
      );

      // Set filter to "Platz"
      const platzButton = screen.getByRole('button', { name: 'Platz' });
      await user.click(platzButton);

      // Search for something
      const searchInput = screen.getByPlaceholderText('Haus suchen...');
      await user.type(searchInput, 'test');

      // Filter should still be "Platz"
      expect(platzButton).not.toHaveClass('border-input');
      expect(screen.getByRole('button', { name: 'Alle' })).toHaveClass('border-input');
      expect(screen.getByRole('button', { name: 'Voll' })).toHaveClass('border-input');
    });

    it('maintains search term when changing filters', async () => {
      const user = userEvent.setup();
      render(
        <HouseFilters
          onFilterChange={mockOnFilterChange}
          onSearchChange={mockOnSearchChange}
        />
      );

      // Enter search term
      const searchInput = screen.getByPlaceholderText('Haus suchen...');
      await user.type(searchInput, 'Berlin');

      // Change filter
      const vollButton = screen.getByRole('button', { name: 'Voll' });
      await user.click(vollButton);

      // Search term should be preserved
      expect(searchInput).toHaveValue('Berlin');
    });
  });
});