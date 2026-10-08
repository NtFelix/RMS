/**
 * Display helpers for the deposit dialog ("Kautionsmanagement", GH-6).
 *
 * Display only: amounts arrive from the database as JSON numbers, they are formatted here and never
 * calculated with. The only conversion the dialog needs is "display number -> input text" (prefill of the
 * payout amount), which goes through exact integer cents (`lib/kautionen-money.ts`), never through
 * floating point arithmetic.
 */

import { formatCurrency } from "@/utils/format";
import { APP_TIME_ZONE, getTodayISOString } from "@/utils/date-calculations";
import { centsToDecimalString, parseMoneyToCents } from "@/lib/kautionen-money";

const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

const DATE_TIME_FORMAT = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: APP_TIME_ZONE,
});

/** "1.234,56 €". Missing values show a dash (never "0,00 €": a missing value is not zero). */
export function formatBetrag(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "–";
  return formatCurrency(value);
}

/**
 * "TT.MM.JJJJ" for a calendar date (`YYYY-MM-DD`, no time zone involved) or a timestamp (shown in the
 * app time zone Europe/Berlin). Missing or unparsable values show a dash.
 */
export function formatDatum(value: string | null | undefined): string {
  if (typeof value !== "string" || value.trim() === "") return "–";
  const text = value.trim();
  const match = ISO_DATE_ONLY.exec(text);
  if (match) return `${match[3]}.${match[2]}.${match[1]}`;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "–";
  return DATE_TIME_FORMAT.format(parsed);
}

/** Today as `YYYY-MM-DD` in the app time zone (default value date, upper limit of a value date). */
export function heuteIso(): string {
  return getTodayISOString();
}

/**
 * Display number -> text for an amount input in German notation (`"1234,50"`, decimal comma, two decimals),
 * `""` if the number is missing or not exact to the cent. The text is parsed again by the strict money
 * parser (`lib/kautionen-money.ts`) when the form is submitted.
 */
export function betragZuEingabe(value: number | null | undefined): string {
  if (typeof value !== "number") return "";
  const cents = parseMoneyToCents(value);
  return cents === null ? "" : centsToDecimalString(cents).replace(".", ",");
}

/**
 * Idempotency key of a booking form (one per opening of the form): a repeated request with the same key
 * books nothing twice. `crypto.randomUUID()` where available; the fallback builds a version 4 UUID from
 * `crypto.getRandomValues` (it is a de-duplication key, not a secret).
 */
export function neuerIdempotenzSchluessel(): string {
  const cryptoApi = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") return cryptoApi.randomUUID();

  const bytes = new Uint8Array(16);
  if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
