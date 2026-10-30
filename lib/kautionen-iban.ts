/**
 * IBAN helpers for the deposit management ("Kautionsmanagement", GH-6, phase 3).
 *
 * Pure functions without I/O. The check is the ISO 13616 format plus the mod-97 check digits. It does not know the
 * bank of an account and does not check the length per country. The database checks the IBAN again (`KA004`)
 * and stays authoritative.
 *
 * The mod-97 check is done digit by digit, so no BigInt and no floating point is needed: the remainder stays
 * below 97 after every step, the intermediate value stays far below 2^53.
 *
 * Not a "use server" file (it exports non-async functions).
 */

/** Country code, two check digits, then 11 to 30 alphanumeric characters (BBAN). Total length 15 to 34. */
const IBAN_FORMAT = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;

/**
 * Normalises a typed IBAN: all whitespace removed, upper case. `"de89 3704 0044 0532 0130 00"` becomes
 * `"DE89370400440532013000"`. Anything that is not a string becomes `""`.
 */
export function normalisiereIban(text: unknown): string {
  if (typeof text !== "string") return "";
  return text.replace(/\s+/g, "").toUpperCase();
}

/** Value of one character for the mod-97 check: digits as they are, letters as 10 to 35. */
function ziffernFuerZeichen(zeichen: string): string {
  const code = zeichen.charCodeAt(0);
  if (code >= 48 && code <= 57) return zeichen; // "0".."9"
  return String(code - 55); // "A" (65) -> "10" ... "Z" (90) -> "35"
}

/** Mod-97 over the rearranged IBAN (first four characters moved to the end), digit by digit. */
function mod97(iban: string): number {
  const umgeordnet = iban.slice(4) + iban.slice(0, 4);
  let rest = 0;
  for (const zeichen of umgeordnet) {
    // A letter gives two digits (10 to 35), a digit gives one: each digit is one step, the remainder stays below 97.
    for (const ziffer of ziffernFuerZeichen(zeichen)) {
      rest = (rest * 10 + Number(ziffer)) % 97;
    }
  }
  return rest;
}

/**
 * Whether the text is a valid IBAN: spaces and case are normalised first, then format and mod-97 check digits must
 * match (remainder 1). Accepts only strings; everything else is `false`.
 */
export function istGueltigeIban(text: unknown): boolean {
  const iban = normalisiereIban(text);
  if (!IBAN_FORMAT.test(iban)) return false;
  return mod97(iban) === 1;
}
