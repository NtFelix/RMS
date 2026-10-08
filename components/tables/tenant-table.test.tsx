import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TenantTable } from './tenant-table';
import { Tenant } from '@/types/Tenant';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: jest.fn(),
  }),
}));

// Mock useModalStore
const mockOpenApplicantScoreModal = jest.fn();
const mockOpenMailPreviewModal = jest.fn();
const mockOpenKautionModal = jest.fn();

jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: Object.assign(
    () => ({
      openApplicantScoreModal: mockOpenApplicantScoreModal,
      openMailPreviewModal: mockOpenMailPreviewModal,
    }),
    {
      getState: () => ({
        openKautionModal: mockOpenKautionModal,
      }),
    }
  ),
}));

describe('TenantTable Filtering', () => {
  const mockWohnungen = [
    { id: 'w1', name: 'Apartment 1' },
    { id: 'w2', name: 'Apartment 2' },
    { id: 'w3', name: 'Apartment 3' },
  ];

  const now = new Date();
  const todayStr = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('-');

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowStr = [
    tomorrow.getFullYear(),
    String(tomorrow.getMonth() + 1).padStart(2, '0'),
    String(tomorrow.getDate()).padStart(2, '0')
  ].join('-');

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = [
    yesterday.getFullYear(),
    String(yesterday.getMonth() + 1).padStart(2, '0'),
    String(yesterday.getDate()).padStart(2, '0')
  ].join('-');

  const mockTenants: Tenant[] = [
    {
      id: '1',
      name: 'Active Tenant',
      wohnung_id: 'w1',
      einzug: '2023-01-01',
      auszug: undefined,
    },
    {
      id: '2',
      name: 'Future Move-out Tenant',
      wohnung_id: 'w2',
      einzug: '2023-01-01',
      auszug: tomorrowStr,
    },
    {
      id: '3',
      name: 'Past Move-out Tenant',
      wohnung_id: 'w3',
      einzug: '2022-01-01',
      auszug: yesterdayStr,
    },
    {
      id: '4',
      name: 'Today Move-out Tenant',
      wohnung_id: 'w1',
      einzug: '2023-01-01',
      auszug: todayStr,
    },
  ];

  it('shows only tenants without auszug date OR with future auszug date when filter is "current"', () => {
    render(
      <TenantTable
        tenants={mockTenants}
        wohnungen={mockWohnungen}
        filter="current"
        searchQuery=""
      />
    );

    expect(screen.getByText('Active Tenant')).toBeInTheDocument();

    // Future move-out tenant should be visible in current filter
    expect(screen.getByText('Future Move-out Tenant')).toBeInTheDocument();

    // Past move-out tenant should NOT be visible
    expect(screen.queryByText('Past Move-out Tenant')).not.toBeInTheDocument();

    // Today move-out tenant should NOT be visible (they moved out today)
    expect(screen.queryByText('Today Move-out Tenant')).not.toBeInTheDocument();
  });

  it('shows only tenants with past or today auszug date when filter is "previous"', () => {
    render(
      <TenantTable
        tenants={mockTenants}
        wohnungen={mockWohnungen}
        filter="previous"
        searchQuery=""
      />
    );

    expect(screen.queryByText('Active Tenant')).not.toBeInTheDocument();
    expect(screen.queryByText('Future Move-out Tenant')).not.toBeInTheDocument();
    expect(screen.getByText('Past Move-out Tenant')).toBeInTheDocument();
    expect(screen.getByText('Today Move-out Tenant')).toBeInTheDocument();
  });
});

// Kautionsmanagement (GH-6): Der Button "Kaution" hängt am Modulrecht `kautionen: ansehen` (nicht mehr am
// Mieter-Bearbeitungsrecht) und übergibt dem Dialog nur noch den Mieter, keine Kautionsdaten.
describe('TenantTable Kaution (GH-6)', () => {
  const wohnungen = [{ id: 'w1', name: 'Apartment 1' }];
  const tenants: Tenant[] = [
    {
      id: '1',
      name: 'Active Tenant',
      wohnung_id: 'w1',
      einzug: '2023-01-01',
      auszug: undefined,
      // Altfeld (Kompat-Form aus get_mieter_details_overview): darf nicht an den Store weitergereicht werden.
      kaution: {
        amount: 1500,
        paymentDate: '2023-01-01',
        status: 'Erhalten',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
      },
    },
  ];

  beforeEach(() => {
    mockOpenKautionModal.mockClear();
  });

  it('shows no Kaution button without the module right (default)', () => {
    render(<TenantTable tenants={tenants} wohnungen={wohnungen} filter="all" searchQuery="" />);

    expect(screen.queryByRole('button', { name: 'Kaution' })).not.toBeInTheDocument();
  });

  it('shows no Kaution button without the module right even if the user may edit tenants', () => {
    render(<TenantTable tenants={tenants} wohnungen={wohnungen} filter="all" searchQuery="" canEdit canViewKautionen={false} />);

    expect(screen.queryByRole('button', { name: 'Kaution' })).not.toBeInTheDocument();
  });

  it('shows the Kaution button with the module right, also for users who may not edit tenants', () => {
    render(<TenantTable tenants={tenants} wohnungen={wohnungen} filter="all" searchQuery="" canEdit={false} canViewKautionen />);

    const button = screen.getByRole('button', { name: 'Kaution' });
    expect(button).toBeEnabled();
  });

  it('opens the deposit dialog with the tenant only (no deposit data from the list)', () => {
    render(<TenantTable tenants={tenants} wohnungen={wohnungen} filter="all" searchQuery="" canViewKautionen />);

    fireEvent.click(screen.getByRole('button', { name: 'Kaution' }));

    expect(mockOpenKautionModal).toHaveBeenCalledTimes(1);
    // exakt ein Argument: kein zweiter Parameter mit Kautionsdaten
    expect(mockOpenKautionModal).toHaveBeenCalledWith({ id: '1', name: 'Active Tenant', wohnung_id: 'w1' });
  });
});
