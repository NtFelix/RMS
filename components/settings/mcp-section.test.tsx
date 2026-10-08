import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import McpSection from './mcp-section';
import { setOrganisationMcpAccessAction } from '@/app/organisation-actions';
import { toast } from '@/hooks/use-toast';

// Mock organisation-actions
jest.mock('@/app/organisation-actions', () => ({
  setOrganisationMcpAccessAction: jest.fn(),
}));

// Mock use-toast
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}));

describe('McpSection Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (setOrganisationMcpAccessAction as jest.Mock).mockResolvedValue({
      success: true,
      data: { success: true },
    });
  });

  it('renders MCP section with copyable endpoint and switch state', () => {
    render(
      <McpSection
        organisationId="org-123"
        organisationName="Test Org"
        initialMcpZugriffAktiviert={true}
        hasVerwaltenPermission={true}
      />
    );

    expect(screen.getByText('Model Context Protocol (MCP)')).toBeInTheDocument();
    expect(screen.getByText('MCP Server Zugriff für Test Org')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /MCP Server Zugriff umschalten/i })).toBeChecked();
    expect(screen.getByText('https://mcp.mietevo.de/mcp')).toBeInTheDocument();
  });

  it('renders unchecked switch when initialMcpZugriffAktiviert is false', () => {
    render(
      <McpSection
        organisationId="org-123"
        organisationName="Test Org"
        initialMcpZugriffAktiviert={false}
        hasVerwaltenPermission={true}
      />
    );

    expect(screen.getByRole('switch', { name: /MCP Server Zugriff umschalten/i })).not.toBeChecked();
  });

  it('toggles MCP access switch and invokes setOrganisationMcpAccessAction', async () => {
    render(
      <McpSection
        organisationId="org-123"
        organisationName="Test Org"
        initialMcpZugriffAktiviert={true}
        hasVerwaltenPermission={true}
      />
    );

    const switchElement = screen.getByRole('switch', { name: /MCP Server Zugriff umschalten/i });
    expect(switchElement).toBeChecked();

    fireEvent.click(switchElement);

    await waitFor(() => {
      expect(setOrganisationMcpAccessAction).toHaveBeenCalledWith('org-123', false);
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Einstellung gespeichert',
          variant: 'success',
        })
      );
    });
  });

  it('disables switch and shows restriction message when user lacks verwalten permission', () => {
    render(
      <McpSection
        organisationId="org-123"
        organisationName="Test Org"
        initialMcpZugriffAktiviert={true}
        hasVerwaltenPermission={false}
      />
    );

    const switchElement = screen.getByRole('switch', { name: /MCP Server Zugriff umschalten/i });
    expect(switchElement).toBeDisabled();
    expect(screen.getByText(/Nur Administratoren und Eigentümer können den MCP Server Zugriff/i)).toBeInTheDocument();
  });

  it('rolls back optimistic state and shows error toast when action returns success=false', async () => {
    (setOrganisationMcpAccessAction as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: { message: 'Keine Berechtigung' },
    });

    render(
      <McpSection
        organisationId="org-123"
        organisationName="Test Org"
        initialMcpZugriffAktiviert={true}
        hasVerwaltenPermission={true}
      />
    );

    const switchElement = screen.getByRole('switch', { name: /MCP Server Zugriff umschalten/i });
    expect(switchElement).toBeChecked();

    fireEvent.click(switchElement);

    await waitFor(() => {
      expect(setOrganisationMcpAccessAction).toHaveBeenCalledWith('org-123', false);
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Fehler beim Aktualisieren',
          description: 'Keine Berechtigung',
          variant: 'destructive',
        })
      );
      // Switch should have rolled back to checked
      expect(switchElement).toBeChecked();
    });
  });

  it('rolls back optimistic state and shows error toast when action throws an exception', async () => {
    (setOrganisationMcpAccessAction as jest.Mock).mockRejectedValueOnce(
      new Error('Netzwerkfehler')
    );

    render(
      <McpSection
        organisationId="org-123"
        organisationName="Test Org"
        initialMcpZugriffAktiviert={true}
        hasVerwaltenPermission={true}
      />
    );

    const switchElement = screen.getByRole('switch', { name: /MCP Server Zugriff umschalten/i });
    expect(switchElement).toBeChecked();

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
      // Switch should have rolled back to checked
      expect(switchElement).toBeChecked();
    });
  });

  it('copies server URL to clipboard when copy button is clicked', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });

    render(
      <McpSection
        organisationId="org-123"
        organisationName="Test Org"
        initialMcpZugriffAktiviert={true}
        hasVerwaltenPermission={true}
      />
    );

    const copyButton = screen.getByRole('button', { name: /Kopieren/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://mcp.mietevo.de/mcp');
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Kopiert',
          variant: 'success',
        })
      );
    });
  });
});
