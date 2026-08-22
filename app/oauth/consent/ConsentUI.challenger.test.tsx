import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ConsentUI from './ConsentUI';
import {
    getUserMcpOrganisationsAction,
    saveUserMcpAuthorizationAction,
    submitDecisionAction,
    type UserMcpOrganisationItem
} from './actions';

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
    saveUserMcpAuthorizationAction: jest.fn(),
}));

jest.mock('@/lib/oauth-utils', () => ({
    isValidRedirect: jest.fn().mockReturnValue(true),
    isValidSupabaseRedirect: jest.fn().mockReturnValue(true),
}));

describe('Adversarial Challenge Tests for ConsentUI', () => {
    const multiOrgs: UserMcpOrganisationItem[] = [
        {
            organisation_id: 'org-1',
            name: 'Active Org 1',
            ist_versteckt: false,
            rolle: 'owner',
            mcp_zugriff_aktiviert: true,
            is_authorized: false,
            allow_all: false,
        },
        {
            organisation_id: 'org-2',
            name: 'Active Org 2',
            ist_versteckt: false,
            rolle: 'mitarbeiter',
            mcp_zugriff_aktiviert: true,
            is_authorized: false,
            allow_all: false,
        },
        {
            organisation_id: 'org-disabled',
            name: 'Disabled Org',
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
            data: multiOrgs,
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

    it('Scenario 1: Handles saveUserMcpAuthorizationAction failure without approving OAuth in Supabase', async () => {
        (saveUserMcpAuthorizationAction as jest.Mock).mockResolvedValueOnce({
            success: false,
            error: 'DB connection timeout during save',
        });

        await act(async () => {
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
                    initialOrganisations={multiOrgs}
                />
            );
        });

        const approveButton = screen.getByRole('button', { name: /Zugriff erlauben/i });
        await act(async () => {
            fireEvent.click(approveButton);
        });

        await waitFor(() => {
            expect(saveUserMcpAuthorizationAction).toHaveBeenCalled();
            // CRITICAL: submitDecisionAction must NOT be called if saving user authorization failed!
            expect(submitDecisionAction).not.toHaveBeenCalled();
            expect(screen.getByText('DB connection timeout during save')).toBeInTheDocument();
        });
    });

    it('Scenario 2: Prevents approval when custom selection is active but all orgs are deselected', async () => {
        await act(async () => {
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
                    initialOrganisations={multiOrgs}
                />
            );
        });

        // Switch to custom selection
        const toggleButton = screen.getByText('Auswahl anpassen');
        await act(async () => {
            fireEvent.click(toggleButton);
        });

        // Deselect org-1 and org-2
        const org1Card = screen.getByText('Active Org 1');
        const org2Card = screen.getByText('Active Org 2');

        await act(async () => {
            fireEvent.click(org1Card);
            fireEvent.click(org2Card);
        });

        // Validation message must be visible
        expect(screen.getByText('Bitte wählen Sie mindestens eine freizugebende Organisation aus.')).toBeInTheDocument();

        const approveButton = screen.getByRole('button', { name: /Zugriff erlauben/i });
        expect(approveButton).toBeDisabled();
    });

    it('Scenario 3: Cannot toggle or select disabled organisation even if clicked directly', async () => {
        await act(async () => {
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
                    initialOrganisations={multiOrgs}
                />
            );
        });

        // Switch to custom selection
        const toggleButton = screen.getByText('Auswahl anpassen');
        await act(async () => {
            fireEvent.click(toggleButton);
        });

        // Try clicking disabled org
        const disabledOrgCard = screen.getByText('Disabled Org');
        await act(async () => {
            fireEvent.click(disabledOrgCard);
        });

        // Click approve and verify only active orgs are submitted
        const approveButton = screen.getByRole('button', { name: /Zugriff erlauben/i });
        await act(async () => {
            fireEvent.click(approveButton);
        });

        await waitFor(() => {
            expect(saveUserMcpAuthorizationAction).toHaveBeenCalledWith(
                'client-123',
                expect.not.arrayContaining(['org-disabled']),
                false,
                { all: true, write: true }
            );
        });
    });

    it('Scenario 4: Handles 100% disabled organisations correctly', async () => {
        const allDisabled: UserMcpOrganisationItem[] = [
            {
                organisation_id: 'org-d1',
                name: 'Disabled 1',
                ist_versteckt: false,
                rolle: 'owner',
                mcp_zugriff_aktiviert: false,
                is_authorized: false,
                allow_all: false,
            },
            {
                organisation_id: 'org-d2',
                name: 'Disabled 2',
                ist_versteckt: false,
                rolle: 'admin',
                mcp_zugriff_aktiviert: false,
                is_authorized: false,
                allow_all: false,
            },
        ];

        (getUserMcpOrganisationsAction as jest.Mock).mockResolvedValueOnce({
            success: true,
            data: allDisabled,
        });

        await act(async () => {
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
                    initialOrganisations={allDisabled}
                />
            );
        });

        expect(screen.getByText(/In allen Organisationen, in denen Sie Mitglied sind, wurde der MCP Server Zugriff durch einen Administrator deaktiviert/i)).toBeInTheDocument();
        expect(screen.getByText('Keine freigebbare Organisation verfügbar (MCP-Zugriff durch Administrator deaktiviert).')).toBeInTheDocument();

        const approveButton = screen.getByRole('button', { name: /Zugriff erlauben/i });
        expect(approveButton).toBeDisabled();

        // But user can still click deny / cancel
        const denyButton = screen.getByRole('button', { name: /Abbrechen/i });
        expect(denyButton).not.toBeDisabled();

        await act(async () => {
            fireEvent.click(denyButton);
        });

        await waitFor(() => {
            expect(submitDecisionAction).toHaveBeenCalledWith(
                'auth_123456789012',
                'deny'
            );
        });
    });
});
