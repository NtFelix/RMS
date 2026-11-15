/**
 * Formatting and input helpers of the tenancy section (GH-17). German display, ISO dates as data.
 * Pure functions, no React.
 */

import type { MietEintragKurz } from "@/types/Mietverhaeltnis";

/** Lower and upper limit of the database for dates; the same limits as the server checks. */
const MIN_DATUM = "1900-01-01";
const MAX_DATUM = "2100-12-31";

export const FEHLER_DATUM = "Bitte geben Sie ein gültiges Datum an.";
export const FEHLER_BETRAG = "Bitte geben Sie einen Betrag von 0 bis 99.999.999,99 mit höchstens zwei Nachkommastellen an.";
export const NOTIZ_MAX_LAENGE = 2000;
export const GRUND_MAX_LAENGE = 500;

const euroFormatter = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

export function formatEuro(betrag: number): string {
  return euroFormatter.format(betrag);
}

/** `YYYY-MM-DD` as `TT.MM.JJJJ` without time zone effects. */
export function formatDatum(iso: string): string {
  const [jahr, monat, tag] = iso.split("-");
  return jahr && monat && tag ? `${tag}.${monat}.${jahr}` : iso;
}

/** Today as `YYYY-MM-DD` in local time. */
export function heuteIso(): string {
  const jetzt = new Date();
  const monat = String(jetzt.getMonth() + 1).padStart(2, "0");
  const tag = String(jetzt.getDate()).padStart(2, "0");
  return `${jetzt.getFullYear()}-${monat}-${tag}`;
}

/** Current rent: the entry with the latest `gueltig_ab` up to `stichtag`, or `null` if there is none. */
export function aktuelleMiete(mieten: MietEintragKurz[], stichtag: string): number | null {
  let treffer: MietEintragKurz | null = null;
  for (const eintrag of mieten) {
    if (eintrag.gueltig_ab <= stichtag && (treffer === null || eintrag.gueltig_ab > treffer.gueltig_ab)) {
      treffer = eintrag;
    }
  }
  return treffer ? treffer.betrag : null;
}

/** German decimal input (`850,50` or `850.50`, at most two places) as number, or `null`. */
export function parseBetragEingabe(text: string): number | null {
  const normalisiert = text.trim().replace(",", ".");
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(normalisiert)) return null;
  const betrag = Number(normalisiert);
  return Number.isFinite(betrag) && betrag <= 99999999.99 ? betrag : null;
}

/** Amount as German input text (`800,00`). */
export function betragAlsEingabe(betrag: number): string {
  return betrag.toFixed(2).replace(".", ",");
}

/** `YYYY-MM-DD` as a real calendar day within the database limits. */
export function istGueltigesDatum(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [jahr, monat, tag] = iso.split("-").map(Number);
  const datum = new Date(Date.UTC(jahr, monat - 1, tag));
  const echterTag = datum.getUTCFullYear() === jahr && datum.getUTCMonth() === monat - 1 && datum.getUTCDate() === tag;
  return echterTag && iso >= MIN_DATUM && iso <= MAX_DATUM;
}

/** Optional date field: empty is `null`, a valid date is kept, anything else is `undefined` (invalid). */
export function datumEingabe(text: string): string | null | undefined {
  const wert = text.trim();
  if (wert === "") return null;
  return istGueltigesDatum(wert) ? wert : undefined;
}

/** Trimmed text, or `null` if empty. */
export function textOderNull(text: string): string | null {
  const wert = text.trim();
  return wert === "" ? null : wert;
}

/** Length in characters (code points), counted the same way as on the server. */
export function zeichenZahl(text: string): number {
  return Array.from(text).length;
}
