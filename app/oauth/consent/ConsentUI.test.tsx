import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConsentUI from './ConsentUI';
import {
    getUserMcpOrganisationsAction,
    saveUserMcpAuthorizationAction,
    submitDecisionAction,
    type UserMcpOrganisationItem
} from './actions';

// Mock server actions
jest.mock('./actions', () => ({
    getAuthorizationDetailsAction: jest.fn().mockResolvedValue({
        success: true,
        data: {
            id: 'auth_123456789012',
            client: { id: 'client-123', name: 'Claude Desktop', logo_uri: 'https://claude.ai/logo.png' },
            scopes: ['properties:read', 'tenants:read'],
            redirect_uri: 'https://claude.ai/oauth/callback',
        },
        error: null,
    }),
    submitDecisionAction: jest.fn().mockResolvedValue({
        success: true,
        redirect_to: 'https://claude.ai/oauth/callback?code=mock_code',
        error: null,
    }),
    getUserMcpOrganisationsAction: jest.fn(),
    saveUserMcpAuthorizationAction: jest.fn().mockResolvedValue({
        success: true,
        data: { success: true },
    }),
}));

// Mock oauth utils
jest.mock('@/lib/oauth-utils', () => ({
    isValidRedirect: jest.fn().mockReturnValue(true),
    isValidSupabaseRedirect: jest.fn().mockReturnValue(true),
}));

describe('ConsentUI Component', () => {
    const mockDefaultOrganisations: UserMcpOrganisationItem[] = [
        {
            organisation_id: 'org-active-1',
            name: 'Immobilienverwaltung Schmidt',
            ist_versteckt: false,
            rolle: 'owner',
            mcp_zugriff_aktiviert: true,
            is_authorized: false,
            allow_all: false,
        },
        {
            organisation_id: 'org-disabled-2',
            name: 'Gewerbe Portfolio Nord',
            ist_versteckt: false,
            rolle: 'admin',
            mcp_zugriff_aktiviert: false,
            is_authorized: false,
            allow_all: false,
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        (getUserMcpOrganisationsAction as jest.Mock).mockResolvedValue({
            success: true,
            data: mockDefaultOrganisations,
        });
        (saveUserMcpAuthorizationAction as jest.Mock).mockResolvedValue({
            success: true,
            data: { success: true },
        });
        (submitDecisionAction as jest.Mock).mockResolvedValue({
            success: true,
            redirect_to: 'https://claude.ai/oauth/callback?code=mock_code',
            error: null,
        });
    });

    it('renders client name, requested scopes, and organisation selection', async () => {
        render(
            <ConsentUI
                type="consent"
                authorizationId="auth_123456789012"
                initialData={{
                    id: 'auth_123456789012',
                    client: { id: 'client-123', name: 'Claude Desktop' },
                    scopes: ['properties:read', 'tenants:read'],
                    redirect_uri: 'https://claude.ai/oauth/callback',
                }}
                initialOrganisations={mockDefaultOrganisations}
            />
        );

        expect(screen.getByText('Verbindung autorisieren')).toBeInTheDocument();
        expect(screen.getByText(/Claude Desktop/i)).toBeInTheDocument();
        expect(screen.getByText('Immobilien ansehen')).toBeInTheDocument();
        expect(screen.getByText('Mieter ansehen')).toBeInTheDocument();
        expect(screen.getByText('Freizugebende Organisationen:')).toBeInTheDocument();
        expect(screen.getByText('Alle erlaubten Organisationen freigeben')).toBeInTheDocument();
    });

    it('shows disabled badge for organisations with mcp_zugriff_aktiviert = false when customized', async () => {
        render(
            <ConsentUI
                type="consent"
                authorizationId="auth_123456789012"
                initialData={{
                    id: 'auth_123456789012',
                    client: { id: 'client-123', name: 'Claude Desktop' },
                    scopes: ['properties:read'],
                    redirect_uri: 'https://claude.ai/oauth/callback',
                }}
                initialOrganisations={mockDefaultOrganisations}
            />
        );

        // Switch to custom selection
        const toggleButton = screen.getByText('Auswahl anpassen');
        fireEvent.click(toggleButton);

        expect(screen.getByText('Immobilienverwaltung Schmidt')).toBeInTheDocument();
        expect(screen.getByText('Gewerbe Portfolio Nord')).toBeInTheDocument();
        expect(screen.getByText('Durch Administrator deaktiviert')).toBeInTheDocument();
    });

    it('persists user MCP authorization with allow_all = true upon default approval', async () => {
        render(
            <ConsentUI
                type="consent"
                authorizationId="auth_123456789012"
                initialData={{
                    id: 'auth_123456789012',
                    client: { id: 'client-123', name: 'Claude Desktop' },
                    scopes: ['properties:read'],
                    redirect_uri: 'https://claude.ai/oauth/callback',
                }}
                initialOrganisations={mockDefaultOrganisations}
            />
        );

        const approveButton = screen.getByRole('button', { name: /Zugriff erlauben/i });
        fireEvent.click(approveButton);

        await waitFor(() => {
            expect(saveUserMcpAuthorizationAction).toHaveBeenCalledWith(
                'client-123',
                ['org-active-1'],
                true
            );
            expect(submitDecisionAction).toHaveBeenCalledWith(
                'auth_123456789012',
                'allow'
            );
        });
    });

    it('persists user MCP authorization with specific org IDs when customized', async () => {
        render(
            <ConsentUI
                type="consent"
                authorizationId="auth_123456789012"
                initialData={{
                    id: 'auth_123456789012',
                    client: { id: 'client-123', name: 'Claude Desktop' },
                    scopes: ['properties:read'],
                    redirect_uri: 'https://claude.ai/oauth/callback',
                }}
                initialOrganisations={mockDefaultOrganisations}
            />
        );

        // Switch to custom selection
        const toggleButton = screen.getByText('Auswahl anpassen');
        fireEvent.click(toggleButton);

        const approveButton = screen.getByRole('button', { name: /Zugriff erlauben/i });
        fireEvent.click(approveButton);

        await waitFor(() => {
            expect(saveUserMcpAuthorizationAction).toHaveBeenCalledWith(
                'client-123',
                ['org-active-1'],
                false
            );
            expect(submitDecisionAction).toHaveBeenCalledWith(
                'auth_123456789012',
                'allow'
            );
        });
    });

    it('submits deny decision when user cancels', async () => {
        render(
            <ConsentUI
                type="consent"
                authorizationId="auth_123456789012"
                initialData={{
                    id: 'auth_123456789012',
                    client: { id: 'client-123', name: 'Claude Desktop' },
                    scopes: ['properties:read'],
                    redirect_uri: 'https://claude.ai/oauth/callback',
                }}
                initialOrganisations={mockDefaultOrganisations}
            />
        );

        const denyButton = screen.getByRole('button', { name: /Abbrechen/i });
        fireEvent.click(denyButton);

        await waitFor(() => {
            expect(submitDecisionAction).toHaveBeenCalledWith(
                'auth_123456789012',
                'deny'
            );
        });
    });

    it('disables approve button and shows warning if all organizations have MCP disabled', async () => {
        const allDisabledOrgs: UserMcpOrganisationItem[] = [
            {
                organisation_id: 'org-disabled-1',
                name: 'Disabled Org',
                ist_versteckt: false,
                rolle: 'admin',
                mcp_zugriff_aktiviert: false,
                is_authorized: false,
                allow_all: false,
            },
        ];

        render(
            <ConsentUI
                type="consent"
                authorizationId="auth_123456789012"
                initialData={{
                    id: 'auth_123456789012',
                    client: { id: 'client-123', name: 'Claude Desktop' },
                    scopes: ['properties:read'],
                    redirect_uri: 'https://claude.ai/oauth/callback',
                }}
                initialOrganisations={allDisabledOrgs}
            />
        );

        expect(screen.getByText(/In allen Organisationen, in denen Sie Mitglied sind, wurde der MCP Server Zugriff durch einen Administrator deaktiviert/i)).toBeInTheDocument();
        const approveButton = screen.getByRole('button', { name: /Zugriff erlauben/i });
        expect(approveButton).toBeDisabled();
    });
});

