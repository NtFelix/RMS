/**
 * @jest-environment node
 */
import { saveUserMcpAuthorizationAction } from './actions';

/**
 * R2 (GH-6 Kautionsmanagement): Das Modul `kautionen` darf nie als MCP-/OAuth-Scope gespeichert werden.
 *
 * Das ist die RMS-Schicht der Sperre für OAuth-/MCP-Clients. Sie ersetzt NICHT die Datenbank: Ein OAuth-Token ist ein
 * echtes Benutzer-JWT und könnte PostgREST direkt aufrufen; dort sperrt allein `check_permission('kautionen', ...)`
 * (Claim-/Sitzungserkennung, siehe Migration `…_kautionen_check_permission_sperre.sql`, Risiko R-3). Dieser Test
 * stellt nur sicher, dass die Zustimmungsseite keinen `kautionen`-Eintrag in `MCP_Nutzer_Autorisierungen.scopes`
 * schreibt, auch nicht, wenn ein manipulierter Aufruf ihn mitschickt. Die textuelle Soll-Tabelle der Schlüssel liegt
 * in `__tests__/lib/module-lists.contract.test.ts`; dieser Test prüft das Verhalten von `sanitizeScopes`.
 */

const mockRpc = jest.fn();

jest.mock('@/lib/auth-utils', () => ({
    ensureAuth: jest.fn().mockImplementation(() => Promise.resolve({
        user: { id: 'user-123' },
        supabase: { rpc: mockRpc },
    })),
}));

/** Liefert das beim RPC-Aufruf übergebene Scope-Objekt (`p_scopes`). */
function gespeicherteScopes(): { all?: boolean; write?: boolean; module?: Record<string, { read: boolean; write: boolean }> } {
    expect(mockRpc).toHaveBeenCalledTimes(1);
    const [name, payload] = mockRpc.mock.calls[0];
    expect(name).toBe('save_user_mcp_authorization');
    return payload.p_scopes;
}

describe('saveUserMcpAuthorizationAction: Modul kautionen (R2)', () => {
    beforeEach(() => {
        mockRpc.mockReset();
        mockRpc.mockResolvedValue({ data: { success: true }, error: null });
    });

    it('verwirft kautionen in jeder Schreibweise und behält erlaubte Module', async () => {
        const result = await saveUserMcpAuthorizationAction('client-1', ['org-1'], false, {
            all: false,
            write: false,
            module: {
                kautionen: { read: true, write: true },
                Kautionen: { read: true, write: true },
                KAUTIONEN: { read: true, write: false },
                ' kautionen ': { read: true, write: true },
                mieter: { read: true, write: false },
            },
        });

        expect(result.success).toBe(true);
        expect(gespeicherteScopes().module).toEqual({ mieter: { read: true, write: false } });
    });

    it('speichert keinen kautionen-Schlüssel, auch wenn nur dieser übergeben wird', async () => {
        await saveUserMcpAuthorizationAction('client-1', ['org-1'], false, {
            all: false,
            write: false,
            module: { kautionen: { read: true, write: true } },
        });

        const module = gespeicherteScopes().module ?? {};
        expect(Object.keys(module).filter((key) => /kaution/i.test(key))).toEqual([]);
        expect(module).toEqual({});
    });

    it('speichert keinen kautionen-Schlüssel, wenn der Gesamtzugriff (all) gesetzt ist', async () => {
        // `all` wird unverändert durchgereicht; Kautionen bleiben dennoch gesperrt (MCP-Server: BLOCKED_MODULES,
        // Datenbank: check_permission). Hier geht es nur darum, dass kein expliziter Eintrag entsteht.
        await saveUserMcpAuthorizationAction('client-1', ['org-1'], true, {
            all: true,
            write: true,
            module: { kautionen: { read: true, write: true }, finanzen: { read: true, write: true } },
        });

        expect(gespeicherteScopes().module).toEqual({ finanzen: { read: true, write: true } });
    });
});
