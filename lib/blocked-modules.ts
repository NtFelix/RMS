/**
 * Module, die nie an Agenten, API-Schlüssel, MCP-Clients oder OAuth-Consents vergeben werden dürfen (R2).
 *
 * `kautionen` (Kautionsmanagement, GH-6) enthält Geld- und Kontodaten. Die Datenbank sperrt das Modul für diese
 * Kontexte hart (`check_permission` liefert dort immer `false`, auch für Owner/Admin). Die Oberflächen führen
 * das Modul bewusst nicht in ihren Auswahllisten. Die Routen, die Agenten- und API-Schlüssel-Rechte schreiben,
 * validieren Modulschlüssel sonst nicht; die UI-Listen allein wären daher keine Sperre. Diese Prüfung lehnt
 * Anfragen mit gesperrten Modulen serverseitig ab (Defense in Depth).
 */
export const BLOCKED_AGENT_API_MODULES = ['kautionen'] as const;

const BLOCKED_SET: ReadonlySet<string> = new Set<string>(BLOCKED_AGENT_API_MODULES);

function isBlockedKey(key: unknown): key is string {
  return typeof key === 'string' && BLOCKED_SET.has(key.trim().toLowerCase());
}

/**
 * Liefert die gesperrten Modulschlüssel in `berechtigungen.module` (Agenten-Format
 * `{ module: { <modul>: string[] } }` und API-Schlüssel-Format `{ module: { <modul>: { <aktion>: boolean } } }`).
 * Schlüssel werden ohne Beachtung von Groß-/Kleinschreibung und Leerraum verglichen.
 * Die Rückgabe ist leer, wenn kein gesperrtes Modul enthalten ist (oder die Struktur unbekannt ist).
 */
export function findBlockedModules(berechtigungen: unknown): string[] {
  if (typeof berechtigungen !== 'object' || berechtigungen === null || Array.isArray(berechtigungen)) {
    return [];
  }

  const modules = (berechtigungen as { module?: unknown }).module;
  if (Array.isArray(modules)) {
    return modules.filter(isBlockedKey);
  }
  if (typeof modules === 'object' && modules !== null) {
    return Object.keys(modules).filter(isBlockedKey);
  }
  return [];
}
