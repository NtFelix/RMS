import {
    getAuthorizationDetailsAction,
    submitDecisionAction,
    getUserMcpOrganisationsAction,
    saveUserMcpAuthorizationAction
} from './actions';
import { ensureAuth } from '@/lib/auth-utils';

const mockRpc = jest.fn();

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

const originalFetch = global.fetch;

describe('Adversarial Security & Action Challenge Tests', () => {
    beforeEach(() => {
        global.fetch = jest.fn();
        mockRpc.mockReset();
    });

    afterAll(() => {
        global.fetch = originalFetch;
    });

    describe('Security & Malicious Payloads', () => {
        it('blocks path traversal and SSRF attacks in authorizationId', async () => {
            const maliciousIds = [
                '../../etc/passwd',
                'auth_12345/../../admin',
                'auth_12345%0d%0aSet-Cookie:admin=1',
                'auth_12345?foo=bar#baz',
                'auth_12345<script>alert(1)</script>',
                'a'.repeat(65), // length > 64
                'short',        // length < 10
                'auth_12345; DROP TABLE users;',
            ];

            for (const id of maliciousIds) {
                const getResult = await getAuthorizationDetailsAction(id);
                expect(getResult.success).toBe(false);
                expect(getResult.error).toMatch(/Invalid authorization identifier/i);

                const submitResult = await submitDecisionAction(id, 'allow');
                expect(submitResult.success).toBe(false);
                expect(submitResult.error).toMatch(/Invalid authorization identifier/i);
            }
        });

        it('rejects invalid decision parameter tampering', async () => {
            const badDecisions = [
                'approve',
                'true',
                'ALLOW',
                'allow; DROP TABLE;',
                null as any,
                undefined as any,
                {} as any,
            ];

            for (const d of badDecisions) {
                const res = await submitDecisionAction('auth_123456789012', d);
                expect(res.success).toBe(false);
                expect(res.error).toMatch(/Invalid decision value/i);
            }
        });

        it('rejects empty or whitespace clientId in saveUserMcpAuthorizationAction', async () => {
            const badClientIds = ['', '   ', '\t\n', null as any, undefined as any];

            for (const cid of badClientIds) {
                const res = await saveUserMcpAuthorizationAction(cid, ['org-1'], false);
                expect(res.success).toBe(false);
                expect(res.error).toContain('Client-ID ist erforderlich');
                expect(mockRpc).not.toHaveBeenCalled();
            }
        });

        it('safely handles empty allowedOrgIds array and null arguments in saveUserMcpAuthorizationAction', async () => {
            mockRpc.mockResolvedValueOnce({
                data: { success: true },
                error: null,
            });

            const res = await saveUserMcpAuthorizationAction('claude-desktop', null as any, false);
            expect(res.success).toBe(true);
            expect(mockRpc).toHaveBeenCalledWith('save_user_mcp_authorization', {
                p_client_id: 'claude-desktop',
                p_allowed_org_ids: [],
                p_allow_all: false,
            });
        });

        it('safely surfaces DB RPC errors during authorization save', async () => {
            mockRpc.mockResolvedValueOnce({
                data: null,
                error: { message: 'Database connection terminated unexpectedly' },
            });

            const res = await saveUserMcpAuthorizationAction('claude-desktop', ['org-1'], false);
            expect(res.success).toBe(false);
            expect(res.error).toBe('Database connection terminated unexpectedly');
        });

        it('handles unauthenticated context gracefully across all actions', async () => {
            (ensureAuth as jest.Mock).mockRejectedValueOnce(new Error('JWT expired'));
            const orgsRes = await getUserMcpOrganisationsAction('client-1');
            expect(orgsRes.success).toBe(false);
            expect(orgsRes.error).toBe('JWT expired');

            (ensureAuth as jest.Mock).mockRejectedValueOnce(new Error('Session not found'));
            const saveRes = await saveUserMcpAuthorizationAction('client-1', [], true);
            expect(saveRes.success).toBe(false);
            expect(saveRes.error).toBe('Session not found');

            (ensureAuth as jest.Mock).mockResolvedValueOnce({
                user: null,
                supabase: {
                    auth: {
                        getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
                    },
                },
            });
            const getAuthRes = await getAuthorizationDetailsAction('auth_123456789012');
            expect(getAuthRes.success).toBe(false);
            expect(getAuthRes.error).toContain('Sitzung ist abgelaufen');

            (ensureAuth as jest.Mock).mockResolvedValueOnce({
                user: null,
                supabase: {
                    auth: {
                        getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
                    },
                },
            });
            const submitRes = await submitDecisionAction('auth_123456789012', 'allow');
            expect(submitRes.success).toBe(false);
            expect(submitRes.error).toContain('Sitzung ist abgelaufen');
        });
    });
});
