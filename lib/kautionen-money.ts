/**
 * Strict money helpers for the deposit management ("Kautionsmanagement", GH-6).
 *
 * Rules (invariant I5 "exact amounts", no silent rounding):
 * - Amounts are handled as integer cents, never as floating point euros.
 * - Input with more than two decimal places is rejected, never rounded (`1.005` would become `1.00`
 *   in the legacy code, `0,1 + 0,2` would not be `0,3`).
 * - Ambiguous input is rejected: `"1.500"` and `"1,500"` can mean 1,50 € or 1.500 €. The legacy
 *   code silently read `"1.500"` as 1,50. Thousands dots are only accepted together with a decimal
 *   comma (`"1.500,00"`).
 * - Upper limit 99.999.999,99 € like the database (`numeric(12,2)`, CHECK <= 99999999.99).
 * - The string sent to the RPC is built with `centsToDecimalString` (`"123.45"`). PostgREST reads it
 *   exactly as `numeric`, so no float is involved on the way into the database.
 *
 * This file is a security- and money-relevant helper. It is not production ready until it has been
 * reviewed by the maintainer. The database validates again and stays authoritative.
 */

/** 99.999.999,99 € in cents. Mirrors the database limit. */
export const KAUTION_MAX_BETRAG_CENTS = 9_999_999_999;

/** Reasons why an input is not an acceptable amount. */
export type MoneyInputFehler =
  | "leer"
  | "ungueltig"
  | "negativ"
  | "mehrdeutig"
  | "nachkommastellen"
  | "zu_gross"
  | "null";

export type MoneyParseResult =
  | { ok: true; cents: number }
  | { ok: false; fehler: Exclude<MoneyInputFehler, "null"> };

export interface MoneyInputOptions {
  /**
   * Accept an amount of exactly 0. Default `false`: deposits and bookings must be greater than 0.
   * Only a few optional fields (rent at contract date) may be 0.
   */
  allowZero?: boolean;
}

const MONEY_INPUT_MESSAGES: Record<MoneyInputFehler, string> = {
  leer: "Bitte geben Sie einen Betrag an.",
  ungueltig: "Bitte geben Sie einen gültigen Betrag an, z. B. 1500,00.",
  negativ: "Der Betrag darf nicht negativ sein.",
  mehrdeutig: "Bitte den Betrag mit Komma angeben, z. B. 1500,00.",
  nachkommastellen: "Beträge dürfen höchstens zwei Nachkommastellen haben.",
  zu_gross: "Der Betrag darf höchstens 99.999.999,99 € betragen.",
  null: "Der Betrag muss größer als 0 sein.",
};

/** Digits only, at least one. */
const DIGITS = /^\d+$/;
/** German grouping: 1-3 digits, then groups of exactly 3 digits separated by dots. */
const DOT_GROUPED = /^\d{1,3}(\.\d{3})+$/;
/** 1-3 leading digits (the shape from which a thousands separator could be read). */
const SHORT_LEAD = /^\d{1,3}$/;

function fail(fehler: Exclude<MoneyInputFehler, "null">): MoneyParseResult {
  return { ok: false, fehler };
}

/**
 * Combines integer and decimal digit strings into cents and checks the upper limit.
 * `decimals` has 0 to 2 digits. No floating point involved, the integer part is limited to 8 digits first.
 */
function centsFromParts(integerDigits: string, decimals: string): MoneyParseResult {
  const integerPart = integerDigits.replace(/^0+(?=\d)/, "");
  // 100.000.000 € and more can never fit (9 digits), avoids Number() on arbitrarily long strings.
  if (integerPart.length > 8) return fail("zu_gross");
  const cents = Number(integerPart) * 100 + Number(decimals.padEnd(2, "0"));
  if (cents > KAUTION_MAX_BETRAG_CENTS) return fail("zu_gross");
  return { ok: true, cents };
}

function parseMoneyString(raw: string): MoneyParseResult {
  const text = raw.trim();
  if (text === "") return fail("leer");
  if (/^-[\d.,]/.test(text)) return fail("negativ");
  // Letters, spaces, currency signs, a leading "+" or exponents are not part of the accepted grammar.
  if (!/^[\d.,]+$/.test(text)) return fail("ungueltig");

  if (text.includes(",")) {
    // German notation: optional dot grouping, exactly one decimal comma.
    const parts = text.split(",");
    if (parts.length !== 2) return fail("ungueltig");
    const [integerRaw, decimalRaw] = parts;
    if (!DIGITS.test(decimalRaw)) return fail("ungueltig"); // "1500,", "2,550.00" (US notation)
    if (decimalRaw.length > 2) return fail("nachkommastellen"); // also "1,500" and "1,005"
    if (!DIGITS.test(integerRaw) && !DOT_GROUPED.test(integerRaw)) return fail("ungueltig");
    return centsFromParts(integerRaw.replace(/\./g, ""), decimalRaw);
  }

  if (text.includes(".")) {
    // No comma: a single dot is a decimal point (format of the number input), unless it could be a
    // thousands separator.
    const parts = text.split(".");
    if (parts.length !== 2) {
      // "1.234.567" can only be a thousands notation without decimal comma: ambiguous by rule.
      return fail(DOT_GROUPED.test(text) ? "mehrdeutig" : "ungueltig");
    }
    const [integerRaw, decimalRaw] = parts;
    if (!DIGITS.test(integerRaw) || !DIGITS.test(decimalRaw)) return fail("ungueltig"); // ".5", "1500."
    if (decimalRaw.length <= 2) return centsFromParts(integerRaw, decimalRaw);
    // Three digits after a short lead ("1.500", "1.005") read as thousands or as decimals.
    return fail(decimalRaw.length === 3 && SHORT_LEAD.test(integerRaw) ? "mehrdeutig" : "nachkommastellen");
  }

  return centsFromParts(text, "");
}

function parseMoneyNumber(value: number): MoneyParseResult {
  if (!Number.isFinite(value)) return fail("ungueltig");
  if (value < 0) return fail("negativ");
  const scaled = value * 100;
  if (scaled > KAUTION_MAX_BETRAG_CENTS + 1) return fail("zu_gross");
  const cents = Math.round(scaled);
  // Tolerate float noise only (1500.3000000000002, 0.1 + 0.2), not real extra decimals (1.005, 0.001).
  // The tolerance grows with the magnitude: near the upper limit one ulp of `value * 100` is ~2e-6.
  const tolerance = Math.max(1e-6, Math.abs(scaled) * 1e-15);
  if (Math.abs(scaled - cents) >= tolerance) return fail("nachkommastellen");
  if (cents > KAUTION_MAX_BETRAG_CENTS) return fail("zu_gross");
  // `Math.round(-0)` is -0: normalise so that callers never see a negative zero.
  return { ok: true, cents: cents === 0 ? 0 : cents };
}

/**
 * Parses an amount and reports why it was rejected.
 * Accepts `string | number` (and rejects everything else at runtime, server actions receive untrusted values).
 * An amount of exactly 0 parses successfully (`cents: 0`); callers that need a positive amount use
 * `isValidMoneyInput` / `getMoneyInputError`.
 */
export function parseMoneyInput(input: unknown): MoneyParseResult {
  if (typeof input === "string") return parseMoneyString(input);
  if (typeof input === "number") return parseMoneyNumber(input);
  return fail("ungueltig");
}

/**
 * Strict: "1500", "1500,5", "1.500,50", "1500.50" -> cents (integer).
 * Ambiguous input ("1.500", "1,500") and everything with more than 2 decimal places -> `null`.
 * Negative, empty, non-numeric input and amounts above 99.999.999,99 € -> `null`.
 * Numbers are only accepted if they are finite and exact to the cent (up to float noise).
 */
export function parseMoneyToCents(input: string | number): number | null {
  const result = parseMoneyInput(input);
  return result.ok ? result.cents : null;
}

/**
 * Whether the input is an acceptable amount. Default: greater than 0 (database: `betrag > 0`).
 * `allowZero` additionally accepts 0 for optional fields.
 */
export function isValidMoneyInput(input: string | number, options: MoneyInputOptions = {}): boolean {
  return getMoneyInputError(input, options) === null;
}

/** German error message for an unacceptable amount (formal address), `null` if the input is fine. */
export function getMoneyInputError(input: string | number, options: MoneyInputOptions = {}): string | null {
  const result = parseMoneyInput(input);
  if (!result.ok) return MONEY_INPUT_MESSAGES[result.fehler];
  if (result.cents === 0 && !options.allowZero) return MONEY_INPUT_MESSAGES.null;
  return null;
}

/**
 * 12345 -> "123.45" (decimal point, always two decimals). This string goes to the RPC: PostgREST reads
 * it exactly as `numeric`. Throws for anything that is not an integer number of cents instead of rounding.
 */
export function centsToDecimalString(cents: number): string {
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError("centsToDecimalString erwartet eine ganzzahlige Centsumme.");
  }
  const absolute = Math.abs(cents);
  const euros = Math.floor(absolute / 100);
  const rest = absolute % 100;
  return `${cents < 0 ? "-" : ""}${euros}.${String(rest).padStart(2, "0")}`;
}
