import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MieterClientView from './client-wrapper';
import { useModalStore } from '@/hooks/use-modal-store';
import type { Tenant } from '@/types/Tenant';
import type { Wohnung } from '@/types/Wohnung';
import type { BewerberListenEintrag } from '@/app/bewerber-actions';
import { toast } from '@/hooks/use-toast';

// Mock dependencies
jest.mock('@/hooks/use-modal-store');
// Die Sammellöschung lädt beim Klick auf "Löschen" zuerst die Auswirkung auf Kautionen (Server Action): hier ohne betroffene Kautionen (übliche Frage).
jest.mock('@/lib/kautionen-loeschen', () => ({
  starteLoeschenMitKautionen: jest.fn(async (_tabelle, _ids, handlers) => handlers.einfach()),
}));
// Kaution (GH-6): Feature Flag `advanced-kautionsmanagment`, standardmäßig an (einzelne Tests schalten ihn aus).
let mockKautionFlagAktiv = true;
let mockKautionFlagGeladen = true;
jest.mock('@/hooks/use-kaution-flag', () => ({
  useKautionenSichtbar: (hatModulrecht: boolean) => hatModulrecht && mockKautionFlagAktiv,
  useKautionFlagGeladen: () => mockKautionFlagGeladen,
}));
const mockCompleteStep = jest.fn();
jest.mock('@/hooks/use-onboarding-store', () => ({
  useOnboardingStore: Object.assign(
    jest.fn(() => ({ getState: () => ({ completeStep: mockCompleteStep }) })),
    { getState: jest.fn(() => ({ completeStep: mockCompleteStep })) }
  ),
}));
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
    dismiss: jest.fn(),
    toasts: [],
  }),
  toast: jest.fn(),
}));
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
    },
  })),
}));

// Router mit gemeinsamer `refresh`-Funktion: Die Massen-Aktionsleiste lädt die Liste darüber neu.
const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: mockRefresh }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
  redirect: jest.fn(),
  unstable_rethrow: jest.fn(),
}));

// Start-Tab der Seite (Standard "mieter"); der Wechsel läuft über echten State, der echte Hook würde die (hier statische) URL zurücklesen.
let mockCurrentTab: 'mieter' | 'overview' | 'bewerber' = 'mieter';
jest.mock('@/hooks/use-tab-params', () => {
  const { useState: useReactState } = jest.requireActual('react');
  return { useTabParams: () => useReactState(mockCurrentTab) };
});

// Die Diagramme der Übersicht sind für diese Tests unerheblich (recharts braucht im jsdom ein Layout).
jest.mock('@/components/dashboard/dashboard-charts', () => ({
  TenantsDonutChart: () => <div data-testid="tenants-donut-chart" />,
}));
jest.mock('@/components/dashboard/dashboard-charts-wrapper', () => ({
  TenantFluctuationChart: () => <div data-testid="tenant-fluctuation-chart" />,
}));

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>;

// Der Kautionseintrag öffnet über den Hook (Auswahl bei mehreren Kautionen); hier wird nur der Aufruf geprüft.
const mockOeffneKaution = jest.fn();
jest.mock('@/hooks/use-kaution-oeffnen', () => ({
  useKautionOeffnen: () => mockOeffneKaution,
}));

// Bewerber (GH-30): kommen über bewerberLadenAction, nicht aus den Mieter-Zeilen. Der Bewerber-Tab hängt am Flag.
const mockBewerberLaden = jest.fn();
jest.mock('@/app/bewerber-actions', () => ({
  bewerberLadenAction: (...args: unknown[]) => mockBewerberLaden(...args),
  bewerberAlleLoeschenAction: (...args: unknown[]) => mockBewerberAlleLoeschen(...args),
}));
const mockBewerberAlleLoeschen = jest.fn();
let mockApplicantsTab = false;
let mockMailImport = false;
jest.mock('posthog-js/react', () => ({
  useFeatureFlagEnabled: (name: string) => {
    if (name === 'applicants-tab') return mockApplicantsTab;
    if (name === 'applicants-mail-import') return mockMailImport;
    return false;
  },
}));
// Das Import-Fenster ist hier nur ein Platzhalter, der sein `open` zeigt
jest.mock('@/components/tenants/applicant-import-modal', () => ({
  ApplicantImportModal: ({ open }: { open: boolean }) => (open ? <div role="dialog" aria-label="Import-Fenster" /> : null),
}));

describe('MieterClientView - Layout Changes', () => {
  const mockOpenTenantModal = jest.fn();
  const mockSetCanViewKautionen = jest.fn();
  const mockServerAction = jest.fn();

  const mockTenants: Tenant[] = [
    {
      id: '1',
      name: 'John Doe',
      wohnung_id: 'w1',
      einzug: '2023-01-01',
      auszug: undefined,
      email: 'john@example.com',
      telefonnummer: '123456789',
      notiz: 'Test note',
      nebenkosten: []
    },
    {
      id: '2',
      name: 'Jane Smith',
      wohnung_id: 'w2',
      einzug: '2023-02-01',
      auszug: '2023-12-01',
      email: 'jane@example.com',
      telefonnummer: '987654321',
      notiz: '',
      nebenkosten: []
    }
  ];

  const mockWohnungen: Wohnung[] = [
    {
      id: 'w1',
      name: 'Apartment 1',
      groesse: 50,
      miete: 800,
      status: 'vermietet',
      Haeuser: { name: 'House 1' },
      haus_id: 'h1'
    },
    {
      id: 'w2',
      name: 'Apartment 2',
      groesse: 75,
      miete: 1200,
      status: 'frei',
      Haeuser: { name: 'House 2' },
      haus_id: 'h2'
    }
  ];

  const defaultProps = {
    initialTenants: mockTenants,
    initialWohnungen: mockWohnungen,
    serverAction: mockServerAction,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOpenTenantModal.mockReset();
    mockCurrentTab = 'mieter';
    mockKautionFlagAktiv = true;
    mockKautionFlagGeladen = true;
    mockUseModalStore.mockReturnValue({
      openTenantModal: mockOpenTenantModal,
      setCanViewKautionen: mockSetCanViewKautionen,
    } as any);
  });

  // Zeilen der Tabelle (ohne Kopfzeile) als Namen in Anzeigereihenfolge; offene Menüs blenden die Tabelle für Rollenabfragen aus
  const rowNames = () =>
    screen
      .getAllByRole('row', { hidden: true })
      .slice(1)
      .map((row) => within(row).queryByRole('checkbox', { hidden: true })?.getAttribute('aria-label')?.replace(/^Mieter (.*) auswählen$/, '$1'));

  // Die Suche ist ein Icon in der Top-Bar, das sich beim Klick zum Eingabefeld öffnet
  const openSearch = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('button', { name: 'Suchen' }));
    return screen.getByTestId('search-input');
  };

  describe('Layout in the dashboard shell', () => {
    it('renders without the old page header, card heading and KPI row', () => {
      render(<MieterClientView {...defaultProps} />);

      expect(screen.queryByRole('heading', { level: 1, name: 'Mieter' })).not.toBeInTheDocument();
      expect(screen.queryByText('Mieterverwaltung')).not.toBeInTheDocument();
      expect(screen.queryByText('Verwalten Sie hier alle Ihre Mieter')).not.toBeInTheDocument();
      // Die Rail trägt den Seitentitel
      expect(screen.getByRole('heading', { name: 'Mieter' })).toBeInTheDocument();
    });

    it('fills the main area and puts the table directly under the top bar without a card', () => {
      const { container } = render(<MieterClientView {...defaultProps} />);

      expect(container.firstChild).toHaveClass('flex', 'flex-col', 'min-h-full');
      expect(container.firstChild).not.toHaveClass('p-4');
      const table = screen.getByRole('table');
      expect(table.closest('[class*="shadow-"]')).toBeNull();
      expect(table.closest('.p-4')).toHaveClass('sm:p-6');
    });

    it('shows the breadcrumb and the toolbar controls in the top bar', () => {
      render(<MieterClientView {...defaultProps} />);

      const bar = screen.getByRole('banner');
      expect(bar).toHaveTextContent('Objekte');
      expect(bar).toHaveTextContent('Mieter');
      expect(within(bar).getByRole('button', { name: 'Filter' })).toBeInTheDocument();
      expect(within(bar).getByRole('button', { name: /Sortiert nach Name/ })).toBeInTheDocument();
      expect(within(bar).getByRole('button', { name: 'Suchen' })).toBeInTheDocument();
      expect(within(bar).getByRole('button', { name: 'Mieter hinzufügen' })).toBeInTheDocument();
    });

    it('opens the search from the icon with the Mieter placeholder', async () => {
      const user = userEvent.setup();
      render(<MieterClientView {...defaultProps} />);

      expect(screen.queryByTestId('search-input')).not.toBeInTheDocument();
      const input = await openSearch(user);
      expect(input).toHaveAttribute('placeholder', 'Mieter suchen…');
    });

    it('handles an empty tenant list and an empty Wohnungen list', () => {
      const { unmount } = render(<MieterClientView {...defaultProps} initialTenants={[]} />);
      expect(screen.getByText('Keine Mieter gefunden.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Mieter hinzufügen' })).toBeInTheDocument();
      unmount();

      render(<MieterClientView {...defaultProps} initialWohnungen={[]} />);
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  describe('Rail', () => {
    it('renders the view switch as buttons with the Mieter view active and no Bewerber without the flag', () => {
      render(<MieterClientView {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Mieter' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Übersicht' })).toHaveAttribute('aria-pressed', 'false');
      expect(screen.queryByRole('button', { name: 'Bewerber' })).not.toBeInTheDocument();
    });

    it('renders the KPIs of the tab in the rail', () => {
      render(<MieterClientView {...defaultProps} />);

      const kpi = (label: string) => screen.getByText(label).parentElement as HTMLElement;
      expect(kpi('Mieter gesamt')).toHaveTextContent('2');
      expect(kpi('Aktiv / Ehemalig')).toHaveTextContent('1 / 1');
      expect(kpi('Ø Nebenkosten')).toHaveTextContent('0,00');
      expect(kpi('Ø Nebenkosten')).toHaveTextContent('€');
    });

    it('averages the latest Nebenkosten of each tenant with two decimals', () => {
      const tenants: Tenant[] = [
        { ...mockTenants[0], nebenkosten: [{ id: 'n1', date: '2023-01-01', amount: '100' }] },
        { ...mockTenants[1], nebenkosten: [{ id: 'n2', date: '2023-01-01', amount: '151.5' }] },
      ];
      render(<MieterClientView {...defaultProps} initialTenants={tenants} />);

      expect(screen.getByText('Ø Nebenkosten').parentElement).toHaveTextContent('125,75');
    });

    it('renders the filter entries with counts from the table predicate', () => {
      render(<MieterClientView {...defaultProps} />);

      expect(screen.getByTestId('filter-current')).toHaveTextContent('Aktuelle Mieter');
      expect(screen.getByTestId('filter-current')).toHaveTextContent('1');
      expect(screen.getByTestId('filter-previous')).toHaveTextContent('Vorherige Mieter');
      expect(screen.getByTestId('filter-previous')).toHaveTextContent('1');
      expect(screen.getByTestId('filter-all')).toHaveTextContent('Alle Mieter');
      expect(screen.getByTestId('filter-all')).toHaveTextContent('2');
    });

    it('counts a tenant who moves out today as previous, one who moves out tomorrow as current', () => {
      const iso = (offsetDays: number) => {
        const d = new Date();
        d.setDate(d.getDate() + offsetDays);
        return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
      };
      const tenants: Tenant[] = [
        { ...mockTenants[0], id: 'a', auszug: iso(0) },
        { ...mockTenants[0], id: 'b', auszug: iso(1) },
        { ...mockTenants[0], id: 'c', auszug: undefined },
      ];
      render(<MieterClientView {...defaultProps} initialTenants={tenants} />);

      expect(screen.getByTestId('filter-current')).toHaveTextContent('2');
      expect(screen.getByTestId('filter-previous')).toHaveTextContent('1');
      expect(screen.getByTestId('filter-all')).toHaveTextContent('3');
    });

    it('starts on "Aktuelle Mieter" and switches the table with the rail filters', async () => {
      const user = userEvent.setup();
      render(<MieterClientView {...defaultProps} />);

      expect(screen.getByTestId('filter-current')).toHaveAttribute('aria-pressed', 'true');
      expect(rowNames()).toEqual(['John Doe']);

      await user.click(screen.getByTestId('filter-previous'));
      expect(screen.getByTestId('filter-previous')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('filter-current')).toHaveAttribute('aria-pressed', 'false');
      expect(rowNames()).toEqual(['Jane Smith']);

      await user.click(screen.getByTestId('filter-all'));
      expect(rowNames()).toEqual(['Jane Smith', 'John Doe']);
    });

    it('hides filters and KPIs of the Mieter tab on the overview and keeps the view switch', async () => {
      const user = userEvent.setup();
      render(<MieterClientView {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: 'Übersicht' }));

      expect(screen.getByRole('button', { name: 'Übersicht' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Mieter' })).toHaveAttribute('aria-pressed', 'false');
      expect(screen.queryByTestId('filter-current')).not.toBeInTheDocument();
      expect(screen.queryByText('Mieter gesamt')).not.toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Filter' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Suchen' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Sortiert nach/ })).not.toBeInTheDocument();
      // Die Übersicht hat ihre eigenen Kennzahlen und die Aktion "Neuer Mieter"
      expect(screen.getByText('Auslastung')).toBeInTheDocument();
      expect(screen.getByRole('banner')).toHaveTextContent('Übersicht');
      expect(screen.getByRole('button', { name: 'Mieter hinzufügen' })).toBeInTheDocument();
    });

    it('resets the filter to "Aktuelle Mieter" and clears the selection when the view changes', async () => {
      const user = userEvent.setup();
      render(<MieterClientView {...defaultProps} />);

      await user.click(screen.getByTestId('filter-all'));
      await user.click(screen.getAllByRole('checkbox')[1]);
      expect(screen.getByRole('toolbar', { name: 'Aktionen für die Auswahl' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Übersicht' }));
      expect(screen.queryByRole('toolbar', { name: 'Aktionen für die Auswahl' })).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Mieter' }));
      expect(screen.getByTestId('filter-current')).toHaveAttribute('aria-pressed', 'true');
      expect(rowNames()).toEqual(['John Doe']);
    });

    it('opens the add modal with status "mieter" from the overview', async () => {
      mockCurrentTab = 'overview';
      const user = userEvent.setup();
      render(<MieterClientView {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: 'Mieter hinzufügen' }));

      expect(mockOpenTenantModal).toHaveBeenCalledWith({ status: 'mieter' }, mockWohnungen);
    });
  });

  describe('Toolbar filter menu', () => {
    const openFilterMenu = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(screen.getByRole('button', { name: 'Filter' }));
      return screen.findByRole('menu');
    };

    it('offers Aktuelle and Vorherige Mieter with counts; the default view shows no filter badge', async () => {
      const user = userEvent.setup();
      render(<MieterClientView {...defaultProps} />);

      // Aktuelle Mieter sind die Standardansicht und zählen nicht als gesetzter Filter
      expect(screen.getByRole('button', { name: 'Filter' })).not.toHaveTextContent('1');
      const menu = await openFilterMenu(user);

      expect(within(menu).getByText('Status')).toBeInTheDocument();
      expect(within(menu).getAllByRole('menuitemcheckbox').map((i) => i.textContent)).toEqual(['Aktuelle Mieter1', 'Vorherige Mieter1']);
      expect(within(menu).getByRole('menuitemcheckbox', { name: /Aktuelle Mieter/ })).toBeChecked();
    });

    it('shares the state with the rail filters and maps "nothing selected" to all', async () => {
      const user = userEvent.setup();
      render(<MieterClientView {...defaultProps} />);

      const menu = await openFilterMenu(user);
      await user.click(within(menu).getByRole('menuitemcheckbox', { name: /Vorherige Mieter/ }));
      expect(screen.getByTestId('filter-previous')).toHaveAttribute('aria-pressed', 'true');
      expect(rowNames()).toEqual(['Jane Smith']);

      // Wieder abwählen = alle Mieter
      await user.click(within(menu).getByRole('menuitemcheckbox', { name: /Vorherige Mieter/ }));
      expect(screen.getByTestId('filter-all')).toHaveAttribute('aria-pressed', 'true');
      expect(rowNames()).toEqual(['Jane Smith', 'John Doe']);
    });

    it('reflects a rail filter in the menu, counts it and resets to the default view', async () => {
      const user = userEvent.setup();
      render(<MieterClientView {...defaultProps} />);

      await user.click(screen.getByTestId('filter-previous'));
      expect(screen.getByRole('button', { name: 'Filter' })).toHaveTextContent('1');
      const menu = await openFilterMenu(user);
      expect(within(menu).getByRole('menuitemcheckbox', { name: /Vorherige Mieter/ })).toBeChecked();
      expect(within(menu).getByRole('menuitemcheckbox', { name: /Aktuelle Mieter/ })).not.toBeChecked();

      await user.click(within(menu).getByRole('menuitem', { name: 'Filter zurücksetzen' }));
      expect(screen.getByTestId('filter-current')).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Toolbar sort menu', () => {
    const openSortMenu = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(screen.getByRole('button', { name: /Sortiert nach/ }));
      return screen.findByRole('menu');
    };

    it('starts with name ascending and offers the five table sort keys', async () => {
      const user = userEvent.setup();
      render(<MieterClientView {...defaultProps} />);

      const menu = await openSortMenu(user);
      const labels = within(menu).getAllByRole('menuitemradio').map((i) => i.textContent);
      expect(labels).toEqual(['Name', 'E-Mail', 'Telefon', 'Wohnung', 'Nebenkosten', 'Aufsteigend', 'Absteigend']);
      expect(within(menu).getByRole('menuitemradio', { name: 'Name' })).toBeChecked();
      expect(within(menu).getByRole('menuitemradio', { name: 'Aufsteigend' })).toBeChecked();
    });

    it('changes the order of the table and shows it in the column header', async () => {
      const user = userEvent.setup();
      render(<MieterClientView {...defaultProps} />);
      await user.click(screen.getByTestId('filter-all'));
      expect(rowNames()).toEqual(['Jane Smith', 'John Doe']);

      const menu = await openSortMenu(user);
      await user.click(within(menu).getByRole('menuitemradio', { name: 'Absteigend' }));

      expect(rowNames()).toEqual(['John Doe', 'Jane Smith']);
      expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute('aria-sort', 'descending');
    });

    it('sorts by another key, here E-Mail', async () => {
      const user = userEvent.setup();
      const tenants: Tenant[] = [
        { ...mockTenants[0], name: 'Anna', email: 'zeta@example.com', auszug: undefined },
        { ...mockTenants[1], name: 'Zoe', email: 'alpha@example.com', auszug: undefined },
      ];
      render(<MieterClientView {...defaultProps} initialTenants={tenants} />);
      expect(rowNames()).toEqual(['Anna', 'Zoe']);

      const menu = await openSortMenu(user);
      await user.click(within(menu).getByRole('menuitemradio', { name: 'E-Mail' }));

      expect(rowNames()).toEqual(['Zoe', 'Anna']);
      expect(screen.getByRole('button', { name: /Sortiert nach E-Mail/ })).toBeInTheDocument();
    });

    it('takes over a sort change coming from the table header (toggle semantics)', async () => {
      const user = userEvent.setup();
      render(<MieterClientView {...defaultProps} />);
      await user.click(screen.getByTestId('filter-all'));

      // Gleiche Spalte: Richtung wechseln
      await user.click(within(screen.getByRole('columnheader', { name: /Name/ })).getByRole('button'));
      expect(rowNames()).toEqual(['John Doe', 'Jane Smith']);
      expect(screen.getByRole('button', { name: /Sortiert nach Name/ })).toBeInTheDocument();

      // Andere Spalte: aufsteigend
      await user.click(within(screen.getByRole('columnheader', { name: /E-Mail/ })).getByRole('button'));
      expect(rowNames()).toEqual(['Jane Smith', 'John Doe']);
      expect(screen.getByRole('button', { name: /Sortiert nach E-Mail/ })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /E-Mail/ })).toHaveAttribute('aria-sort', 'ascending');
    });
  });

  describe('Search functionality', () => {
    it('filters the table while typing and can clear the search', async () => {
      const user = userEvent.setup();
      render(<MieterClientView {...defaultProps} />);
      await user.click(screen.getByTestId('filter-all'));

      await user.type(await openSearch(user), 'jane');
      expect(rowNames()).toEqual(['Jane Smith']);

      await user.click(screen.getByRole('button', { name: 'Suche leeren' }));
      expect(rowNames()).toEqual(['Jane Smith', 'John Doe']);
    });
  });

  describe('Add tenant functionality', () => {
    it('labels the button "Neuer Mieter" and opens the modal with status mieter and the Wohnungen', async () => {
      const user = userEvent.setup();
      render(<MieterClientView {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: 'Mieter hinzufügen' });
      expect(addButton).toHaveTextContent('Neuer Mieter');
      await user.click(addButton);

      expect(mockOpenTenantModal).toHaveBeenCalledWith({ status: 'mieter' }, mockWohnungen);
    });

    it('collapses to the icon on narrow viewports', () => {
      render(<MieterClientView {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Mieter hinzufügen' })).toHaveClass('max-sm:w-8', 'max-sm:px-0');
    });

    it('is disabled without permission, shows the tooltip and does not open the modal', async () => {
      const user = userEvent.setup();
      render(<MieterClientView {...defaultProps} canCreate={false} />);

      const addButton = screen.getByRole('button', { name: 'Mieter hinzufügen' });
      expect(addButton).toBeDisabled();
      await user.click(addButton);
      expect(mockOpenTenantModal).not.toHaveBeenCalled();

      await user.hover(addButton.parentElement as HTMLElement);
      expect((await screen.findAllByText('Keine Berechtigung zum Erstellen')).length).toBeGreaterThan(0);
    });

    it('supports keyboard activation', async () => {
      const user = userEvent.setup();
      render(<MieterClientView {...defaultProps} />);

      screen.getByRole('button', { name: 'Mieter hinzufügen' }).focus();
      await user.keyboard('{Enter}');

      expect(mockOpenTenantModal).toHaveBeenCalled();
    });

    it('logs and survives an error while opening the modal', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockOpenTenantModal.mockImplementation(() => {
        throw new Error('Modal error');
      });
      const user = userEvent.setup();
      render(<MieterClientView {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: 'Mieter hinzufügen' }));

      expect(consoleSpy).toHaveBeenCalledWith('Error opening tenant modal:', expect.any(Error));
      expect(screen.getByRole('button', { name: 'Mieter hinzufügen' })).toBeInTheDocument();
      consoleSpy.mockRestore();
    });

    it('formats the tenant for the edit modal when a row is clicked', async () => {
      const user = userEvent.setup();
      render(<MieterClientView {...defaultProps} />);

      await user.click(screen.getByText('John Doe'));

      expect(mockOpenTenantModal).toHaveBeenCalledWith(
        expect.objectContaining({ id: '1', name: 'John Doe', wohnung_id: 'w1', einzug: '2023-01-01', status: 'mieter' }),
        mockWohnungen
      );
    });
  });

  describe('Selection pill', () => {
    const selectFirstRow = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(screen.getByRole('checkbox', { name: 'Mieter John Doe auswählen' }));
      return screen.getByRole('toolbar', { name: 'Aktionen für die Auswahl' });
    };

    it('appears once a row is selected, counts Mieter and clears the selection', async () => {
      const user = userEvent.setup();
      render(<MieterClientView {...defaultProps} />);

      expect(screen.queryByRole('toolbar', { name: 'Aktionen für die Auswahl' })).not.toBeInTheDocument();
      const pill = await selectFirstRow(user);

      expect(pill).toHaveTextContent('1 Mieter ausgewählt');
      expect(within(pill).getByRole('button', { name: 'Wohnung zuweisen' })).toBeEnabled();
      expect(within(pill).getByRole('button', { name: 'Exportieren' })).toBeInTheDocument();
      expect(within(pill).getByRole('button', { name: 'Löschen (1)' })).toBeEnabled();

      await user.click(screen.getByRole('button', { name: 'Auswahl aufheben' }));
      expect(screen.queryByRole('toolbar', { name: 'Aktionen für die Auswahl' })).not.toBeInTheDocument();
    });

    it('is the last child of the page root, behind the work area', async () => {
      const user = userEvent.setup();
      const { container } = render(<MieterClientView {...defaultProps} />);

      const pill = await selectFirstRow(user);

      expect(container.firstChild?.lastChild).toBe(pill.parentElement);
    });

    it('opens the Wohnung dialog and disables the action without edit permission', async () => {
      const user = userEvent.setup();
      const { unmount } = render(<MieterClientView {...defaultProps} />);

      const pill = await selectFirstRow(user);
      await user.click(within(pill).getByRole('button', { name: 'Wohnung zuweisen' }));
      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByText('Weisen Sie 1 ausgewähltem Mieter eine Wohnung zu.')).toBeInTheDocument();
      unmount();

      render(<MieterClientView {...defaultProps} canEdit={false} />);
      await user.click(screen.getByRole('checkbox', { name: 'Mieter John Doe auswählen' }));
      expect(screen.getByRole('button', { name: 'Wohnung zuweisen' })).toBeDisabled();
    });

    it('exports the selected tenants as CSV', async () => {
      const user = userEvent.setup();
      const createObjectURL = jest.fn(() => 'blob:export');
      const originalCreate = URL.createObjectURL;
      URL.createObjectURL = createObjectURL;
      const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      render(<MieterClientView {...defaultProps} />);

      const pill = await selectFirstRow(user);
      await user.click(within(pill).getByRole('button', { name: 'Exportieren' }));

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Export erfolgreich', description: '1 Einträge exportiert.' }));
      clickSpy.mockRestore();
      URL.createObjectURL = originalCreate;
    });

    it('disables deleting without permission', async () => {
      const user = userEvent.setup();
      render(<MieterClientView {...defaultProps} canDelete={false} />);

      await selectFirstRow(user);
      expect(screen.getByRole('button', { name: 'Löschen (1)' })).toBeDisabled();
    });
  });

  // Kautionsmanagement (GH-6): Anzeige und Menüeinträge hängen am Modulrecht `kautionen: ansehen`.
  describe('Kaution (GH-6)', () => {
    const tenantWithDeposit: Tenant = {
      id: 't-deposit',
      name: 'Kautions Mieter',
      status: 'mieter',
      wohnung_id: 'w1',
      einzug: '2023-01-01',
      kaution: {
        amount: 1500,
        paymentDate: '2023-01-01',
        status: 'Erhalten',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        kautionId: 'k-1',
        kontostand: 1500,
      },
    };
    const depositProps = { ...defaultProps, initialTenants: [tenantWithDeposit] };

    it('does not write the module right into the modal store (the dashboard layout owns it, independent of this page)', () => {
      const { rerender } = render(<MieterClientView {...defaultProps} />);
      rerender(<MieterClientView {...defaultProps} canViewKautionen />);

      expect(mockSetCanViewKautionen).not.toHaveBeenCalled();
    });

    it('offers the Kaution button in the tenant table only with the module right', () => {
      const { unmount } = render(<MieterClientView {...depositProps} />);
      expect(screen.queryByRole('button', { name: 'Kaution' })).not.toBeInTheDocument();
      unmount();

      render(<MieterClientView {...depositProps} canViewKautionen />);
      expect(screen.getByRole('button', { name: 'Kaution' })).toBeInTheDocument();
    });

    it('hides the Kaution button and the deposit card with the module right but without the feature flag', () => {
      mockKautionFlagAktiv = false;
      const { unmount } = render(<MieterClientView {...depositProps} canViewKautionen />);
      expect(screen.queryByRole('button', { name: 'Kaution' })).not.toBeInTheDocument();
      unmount();

      mockCurrentTab = 'overview';
      render(<MieterClientView {...depositProps} canViewKautionen />);
      expect(screen.getByText('KI-Bewerber Match-Score')).toBeInTheDocument();
      expect(screen.queryByText('Kaution Status & Rückzahlungen')).not.toBeInTheDocument();
    });

    it('holds the card slot with a skeleton while the flag loads (no layout shift), only with the module right', () => {
      mockKautionFlagAktiv = false;
      mockKautionFlagGeladen = false;
      mockCurrentTab = 'overview';
      const { unmount } = render(<MieterClientView {...depositProps} canViewKautionen />);
      expect(screen.getByRole('status', { name: 'Kautionsdaten werden geladen' })).toBeInTheDocument();
      expect(screen.queryByText('Kaution Status & Rückzahlungen')).not.toBeInTheDocument();
      unmount();

      render(<MieterClientView {...depositProps} />);
      expect(screen.queryByRole('status', { name: 'Kautionsdaten werden geladen' })).not.toBeInTheDocument();
    });

    it('shows neither skeleton nor card once the flag has loaded as off', () => {
      mockKautionFlagAktiv = false;
      mockKautionFlagGeladen = true;
      mockCurrentTab = 'overview';
      render(<MieterClientView {...depositProps} canViewKautionen />);
      expect(screen.queryByRole('status', { name: 'Kautionsdaten werden geladen' })).not.toBeInTheDocument();
      expect(screen.queryByText('Kaution Status & Rückzahlungen')).not.toBeInTheDocument();
    });

    it('hides the deposit card of the overview without the module right', () => {
      mockCurrentTab = 'overview';
      render(<MieterClientView {...depositProps} />);

      // Der Tab "Übersicht" ist gerendert, nur die Kautionskarte fehlt.
      expect(screen.getByText('KI-Bewerber Match-Score')).toBeInTheDocument();
      expect(screen.queryByText('Kaution Status & Rückzahlungen')).not.toBeInTheDocument();
      expect(screen.queryByText('Keine Kautionsdaten erfasst')).not.toBeInTheDocument();
      expect(screen.queryByText('Kautionsbestand nach Mieter')).not.toBeInTheDocument();
    });

    it('shows the deposit card of the overview with the module right and notes that amounts are target amounts', () => {
      mockCurrentTab = 'overview';
      render(<MieterClientView {...depositProps} canViewKautionen />);

      expect(screen.getByText('Kaution Status & Rückzahlungen')).toBeInTheDocument();
      expect(screen.getByText(/Soll-Betrag, nicht dem aktuellen Kontostand/)).toBeInTheDocument();
    });

    it('opens the deposit dialog from the overview with the tenant only (no deposit data from the list)', async () => {
      mockCurrentTab = 'overview';
      const user = userEvent.setup();
      render(<MieterClientView {...depositProps} canViewKautionen />);

      await user.click(screen.getByText('Kautions Mieter'));

      expect(mockOeffneKaution).toHaveBeenCalledTimes(1);
      const args = mockOeffneKaution.mock.calls[0];
      expect(args).toHaveLength(1);
      expect(args[0]).toMatchObject({ id: 't-deposit', name: 'Kautions Mieter' });
    });

    it('lets the deposit row of the overview be reached and opened with the keyboard (Enter and Space)', async () => {
      mockCurrentTab = 'overview';
      const user = userEvent.setup();
      render(<MieterClientView {...depositProps} canViewKautionen />);

      const zeile = screen.getByRole('button', { name: 'Kaution von Kautions Mieter öffnen' });
      expect(zeile).toHaveAttribute('tabindex', '0');

      zeile.focus();
      expect(zeile).toHaveFocus();
      await user.keyboard('{Enter}');
      expect(mockOeffneKaution).toHaveBeenCalledTimes(1);

      await user.keyboard(' ');
      expect(mockOeffneKaution).toHaveBeenCalledTimes(2);
      expect(mockOeffneKaution.mock.calls[1][0]).toMatchObject({ id: 't-deposit' });

      await user.keyboard('a'); // other keys do nothing
      expect(mockOeffneKaution).toHaveBeenCalledTimes(2);
    });
  });
});

// Löschen mehrerer Mieter (GH-6, Kautionsmanagement): Der tatsächlich genutzte Löschweg ist die Massen-Aktionsleiste.
// Sie lädt die Liste über die Seite neu (`onUpdate`), auch wenn die Datenbank einzelne Löschungen abgelehnt hat.
describe('MieterClientView - Mieter in der Liste löschen (GH-6)', () => {
  const defaultProps = {
    initialTenants: [
      { id: 't-1', name: 'Mieter Eins', wohnung_id: 'w1', einzug: '2023-01-01', auszug: undefined, nebenkosten: [] },
    ] as Tenant[],
    initialWohnungen: [] as Wohnung[],
    serverAction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentTab = 'mieter';
    mockUseModalStore.mockReturnValue({ openTenantModal: jest.fn(), openKautionModal: jest.fn() } as any);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ successCount: 1, errorCount: 1, reasons: ['Der Mieter hat eine hinterlegte Kaution und kann nicht gelöscht werden.'] }),
    }) as unknown as typeof fetch;
  });

  it('reloads the list through the router after a bulk delete with rejected tenants', async () => {
    const user = userEvent.setup();
    render(<MieterClientView {...defaultProps} />);

    await user.click(screen.getAllByRole('checkbox')[0]); // alle sichtbaren Mieter auswählen
    await user.click(await screen.findByRole('button', { name: /^Löschen \(\d+\)$/ }));
    await user.click(await screen.findByRole('button', { name: 'Löschen bestätigen' }));

    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
    expect(global.fetch).toHaveBeenCalledWith('/api/mieter/bulk-delete', expect.objectContaining({ method: 'POST' }));
  });
});

// Bewerber (GH-30): Mieter-Liste und Bewerber-Liste kommen aus getrennten Quellen.
describe('MieterClientView - Bewerber (GH-30)', () => {
  const bewerberListe = [
    {
      id: 'b-1',
      name: 'Bewerberin Probe',
      status: 'bewerber',
      bewerber_status: 'neu',
      bewerbung_score: 85,
    },
  ] as unknown as BewerberListenEintrag[];

  const mieterListe: Tenant[] = [
    { id: 'm-1', name: 'Mieter Probe', wohnung_id: 'w1', einzug: '2023-01-01', nebenkosten: [] },
  ];

  const props = {
    initialTenants: mieterListe,
    initialWohnungen: [] as Wohnung[],
    serverAction: jest.fn(),
  };
  const mockOpenTenantModal = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentTab = 'mieter';
    mockApplicantsTab = true;
    mockMailImport = false;
    mockBewerberLaden.mockResolvedValue({ success: true, data: bewerberListe });
    mockUseModalStore.mockReturnValue({
      openTenantModal: mockOpenTenantModal,
      openApplicantScoreModal: jest.fn(),
      openTenantMailTemplatesModal: jest.fn(),
      openMailPreviewModal: jest.fn(),
    } as any);
  });

  afterEach(() => {
    mockApplicantsTab = false;
    mockMailImport = false;
  });

  it('lädt die Bewerber über bewerberLadenAction und zeigt sie im Bewerber-Tab', async () => {
    mockCurrentTab = 'bewerber';
    render(<MieterClientView {...props} />);

    expect(await screen.findByText('Bewerberin Probe')).toBeInTheDocument();
    expect(mockBewerberLaden).toHaveBeenCalled();
    expect(screen.queryByText('Mieter Probe')).not.toBeInTheDocument();
  });

  it('zeigt im Mieter-Tab nur Mieter, nicht die Bewerber', async () => {
    render(<MieterClientView {...props} />);

    expect(screen.getByText('Mieter Probe')).toBeInTheDocument();
    await waitFor(() => expect(mockBewerberLaden).toHaveBeenCalled());
    // Das Ergebnis der Ladeaktion noch einarbeiten lassen, sonst läuft das State-Update in den nächsten Test
    await act(async () => {
      await mockBewerberLaden.mock.results[0].value;
    });
    expect(screen.queryByText('Bewerberin Probe')).not.toBeInTheDocument();
  });

  it('zeigt die Ansicht "Bewerber" in der Rail nur mit dem Flag und wechselt per Klick dorthin', async () => {
    const user = userEvent.setup();
    render(<MieterClientView {...props} />);

    expect(screen.getByRole('button', { name: 'Bewerber' })).toHaveAttribute('aria-pressed', 'false');
    await user.click(screen.getByRole('button', { name: 'Bewerber' }));

    expect(screen.getByRole('button', { name: 'Bewerber' })).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByText('Bewerberin Probe')).toBeInTheDocument();
    expect(screen.getByRole('banner')).toHaveTextContent('Bewerber');
  });

  it('zeigt im Bewerber-Tab nur die Bewerber-Kennzahl, keine Mieter-Filter und "Alle Bewerber löschen" unter "Verwalten"', async () => {
    mockCurrentTab = 'bewerber';
    render(<MieterClientView {...props} />);
    await screen.findByText('Bewerberin Probe');

    expect(screen.getByText('Bewerber gesamt').parentElement).toHaveTextContent('1');
    expect(screen.queryByText('Aktiv / Ehemalig')).not.toBeInTheDocument();
    expect(screen.queryByText('Ø Nebenkosten')).not.toBeInTheDocument();
    expect(screen.queryByTestId('filter-current')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Filter' })).not.toBeInTheDocument();
    expect(screen.getByText('Verwalten')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Alle Bewerber löschen' })).toHaveClass('text-destructive');
  });

  it('benennt im Bewerber-Tab Suche und Sortierung nach Bewerbern (Score statt Nebenkosten)', async () => {
    mockCurrentTab = 'bewerber';
    const user = userEvent.setup();
    render(<MieterClientView {...props} />);
    await screen.findByText('Bewerberin Probe');

    await user.click(screen.getByRole('button', { name: 'Suchen' }));
    expect(screen.getByTestId('search-input')).toHaveAttribute('placeholder', 'Bewerber suchen…');

    await user.click(screen.getByRole('button', { name: /Sortiert nach Name/ }));
    const labels = within(await screen.findByRole('menu')).getAllByRole('menuitemradio').map((i) => i.textContent);
    expect(labels).toEqual(['Name', 'E-Mail', 'Telefon', 'Wohnung', 'Score', 'Aufsteigend', 'Absteigend']);
  });

  it('löscht alle Bewerber über den Eintrag in der Rail erst nach Bestätigung', async () => {
    mockCurrentTab = 'bewerber';
    mockBewerberAlleLoeschen.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<MieterClientView {...props} />);
    await screen.findByText('Bewerberin Probe');

    await user.click(screen.getByRole('button', { name: 'Alle Bewerber löschen' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Alle Bewerber löschen?')).toBeInTheDocument();
    expect(mockBewerberAlleLoeschen).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Alle löschen' }));

    await waitFor(() => expect(mockBewerberAlleLoeschen).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Erfolg', description: 'Alle Bewerber wurden gelöscht.' }));
  });

  it('lässt "Alle Bewerber löschen" per Abbrechen unangetastet', async () => {
    mockCurrentTab = 'bewerber';
    const user = userEvent.setup();
    render(<MieterClientView {...props} />);
    await screen.findByText('Bewerberin Probe');

    await user.click(screen.getByRole('button', { name: 'Alle Bewerber löschen' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Abbrechen' }));

    expect(mockBewerberAlleLoeschen).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  describe('Aktion "Neuer Bewerber"', () => {
    const openMenu = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(screen.getByRole('button', { name: 'Bewerber hinzufügen' }));
      return screen.findByRole('menu');
    };

    it('ist ein Menü-Button mit dem Eintrag zum manuellen Anlegen, der den Dialog mit Status "bewerber" öffnet', async () => {
      mockCurrentTab = 'bewerber';
      const user = userEvent.setup();
      render(<MieterClientView {...props} />);
      await screen.findByText('Bewerberin Probe');

      expect(screen.getByRole('button', { name: 'Bewerber hinzufügen' })).toHaveTextContent('Neuer Bewerber');
      expect(screen.queryByRole('button', { name: 'Mieter hinzufügen' })).not.toBeInTheDocument();
      const menu = await openMenu(user);
      expect(within(menu).queryByRole('menuitem', { name: /Aus E-Mails importieren/ })).not.toBeInTheDocument();
      await user.click(within(menu).getByRole('menuitem', { name: /Bewerber hinzufügen/ }));

      await waitFor(() => expect(mockOpenTenantModal).toHaveBeenCalledWith({ status: 'bewerber' }, props.initialWohnungen));
    });

    it('bietet den Mail-Import nur hinter dem Feature Flag an und öffnet das Import-Fenster', async () => {
      mockCurrentTab = 'bewerber';
      mockMailImport = true;
      const user = userEvent.setup();
      render(<MieterClientView {...props} />);
      await screen.findByText('Bewerberin Probe');

      const menu = await openMenu(user);
      expect(screen.queryByRole('dialog', { name: 'Import-Fenster' })).not.toBeInTheDocument();
      await user.click(within(menu).getByRole('menuitem', { name: /Aus E-Mails importieren/ }));

      // Das Menü öffnet den Dialog erst im nächsten Tick (setTimeout 0, damit es zuerst schließt)
      expect(await screen.findByRole('dialog', { name: 'Import-Fenster', hidden: true })).toBeInTheDocument();
    });

    it('ist ohne Berechtigung gesperrt und zeigt den Tooltip', async () => {
      mockCurrentTab = 'bewerber';
      const user = userEvent.setup();
      render(<MieterClientView {...props} canCreate={false} />);
      await screen.findByText('Bewerberin Probe');

      const trigger = screen.getByRole('button', { name: 'Bewerber hinzufügen' });
      expect(trigger).toBeDisabled();
      await user.click(trigger);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();

      await user.hover(trigger.parentElement as HTMLElement);
      expect((await screen.findAllByText('Keine Berechtigung zum Erstellen')).length).toBeGreaterThan(0);
    });
  });

  it('zeigt in der Auswahl-Pille Bewerber, ohne "Wohnung zuweisen"', async () => {
    mockCurrentTab = 'bewerber';
    const user = userEvent.setup();
    render(<MieterClientView {...props} />);
    await screen.findByText('Bewerberin Probe');

    await user.click(screen.getByRole('checkbox', { name: 'Mieter Bewerberin Probe auswählen' }));

    const pill = screen.getByRole('toolbar', { name: 'Aktionen für die Auswahl' });
    expect(pill).toHaveTextContent('1 Bewerber ausgewählt');
    expect(within(pill).queryByRole('button', { name: 'Wohnung zuweisen' })).not.toBeInTheDocument();
    expect(within(pill).getByRole('button', { name: 'Exportieren' })).toBeInTheDocument();
    expect(within(pill).getByRole('button', { name: 'Löschen (1)' })).toBeInTheDocument();
  });
});
