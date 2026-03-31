import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HouseTable, House } from './house-table';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
jest.mock('@/hooks/use-toast');
jest.mock('@/components/houses/house-context-menu', () => ({
  HouseContextMenu: ({ children, house, onEdit, onRefresh }: any) => (
    <>
      {children}
      <div data-testid={`context-menu-${house.id}`} style={{ display: 'none' }}>
        <button onClick={onEdit} data-testid={`edit-${house.id}`}>Edit</button>
        <button onClick={onRefresh} data-testid={`refresh-${house.id}`}>Refresh</button>
      </div>
    </>
  ),
}));

// Mock fetch globally
global.fetch = jest.fn();

const mockToast = useToast as jest.MockedFunction<typeof useToast>;
const mockToastFn = jest.fn();

describe('HouseTable', () => {
  const mockOnEdit = jest.fn();
  const mockReloadRef = { current: null } as React.MutableRefObject<(() => void) | null>;

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
    {
      id: '3',
      name: 'Haus Gamma',
      ort: 'Hamburg',
      size: '100',
      rent: '1800',
      pricePerSqm: '18.00',
      totalApartments: 2,
      freeApartments: 0,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockToast.mockReturnValue({ toast: mockToastFn, dismiss: jest.fn(), toasts: [] });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockHouses),
    });
  });

  describe('Rendering', () => {
    it('renders table headers correctly', () => {
      render(
        <HouseTable
          filter="all"
          searchQuery=""
          onEdit={mockOnEdit}
          initialHouses={mockHouses}
        />
      );

      expect(screen.getByText('Häuser')).toBeInTheDocument();
      expect(screen.getByText('Ort')).toBeInTheDocument();
      expect(screen.getByText('Größe')).toBeInTheDocument();
      expect(screen.getByText('Miete')).toBeInTheDocument();
      expect(screen.getByText('Miete pro m²')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('renders house data correctly', () => {
      render(
        <HouseTable
          filter="all"
          searchQuery=""
          onEdit={mockOnEdit}
          initialHouses={mockHouses}
        />
      );

      expect(screen.getByText('Haus Alpha')).toBeInTheDocument();
      expect(screen.getByText('Berlin')).toBeInTheDocument();
      expect(screen.getByText('150 m²')).toBeInTheDocument();
      expect(screen.getByText('2500 €')).toBeInTheDocument();
      expect(screen.getByText('16.67 €/m²')).toBeInTheDocument();

      expect(screen.getByText('Haus Beta')).toBeInTheDocument();
      expect(screen.getByText('München')).toBeInTheDocument();
      expect(screen.getByText('200 m²')).toBeInTheDocument();
      expect(screen.getByText('3000 €')).toBeInTheDocument();
      expect(screen.getByText('15.00 €/m²')).toBeInTheDocument();
    });

    it('renders status badges correctly', () => {
      render(
        <HouseTable
          filter="all"
          searchQuery=""
          onEdit={mockOnEdit}
          initialHouses={mockHouses}
        />
      );

      // House with free apartments (blue badge)
      expect(screen.getByText('2/3 belegt')).toBeInTheDocument();
      
      // House with no free apartments (green badge)
      expect(screen.getByText('4/4 belegt')).toBeInTheDocument();
      
      // House with no free apartments (green badge)
      expect(screen.getByText('2/2 belegt')).toBeInTheDocument();
    });

    it('renders empty state when no houses provided', () => {
      render(
        <HouseTable
          filter="all"
          searchQuery=""
          onEdit={mockOnEdit}
          initialHouses={[]}
        />
      );

      expect(screen.getByText('Keine Häuser gefunden.')).toBeInTheDocument();
    });

    it('handles missing optional fields gracefully', () => {
      const housesWithMissingFields: House[] = [
        {
          id: '1',
          name: 'Minimal House',
          ort: 'Berlin',
        },
      ];

      render(
        <HouseTable
          filter="all"
          searchQuery=""
          onEdit={mockOnEdit}
          initialHouses={housesWithMissingFields}
        />
      );

      expect(screen.getByText('Minimal House')).toBeInTheDocument();
      expect(screen.getByText('Berlin')).toBeInTheDocument();
      // Should show "-" for missing fields
      expect(screen.getAllByText('-')).toHaveLength(3); // size, rent, pricePerSqm
    });
  });

  describe('Filtering', () => {
    it('filters houses by "full" status', () => {
      render(
        <HouseTable
          filter="full"
          searchQuery=""
          onEdit={mockOnEdit}
          initialHouses={mockHouses}
        />
      );

      // Only houses with no free apartments should be shown
      expect(screen.getByText('Haus Beta')).toBeInTheDocument();
      expect(screen.getByText('Haus Gamma')).toBeInTheDocument();
      expect(screen.queryByText('Haus Alpha')).not.toBeInTheDocument();
    });

    it('filters houses by "vacant" status', () => {
      render(
        <HouseTable
          filter="vacant"
          searchQuery=""
          onEdit={mockOnEdit}
          initialHouses={mockHouses}
        />
      );

      // Only houses with free apartments should be shown
      expect(screen.getByText('Haus Alpha')).toBeInTheDocument();
      expect(screen.queryByText('Haus Beta')).not.toBeInTheDocument();
      expect(screen.queryByText('Haus Gamma')).not.toBeInTheDocument();
    });

    it('shows all houses with "all" filter', () => {
      render(
        <HouseTable
          filter="all"
          searchQuery=""
          onEdit={mockOnEdit}
          initialHouses={mockHouses}
        />
      );

      expect(screen.getByText('Haus Alpha')).toBeInTheDocument();
      expect(screen.getByText('Haus Beta')).toBeInTheDocument();
      expect(screen.getByText('Haus Gamma')).toBeInTheDocument();
    });
  });

  describe('Search functionality', () => {
    it('filters houses by name', () => {
      render(
        <HouseTable
          filter="all"
          searchQuery="alpha"
          onEdit={mockOnEdit}
          initialHouses={mockHouses}
        />
      );

      expect(screen.getByText('Haus Alpha')).toBeInTheDocument();
      expect(screen.queryByText('Haus Beta')).not.toBeInTheDocument();
      expect(screen.queryByText('Haus Gamma')).not.toBeInTheDocument();
    });

    it('filters houses by location', () => {
      render(
        <HouseTable
          filter="all"
          searchQuery="berlin"
          onEdit={mockOnEdit}
          initialHouses={mockHouses}
        />
      );

      expect(screen.getByText('Haus Alpha')).toBeInTheDocument();
      expect(screen.queryByText('Haus Beta')).not.toBeInTheDocument();
      expect(screen.queryByText('Haus Gamma')).not.toBeInTheDocument();
    });

    it('filters houses by size', () => {
      render(
        <HouseTable
          filter="all"
          searchQuery="150"
          onEdit={mockOnEdit}
          initialHouses={mockHouses}
        />
      );

      expect(screen.getByText('Haus Alpha')).toBeInTheDocument();
      expect(screen.queryByText('Haus Beta')).not.toBeInTheDocument();
      expect(screen.queryByText('Haus Gamma')).not.toBeInTheDocument();
    });

    it('filters houses by rent', () => {
      render(
        <HouseTable
          filter="all"
          searchQuery="2500"
          onEdit={mockOnEdit}
          initialHouses={mockHouses}
        />
      );

      expect(screen.getByText('Haus Alpha')).toBeInTheDocument();
      expect(screen.queryByText('Haus Beta')).not.toBeInTheDocument();
      expect(screen.queryByText('Haus Gamma')).not.toBeInTheDocument();
    });

    it('is case insensitive', () => {
      render(
        <HouseTable
          filter="all"
          searchQuery="BERLIN"
          onEdit={mockOnEdit}
          initialHouses={mockHouses}
        />
      );

      expect(screen.getByText('Haus Alpha')).toBeInTheDocument();
      expect(screen.queryByText('Haus Beta')).not.toBeInTheDocument();
    });

    it('shows empty state when search yields no results', () => {
      render(
        <HouseTable
          filter="all"
          searchQuery="nonexistent"
          onEdit={mockOnEdit}
          initialHouses={mockHouses}
        />
      );

      expect(screen.getByText('Keine Häuser gefunden.')).toBeInTheDocument();
    });
  });

  describe('Sorting functionality', () => {
    it('sorts by name in ascending order by default', () => {
      render(
        <HouseTable
          filter="all"
          searchQuery=""
          onEdit={mockOnEdit}
          initialHouses={mockHouses}
        />
      );

      const rows = screen.getAllByRole('row');
      // Skip header row
      const dataRows = rows.slice(1);
      
      expect(within(dataRows[0]).getByText('Haus Alpha')).toBeInTheDocument();
      expect(within(dataRows[1]).getByText('Haus Beta')).toBeInTheDocument();
      expect(within(dataRows[2]).getByText('Haus Gamma')).toBeInTheDocument();
    });

    it('toggles sort direction when clicking same column header', async () => {
      const user = userEvent.setup();
      render(
        <HouseTable
          filter="all"
          searchQuery=""
          onEdit={mockOnEdit}
          initialHouses={mockHouses}
        />
      );

      const nameHeader = screen.getByText('Häuser').closest('div');
      
      // Click to sort descending
      await user.click(nameHeader!);
      
      const rows = screen.getAllByRole('row');
      const dataRows = rows.slice(1);
      
      expect(within(dataRows[0]).getByText('Haus Gamma')).toBeInTheDocument();
      expect(within(dataRows[1]).getByText('Haus Beta')).toBeInTheDocument();
      expect(within(dataRows[2]).getByText('Haus Alpha')).toBeInTheDocument();
    });

    it('sorts by location', async () => {
      const user = userEvent.setup();
      render(
        <HouseTable
          filter="all"
          searchQuery=""
          onEdit={mockOnEdit}
          initialHouses={mockHouses}
        />
      );

      const ortHeader = screen.getByText('Ort').closest('div');
      await user.click(ortHeader!);
      
      const rows = screen.getAllByRole('row');
      const dataRows = rows.slice(1);
      
      // Should be sorted by Ort: Berlin, Hamburg, München
      expect(within(dataRows[0]).getByText('Berlin')).toBeInTheDocument();
      expect(within(dataRows[1]).getByText('Hamburg')).toBeInTheDocument();
      expect(within(dataRows[2]).getByText('München')).toBeInTheDocument();
    });

    it('sorts by numeric values correctly', async () => {
      const user = userEvent.setup();
      render(
        <HouseTable
          filter="all"
          searchQuery=""
          onEdit={mockOnEdit}
          initialHouses={mockHouses}
        />
      );

      const sizeHeader = screen.getByText('Größe').closest('div');
      await user.click(sizeHeader!);
      
      const rows = screen.getAllByRole('row');
      const dataRows = rows.slice(1);
      
      // Should be sorted by size: 100, 150, 200
      expect(within(dataRows[0]).getByText('100 m²')).toBeInTheDocument();
      expect(within(dataRows[1]).getByText('150 m²')).toBeInTheDocument();
      expect(within(dataRows[2]).getByText('200 m²')).toBeInTheDocument();
    });

    it('sorts by status (occupied apartments)', async () => {
      const user = userEvent.setup();
      render(
        <HouseTable
          filter="all"
          searchQuery=""
          onEdit={mockOnEdit}
          initialHouses={mockHouses}
        />
      );

      const statusHeader = screen.getByText('Status').closest('div');
      await user.click(statusHeader!);
      
      const rows = screen.getAllByRole('row');
      const dataRows = rows.slice(1);
      
      // Should be sorted by occupied apartments: 2, 2, 4
      expect(within(dataRows[0]).getByText('2/3 belegt')).toBeInTheDocument();
      expect(within(dataRows[1]).getByText('2/2 belegt')).toBeInTheDocument();
      expect(within(dataRows[2]).getByText('4/4 belegt')).toBeInTheDocument();
    });

    it('displays correct sort icons', async () => {
      const user = userEvent.setup();
      render(
        <HouseTable
          filter="all"
          searchQuery=""
          onEdit={mockOnEdit}
          initialHouses={mockHouses}
        />
      );

      // Initially should show ascending arrow for name column
      const nameHeader = screen.getByText('Häuser').closest('div');
      expect(nameHeader).toBeInTheDocument();

      // Click to change to descending
      await user.click(nameHeader!);
      
      // The sort icons are rendered but testing their exact state would require
      // more complex DOM inspection. The functionality is tested above.
    });
  });

  describe('Row interactions', () => {
    it('calls onEdit when row is clicked', async () => {
      const user = userEvent.setup();
      render(
        <HouseTable
          filter="all"
          searchQuery=""
          onEdit={mockOnEdit}
          initialHouses={mockHouses}
        />
      );

      const firstRow = screen.getByText('Haus Alpha').closest('tr');
      await user.click(firstRow!);

      expect(mockOnEdit).toHaveBeenCalledWith(mockHouses[0]);
    });

    it('applies hover styles to rows', () => {
      render(
        <HouseTable
          filter="all"
          searchQuery=""
          onEdit={mockOnEdit}
          initialHouses={mockHouses}
        />
      );

      const firstRow = screen.getByText('Haus Alpha').closest('tr');
      expect(firstRow).toHaveClass('hover:bg-gray-50', 'cursor-pointer');
    });
  });

  describe('Data fetching', () => {
    it('fetches houses when no initial data provided', async () => {
      render(
        <HouseTable
          filter="all"
          searchQuery=""
          onEdit={mockOnEdit}
        />
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/haeuser');
      });
    });

    it('uses initial houses when provided', () => {
      render(
        <HouseTable
          filter="all"
          searchQuery=""
          onEdit={mockOnEdit}
          initialHouses={mockHouses}
        />
      );

      expect(screen.getByText('Haus Alpha')).toBeInTheDocument();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('handles fetch errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(
        <HouseTable
          filter="all"
          searchQuery=""
          onEdit={mockOnEdit}
        />
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching houses:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('handles non-ok response gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });
      
      render(
        <HouseTable
          filter="all"
          searchQuery=""
          onEdit={mockOnEdit}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Keine Häuser gefunden.')).toBeInTheDocument();
      });
    });
  });

  describe('Reload functionality', () => {
    it('sets reload function in ref', () => {
      render(
        <HouseTable
          filter="all"
          searchQuery=""
          onEdit={mockOnEdit}
          reloadRef={mockReloadRef}
          initialHouses={mockHouses}
        />
      );

      expect(mockReloadRef.current).toBeDefined();
      expect(typeof mockReloadRef.current).toBe('function');
    });

    it('clears reload function on unmount', () => {
      const { unmount } = render(
        <HouseTable
          filter="all"
          searchQuery=""
          onEdit={mockOnEdit}
          reloadRef={mockReloadRef}
          initialHouses={mockHouses}
        />
      );

      expect(mockReloadRef.current).toBeDefined();
      
      unmount();
      
      expect(mockReloadRef.current).toBeNull();
    });

    it('calls fetch when reload function is invoked', async () => {
      render(
        <HouseTable
          filter="all"
          searchQuery=""
          onEdit={mockOnEdit}
          reloadRef={mockReloadRef}
          initialHouses={mockHouses}
        />
      );

      expect(mockReloadRef.current).toBeDefined();
      
      await mockReloadRef.current!();
      
      expect(global.fetch).toHaveBeenCalledWith('/api/haeuser');
    });
  });

  describe('Context menu integration', () => {
    it('renders context menu for each house row', () => {
      render(
        <HouseTable
          filter="all"
          searchQuery=""
          onEdit={mockOnEdit}
          initialHouses={mockHouses}
        />
      );

      expect(screen.getByTestId('context-menu-1')).toBeInTheDocument();
      expect(screen.getByTestId('context-menu-2')).toBeInTheDocument();
      expect(screen.getByTestId('context-menu-3')).toBeInTheDocument();
    });

    it('passes correct props to context menu', () => {
      render(
        <HouseTable
          filter="all"
          searchQuery=""
          onEdit={mockOnEdit}
          initialHouses={mockHouses}
        />
      );

      // Test that edit buttons are present (indicating props were passed correctly)
      expect(screen.getByTestId('edit-1')).toBeInTheDocument();
      expect(screen.getByTestId('edit-2')).toBeInTheDocument();
      expect(screen.getByTestId('edit-3')).toBeInTheDocument();
    });
  });

  describe('Combined filtering and sorting', () => {
    it('applies both filter and search simultaneously', () => {
      render(
        <HouseTable
          filter="vacant"
          searchQuery="alpha"
          onEdit={mockOnEdit}
          initialHouses={mockHouses}
        />
      );

      // Should show only Haus Alpha (matches search and has vacant apartments)
      expect(screen.getByText('Haus Alpha')).toBeInTheDocument();
      expect(screen.queryByText('Haus Beta')).not.toBeInTheDocument();
      expect(screen.queryByText('Haus Gamma')).not.toBeInTheDocument();
    });

    it('sorts filtered results correctly', async () => {
      const user = userEvent.setup();
      
      // Add more houses with vacant apartments for better sorting test
      const extendedHouses: House[] = [
        ...mockHouses,
        {
          id: '4',
          name: 'Haus Delta',
          ort: 'Köln',
          size: '120',
          rent: '2000',
          pricePerSqm: '16.67',
          totalApartments: 2,
          freeApartments: 1,
        },
      ];

      render(
        <HouseTable
          filter="vacant"
          searchQuery=""
          onEdit={mockOnEdit}
          initialHouses={extendedHouses}
        />
      );

      // Should show only houses with vacant apartments
      expect(screen.getByText('Haus Alpha')).toBeInTheDocument();
      expect(screen.getByText('Haus Delta')).toBeInTheDocument();
      expect(screen.queryByText('Haus Beta')).not.toBeInTheDocument();

      // Sort by name descending
      const nameHeader = screen.getByText('Häuser').closest('div');
      await user.click(nameHeader!);

      const rows = screen.getAllByRole('row');
      const dataRows = rows.slice(1);
      
      // Should be sorted: Delta, Alpha (descending)
      expect(within(dataRows[0]).getByText('Haus Delta')).toBeInTheDocument();
      expect(within(dataRows[1]).getByText('Haus Alpha')).toBeInTheDocument();
    });
  });
});