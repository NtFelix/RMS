/**
 * Lese- und Schreibpfad der Mieter-Routen und Server Actions nach GH-30 (Personen-Stammdaten).
 *
 * - Die Tabelle "Mieter" hat seit M1 keine Personenfelder mehr in Benutzung. Lesezugriffe wählen deshalb
 *   MIETER_LESE_SPALTEN und die Person über MIETER_PERSON_EMBED, danach mitPersonenfeldern (lib/personen.ts).
 *   Die Spalten name, email, telefonnummer, status und bewerbung_* werden nie an "Mieter" selektiert, weil
 *   Migration M2 sie löscht.
 * - Schreibzugriffe laufen über die RPCs mieter_anlegen, mieter_aktualisieren und bewerber_anlegen. Diese Datei
 *   übersetzt Eingaben (API-Body oder Formulardaten) in deren Parameter und Fehler in HTTP-Status und Meldung.
 *
 * Kein "use server"-Modul (exportiert synchrone Funktionen und Konstanten).
 */

import { MIETER_PERSON_EMBED, istAnrede, type PersonEingabe } from "@/lib/personen";
import { stripDbCodePrefix } from "@/lib/bulk-delete-summary";
import { ermittleWohnungswechselFehler } from "@/lib/mietverhaeltnis-errors";

/**
 * Spalten der Tabelle "Mieter" für Lesezugriffe. Bewusst ohne das Altfeld `kaution` und ohne die Personenfelder
 * (diese liegen in "Personen" bzw. "Bewerber").
 */
export const MIETER_LESE_SPALTEN =
  "id, organisation_id, wohnung_id, person_id, einzug, auszug, notiz, nebenkosten, erstellt_am, erstellt_von, geaendert_am, geaendert_von, geloescht_am, geloescht_von";

/** Select für Mieter mit eingebetteter Person (Schlüssel `person`). Danach mit `mitPersonenfeldern` abbilden. */
export const MIETER_LESE_SELECT = `${MIETER_LESE_SPALTEN}, ${MIETER_PERSON_EMBED}`;

export type Roh = Record<string, unknown>;

/** true für ein JSON-Objekt (kein Array, kein null). */
export function istEingabeObjekt(wert: unknown): wert is Roh {
  return typeof wert === "object" && wert !== null && !Array.isArray(wert);
}

function hat(objekt: Roh, schluessel: string): boolean {
  return Object.prototype.hasOwnProperty.call(objekt, schluessel) && objekt[schluessel] !== undefined;
}

function textOderNull(wert: unknown): string | null {
  if (wert === null || wert === undefined) return null;
  const text = typeof wert === "string" ? wert : String(wert);
  const getrimmt = text.trim();
  return getrimmt === "" ? null : getrimmt;
}

/**
 * Personenfelder aus einem Body (API) übernehmen. Akzeptiert die neuen Schlüssel (anrede, vorname, nachname, email,
 * telefon, strasse, plz, ort) und die bisherigen Namen: `name` wird zum Nachnamen, `telefonnummer` zu `telefon`.
 * Nur vorhandene Schlüssel werden übernommen (RPCs ändern nur übergebene Felder).
 *
 * Altfeld `name` (Regel für Personen-Stammdaten):
 * - "anlegen": nachname = name, vorname wird weggelassen.
 * - "aendern" ohne vorname und nachname im Body: nachname = name UND vorname = null. Sonst bliebe ein alter
 *   Vorname stehen und es entstünde z. B. "Max Erika Musterfrau".
 */
export function personEingabeAusBody(body: Roh, modus: "anlegen" | "aendern"): PersonEingabe {
  const eingabe: PersonEingabe = {};
  if (hat(body, "anrede")) {
    const anrede = body.anrede;
    eingabe.anrede = istAnrede(anrede) ? anrede : "keine_angabe";
  }
  for (const feld of ["vorname", "nachname", "email", "strasse", "plz", "ort"] as const) {
    if (hat(body, feld)) eingabe[feld] = textOderNull(body[feld]);
  }
  if (hat(body, "telefon")) eingabe.telefon = textOderNull(body.telefon);
  else if (hat(body, "telefonnummer")) eingabe.telefon = textOderNull(body.telefonnummer);
  if (!hat(body, "nachname") && hat(body, "name")) {
    eingabe.nachname = textOderNull(body.name);
    if (modus === "aendern" && !hat(body, "vorname")) eingabe.vorname = null;
  }
  return eingabe;
}

/**
 * Mieterfelder für die RPCs mieter_anlegen und mieter_aktualisieren. Leere Texte werden zu null. Die RPCs weisen
 * unbekannte Schlüssel ab, deshalb wird nur die Whitelist übernommen (keine Personenfelder, kein Altfeld).
 */
export function mieterEingabeAusBody(body: Roh): Roh {
  const eingabe: Roh = {};
  for (const feld of ["wohnung_id", "einzug", "auszug", "notiz", "nebenkosten"] as const) {
    if (!hat(body, feld)) continue;
    const wert = body[feld];
    eingabe[feld] = typeof wert === "string" && wert.trim() === "" ? null : wert;
  }
  return eingabe;
}

/** Eingabe für bewerber_anlegen aus den Mieterfeldern des Formulars (nur wohnung_id und notiz sind dort vorgesehen). */
export function bewerberEingabeAusMieterEingabe(mieter: Roh): Roh {
  const eingabe: Roh = {};
  if (hat(mieter, "wohnung_id") && mieter.wohnung_id !== null) eingabe.wohnung_id = mieter.wohnung_id;
  if (hat(mieter, "notiz") && mieter.notiz !== null) eingabe.notiz = mieter.notiz;
  return eingabe;
}

/** Fehler einer RPC in HTTP-Status und Meldung übersetzen. Die Meldung ohne technisches Präfix, ohne Personendaten. */
export function fehlerAusRpc(error: { code?: string; message?: string }): { status: number; message: string } {
  const wohnungswechsel = ermittleWohnungswechselFehler(error);
  const message = wohnungswechsel ?? (stripDbCodePrefix(String(error.message ?? "")) || "Die Aktion konnte nicht ausgeführt werden.");
  let status = 400;
  if (error.code === "42501") status = 403;
  else if (error.code === "PE003") status = 404;
  return { status, message };
}
