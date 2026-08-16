import { getAuthorizationDetailsAction, submitDecisionAction } from './actions';

// Mock ensureAuth
jest.mock('@/lib/auth-utils', () => ({
    ensureAuth: jest.fn().mockResolvedValue({
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
        },
    }),
}));

// Mock fetch
const originalFetch = global.fetch;

describe('OAuth Consent actions', () => {
    beforeEach(() => {
        global.fetch = jest.fn();
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
    });

    describe('submitDecisionAction', () => {
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
                    body: JSON.stringify({ consent: 'approve', decision: 'allow' }),
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
    });
});
