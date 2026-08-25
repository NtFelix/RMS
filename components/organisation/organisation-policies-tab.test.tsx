import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { OrganisationPoliciesTab } from './organisation-policies-tab';
import type { OrganisationPolicy } from '@/lib/organisation-types';

// Mock policy-actions
jest.mock('@/lib/organisation/policy-actions', () => ({
  getPolicyAction: jest.fn(),
  createPolicyAction: jest.fn(),
  updatePolicyAction: jest.fn(),
  deletePolicyAction: jest.fn(),
}));

// Mock use-toast
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}));

describe('OrganisationPoliciesTab Component', () => {
  const mockPolicies: OrganisationPolicy[] = [
    {
      id: 'policy-1',
      organisation_id: 'org-123',
      name: 'Standard Mitarbeiter',
      berechtigungen: {
        module: { haeuser: ['ansehen'], mieter: ['ansehen'] },
        objekte: { haeuser: null },
      },
      erstellt_am: '2026-01-01T00:00:00Z',
    },
    {
      id: 'policy-2',
      organisation_id: 'org-123',
      name: 'Finanzverwalter',
      berechtigungen: {
        module: { finanzen: ['verwalten'] },
        objekte: { haeuser: null },
      },
      erstellt_am: '2026-01-02T00:00:00Z',
    },
  ];

  const mockHaeuser = [
    {
      id: 'haus-1',
      name: 'Musterstraße 1',
      wohnungen: [{ id: 'w-1', name: 'Wohnung 1' }],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders list of policies correctly', () => {
    render(
      <OrganisationPoliciesTab
        hasVerwaltenPermission={true}
        initialPolicies={mockPolicies}
        initialHaeuser={mockHaeuser}
      />
    );

    expect(screen.getByText('Standard Mitarbeiter')).toBeInTheDocument();
    expect(screen.getByText('Finanzverwalter')).toBeInTheDocument();
    expect(screen.getByText('Erstellen')).toBeInTheDocument();
  });

  it('filters policies based on search query', () => {
    render(
      <OrganisationPoliciesTab
        hasVerwaltenPermission={true}
        initialPolicies={mockPolicies}
        initialHaeuser={mockHaeuser}
      />
    );

    const searchInput = screen.getByPlaceholderText('Suchen nach Richtlinien...');
    fireEvent.change(searchInput, { target: { value: 'Finanz' } });

    expect(screen.getByText('Finanzverwalter')).toBeInTheDocument();
    expect(screen.queryByText('Standard Mitarbeiter')).not.toBeInTheDocument();
  });

  it('hides create button when user lacks verwalten permission', () => {
    render(
      <OrganisationPoliciesTab
        hasVerwaltenPermission={false}
        initialPolicies={mockPolicies}
        initialHaeuser={mockHaeuser}
      />
    );

    expect(screen.queryByText('Erstellen')).not.toBeInTheDocument();
    expect(screen.getByText('Standard Mitarbeiter')).toBeInTheDocument();
  });
});

