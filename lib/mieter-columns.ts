/**
 * Spaltenlisten der Tabelle "Mieter" ohne das veraltete Altfeld `kaution` (GH-6, Kautionsmanagement).
 *
 * Hintergrund: Das Altfeld `Mieter.kaution` (jsonb) bleibt in diesem Release bestehen (Expand/Contract),
 * ist aber nur noch ein eingefrorener Altbestand. Kautionsdaten liegen in den Kautionstabellen und sind an das
 * Modul `kautionen` gebunden. Ein `select('*')` auf "Mieter" würde das Altfeld weiter an jeden Aufrufer
 * ausliefern (auch ohne Modulrecht), ein ungefilterter Body würde es weiter beschreibbar machen.
 *
 * Regel: Routen und Abfragen, die Mieterzeilen an den Browser oder an API-Clients geben, verwenden
 * `MIETER_SPALTEN_OHNE_KAUTION` statt `*`; Routen, die Mieter schreiben, filtern den Body mit
 * `pickMieterSchreibbareFelder`.
 */

/**
 * Select-Liste für `.select(...)`: alle Spalten der Tabelle "Mieter" außer `kaution` (explizit, damit neue
 * Spalten bewusst aufgenommen werden). Als Literal-Typ deklariert, damit der Select-Parser von postgrest-js die
 * Zeichenkette auch in Template-Literalen (z. B. mit eingebetteten Relationen) auswerten kann.
 */
export const MIETER_SPALTEN_OHNE_KAUTION =
  'id, organisation_id, wohnung_id, name, einzug, auszug, email, telefonnummer, notiz, nebenkosten, status, bewerbung_score, bewerbung_metadaten, bewerbung_mail_id, erstellt_am, erstellt_von, geaendert_am, geaendert_von, geloescht_am, geloescht_von' as const;

/**
 * Spalten, die ein Client beim Anlegen/Ändern eines Mieters setzen darf (Whitelist).
 * Nicht enthalten: `kaution` (Altfeld, eingefroren), Schlüssel/Mandant (`id`, `organisation_id`) und
 * Systemfelder (`erstellt_*`, `geaendert_*`, `geloescht_*`), die die Datenbank bzw. die zentralen
 * Löschfunktionen (soft_delete_record) verwalten.
 */
export const MIETER_SCHREIBBARE_SPALTEN = [
  'wohnung_id',
  'name',
  'einzug',
  'auszug',
  'email',
  'telefonnummer',
  'notiz',
  'nebenkosten',
  'status',
  'bewerbung_score',
  'bewerbung_metadaten',
  'bewerbung_mail_id',
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reduziert einen Request-Body auf die schreibbaren Mieterspalten. Unbekannte und gesperrte Felder
 * (insbesondere `kaution`) werden verworfen. Gibt `null` zurück, wenn der Body kein JSON-Objekt ist.
 */
export function pickMieterSchreibbareFelder(body: unknown): Record<string, unknown> | null {
  if (!isPlainObject(body)) return null;

  const result: Record<string, unknown> = {};
  for (const key of MIETER_SCHREIBBARE_SPALTEN) {
    if (Object.prototype.hasOwnProperty.call(body, key) && body[key] !== undefined) {
      result[key] = body[key];
    }
  }
  return result;
}
