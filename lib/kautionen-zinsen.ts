/**
 * Pure date helpers for the interest periods of the deposit management ("Kautionsmanagement", GH-6, phase 3).
 *
 * The database works with half-open periods `[von, bis)`: `von` is included, `bis` is excluded. The form shows and
 * captures the end date INCLUSIVE ("bis einschließlich"), so the form converts with these helpers:
 * the form sends `bis + 1 Tag`, the statement shows `bis - 1 Tag`.
 *
 * Calendar arithmetic only: `YYYY-MM-DD` strings in and out, UTC internally, so no time zone or daylight saving
 * shift can move a day (`Date.UTC` plus whole days of 86 400 000 ms). Leap years and month/year boundaries are
 * handled by the calendar itself.
 *
 * Deliberately NOT a "use server" file (it exports non-async functions).
 */

const ISO_DATUM = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_JE_TAG = 86_400_000;

/** Whether the text is a strict `YYYY-MM-DD` calendar day (`2026-02-31` is not). */
export function istIsoDatum(text: unknown): text is string {
  if (typeof text !== "string") return false;
  const treffer = ISO_DATUM.exec(text);
  if (!treffer) return false;
  const jahr = Number(treffer[1]);
  const monat = Number(treffer[2]);
  const tag = Number(treffer[3]);
  const datum = new Date(Date.UTC(jahr, monat - 1, tag));
  return datum.getUTCFullYear() === jahr && datum.getUTCMonth() === monat - 1 && datum.getUTCDate() === tag;
}

/**
 * Adds whole days to a calendar day (`n` may be negative). `addiereTage("2026-03-01", -1)` is `"2026-02-28"`,
 * `addiereTage("2028-02-28", 1)` is `"2028-02-29"`. Throws a `RangeError` for an invalid day or a non-integer
 * number of days: the callers validate their input first, a wrong value must not reach the database silently.
 */
export function addiereTage(iso: string, n: number): string {
  if (!istIsoDatum(iso)) throw new RangeError("addiereTage erwartet ein gültiges Datum (JJJJ-MM-TT).");
  if (!Number.isInteger(n)) throw new RangeError("addiereTage erwartet eine ganze Anzahl Tage.");

  const [jahr, monat, tag] = iso.split("-").map(Number);
  const ergebnis = new Date(Date.UTC(jahr, monat - 1, tag) + n * MS_JE_TAG);
  const j = String(ergebnis.getUTCFullYear()).padStart(4, "0");
  const m = String(ergebnis.getUTCMonth() + 1).padStart(2, "0");
  const t = String(ergebnis.getUTCDate()).padStart(2, "0");
  return `${j}-${m}-${t}`;
}

/**
 * End of an interest period as the form shows it: the database's exclusive end minus one day.
 * `bis` `2026-01-01` (exclusive) is shown as `2025-12-31` (inclusive).
 */
export function endeEinschliessend(bisExklusiv: string): string {
  return addiereTage(bisExklusiv, -1);
}

/** Exclusive end for the database from the inclusive end of the form: `2025-12-31` becomes `2026-01-01`. */
export function endeExklusiv(bisEinschliessend: string): string {
  return addiereTage(bisEinschliessend, 1);
}

/**
 * Like `endeEinschliessend`, for values from the server or from the form that may be invalid: `null` instead of an
 * exception. Used for display only.
 */
export function endeEinschliessendSicher(bisExklusiv: unknown): string | null {
  if (!istIsoDatum(bisExklusiv)) return null;
  return endeEinschliessend(bisExklusiv);
}
