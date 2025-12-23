import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HaeuserClientView from './client-wrapper';
import { House } from '@/components/tables/house-table';
import { useModalStore } from '@/hooks/use-modal-store';

// Mock dependencies
jest.mock('@/hooks/use-modal-store');
jest.mock('@/components/houses/house-filters', () => ({
  HouseFilters: ({ onFilterChange, onSearchChange }: any) => (
    <div data-testid="house-filters">
      <button onClick={() => onFilterChange('all')} data-testid="filter-all">All</button>
      <button onClick={() => onFilterChange('full')} data-testid="filter-full">Full</button>
      <button onClick={() => onFilterChange('vacant')} data-testid="filter-vacant">Vacant</button>
      <input 
        data-testid="search-input" 
        onChange={(e) => onSearchChange(e.target.value)} 
        placeholder="Search houses..."
      />
    </div>
  ),
}));

jest.mock('@/components/tables/house-table', () => ({
  HouseTable: ({ filter, searchQuery, onEdit, initialHouses, reloadRef }: any) => (
    <div data-testid="house-table">
      <div data-testid="filter-value">{filter}</div>
      <div data-testid="search-value">{searchQuery}</div>
      <div data-testid="houses-count">{initialHouses?.length || 0}</div>
      {initialHouses?.map((house: House) => (
        <div key={house.id} data-testid={`house-${house.id}`}>
          <span>{house.name}</span>
          <button onClick={() => onEdit(house)} data-testid={`edit-${house.id}`}>Edit</button>
        </div>
      ))}
      <button onClick={() => reloadRef?.current?.()} data-testid="reload-table">Reload</button>
    </div>
  ),
}));

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>;

describe('HaeuserClientView', () => {
  const mockOpenHouseModal = jest.fn();

  const mockHouses: House[] = [
    {
      id: '1',
      name: 'Haus Alpha',
      ort: 'Berlin',
      size: '150',
      rent: '2500',
      pricePerSqm: '16.67',
      totalApartments: 3,
      freeApartments: 1,
    },
    {
      id: '2',
      name: 'Haus Beta',
      ort: 'München',
      size: '200',
      rent: '3000',
      pricePerSqm: '15.00',
      totalApartments: 4,
      freeApartments: 0,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseModalStore.mockReturnValue({
      openHouseModal: mockOpenHouseModal,
    } as any);
  });

  describe('Rendering', () => {
    it('renders page title and summary cards', () => {
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      // Check for summary cards
      expect(screen.getByText('Häuser')).toBeInTheDocument();
      expect(screen.getByText('Wohnungen')).toBeInTheDocument();
      expect(screen.getByText('Freie Wohnungen')).toBeInTheDocument();
    });

    it('renders add house button', () => {
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      const addButton = screen.getByRole('button', { name: /Haus hinzufügen/i });
      expect(addButton).toBeInTheDocument();
    });

    it('renders house filters component', () => {
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      expect(screen.getByTestId('house-filters')).toBeInTheDocument();
    });

    it('renders house table component', () => {
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      expect(screen.getByTestId('house-table')).toBeInTheDocument();
    });

    it('renders card with correct title', () => {
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      expect(screen.getByText('Hausliste')).toBeInTheDocument();
    });

    it('passes enriched houses to table component', () => {
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      expect(screen.getByTestId('houses-count')).toHaveTextContent('2');
      expect(screen.getByTestId('house-1')).toBeInTheDocument();
      expect(screen.getByTestId('house-2')).toBeInTheDocument();
      expect(screen.getByText('Haus Alpha')).toBeInTheDocument();
      expect(screen.getByText('Haus Beta')).toBeInTheDocument();
    });
  });

  describe('Filter functionality', () => {
    it('initializes with "all" filter', () => {
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      expect(screen.getByTestId('filter-value')).toHaveTextContent('all');
    });

    it('updates filter when filter buttons are clicked', async () => {
      const user = userEvent.setup();
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      const fullFilterButton = screen.getByTestId('filter-full');
      await user.click(fullFilterButton);

      expect(screen.getByTestId('filter-value')).toHaveTextContent('full');
    });

    it('can switch between different filters', async () => {
      const user = userEvent.setup();
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      // Switch to vacant filter
      const vacantFilterButton = screen.getByTestId('filter-vacant');
      await user.click(vacantFilterButton);
      expect(screen.getByTestId('filter-value')).toHaveTextContent('vacant');

      // Switch back to all filter
      const allFilterButton = screen.getByTestId('filter-all');
      await user.click(allFilterButton);
      expect(screen.getByTestId('filter-value')).toHaveTextContent('all');
    });
  });

  describe('Search functionality', () => {
    it('initializes with empty search query', () => {
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      expect(screen.getByTestId('search-value')).toHaveTextContent('');
    });

    it('updates search query when typing in search input', async () => {
      const user = userEvent.setup();
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'Berlin');

      expect(screen.getByTestId('search-value')).toHaveTextContent('Berlin');
    });

    it('can clear search query', async () => {
      const user = userEvent.setup();
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'test');
      expect(screen.getByTestId('search-value')).toHaveTextContent('test');

      await user.clear(searchInput);
      expect(screen.getByTestId('search-value')).toHaveTextContent('');
    });
  });

  describe('Add house functionality', () => {
    it('calls openHouseModal when add button is clicked', async () => {
      const user = userEvent.setup();
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      const addButton = screen.getByRole('button', { name: /Haus hinzufügen/i });
      await user.click(addButton);

      expect(mockOpenHouseModal).toHaveBeenCalledWith(undefined, expect.any(Function));
    });

    it('passes refresh callback to openHouseModal', async () => {
      const user = userEvent.setup();
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      const addButton = screen.getByRole('button', { name: /Haus hinzufügen/i });
      await user.click(addButton);

      expect(mockOpenHouseModal).toHaveBeenCalledTimes(1);
      const [houseData, refreshCallback] = mockOpenHouseModal.mock.calls[0];
      
      expect(houseData).toBeUndefined();
      expect(typeof refreshCallback).toBe('function');
    });
  });

  describe('Edit house functionality', () => {
    it('calls openHouseModal when edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      const editButton = screen.getByTestId('edit-1');
      await user.click(editButton);

      expect(mockOpenHouseModal).toHaveBeenCalledWith(mockHouses[0], expect.any(Function));
    });

    it('passes correct house data to openHouseModal', async () => {
      const user = userEvent.setup();
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      const editButton = screen.getByTestId('edit-2');
      await user.click(editButton);

      expect(mockOpenHouseModal).toHaveBeenCalledTimes(1);
      const [houseData, refreshCallback] = mockOpenHouseModal.mock.calls[0];
      
      expect(houseData).toEqual(mockHouses[1]);
      expect(typeof refreshCallback).toBe('function');
    });
  });

  describe('Table reload functionality', () => {
    it('provides reload function to table component', () => {
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      const reloadButton = screen.getByTestId('reload-table');
      expect(reloadButton).toBeInTheDocument();
    });

    it('refresh callback can be called without errors', async () => {
      const user = userEvent.setup();
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      // Simulate calling the refresh callback through add modal
      const addButton = screen.getByRole('button', { name: /Haus hinzufügen/i });
      await user.click(addButton);

      const refreshCallback = mockOpenHouseModal.mock.calls[0][1];
      
      // Should not throw an error when called
      expect(() => refreshCallback()).not.toThrow();
    });
  });

  describe('Layout and styling', () => {
    it('has correct layout structure', () => {
      const { container } = render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass('flex', 'flex-col', 'gap-8', 'p-8');
    });

    it('has responsive header layout', () => {
      const { container } = render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      // Check for the card header with responsive layout
      const headerContainer = container.querySelector('.flex.flex-row.items-center.justify-between');
      expect(headerContainer).toBeInTheDocument();
    });

    it('has correct title styling', () => {
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      // The title "Häuser" appears in a StatCard, not as a main title
      const title = screen.getByText('Häuser');
      expect(title).toHaveClass('tracking-tight', 'text-sm', 'font-medium');
    });

    it('has correct main card title', () => {
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      // Check for the main card title "Hausliste"
      const cardTitle = screen.getByText('Hausliste');
      expect(cardTitle).toHaveClass('text-2xl', 'font-semibold', 'leading-none', 'tracking-tight');
    });

    it('has correct card styling', () => {
      const { container } = render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      // Look for card with rounded-xl and shadow-md (without border-none)
      const card = container.querySelector('[class*="rounded-xl"][class*="shadow-md"]');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('handles empty houses array', () => {
      render(<HaeuserClientView enrichedHaeuser={[]} />);

      expect(screen.getByTestId('houses-count')).toHaveTextContent('0');
      expect(screen.getByText('Häuser')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Haus hinzufügen/i })).toBeInTheDocument();
    });

    it('still allows adding houses when list is empty', async () => {
      const user = userEvent.setup();
      render(<HaeuserClientView enrichedHaeuser={[]} />);

      const addButton = screen.getByRole('button', { name: /Haus hinzufügen/i });
      await user.click(addButton);

      expect(mockOpenHouseModal).toHaveBeenCalledWith(undefined, expect.any(Function));
    });
  });

  describe('Integration', () => {
    it('maintains filter and search state independently', async () => {
      const user = userEvent.setup();
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      // Set filter
      const fullFilterButton = screen.getByTestId('filter-full');
      await user.click(fullFilterButton);

      // Set search
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'Berlin');

      // Both should be maintained
      expect(screen.getByTestId('filter-value')).toHaveTextContent('full');
      expect(screen.getByTestId('search-value')).toHaveTextContent('Berlin');
    });

    it('can perform multiple operations in sequence', async () => {
      const user = userEvent.setup();
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      // Add a house
      const addButton = screen.getByRole('button', { name: /Haus hinzufügen/i });
      await user.click(addButton);
      expect(mockOpenHouseModal).toHaveBeenCalledTimes(1);

      // Edit a house
      const editButton = screen.getByTestId('edit-1');
      await user.click(editButton);
      expect(mockOpenHouseModal).toHaveBeenCalledTimes(2);

      // Change filter
      const vacantFilterButton = screen.getByTestId('filter-vacant');
      await user.click(vacantFilterButton);
      expect(screen.getByTestId('filter-value')).toHaveTextContent('vacant');

      // Search
      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'test');
      expect(screen.getByTestId('search-value')).toHaveTextContent('test');
    });
  });

  describe('Props handling', () => {
    it('handles houses with minimal data', () => {
      const minimalHouses: House[] = [
        {
          id: '1',
          name: 'Minimal House',
          ort: 'City',
        },
      ];

      render(<HaeuserClientView enrichedHaeuser={minimalHouses} />);

      expect(screen.getByTestId('houses-count')).toHaveTextContent('1');
      expect(screen.getByText('Minimal House')).toBeInTheDocument();
    });

    it('handles houses with all optional fields', () => {
      const completeHouses: House[] = [
        {
          id: '1',
          name: 'Complete House',
          ort: 'Berlin',
          strasse: 'Test Street 1',
          size: '150',
          rent: '2500',
          pricePerSqm: '16.67',
          status: 'available',
          totalApartments: 3,
          freeApartments: 1,
        },
      ];

      render(<HaeuserClientView enrichedHaeuser={completeHouses} />);

      expect(screen.getByTestId('houses-count')).toHaveTextContent('1');
      expect(screen.getByText('Complete House')).toBeInTheDocument();
    });
  });
});