/**
 * Spaltenlisten der Tabelle "Mieter" ohne das veraltete Altfeld `kaution` (GH-6, Kautionsmanagement)
 * und ohne die personenbezogenen Altfelder (GH-30, Personen-Stammdaten).
 *
 * Hintergrund GH-6: Das Altfeld `Mieter.kaution` (jsonb) bleibt bestehen (Expand/Contract), ist aber nur noch ein
 * eingefrorener Altbestand. Kautionsdaten liegen in den Kautionstabellen und sind an das Modul `kautionen` gebunden.
 *
 * Hintergrund GH-30: Name, E-Mail und Telefon stehen in der Tabelle "Personen" (per `person_id` verknüpft). Die
 * Spalten `name`, `email`, `telefonnummer`, `status` und `bewerbung_*` werden von "Mieter" entfernt (Migration M2),
 * deshalb dürfen sie nicht mehr selektiert, geschrieben oder gefiltert werden. Jede Mieter-Zeile ist ein Mieter;
 * Bewerber kommen ausschließlich aus der Tabelle "Bewerber".
 *
 * Regel: Routen und Abfragen, die Mieterzeilen an den Browser oder an API-Clients geben, verwenden
 * `MIETER_SPALTEN_OHNE_KAUTION` (inkl. eingebetteter Person) und bilden das Ergebnis mit `mitPersonenfeldern`
 * ab. Routen, die Mieter schreiben, filtern den Body mit `pickMieterSchreibbareFelder`; Person-Daten werden
 * über die RPCs `mieter_anlegen` / `mieter_aktualisieren` geschrieben.
 */
import { MIETER_PERSON_EMBED } from './personen';

/**
 * Select-Liste für `.select(...)`: alle Spalten der Tabelle "Mieter" außer `kaution`, `name`, `email`,
 * `telefonnummer`, `status` und `bewerbung_*`, dazu die eingebettete Person (Schlüssel `person`).
 * Explizit aufgelistet, damit neue Spalten bewusst aufgenommen werden.
 */
export const MIETER_SPALTEN_OHNE_KAUTION =
  `id, organisation_id, wohnung_id, person_id, einzug, auszug, notiz, nebenkosten, erstellt_am, erstellt_von, geaendert_am, geaendert_von, geloescht_am, geloescht_von, ${MIETER_PERSON_EMBED}` as const;

/**
 * Spalten, die ein Client beim Ändern eines Mieters direkt auf der Tabelle setzen darf (Whitelist).
 * Nicht enthalten:
 * - `kaution` (Altfeld, eingefroren),
 * - Person-Felder (`name`, `email`, `telefonnummer`, `person_id`): werden über die RPCs
 *   `mieter_anlegen` / `mieter_aktualisieren` mit dem Objekt `p_person` geschrieben,
 * - `status`, `bewerbung_*` (entfernt bzw. Bewerber-Tabelle),
 * - Schlüssel/Mandant (`id`, `organisation_id`) und Systemfelder (`erstellt_*`, `geaendert_*`, `geloescht_*`),
 *   die die Datenbank bzw. die zentralen Löschfunktionen (soft_delete_record) verwalten.
 */
export const MIETER_SCHREIBBARE_SPALTEN = [
  'wohnung_id',
  'einzug',
  'auszug',
  'notiz',
  'nebenkosten',
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reduziert einen Request-Body auf die schreibbaren Mieterspalten. Unbekannte und gesperrte Felder
 * (insbesondere `kaution` und Person-Felder) werden verworfen. Gibt `null` zurück, wenn der Body kein JSON-Objekt ist.
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
