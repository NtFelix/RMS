import {
    getAuthorizationDetailsAction,
    submitDecisionAction,
    getUserMcpOrganisationsAction,
    saveUserMcpAuthorizationAction
} from './actions';
import { ensureAuth } from '@/lib/auth-utils';

const mockRpc = jest.fn();

// Mock ensureAuth
jest.mock('@/lib/auth-utils', () => ({
    ensureAuth: jest.fn().mockImplementation(() => Promise.resolve({
        user: { id: 'user-123' },
        supabase: {
            auth: {
                getSession: jest.fn().mockResolvedValue({
                    data: { session: { access_token: 'mock-access-token' } },
                    error: null,
                }),
                getUser: jest.fn().mockResolvedValue({
                    data: { user: { id: 'user-123' } },
                    error: null,
                }),
            },
            rpc: mockRpc,
        },
    })),
}));

// Mock fetch
const originalFetch = global.fetch;

describe('OAuth Consent actions', () => {
    beforeEach(() => {
        global.fetch = jest.fn();
        mockRpc.mockReset();
    });

    afterAll(() => {
        global.fetch = originalFetch;
    });

    describe('getAuthorizationDetailsAction', () => {
        it('rejects invalid authorization_id format', async () => {
            const result = await getAuthorizationDetailsAction('short');
            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid authorization identifier');
        });

        it('fetches authorization details successfully from GoTrue REST endpoint', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    id: 'auth_123456789012',
                    client: { name: 'Notion MCP', logo_uri: 'https://notion.so/logo.png' },
                    scopes: 'openid email',
                }),
            });

            const result = await getAuthorizationDetailsAction('auth_123456789012');
            expect(result.success).toBe(true);
            expect(result.data?.client?.name).toBe('Notion MCP');
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/auth/v1/oauth/authorizations/auth_123456789012'),
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        Authorization: 'Bearer mock-access-token',
                    }),
                })
            );
        });

        it('handles 400 already processed authorization gracefully', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 400,
                text: async () => 'Authorization has already been processed',
            });

            const result = await getAuthorizationDetailsAction('auth_123456789012');
            expect(result.success).toBe(true);
            expect(result.alreadyProcessed).toBe(true);
            expect(result.data).toBeNull();
        });

        it('handles 404 expired authorization gracefully', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 404,
                text: async () => 'Not found',
            });

            const result = await getAuthorizationDetailsAction('auth_123456789012');
            expect(result.success).toBe(false);
            expect(result.error).toContain('bereits verwendet oder ist abgelaufen');
        });
        it.each([401, 403])('handles %i unauthorized responses gracefully', async (status) => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status,
            });

            const result = await getAuthorizationDetailsAction('auth_123456789012');
            expect(result.success).toBe(false);
            expect(result.error).toContain('Sitzung ist abgelaufen');
        });

        it('handles network failure rejection in catch block', async () => {
            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failure'));

            const result = await getAuthorizationDetailsAction('auth_123456789012');
            expect(result.success).toBe(false);
            expect(result.error).toContain('Network failure');
        });
    });

    describe('submitDecisionAction', () => {
        it('rejects invalid decision parameter values', async () => {
            const result = await submitDecisionAction('auth_123456789012', 'invalid_decision' as any);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid decision value');
        });

        it('submits allow decision to /consent endpoint', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    redirect_to: 'https://mcp.mietevo.de/oauth/callback?code=code123',
                }),
            });

            const result = await submitDecisionAction('auth_123456789012', 'allow');
            expect(result.success).toBe(true);
            expect(result.redirect_to).toBe('https://mcp.mietevo.de/oauth/callback?code=code123');
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/auth/v1/oauth/authorizations/auth_123456789012/consent'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ action: 'approve', consent: 'approve', decision: 'allow' }),
                })
            );
        });

        it('submits deny decision to /consent endpoint', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    redirect_to: 'https://mcp.mietevo.de/oauth/callback?error=access_denied',
                }),
            });

            const result = await submitDecisionAction('auth_123456789012', 'deny');
            expect(result.success).toBe(true);
            expect(result.redirect_to).toBe('https://mcp.mietevo.de/oauth/callback?error=access_denied');
        });

        it('falls back to /authorizations/{id} when /consent returns 404', async () => {
            // First call returns 404
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 404,
            });
            // Fallback call returns 200
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    redirect_to: 'https://mcp.mietevo.de/oauth/callback?code=fallback_code',
                }),
            });

            const result = await submitDecisionAction('auth_123456789012', 'allow');
            expect(result.success).toBe(true);
            expect(result.redirect_to).toBe('https://mcp.mietevo.de/oauth/callback?code=fallback_code');
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });

        it('falls back to /authorizations/{id} when /consent returns 405', async () => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 405,
            });
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    redirect_to: 'https://mcp.mietevo.de/oauth/callback?code=fallback_code_405',
                }),
            });

            const result = await submitDecisionAction('auth_123456789012', 'allow');
            expect(result.success).toBe(true);
            expect(result.redirect_to).toBe('https://mcp.mietevo.de/oauth/callback?code=fallback_code_405');
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });

        it.each([401, 403])('handles %i unauthorized responses on decision submit', async (status) => {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status,
            });

            const result = await submitDecisionAction('auth_123456789012', 'allow');
            expect(result.success).toBe(false);
            expect(result.error).toContain('Sitzung ist abgelaufen');
        });

        it('handles network failure rejection in submit decision', async () => {
            (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network down'));

            const result = await submitDecisionAction('auth_123456789012', 'allow');
            expect(result.success).toBe(false);
            expect(result.error).toContain('Network down');
        });
    });

    describe('getUserMcpOrganisationsAction', () => {
        it('fetches user organizations and their MCP access status successfully', async () => {
            const mockOrgs = [
                {
                    organisation_id: 'org-1',
                    name: 'Immobilien GmbH',
                    ist_versteckt: false,
                    rolle: 'owner',
                    mcp_zugriff_aktiviert: true,
                    is_authorized: true,
                    allow_all: false,
                },
                {
                    organisation_id: 'org-2',
                    name: 'Private Hausverwaltung',
                    ist_versteckt: false,
                    rolle: 'admin',
                    mcp_zugriff_aktiviert: false,
                    is_authorized: false,
                    allow_all: false,
                },
            ];
            mockRpc.mockResolvedValueOnce({ data: mockOrgs, error: null });

            const result = await getUserMcpOrganisationsAction('notion-client-id');
            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockOrgs);
            expect(mockRpc).toHaveBeenCalledWith('get_user_mcp_organisations', {
                p_client_id: 'notion-client-id',
            });
        });

        it('handles null clientId parameter gracefully', async () => {
            mockRpc.mockResolvedValueOnce({ data: [], error: null });

            const result = await getUserMcpOrganisationsAction();
            expect(result.success).toBe(true);
            expect(result.data).toEqual([]);
            expect(mockRpc).toHaveBeenCalledWith('get_user_mcp_organisations', {
                p_client_id: null,
            });
        });

        it('handles authentication failure gracefully', async () => {
            (ensureAuth as jest.Mock).mockRejectedValueOnce(new Error('Benutzer nicht angemeldet'));

            const result = await getUserMcpOrganisationsAction('client-id');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Benutzer nicht angemeldet');
        });

        it('handles database RPC error without leaking raw DB details', async () => {
            mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'DB connection error' } });

            const result = await getUserMcpOrganisationsAction('client-id');
            expect(result.success).toBe(false);
            // Raw DB error message must not be surfaced to the client
            expect(result.error).not.toBe('DB connection error');
            expect(result.error).toContain('nicht geladen');
        });
    });

    describe('saveUserMcpAuthorizationAction', () => {
        it('saves user MCP authorizations successfully', async () => {
            mockRpc.mockResolvedValueOnce({
                data: {
                    success: true,
                    client_id: 'claude-desktop',
                    allowed_organisation_ids: ['org-1', 'org-2'],
                    allow_all: false,
                },
                error: null,
            });

            const result = await saveUserMcpAuthorizationAction('claude-desktop', ['org-1', 'org-2'], false);
            expect(result.success).toBe(true);
            expect(mockRpc).toHaveBeenCalledWith('save_user_mcp_authorization', {
                p_client_id: 'claude-desktop',
                p_allowed_org_ids: ['org-1', 'org-2'],
                p_allow_all: false,
                // Fail-closed default: no scopes object means no access
                p_scopes: { all: false, write: false },
            });
        });

        it('saves with allow_all = true', async () => {
            mockRpc.mockResolvedValueOnce({
                data: {
                    success: true,
                    client_id: 'claude-desktop',
                    allowed_organisation_ids: [],
                    allow_all: true,
                },
                error: null,
            });

            const result = await saveUserMcpAuthorizationAction('claude-desktop', [], true);
            expect(result.success).toBe(true);
            expect(mockRpc).toHaveBeenCalledWith('save_user_mcp_authorization', {
                p_client_id: 'claude-desktop',
                p_allowed_org_ids: [],
                p_allow_all: true,
                p_scopes: { all: false, write: false },
            });
        });

        it('rejects empty clientId', async () => {
            const result = await saveUserMcpAuthorizationAction('   ', ['org-1'], false);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Client-ID ist erforderlich');
            expect(mockRpc).not.toHaveBeenCalled();
        });

        it('handles unauthenticated error', async () => {
            (ensureAuth as jest.Mock).mockRejectedValueOnce(new Error('Nicht authentifiziert'));

            const result = await saveUserMcpAuthorizationAction('client-1', ['org-1'], false);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Nicht authentifiziert');
        });

        it('handles database RPC error without leaking raw DB details', async () => {
            mockRpc.mockResolvedValueOnce({
                data: null,
                error: { message: 'Constraint violation in save RPC' },
            });

            const result = await saveUserMcpAuthorizationAction('client-1', ['org-1'], false);
            expect(result.success).toBe(false);
            // Raw DB error message must not be surfaced to the client
            expect(result.error).not.toBe('Constraint violation in save RPC');
            expect(result.error).toContain('Fehler beim Speichern');
        });
    });
});
