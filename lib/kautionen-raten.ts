/**
 * Pure helpers for the instalment plan ("Ratenplan", GH-6, phase 2).
 *
 * Proposal only: the form prefills the rates with `berechneRatenVorschlag`, the database stores what the user
 * confirms (`kaution_raten_planen`). The database does not enforce that the rates add up to the target amount,
 * `ratenSummeAbweichung` only feeds a non-blocking warning.
 *
 * Money is handled as integer cents. Dates are pure `YYYY-MM-DD` string and calendar arithmetic, no `Date`
 * object and no time zone involved.
 *
 * Deliberately NOT a "use server" file (it exports non-async functions).
 */

export type RatenAnzahl = 1 | 2 | 3;

export interface RatenVorschlag {
  /** `YYYY-MM-DD`. */
  faelligkeitsdatum: string;
  /** Target amount of the rate in cents (integer). */
  sollCents: number;
}

const ISO_DATUM = /^(\d{4})-(\d{2})-(\d{2})$/;

function istSchaltjahr(jahr: number): boolean {
  return (jahr % 4 === 0 && jahr % 100 !== 0) || jahr % 400 === 0;
}

function tageImMonat(jahr: number, monat: number): number {
  if (monat === 2) return istSchaltjahr(jahr) ? 29 : 28;
  return [4, 6, 9, 11].includes(monat) ? 30 : 31;
}

interface KalenderTag {
  jahr: number;
  monat: number;
  tag: number;
}

/** Strict `YYYY-MM-DD` with a real calendar day (`2026-02-31` is rejected). `null` otherwise. */
function zerlegeIsoDatum(text: string): KalenderTag | null {
  const treffer = ISO_DATUM.exec(text);
  if (!treffer) return null;
  const jahr = Number(treffer[1]);
  const monat = Number(treffer[2]);
  const tag = Number(treffer[3]);
  if (monat < 1 || monat > 12) return null;
  if (tag < 1 || tag > tageImMonat(jahr, monat)) return null;
  return { jahr, monat, tag };
}

function formatIsoDatum({ jahr, monat, tag }: KalenderTag): string {
  return `${String(jahr).padStart(4, "0")}-${String(monat).padStart(2, "0")}-${String(tag).padStart(2, "0")}`;
}

/**
 * Due date `abstand` months after the first one: same day of the month, clamped to the last day of the target month
 * (31 January -> 28/29 February -> 31 March).
 */
function faelligkeitNachMonaten(start: KalenderTag, abstand: number): string {
  const monateGesamt = start.monat - 1 + abstand;
  const jahr = start.jahr + Math.floor(monateGesamt / 12);
  const monat = (monateGesamt % 12) + 1;
  const tag = Math.min(start.tag, tageImMonat(jahr, monat));
  return formatIsoDatum({ jahr, monat, tag });
}

/**
 * Equal split of the target amount in cents. The LAST rate takes the remainder (1000,00 / 3 -> 333,33, 333,33, 333,34).
 * Due dates: the first one as given, then monthly on the same day of the month.
 *
 * Returns `null` if the input is unusable (target amount not greater than 0, invalid date, anzahl other than 1-3) or
 * if any rate would be below one cent (e.g. 0,02 € in three rates). Never throws.
 */
export function berechneRatenVorschlag(sollCents: number, erstesFaelligkeitsdatum: string, anzahl: RatenAnzahl): RatenVorschlag[] | null {
  if (!Number.isSafeInteger(sollCents) || sollCents <= 0) return null;
  if (anzahl !== 1 && anzahl !== 2 && anzahl !== 3) return null;
  const start = zerlegeIsoDatum(erstesFaelligkeitsdatum);
  if (!start) return null;

  const basis = Math.floor(sollCents / anzahl);
  if (basis < 1) return null;
  const rest = sollCents - basis * anzahl;

  const vorschlag: RatenVorschlag[] = [];
  for (let index = 0; index < anzahl; index += 1) {
    const letzte = index === anzahl - 1;
    vorschlag.push({
      faelligkeitsdatum: faelligkeitNachMonaten(start, index),
      sollCents: letzte ? basis + rest : basis,
    });
  }
  return vorschlag;
}

/**
 * Difference in cents between the sum of the rates and the target amount: `0` if they match, positive if the rates
 * are higher, negative if they are lower.
 */
export function ratenSummeAbweichung(raten: readonly { sollCents: number }[], sollCents: number): number {
  const summe = raten.reduce((gesamt, rate) => gesamt + rate.sollCents, 0);
  return summe - sollCents;
}
