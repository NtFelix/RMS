import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HaeuserClientView from './client-wrapper';
import { House } from '@/components/tables/house-table';
import { useModalStore } from '@/hooks/use-modal-store';
import { useOnboardingStore } from '@/hooks/use-onboarding-store';
import { starteLoeschenMitKautionen } from '@/lib/kautionen-loeschen';

// Mock dependencies
jest.mock('@/hooks/use-modal-store');
jest.mock('@/lib/kautionen-loeschen', () => ({
  // Standard: keine gebuchte Kaution betroffen -> die übliche Frage wird gezeigt
  starteLoeschenMitKautionen: jest.fn(async (_tabelle, _ids, handlers) => handlers.einfach()),
}));
// Der echte Hook liest die URL über den (hier statischen) useSearchParams-Mock und würde den Tab sofort zurücksetzen
jest.mock('@/hooks/use-tab-params', () => {
  const { useState } = jest.requireActual('react');
  return { useTabParams: (defaultValue: string) => useState(defaultValue) };
});

jest.mock('@/components/tables/house-table', () => ({
  // Städte-Filter und Sortierung (Name/Ort) werden hier nachgebildet, damit die Verdrahtung sichtbar wird
  HouseTable: ({ filter, searchQuery, cityFilter, sortKey, sortDirection, onSortChange, onEdit, initialHouses, reloadRef, onSelectionChange }: any) => {
    const visible = (initialHouses ?? [])
      .filter((h: House) => !cityFilter?.length || cityFilter.includes(h.ort))
      .sort((a: House, b: House) => {
        const key = sortKey === 'ort' ? 'ort' : 'name'
        const cmp = String(a[key]).localeCompare(String(b[key]))
        return sortDirection === 'desc' ? -cmp : cmp
      })
    return (
      <div data-testid="house-table">
        <div data-testid="filter-value">{filter}</div>
        <div data-testid="search-value">{searchQuery}</div>
        <div data-testid="city-filter-value">{(cityFilter ?? []).join(',')}</div>
        <div data-testid="sort-value">{`${sortKey}:${sortDirection}`}</div>
        <div data-testid="houses-count">{visible.length}</div>
        <button onClick={() => onSortChange?.('rent', 'desc')} data-testid="header-sort">Header sort</button>
        {visible.map((house: House) => (
          <div key={house.id} data-testid={`house-${house.id}`}>
            <span>{house.name}</span>
            <button onClick={() => onEdit(house)} data-testid={`edit-${house.id}`}>Edit</button>
          </div>
        ))}
        <button onClick={() => onSelectionChange?.(new Set(['1']))} data-testid="select-1">Select</button>
        <button onClick={() => reloadRef?.current?.()} data-testid="reload-table">Reload</button>
      </div>
    )
  },
}));

const mockStart = starteLoeschenMitKautionen as jest.Mock;

// Die Suche ist ein Icon in der Top-Bar, das sich beim Klick zum Eingabefeld öffnet
const openSearch = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Suchen' }));
  return screen.getByTestId('search-input');
};
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
    it('renders the view switch as buttons with the houses view active', () => {
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      expect(screen.getByRole('button', { name: 'Häuser' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Übersicht' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('renders the KPIs in the rail', () => {
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      expect(screen.getByText('Häuser gesamt')).toBeInTheDocument();
      expect(screen.getByText('Wohnungen gesamt')).toBeInTheDocument();
      expect(screen.getByText('Freie Wohnungen')).toBeInTheDocument();
    });

    it('renders add house button', () => {
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      const addButton = screen.getByRole('button', { name: /Haus hinzufügen/i });
      expect(addButton).toBeInTheDocument();
    });

    it('renders the filter entries with counts', () => {
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      expect(screen.getByTestId('filter-all')).toHaveTextContent('Alle Häuser');
      expect(screen.getByTestId('filter-all')).toHaveTextContent('2');
      expect(screen.getByTestId('filter-full')).toHaveTextContent('Voll belegt');
      expect(screen.getByTestId('filter-full')).toHaveTextContent('1');
      expect(screen.getByTestId('filter-vacant')).toHaveTextContent('Mit freien Wohnungen');
      expect(screen.getByTestId('filter-vacant')).toHaveTextContent('1');
    });

    it('renders the breadcrumb and the toolbar controls in the top bar', async () => {
      const user = userEvent.setup();
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      expect(screen.getByText('Objekte')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Filter' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sortiert nach Name/ })).toBeInTheDocument();
      // Die Suche ist ein Icon, das sich zum Feld öffnet
      expect(screen.queryByTestId('search-input')).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Suchen' }));
      expect(screen.getByTestId('search-input')).toHaveAttribute('placeholder', 'Häuser suchen…');
    });

    it('renders house table component', () => {
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      expect(screen.getByTestId('house-table')).toBeInTheDocument();
    });

    it('does not render the old card heading', () => {
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      expect(screen.queryByText('Hausverwaltung')).not.toBeInTheDocument();
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
      expect(fullFilterButton).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('filter-all')).toHaveAttribute('aria-pressed', 'false');
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

  describe('Toolbar filter menu', () => {
    const openFilterMenu = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(screen.getByRole('button', { name: 'Filter' }));
      return screen.findByRole('menu');
    };

    it('lists Belegung and the unique cities with counts, sorted alphabetically', async () => {
      const user = userEvent.setup();
      const houses: House[] = [
        ...mockHouses,
        { id: '3', name: 'Haus Gamma', ort: 'Berlin', totalApartments: 1, freeApartments: 0 },
        { id: '4', name: 'Haus Delta', ort: 'Ärgste Stadt', totalApartments: 1, freeApartments: 0 },
        { id: '5', name: 'Haus Epsilon', ort: '', totalApartments: 1, freeApartments: 0 },
      ];
      render(<HaeuserClientView enrichedHaeuser={houses} />);

      const menu = await openFilterMenu(user);
      const items = within(menu).getAllByRole('menuitemcheckbox').map((i) => i.textContent);

      expect(within(menu).getByText('Belegung')).toBeInTheDocument();
      expect(items).toEqual(['Voll belegt4', 'Mit freien Wohnungen1', 'Ärgste Stadt1', 'Berlin2', 'München1']);
    });

    it('narrows the table to the selected city and shows the active filter count', async () => {
      const user = userEvent.setup();
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      const menu = await openFilterMenu(user);
      await user.click(within(menu).getByRole('menuitemcheckbox', { name: /München/ }));

      expect(screen.getByTestId('city-filter-value')).toHaveTextContent('München');
      expect(screen.queryByTestId('house-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('house-2')).toBeInTheDocument();

      // Menü schließen: der Trigger zeigt die Zahl aktiver Gruppen
      await user.keyboard('{Escape}');
      expect(screen.getByRole('button', { name: 'Filter' })).toHaveTextContent('1');
    });

    it('supports several cities at once', async () => {
      const user = userEvent.setup();
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      const menu = await openFilterMenu(user);
      await user.click(within(menu).getByRole('menuitemcheckbox', { name: /München/ }));
      await user.click(within(menu).getByRole('menuitemcheckbox', { name: /Berlin/ }));

      expect(screen.getByTestId('city-filter-value')).toHaveTextContent('München,Berlin');
      expect(screen.getByTestId('houses-count')).toHaveTextContent('2');
    });

    it('shares the Belegung state with the rail quick views', async () => {
      const user = userEvent.setup();
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      const menu = await openFilterMenu(user);
      await user.click(within(menu).getByRole('menuitemcheckbox', { name: /Voll belegt/ }));

      expect(screen.getByTestId('filter-value')).toHaveTextContent('full');
      expect(screen.getByTestId('filter-full')).toHaveAttribute('aria-pressed', 'true');

      // Wieder abwählen = kein Filter
      await user.click(within(menu).getByRole('menuitemcheckbox', { name: /Voll belegt/ }));
      expect(screen.getByTestId('filter-value')).toHaveTextContent('all');
      expect(screen.getByTestId('filter-all')).toHaveAttribute('aria-pressed', 'true');
    });

    it('reflects a rail quick view in the menu', async () => {
      const user = userEvent.setup();
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      await user.click(screen.getByTestId('filter-vacant'));
      const menu = await openFilterMenu(user);

      expect(within(menu).getByRole('menuitemcheckbox', { name: /Mit freien Wohnungen/ })).toBeChecked();
      expect(within(menu).getByRole('menuitemcheckbox', { name: /Voll belegt/ })).not.toBeChecked();
    });

    it('resets Belegung and Ort', async () => {
      const user = userEvent.setup();
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      const menu = await openFilterMenu(user);
      await user.click(within(menu).getByRole('menuitemcheckbox', { name: /Voll belegt/ }));
      await user.click(within(menu).getByRole('menuitemcheckbox', { name: /Berlin/ }));
      await user.click(within(menu).getByRole('menuitem', { name: 'Filter zurücksetzen' }));

      expect(screen.getByTestId('filter-value')).toHaveTextContent('all');
      expect(screen.getByTestId('city-filter-value')).toHaveTextContent('');
      expect(screen.getByTestId('houses-count')).toHaveTextContent('2');
    });
  });

  describe('Toolbar sort menu', () => {
    const openSortMenu = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(screen.getByRole('button', { name: /Sortiert nach/ }));
      return screen.findByRole('menu');
    };

    const houseOrder = () => screen.getAllByTestId(/^house-\d+$/).map((el) => el.textContent?.replace('Edit', ''));

    it('starts with name ascending and offers all six sort keys', async () => {
      const user = userEvent.setup();
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      expect(screen.getByTestId('sort-value')).toHaveTextContent('name:asc');
      const menu = await openSortMenu(user);
      const labels = within(menu).getAllByRole('menuitemradio').map((i) => i.textContent);
      expect(labels).toEqual(['Name', 'Ort', 'Größe', 'Miete', 'Miete pro m²', 'Status', 'Aufsteigend', 'Absteigend']);
    });

    it('changes the sort key and the order', async () => {
      const user = userEvent.setup();
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);
      expect(houseOrder()).toEqual(['Haus Alpha', 'Haus Beta']);

      const menu = await openSortMenu(user);
      await user.click(within(menu).getByRole('menuitemradio', { name: 'Ort' }));
      expect(screen.getByTestId('sort-value')).toHaveTextContent('ort:asc');
      expect(houseOrder()).toEqual(['Haus Alpha', 'Haus Beta']);

      await user.click(screen.getByRole('button', { name: /Sortiert nach Ort/ }));
      await user.click(within(await screen.findByRole('menu')).getByRole('menuitemradio', { name: 'Absteigend' }));
      expect(screen.getByTestId('sort-value')).toHaveTextContent('ort:desc');
      expect(houseOrder()).toEqual(['Haus Beta', 'Haus Alpha']);
    });

    it('takes over a sort change coming from the table header', async () => {
      const user = userEvent.setup();
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      await user.click(screen.getByTestId('header-sort'));

      expect(screen.getByTestId('sort-value')).toHaveTextContent('rent:desc');
      expect(screen.getByRole('button', { name: /Sortiert nach Miete$/ })).toBeInTheDocument();
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

      const searchInput = await openSearch(user);
      await user.type(searchInput, 'Berlin');

      expect(screen.getByTestId('search-value')).toHaveTextContent('Berlin');
    });

    it('can clear search query', async () => {
      const user = userEvent.setup();
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      const searchInput = await openSearch(user);
      await user.type(searchInput, 'test');
      expect(screen.getByTestId('search-value')).toHaveTextContent('test');

      await user.click(screen.getByRole('button', { name: 'Suche leeren' }));
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

    it('labels the button "Neues Haus" and completes the onboarding step', async () => {
      const user = userEvent.setup();
      const completeStep = jest.fn();
      const getStateSpy = jest
        .spyOn(useOnboardingStore, 'getState')
        .mockReturnValue({ completeStep } as unknown as ReturnType<typeof useOnboardingStore.getState>);
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      const addButton = screen.getByRole('button', { name: 'Haus hinzufügen' });
      expect(addButton).toHaveTextContent('Neues Haus');
      expect(addButton).toHaveAttribute('id', 'create-object-btn');
      await user.click(addButton);

      expect(completeStep).toHaveBeenCalledWith('create-house-start');
      expect(mockOpenHouseModal).toHaveBeenCalledWith(undefined, expect.any(Function));
      getStateSpy.mockRestore();
    });

    it('is disabled without permission, shows the tooltip and does not open the modal', async () => {
      const user = userEvent.setup();
      render(<HaeuserClientView enrichedHaeuser={mockHouses} canCreate={false} />);

      const addButton = screen.getByRole('button', { name: 'Haus hinzufügen' });
      expect(addButton).toBeDisabled();
      await user.click(addButton);
      expect(mockOpenHouseModal).not.toHaveBeenCalled();

      await user.hover(addButton.parentElement as HTMLElement);
      expect((await screen.findAllByText('Keine Berechtigung zum Erstellen')).length).toBeGreaterThan(0);
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

      expect(mockOpenHouseModal).toHaveBeenCalledWith(mockHouses[0], expect.any(Function), true);
    });

    it('passes canDelete=false to openHouseModal when user lacks delete permission', async () => {
      const user = userEvent.setup();
      render(<HaeuserClientView enrichedHaeuser={mockHouses} canDelete={false} />);

      const editButton = screen.getByTestId('edit-1');
      await user.click(editButton);

      expect(mockOpenHouseModal).toHaveBeenCalledWith(mockHouses[0], expect.any(Function), false);
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

  describe('Layout', () => {
    it('has correct layout structure', () => {
      const { container } = render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass('flex', 'flex-col');
    });

    it('renders the table directly without a card wrapper', () => {
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      const table = screen.getByTestId('house-table');
      expect(table.parentElement?.className).not.toMatch(/shadow-/);
    });
  });

  describe('View switch', () => {
    it('switches to the overview and hides filters and search', async () => {
      const user = userEvent.setup();
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      await user.click(screen.getByRole('button', { name: 'Übersicht' }));

      expect(screen.getByRole('button', { name: 'Übersicht' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.queryByTestId('house-table')).not.toBeInTheDocument();
      expect(screen.queryByTestId('filter-all')).not.toBeInTheDocument();
      expect(screen.queryByTestId('search-input')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Filter' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Suchen' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Haus hinzufügen/i })).toBeInTheDocument();
      // KPIs bleiben in der Rail sichtbar, die Übersicht zeigt ihre eigenen Kennzahlen
      expect(screen.getByText('Häuser gesamt')).toBeInTheDocument();
      expect(screen.getByText('Ø Hausgröße')).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('handles empty houses array', () => {
      render(<HaeuserClientView enrichedHaeuser={[]} />);

      expect(screen.getByTestId('houses-count')).toHaveTextContent('0');
      expect(screen.getByRole('button', { name: 'Häuser' })).toBeInTheDocument();
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
      const searchInput = await openSearch(user);
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
      const searchInput = await openSearch(user);
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

  describe('Selection pill', () => {
    it('appears at the bottom once a row is selected and clears the selection', async () => {
      const user = userEvent.setup();
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);

      expect(screen.queryByRole('toolbar', { name: 'Aktionen für die Auswahl' })).not.toBeInTheDocument();
      await user.click(screen.getByTestId('select-1'));

      const pill = screen.getByRole('toolbar', { name: 'Aktionen für die Auswahl' });
      expect(pill).toHaveTextContent('1 Haus ausgewählt');
      expect(screen.getByRole('button', { name: 'Exportieren' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Auswahl aufheben' }));
      expect(screen.queryByRole('toolbar', { name: 'Aktionen für die Auswahl' })).not.toBeInTheDocument();
    });

    it('disables deleting without permission', async () => {
      const user = userEvent.setup();
      render(<HaeuserClientView enrichedHaeuser={mockHouses} canDelete={false} />);

      await user.click(screen.getByTestId('select-1'));
      expect(screen.getByRole('button', { name: /Löschen \(1\)/ })).toBeDisabled();
    });
  });

  describe('Bulk delete with Kautionen overview', () => {
    const mockFetch = global.fetch as jest.Mock;

    const waehleUndKlickeLoeschen = async (user: ReturnType<typeof userEvent.setup>) => {
      render(<HaeuserClientView enrichedHaeuser={mockHouses} />);
      await user.click(screen.getByTestId('select-1'));
      await user.click(screen.getByRole('button', { name: /Löschen \(1\)/ }));
    };

    beforeEach(() => {
      mockFetch.mockClear();
      mockFetch.mockImplementation(() =>
        Promise.resolve(Response.json({ successCount: 1, reasons: [] }))
      );
    });

    it('loads the impact first, then asks the usual question and sends only the IDs', async () => {
      const user = userEvent.setup();
      await waehleUndKlickeLoeschen(user);

      await user.click(await screen.findByRole('button', { name: '1 Häuser löschen' }));

      await waitFor(() => expect(mockFetch).toHaveBeenCalledWith('/api/haeuser/bulk-delete', expect.any(Object)));
      expect(mockStart).toHaveBeenCalledWith('Haeuser', ['1'], expect.any(Object));
      expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ ids: ['1'] });
      // Nach einer Löschung wird die Auswahl zurückgesetzt
      await waitFor(() => expect(screen.queryByRole('button', { name: /Löschen \(1\)/ })).not.toBeInTheDocument());
    });

    it('with booked deposits: no second question, the confirmed overview sends the IDs', async () => {
      mockStart.mockImplementationOnce(async (_tabelle, _ids, handlers) => handlers.loeschen());
      await waehleUndKlickeLoeschen(userEvent.setup());

      await waitFor(() => expect(mockFetch).toHaveBeenCalledWith('/api/haeuser/bulk-delete', expect.any(Object)));
      expect(screen.queryByRole('button', { name: '1 Häuser löschen' })).not.toBeInTheDocument();
      expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ ids: ['1'] });
      await waitFor(() => expect(screen.queryByRole('button', { name: /Löschen \(1\)/ })).not.toBeInTheDocument());
    });

    it('deletes nothing, shows no question and keeps the selection when the overview is cancelled', async () => {
      mockStart.mockImplementationOnce(async () => undefined);
      await waehleUndKlickeLoeschen(userEvent.setup());

      await waitFor(() => expect(mockStart).toHaveBeenCalledWith('Haeuser', ['1'], expect.any(Object)));
      expect(mockFetch).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: '1 Häuser löschen' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Löschen \(1\)/ })).toBeInTheDocument();
    });
  });
});
