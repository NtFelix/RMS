import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Cross-repo drift guard.
 *
 * The RMS consent screen writes module-scope aliases (e.g. `haeuser`, `wohnungen`,
 * `mieter`, `betriebskosten`) that the mietevo-mcp server resolves via MODULE_ALIASES
 * when enforcing per-tool scopes. The two maps live in different repos, so this test
 * asserts the alias contract textually: every alias key the MCP server resolves for a
 * module the consent UI writes must also be written by the consent UI, and vice versa
 * for the modules defined here.
 */

const repoRoot = join(__dirname, '..', '..', '..');

const CONSENT_UI_PATH = join(repoRoot, 'app', 'oauth', 'consent', 'ConsentUI.tsx');
const MCP_SERVER_PATH = join(
    repoRoot,
    '..',
    'mietevo-mcp',
    'src',
    'mcp-server.ts'
);

// Modules the consent UI exposes as user-facing permission definitions, mapped to the
// DB module keys they must fan out to (must mirror handleDecision's moduleMap logic).
const EXPECTED_ALIAS_FANOUT: Record<string, string[]> = {
    properties: ['haeuser', 'wohnungen'],
    tenants: ['mieter'],
    finanzen: ['betriebskosten', 'nebenkosten'],
    zaehler: ['zaehler_ablesungen'],
    dokumente: ['vorlagen', 'dokumente_metadaten'],
};

describe('consent <-> mcp-server module alias contract', () => {
    let consentUiSource: string;
    let mcpServerSource: string;

    beforeAll(() => {
        try {
            consentUiSource = readFileSync(CONSENT_UI_PATH, 'utf-8');
        } catch {
            consentUiSource = '';
        }
        try {
            mcpServerSource = readFileSync(MCP_SERVER_PATH, 'utf-8');
        } catch {
            // Sibling repo not checked out — skip assertions rather than fail unrelated CI.
            mcpServerSource = '';
        }
    });

    it('consent UI fans each permission definition out to all expected DB module keys', () => {
        expect(consentUiSource).not.toBe('');
        for (const [defId, aliases] of Object.entries(EXPECTED_ALIAS_FANOUT)) {
            for (const alias of aliases) {
                // Match e.g.  if (def.id === 'properties') { ... moduleMap['haeuser'] = ...
                const pattern = new RegExp(
                    `def\\.id === '${defId}'[\\s\\S]{0,400}?moduleMap\\['${alias}'\\]`
                );
                expect({ defId, alias, found: pattern.test(consentUiSource) }).toEqual({
                    defId,
                    alias,
                    found: true,
                });
            }
        }
    });

    it('mietevo-mcp MODULE_ALIASES resolves every DB module key the consent UI writes', () => {
        if (!mcpServerSource) {
            console.warn('mietevo-mcp sibling repo not present; skipping cross-repo assertion.');
            return;
        }

        const aliasesMatch = mcpServerSource.match(/MODULE_ALIASES[^=]*=\s*\{([\s\S]*?)\n\};/);
        expect(aliasesMatch).toBeTruthy();

        for (const aliases of Object.values(EXPECTED_ALIAS_FANOUT)) {
            for (const alias of aliases) {
                expect({ alias, listed: aliasesMatch![1].includes(alias) }).toEqual({
                    alias,
                    listed: true,
                });
            }
        }
    });
});
