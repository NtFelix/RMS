import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrganisationPoliciesTab } from './organisation-policies-tab';
import { setOrganisationMcpAccessAction } from '@/app/organisation-actions';
import { toast } from '@/hooks/use-toast';

// Mock organisation-actions
jest.mock('@/app/organisation-actions', () => ({
  setOrganisationMcpAccessAction: jest.fn(),
}));

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
  const mockPolicies = [
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
    (setOrganisationMcpAccessAction as jest.Mock).mockResolvedValue({
      success: true,
      data: { success: true },
    });
  });

  it('renders MCP Server Zugriff card with enabled status badge', () => {
    render(
      <OrganisationPoliciesTab
        hasVerwaltenPermission={true}
        initialPolicies={mockPolicies}
        initialHaeuser={mockHaeuser}
        organisationId="org-123"
        initialMcpZugriffAktiviert={true}
      />
    );

    expect(screen.getByText('MCP Server Zugriff (Model Context Protocol)')).toBeInTheDocument();
    expect(screen.getByText('Aktiviert')).toBeInTheDocument();
    expect(screen.getByText(/Ermöglicht autorisierten KI-Assistenten/i)).toBeInTheDocument();
  });

  it('renders disabled status badge when initialMcpZugriffAktiviert is false', () => {
    render(
      <OrganisationPoliciesTab
        hasVerwaltenPermission={true}
        initialPolicies={mockPolicies}
        initialHaeuser={mockHaeuser}
        organisationId="org-123"
        initialMcpZugriffAktiviert={false}
      />
    );

    expect(screen.getByText('Deaktiviert')).toBeInTheDocument();
  });

  it('toggles MCP access switch and invokes setOrganisationMcpAccessAction', async () => {
    render(
      <OrganisationPoliciesTab
        hasVerwaltenPermission={true}
        initialPolicies={mockPolicies}
        initialHaeuser={mockHaeuser}
        organisationId="org-123"
        initialMcpZugriffAktiviert={true}
      />
    );

    const switchElement = screen.getByRole('switch', { name: /MCP Server Zugriff umschalten/i });
    expect(switchElement).toBeInTheDocument();

    fireEvent.click(switchElement);

    await waitFor(() => {
      expect(setOrganisationMcpAccessAction).toHaveBeenCalledWith('org-123', false);
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'MCP Server Zugriff aktualisiert',
          variant: 'success',
        })
      );
    });
  });

  it('disables switch and shows restriction message when user lacks verwalten permission', () => {
    render(
      <OrganisationPoliciesTab
        hasVerwaltenPermission={false}
        initialPolicies={mockPolicies}
        initialHaeuser={mockHaeuser}
        organisationId="org-123"
        initialMcpZugriffAktiviert={true}
      />
    );

    const switchElement = screen.getByRole('switch', { name: /MCP Server Zugriff umschalten/i });
    expect(switchElement).toBeDisabled();
    expect(screen.getByText(/Nur Administratoren und Eigentümer können den MCP Server Zugriff verwalten/i)).toBeInTheDocument();
  });

  it('rolls back optimistic state and shows error toast when action returns success=false', async () => {
    (setOrganisationMcpAccessAction as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: { message: 'Keine Berechtigung' },
    });

    render(
      <OrganisationPoliciesTab
        hasVerwaltenPermission={true}
        initialPolicies={mockPolicies}
        initialHaeuser={mockHaeuser}
        organisationId="org-123"
        initialMcpZugriffAktiviert={true}
      />
    );

    const switchElement = screen.getByRole('switch', { name: /MCP Server Zugriff umschalten/i });
    expect(screen.getByText('Aktiviert')).toBeInTheDocument();

    fireEvent.click(switchElement);

    // Wait for the action to complete and rollback to happen
    await waitFor(() => {
      expect(setOrganisationMcpAccessAction).toHaveBeenCalledWith('org-123', false);
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Fehler beim Aktualisieren',
          description: 'Keine Berechtigung',
          variant: 'destructive',
        })
      );
      // Badge should have rolled back to 'Aktiviert'
      expect(screen.getByText('Aktiviert')).toBeInTheDocument();
    });
  });

  it('rolls back optimistic state and shows error toast when action throws an exception', async () => {
    (setOrganisationMcpAccessAction as jest.Mock).mockRejectedValueOnce(
      new Error('Netzwerkfehler')
    );

    render(
      <OrganisationPoliciesTab
        hasVerwaltenPermission={true}
        initialPolicies={mockPolicies}
        initialHaeuser={mockHaeuser}
        organisationId="org-123"
        initialMcpZugriffAktiviert={true}
      />
    );

    const switchElement = screen.getByRole('switch', { name: /MCP Server Zugriff umschalten/i });
    expect(screen.getByText('Aktiviert')).toBeInTheDocument();

    fireEvent.click(switchElement);

    await waitFor(() => {
      expect(setOrganisationMcpAccessAction).toHaveBeenCalledWith('org-123', false);
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Fehler beim Aktualisieren',
          description: 'Netzwerkfehler',
          variant: 'destructive',
        })
      );
      // Badge should have rolled back to 'Aktiviert'
      expect(screen.getByText('Aktiviert')).toBeInTheDocument();
    });
  });

  it('does not invoke setOrganisationMcpAccessAction when organisationId is undefined', () => {
    render(
      <OrganisationPoliciesTab
        hasVerwaltenPermission={true}
        initialPolicies={mockPolicies}
        initialHaeuser={mockHaeuser}
        organisationId={undefined}
        initialMcpZugriffAktiviert={true}
      />
    );

    const switchElement = screen.getByRole('switch', { name: /MCP Server Zugriff umschalten/i });
    expect(switchElement).toBeDisabled();

    fireEvent.click(switchElement);
    expect(setOrganisationMcpAccessAction).not.toHaveBeenCalled();
  });
});
