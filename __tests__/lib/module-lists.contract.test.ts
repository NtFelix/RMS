/**
 * @jest-environment node
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Abgleich der Modullisten (R8) und Sperre des Moduls `kautionen` für Agenten, API-Schlüssel, MCP und OAuth (R2).
 *
 * Modullisten driften zwischen den Stellen auseinander (z. B. kennt die API `betriebskosten`/`api_keys` nicht,
 * der Agent-Builder kein `api_keys`). Dieser Test liest die Quelltexte und vergleicht je Liste die Modulmenge
 * gegen eine EXPLIZITE Soll-Tabelle. Fügt jemand ein Modul hinzu oder entfernt eines, schlägt der Test fehl und
 * erzwingt eine bewusste Entscheidung. Das gilt insbesondere für `kautionen`:
 *
 *   - vorhanden in: Typ `Modul` (permissions-core), Rechte-Editor, MODULE_CONFIG (permission-utils)
 *   - abwesend in: Agent-Builder, API-Key-UI, OAuth-Consent, Sidebar-/Gating-/Route-Listen, mietevo-api,
 *     mietevo-mcp, mietevo-ai (dort sperrt zusätzlich die Datenbank, auch für Owner/Admin)
 *
 * Die Schwester-Repos (api, mcp, ai) werden nur geprüft, wenn die Umgebungsvariable `MIETEVO_REPOS_ROOT` auf das
 * Verzeichnis zeigt, das `mietevo-api`, `mietevo-mcp` und `mietevo-ai` enthält. Ohne sie wird der Cross-Repo-Teil
 * mit Warnung übersprungen (im Worktree liegen die Schwester-Repos nicht daneben).
 */

const repoRoot = join(__dirname, '..', '..');

function readSource(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf-8');
}

/** Entfernt Block- und Zeilenkommentare, damit Kommentartext (z. B. mit ";" oder Anführungszeichen) nichts verfälscht. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** Liefert den Text zwischen dem ersten Treffer von `start` und dem darauffolgenden `end` (jeweils exklusive). */
function between(source: string, start: RegExp, end: RegExp): string {
  const startMatch = start.exec(source);
  if (!startMatch) throw new Error(`Startmuster nicht gefunden: ${start}`);
  const rest = source.slice(startMatch.index + startMatch[0].length);
  const endMatch = end.exec(rest);
  if (!endMatch) throw new Error(`Endmuster nicht gefunden: ${end}`);
  return rest.slice(0, endMatch.index);
}

function matchAll(text: string, pattern: RegExp): string[] {
  return Array.from(text.matchAll(pattern), (m) => m[1]);
}

function sortedUnique(values: string[]): string[] {
  return Array.from(new Set(values)).sort();
}

/** Quote-Muster, das nur das Modul als Schlüssel/Zeichenkette trifft (nicht z. B. "kautionen-actions"). */
const KAUTIONEN_AS_STRING = /['"`]kautionen['"`]/;

// ---------------------------------------------------------------------------------------------------------------------
// Soll-Tabelle: Modulmenge je Liste (RMS)
// ---------------------------------------------------------------------------------------------------------------------

const CORE_MODULES = ['haeuser', 'wohnungen', 'mieter', 'zaehler', 'finanzen', 'betriebskosten', 'dokumente', 'aufgaben', 'vorlagen', 'organisation'];

interface RmsList {
  /** Anzeigename im Testbericht */
  name: string;
  /** Datei (relativ zum RMS-Root) */
  file: string;
  /** Ermittelt die Modulmenge der Liste aus dem Quelltext */
  extract: (source: string) => string[];
  /** Soll-Modulmenge (sortiert) */
  expected: string[];
  /** Begründung gewollter Abweichungen gegenüber CORE_MODULES */
  note: string;
}

const RMS_LISTS: RmsList[] = [
  {
    name: 'Typ Modul (lib/permissions-core.ts)',
    file: 'lib/permissions-core.ts',
    extract: (src) => matchAll(between(stripComments(src), /export type Modul\s*=/, /;/), /'([a-z_]+)'/g),
    expected: sortedUnique([...CORE_MODULES, 'api_keys', 'kautionen']),
    note: 'Superset: zusätzlich api_keys (eigene Verwaltung) und kautionen (GH-6).',
  },
  {
    name: 'Rechte-Editor (module-permission-editor.tsx, MODULES)',
    file: 'components/organisation/module-permission-editor.tsx',
    extract: (src) => matchAll(between(stripComments(src), /const MODULES[^=]*=\s*\[/, /\]\s*as const;/), /key:\s*"([a-z_]+)"/g),
    expected: sortedUnique([...CORE_MODULES, 'kautionen']),
    note: 'api_keys fehlt bewusst (eigene Oberfläche); kautionen mit deaktivierter Spalte "verwalten" (DECISION-35).',
  },
  {
    name: 'MODULE_CONFIG (lib/organisation/permission-utils.tsx)',
    file: 'lib/organisation/permission-utils.tsx',
    extract: (src) => matchAll(between(stripComments(src), /export const MODULE_CONFIG[^=]*=\s*\{/, /\n\};/), /^\s*([a-z_]+):\s*\{\s*label/gm),
    expected: sortedUnique([...CORE_MODULES, 'kautionen']),
    note: 'api_keys fehlt bewusst (kein Eintrag im Rechte-Editor).',
  },
  {
    name: 'Agent-Builder (Step3Permissions.tsx, MODULES)',
    file: 'components/agent-builder/steps/Step3Permissions.tsx',
    extract: (src) => matchAll(between(stripComments(src), /const MODULES\s*=\s*\[/, /\];/), /id:\s*'([a-z_]+)'/g),
    expected: sortedUnique(CORE_MODULES),
    note: 'R2: kautionen darf Agenten nie zugewiesen werden.',
  },
  {
    name: 'API-Key-UI (api-keys/types.ts, AVAILABLE_MODULES)',
    file: 'components/settings/api-keys/types.ts',
    extract: (src) => matchAll(between(stripComments(src), /export const AVAILABLE_MODULES\s*=\s*\[/, /\]\s*as const;/), /id:\s*"([a-z_]+)"/g),
    expected: sortedUnique(['haeuser', 'wohnungen', 'mieter', 'finanzen', 'aufgaben', 'zaehler', 'zaehler_ablesungen']),
    note: 'Entspricht der API-Ressourcenliste (inkl. zaehler_ablesungen); R2: kein kautionen.',
  },
  {
    name: 'OAuth-Consent (actions.ts, ALLOWED_MODULE_SCOPE_KEYS)',
    file: 'app/oauth/consent/actions.ts',
    extract: (src) => matchAll(between(stripComments(src), /const ALLOWED_MODULE_SCOPE_KEYS\s*=\s*new Set\(\[/, /\]\);/), /'([a-z_]+)'/g),
    expected: sortedUnique([
      'properties', 'tenants', 'finanzen', 'zaehler', 'aufgaben', 'dokumente',
      'haeuser', 'wohnungen', 'mieter', 'betriebskosten', 'nebenkosten', 'zaehler_ablesungen', 'vorlagen', 'dokumente_metadaten',
    ]),
    note: 'Consent-Aliase und MCP-Aliase; R2: kein kautionen (sanitizeScopes verwirft unbekannte Schlüssel).',
  },
  {
    name: 'Gating der Sidebar-Module (lib/server/user-data.ts, GATED_MODULES)',
    file: 'lib/server/user-data.ts',
    extract: (src) => matchAll(between(stripComments(src), /const GATED_MODULES\s*=\s*\[/, /\]\s*as const;/), /'([a-z_]+)'/g),
    expected: sortedUnique(['haeuser', 'wohnungen', 'mieter', 'finanzen', 'betriebskosten', 'aufgaben', 'dokumente', 'organisation', 'zaehler']),
    note: 'kautionen hat keine Route/Sidebar-Seite; Aufnahme würde Mitglieder ohne das Modul als eingeschränkt einstufen.',
  },
  {
    name: 'Route-Rechte (proxy.ts, ROUTE_PERMISSIONS)',
    file: 'proxy.ts',
    extract: (src) => matchAll(between(stripComments(src), /const ROUTE_PERMISSIONS[^=]*=\s*\{/, /\n\}/), /"\/[a-z-]+":\s*"([a-z_]+)"/g),
    expected: sortedUnique(['haeuser', 'wohnungen', 'mieter', 'finanzen', 'betriebskosten', 'aufgaben', 'dokumente', 'vorlagen', 'organisation']),
    note: 'kautionen hat keine eigene Route (Dialog in der Mieter-Seite).',
  },
  {
    name: 'Sidebar-Zuordnung (dashboard-sidebar.tsx, SIDEBAR_MODULE_MAP)',
    file: 'components/dashboard/dashboard-sidebar.tsx',
    extract: (src) => matchAll(between(stripComments(src), /const SIDEBAR_MODULE_MAP[^=]*=\s*\{/, /\n\};/), /'\/[a-z-]+':\s*'([a-z_]+)'/g),
    expected: sortedUnique(['haeuser', 'wohnungen', 'mieter', 'finanzen', 'betriebskosten', 'aufgaben', 'dokumente', 'organisation', 'agenten']),
    note: 'kautionen hat keinen Sidebar-Eintrag.',
  },
];

describe('Modullisten im RMS: Abgleich mit der Soll-Tabelle', () => {
  it.each(RMS_LISTS)('$name enthält genau die erwarteten Module', ({ file, extract, expected, note }) => {
    const modules = sortedUnique(extract(readSource(file)));
    // Bei Abweichung zuerst "note" lesen: gewollte Abweichungen stehen in der Soll-Tabelle, nicht im Code.
    expect({ modules, note }).toEqual({ modules: expected, note });
  });

  it('listet kautionen genau in permissions-core, Rechte-Editor und permission-utils (und sonst in keiner Liste)', () => {
    const holders = RMS_LISTS
      .filter(({ file, extract }) => extract(readSource(file)).includes('kautionen'))
      .map(({ file }) => file)
      .sort();

    expect(holders).toEqual([
      'components/organisation/module-permission-editor.tsx',
      'lib/organisation/permission-utils.tsx',
      'lib/permissions-core.ts',
    ]);
  });

  it('enthält Modulschlüssel der Editor-Listen ausschließlich als Teilmenge des Typs Modul', () => {
    const modulTyp = RMS_LISTS[0];
    const typ = new Set(modulTyp.extract(readSource(modulTyp.file)));
    for (const list of RMS_LISTS.slice(1, 4)) {
      const unbekannt = list.extract(readSource(list.file)).filter((m) => !typ.has(m));
      expect({ list: list.name, unbekannt }).toEqual({ list: list.name, unbekannt: [] });
    }
  });

  it('erwähnt kautionen als Zeichenkette in keiner der übrigen Freigabe-/Navigationsdateien (R2)', () => {
    const forbiddenFiles = [
      'components/agent-builder/steps/Step3Permissions.tsx',
      'components/settings/api-keys/types.ts',
      'app/oauth/consent/actions.ts',
      'app/oauth/consent/ConsentUI.tsx',
      'lib/server/user-data.ts',
      'components/dashboard/dashboard-sidebar.tsx',
      'components/common/mobile-bottom-navigation.tsx',
      'proxy.ts',
    ];

    const offenders = forbiddenFiles.filter((file) => KAUTIONEN_AS_STRING.test(stripComments(readSource(file))));
    expect(offenders).toEqual([]);
  });

  it('benennt kautionen in der serverseitigen Sperrliste für Agenten und API-Schlüssel (lib/blocked-modules.ts)', () => {
    const blocked = stripComments(readSource('lib/blocked-modules.ts'));
    expect(blocked).toMatch(/BLOCKED_AGENT_API_MODULES\s*=\s*\[\s*'kautionen'\s*\]/);
  });

  it('wendet die Sperrliste in allen Routen an, die Agenten- oder API-Key-Rechte schreiben', () => {
    const routes = [
      'app/api/agents/route.ts',
      'app/api/agents/[id]/route.ts',
      'app/api/einstellungen/api-keys/route.ts',
      'app/api/einstellungen/api-keys/[id]/genehmigen/route.ts',
    ];

    const withoutGuard = routes.filter((file) => !stripComments(readSource(file)).includes('findBlockedModules('));
    expect(withoutGuard).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Cross-Repo (api, mcp, ai): nur mit MIETEVO_REPOS_ROOT
// ---------------------------------------------------------------------------------------------------------------------

const reposRoot = process.env.MIETEVO_REPOS_ROOT;

if (!reposRoot) {
  console.warn(
    'MIETEVO_REPOS_ROOT ist nicht gesetzt; der Cross-Repo-Teil des Modullisten-Abgleichs (mietevo-api, mietevo-mcp, mietevo-ai) wird übersprungen.'
  );
}

interface SiblingFile {
  name: string;
  /** Pfad relativ zu MIETEVO_REPOS_ROOT */
  path: string;
  /** Liefert den Textbereich, der keine Modulschlüssel `kautionen` enthalten darf */
  region: (source: string) => string;
}

const SIBLING_FILES: SiblingFile[] = [
  {
    name: 'mietevo-api: Typ Modul (src/lib/permissions.ts)',
    path: 'mietevo-api/src/lib/permissions.ts',
    region: (src) => between(stripComments(src), /export type Modul\s*=/, /;/),
  },
  {
    name: 'mietevo-api: RESOURCES (src/routes/router.ts)',
    path: 'mietevo-api/src/routes/router.ts',
    region: (src) => between(stripComments(src), /export const RESOURCES[^=]*=\s*\[/, /\n\];/),
  },
  {
    name: 'mietevo-mcp: MODULE_ALIASES (src/mcp-server.ts)',
    path: 'mietevo-mcp/src/mcp-server.ts',
    region: (src) => between(stripComments(src), /export const MODULE_ALIASES[^=]*=\s*\{/, /\n\};/),
  },
  {
    name: 'mietevo-mcp: TOOL_SCOPE_MAPPINGS (src/mcp-server.ts)',
    path: 'mietevo-mcp/src/mcp-server.ts',
    region: (src) => between(stripComments(src), /export const TOOL_SCOPE_MAPPINGS[^=]*=\s*\{/, /\n\};/),
  },
  {
    name: 'mietevo-ai: TOOL_PERMISSIONS (src/lib/agents/tool-permissions.ts)',
    path: 'mietevo-ai/src/lib/agents/tool-permissions.ts',
    region: (src) => stripComments(src),
  },
];

describe('Modullisten in den Schwester-Repos (nur mit MIETEVO_REPOS_ROOT)', () => {
  for (const sibling of SIBLING_FILES) {
    const absolute = reposRoot ? join(reposRoot, sibling.path) : null;
    const available = absolute !== null && existsSync(absolute);
    const testFn = available ? it : it.skip;

    if (reposRoot && !available) {
      console.warn(`Datei fehlt unter MIETEVO_REPOS_ROOT, Prüfung wird übersprungen: ${sibling.path}`);
    }

    testFn(`${sibling.name} enthält kein Modul "kautionen" und kein Kautionen-Tool (R2)`, () => {
      const region = sibling.region(readFileSync(absolute as string, 'utf-8'));
      // Plausibilitätsprüfung: die Extraktion hat tatsächlich einen Bereich gefunden.
      expect(region.trim().length).toBeGreaterThan(20);
      expect(region).not.toMatch(/kaution/i);
    });
  }
});

describe('Selbsttest der Extraktion', () => {
  it('findet kautionen in einem Typ-Literal, ignoriert aber Kommentare', () => {
    const mitModul = "export type Modul =\n  | 'haeuser'\n  // 'kautionen'; nur Kommentar\n  | 'kautionen';";
    const ohneModul = "export type Modul =\n  | 'haeuser'\n  // 'kautionen'; nur Kommentar\n  | 'mieter';";
    const extract = (src: string) => matchAll(between(stripComments(src), /export type Modul\s*=/, /;/), /'([a-z_]+)'/g);

    expect(extract(mitModul)).toEqual(['haeuser', 'kautionen']);
    expect(extract(ohneModul)).toEqual(['haeuser', 'mieter']);
  });

  it('meldet einen fehlenden Startpunkt statt still eine leere Liste zu liefern', () => {
    expect(() => between('const andere = 1;', /export type Modul\s*=/, /;/)).toThrow('Startmuster nicht gefunden');
  });
});
