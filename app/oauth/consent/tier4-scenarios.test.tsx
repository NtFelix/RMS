import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConsentUI from './ConsentUI';
import { setOrganisationMcpAccessAction } from '@/app/organisation-actions';
import { getUserMcpOrganisationsAction, saveUserMcpAuthorizationAction, submitDecisionAction } from './actions';
import { ensureAuth } from '@/lib/auth-utils';
import { hasPermission } from '@/lib/permissions';

jest.mock('@/lib/auth-utils', () => ({
    ensureAuth: jest.fn(),
}));

jest.mock('@/lib/permissions', () => ({
    hasPermission: jest.fn(),
}));

jest.mock('@/utils/supabase/server', () => ({
    createClient: jest.fn(),
}));

jest.mock('next/cache', () => ({
    revalidatePath: jest.fn(),
}));

jest.mock('@/lib/logging-middleware', () => ({
    withLogging: (_name: string, fn: any) => fn,
}));

jest.mock('./actions', () => ({
    getAuthorizationDetailsAction: jest.fn(),
    submitDecisionAction: jest.fn(),
    getUserMcpOrganisationsAction: jest.fn(),
    saveUserMcpAuthorizationAction: jest.fn(),
}));

jest.mock('@/lib/oauth-utils', () => ({
    isValidRedirect: jest.fn().mockReturnValue(true),
    isValidSupabaseRedirect: jest.fn().mockReturnValue(true),
}));

describe('RMS Tier 4 Scenario 3 Verification: Admin MCP Access Control & Consent Flow', () => {
    const mockAuthId = '123e4567-e89b-42d3-a456-426614174000';
    const mockClientId = 'claude-ai-mcp';

    const ORG_ACTIVE_1 = {
        organisation_id: '11111111-1111-4111-a111-111111111111',
        name: 'Schmidt Hausverwaltung GmbH',
        ist_versteckt: false,
        rolle: 'owner',
        mcp_zugriff_aktiviert: true,
        is_authorized: true,
        allow_all: false,
    };

    const ORG_DISABLED_2 = {
        organisation_id: '22222222-2222-4222-a222-222222222222',
        name: 'Muster Immobilien (Deactivated)',
        ist_versteckt: false,
        rolle: 'admin',
        mcp_zugriff_aktiviert: false,
        is_authorized: true,
        allow_all: false,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Scenario 3 Part A: Admin toggles mcp_zugriff_aktiviert via Server Action', () => {
        it('rejects toggle attempt if caller lacks organisation:verwalten permission', async () => {
            (ensureAuth as jest.Mock).mockResolvedValue({
                user: { id: 'user-emp' },
                supabase: {},
            });
            (hasPermission as jest.Mock).mockResolvedValue(false);

            const res = await setOrganisationMcpAccessAction(ORG_ACTIVE_1.organisation_id, false);
            expect(res.success).toBe(false);
            expect(res.error?.message).toContain('Keine Berechtigung zum Verwalten der Organisation');
        });

        it('allows admin/owner to disable MCP access and invokes set_organisation_mcp_access RPC', async () => {
            const mockRpc = jest.fn().mockResolvedValue({
                data: { success: true, mcp_zugriff_aktiviert: false },
                error: null,
            });
            (ensureAuth as jest.Mock).mockResolvedValue({
                user: { id: 'user-admin' },
                supabase: { rpc: mockRpc },
            });
            (hasPermission as jest.Mock).mockResolvedValue(true);

            const res = await setOrganisationMcpAccessAction(ORG_ACTIVE_1.organisation_id, false);
            expect(res.success).toBe(true);
            expect(mockRpc).toHaveBeenCalledWith('set_organisation_mcp_access', {
                p_org_id: ORG_ACTIVE_1.organisation_id,
                p_enabled: false,
            });
        });
    });

    describe('Scenario 3 Part B: Consent UI renders disabled badge and enforces persistence', () => {
        it('renders disabled organisation with badge, prevents its selection, and permits active org', async () => {
            (getUserMcpOrganisationsAction as jest.Mock).mockResolvedValue({
                success: true,
                data: [ORG_ACTIVE_1, ORG_DISABLED_2],
            });
            (saveUserMcpAuthorizationAction as jest.Mock).mockResolvedValue({ success: true, data: { success: true } });
            (submitDecisionAction as jest.Mock).mockResolvedValue({
                success: true,
                redirect_to: 'https://claude.ai/api/mcp/oauth_callback?code=test-code',
            });

            render(
                <ConsentUI
                    type="consent"
                    authorizationId={mockAuthId}
                    initialData={{
                        id: mockAuthId,
                        client: { id: mockClientId, name: 'Claude Desktop' },
                        scopes: ['properties:read'],
                        redirect_uri: 'https://claude.ai/api/mcp/oauth_callback',
                    }}
                    initialOrganisations={[ORG_ACTIVE_1, ORG_DISABLED_2]}
                />
            );

            // Click combobox to open dropdown
            const combobox = screen.queryByRole('combobox');
            if (combobox) {
                fireEvent.click(combobox);
            }

            expect(screen.getAllByText('Schmidt Hausverwaltung GmbH')[0]).toBeInTheDocument();
            expect(screen.getByText('Muster Immobilien (Deactivated)')).toBeInTheDocument();

            // Disabled badge must be rendered for the deactivated org
            expect(screen.getByText('Durch Administrator deaktiviert')).toBeInTheDocument();

            // Click approve
            const approveButton = screen.getByRole('button', { name: /zugriff erlauben/i });
            fireEvent.click(approveButton);

            // Verify saveUserMcpAuthorizationAction was called BEFORE submitDecisionAction with only enabled org
            await waitFor(() => {
                expect(saveUserMcpAuthorizationAction).toHaveBeenCalledTimes(1);
                expect(saveUserMcpAuthorizationAction).toHaveBeenCalledWith(
                    mockClientId,
                    [ORG_ACTIVE_1.organisation_id],
                    false,
                    { all: true, write: false }
                );
                expect(submitDecisionAction).toHaveBeenCalledTimes(1);
                expect(submitDecisionAction).toHaveBeenCalledWith(mockAuthId, 'allow');
            });
        });

        it('displays notice and blocks approval when all user organisations are deactivated by admin', async () => {
            (getUserMcpOrganisationsAction as jest.Mock).mockResolvedValue({
                success: true,
                data: [ORG_DISABLED_2],
            });

            render(
                <ConsentUI
                    type="consent"
                    authorizationId={mockAuthId}
                    initialData={{
                        id: mockAuthId,
                        client: { id: mockClientId, name: 'Claude Desktop' },
                        scopes: ['properties:read'],
                        redirect_uri: 'https://claude.ai/api/mcp/oauth_callback',
                    }}
                    initialOrganisations={[ORG_DISABLED_2]}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Muster Immobilien (Deactivated)')).toBeInTheDocument();
                expect(screen.getByText(/In allen Organisationen.*deaktiviert/i)).toBeInTheDocument();
            });

            const approveButton = screen.getByRole('button', { name: /zugriff erlauben/i });
            expect(approveButton).toBeDisabled();
        });
    });
});
