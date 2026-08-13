import React from 'react';
import { render, screen } from '@testing-library/react';
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
