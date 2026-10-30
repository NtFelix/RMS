/**
 * Input validation helpers for the server actions of the deposit management ("Kautionsmanagement", GH-6).
 *
 * Server actions receive arbitrary client values, so every value is checked at runtime (type, format, length)
 * before it is sent to an RPC. The database validates again and stays authoritative; these checks give early,
 * friendly German messages and keep malformed values away from the RPCs.
 *
 * Messages are formal German and never contain the rejected value (no personal data in messages or logs).
 * Not a "use server" file (it exports non-async functions).
 */

import {
  KAUTION_MIN_WERTSTELLUNG,
  KAUTION_TEXT_LIMITS,
  KAUTION_VEREINBARUNGSFELDER_JE_ART,
  KAUTION_ZINSSATZ_MAX_NACHKOMMASTELLEN,
  KAUTION_ZINSSTAFFEL_MAX_ZEILEN,
  isKautionZinsmethode,
} from "@/lib/kautionen-constants";
import { istGueltigeIban, normalisiereIban } from "@/lib/kautionen-iban";
import { parseZinssatzProzent } from "@/lib/kautionen-money";
import { UUID_REGEX } from "@/lib/supabase-env";
import type { KautionArt, KautionZinsmethode } from "@/types/Kaution";

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; message: string };

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Whether the value is a UUID string (any version, case-insensitive). */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}

/** Validates a UUID given by the client. `label` is the German noun for the message, e.g. "Mieter-ID". */
export function validateUuid(value: unknown, label: string): ValidationResult<string> {
  if (!isUuid(value)) return { ok: false, message: `Ungültige ${label}.` };
  return { ok: true, value };
}

/**
 * Validates a calendar date `YYYY-MM-DD` (strict format AND a real calendar day, so `2026-02-31` is rejected)
 * that is not before 1990-01-01 (database limit). The upper limit ("not in the future") depends on the
 * Berlin date and is checked by the database (`KA013`), not here.
 */
export function validateKautionDatum(value: unknown, label = "Wertstellung"): ValidationResult<string> {
  if (typeof value !== "string") return { ok: false, message: `Bitte geben Sie ein Datum für ${label} an.` };
  const text = value.trim();
  const match = DATE_PATTERN.exec(text);
  if (!match) return { ok: false, message: `${label}: Bitte geben Sie ein gültiges Datum an (JJJJ-MM-TT).` };

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealDay = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!isRealDay) return { ok: false, message: `${label}: Bitte geben Sie ein gültiges Datum an (JJJJ-MM-TT).` };

  // ISO date strings compare correctly as text.
  if (text < KAUTION_MIN_WERTSTELLUNG) return { ok: false, message: `${label} darf nicht vor dem 01.01.1990 liegen.` };
  return { ok: true, value: text };
}

export interface TextRule {
  /** German noun for the message, e.g. "Der Grund". */
  label: string;
  /** Minimum length after trimming; only checked if the value is present or `required`. */
  min?: number;
  max: number;
  /** Missing, `null`, empty or whitespace-only values are an error instead of `null`. */
  required?: boolean;
}

/**
 * Validates an optional or mandatory free text: only strings, trimmed, empty becomes `null`,
 * length counted in characters (code points, like `char_length` in the database).
 */
export function validateKautionText(value: unknown, rule: TextRule): ValidationResult<string | null> {
  const { label, min = 0, max, required = false } = rule;
  const missing = (): ValidationResult<string | null> =>
    required ? { ok: false, message: `${label} ist erforderlich.` } : { ok: true, value: null };

  if (value === undefined || value === null) return missing();
  if (typeof value !== "string") return { ok: false, message: `${label} ist ungültig.` };

  const text = value.trim();
  if (text === "") return missing();

  const length = Array.from(text).length;
  if (min > 0 && length < min) {
    return { ok: false, message: `${label} muss zwischen ${min} und ${max} Zeichen lang sein.` };
  }
  if (length > max) {
    return { ok: false, message: min > 0 ? `${label} muss zwischen ${min} und ${max} Zeichen lang sein.` : `${label} darf höchstens ${max} Zeichen lang sein.` };
  }
  return { ok: true, value: text };
}

// ---------------------------------------------------------------------------
// Agreement fields of phase 3 (bank account, guarantee, insurance, interest)
// ---------------------------------------------------------------------------

/**
 * IBAN of a bank account: spaces removed and upper-cased, then format and mod-97 check (`lib/kautionen-iban.ts`).
 * Empty or missing means "not given" (`null`). The rejected value is never repeated in the message.
 */
export function validateKautionIban(value: unknown): ValidationResult<string | null> {
  if (value === undefined || value === null) return { ok: true, value: null };
  if (typeof value !== "string") return { ok: false, message: "Die IBAN ist ungültig." };

  const iban = normalisiereIban(value);
  if (iban === "") return { ok: true, value: null };
  if (iban.length > KAUTION_TEXT_LIMITS.iban.max) {
    return { ok: false, message: `Die IBAN darf höchstens ${KAUTION_TEXT_LIMITS.iban.max} Zeichen lang sein.` };
  }
  if (!istGueltigeIban(iban)) return { ok: false, message: "Bitte geben Sie eine gültige IBAN an." };
  return { ok: true, value: iban };
}

/** Interest method: one of the three database values. `null` and missing are not accepted here (the caller omits the key). */
export function validateKautionZinsmethode(value: unknown): ValidationResult<KautionZinsmethode> {
  if (!isKautionZinsmethode(value)) return { ok: false, message: "Die Zinsmethode ist ungültig." };
  return { ok: true, value };
}

/** Whether a separate account was confirmed (`getrennt_angelegt`). Missing or `null` is "not given". */
export function validateKautionGetrennt(value: unknown): ValidationResult<boolean | null> {
  if (value === undefined || value === null) return { ok: true, value: null };
  if (typeof value !== "boolean") return { ok: false, message: "Die Angabe zur getrennten Anlage ist ungültig." };
  return { ok: true, value };
}

/**
 * Checks that every filled agreement field belongs to the deposit type (`KAUTION_VEREINBARUNGSFELDER_JE_ART`).
 * `gefuellt` lists only the fields that carry a value; a field of another type is rejected (`KA004` at the database).
 */
export function validateKautionArtFelder(art: KautionArt, gefuellt: readonly string[]): ValidationResult<null> {
  const erlaubt: ReadonlySet<string> = new Set<string>(KAUTION_VEREINBARUNGSFELDER_JE_ART[art]);
  const fremd = gefuellt.some((feld) => !erlaubt.has(feld));
  if (fremd) return { ok: false, message: "Eine Angabe passt nicht zu dieser Kautionsart." };
  return { ok: true, value: null };
}

/** Interest schedule row as the RPC takes it: exact decimal rate (`"1.5"`). */
export interface ZinsstaffelZeile {
  gueltig_ab: string;
  zinssatz_prozent: string;
}

/**
 * Interest schedule (`kaution_zinsstaffel_setzen`): 0 to 20 rows, each with a valid date (not before 1990) and a strict
 * rate (0 to 100, at most 4 decimal places). Dates must be strictly ascending. Input rows use `gueltigAb` and
 * `zinssatzProzent`. An empty list is allowed (it removes the schedule).
 */
export function validateZinsstaffel(value: unknown): ValidationResult<ZinsstaffelZeile[]> {
  if (!Array.isArray(value)) return { ok: false, message: "Die Zinsstaffel ist ungültig." };
  if (value.length > KAUTION_ZINSSTAFFEL_MAX_ZEILEN) {
    return { ok: false, message: `Eine Zinsstaffel hat höchstens ${KAUTION_ZINSSTAFFEL_MAX_ZEILEN} Zeilen.` };
  }

  const zeilen: ZinsstaffelZeile[] = [];
  for (const eintrag of value) {
    if (typeof eintrag !== "object" || eintrag === null || Array.isArray(eintrag)) {
      return { ok: false, message: "Die Zinsstaffel ist ungültig." };
    }
    const feld = eintrag as Record<string, unknown>;

    const datum = validateKautionDatum(feld.gueltigAb, "Das Gültigkeitsdatum");
    if (!datum.ok) return { ok: false, message: datum.message };

    const satz = parseZinssatzProzent(feld.zinssatzProzent);
    if (satz === null) {
      return {
        ok: false,
        message: `Der Zinssatz muss zwischen 0 und 100 liegen und höchstens ${KAUTION_ZINSSATZ_MAX_NACHKOMMASTELLEN} Nachkommastellen haben.`,
      };
    }

    // ISO date strings compare correctly as text.
    const vorige = zeilen[zeilen.length - 1];
    if (vorige && datum.value <= vorige.gueltig_ab) {
      return { ok: false, message: "Die Gültigkeitsdaten der Zinsstaffel müssen in aufsteigender Reihenfolge liegen." };
    }
    zeilen.push({ gueltig_ab: datum.value, zinssatz_prozent: satz });
  }
  return { ok: true, value: zeilen };
}

/**
 * Interest period of an interest credit (`zinszeitraum_von` inclusive, `zinszeitraum_bis` exclusive). Both dates must be
 * valid, the end must be after the start. The database checks the rest (`KA013`: not in the future, not before the last
 * credit, at most 10 years).
 */
export function validateZinszeitraum(von: unknown, bis: unknown): ValidationResult<{ von: string; bis: string }> {
  const start = validateKautionDatum(von, "Der Zinszeitraum (von)");
  if (!start.ok) return { ok: false, message: start.message };
  const ende = validateKautionDatum(bis, "Der Zinszeitraum (bis)");
  if (!ende.ok) return { ok: false, message: ende.message };
  if (start.value >= ende.value) return { ok: false, message: "Das Ende des Zinszeitraums muss nach dem Beginn liegen." };
  return { ok: true, value: { von: start.value, bis: ende.value } };
}

// ---------------------------------------------------------------------------
// Phase 4: interest hold and settlement date
// ---------------------------------------------------------------------------

/** `true` for missing, `null` or whitespace-only input. */
function istLeer(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}

/**
 * Interest hold ("Einbehalt", `kaution_einbehalt_setzen`): reason and date belong together. Both empty means "remove"
 * (`null`); only one of them is an error. The reason has 3 to 500 characters, the date is a real calendar day not
 * before 1990-01-01. A date in the future is NOT checked here: the database decides (`KA013`).
 */
export function validateKautionEinbehalt(grund: unknown, seit: unknown): ValidationResult<{ grund: string; seit: string } | null> {
  const grundLeer = istLeer(grund);
  const seitLeer = istLeer(seit);
  if (grundLeer && seitLeer) return { ok: true, value: null };
  if (grundLeer || seitLeer) {
    return { ok: false, message: "Grund und Datum des Einbehalts müssen gemeinsam angegeben oder gemeinsam entfernt werden." };
  }

  const begruendung = validateKautionText(grund, {
    label: "Der Grund des Einbehalts",
    min: KAUTION_TEXT_LIMITS.einbehaltGrund.min,
    max: KAUTION_TEXT_LIMITS.einbehaltGrund.max,
    required: true,
  });
  if (!begruendung.ok) return { ok: false, message: begruendung.message };
  if (begruendung.value === null) return { ok: false, message: "Der Grund des Einbehalts ist erforderlich." };

  const datum = validateKautionDatum(seit, "Das Datum des Einbehalts");
  if (!datum.ok) return { ok: false, message: datum.message };

  return { ok: true, value: { grund: begruendung.value, seit: datum.value } };
}

/**
 * Settlement date (`stichtag`, optional). Missing or `null` means "the database default" (today) and is returned as
 * `null`. Otherwise a valid calendar date not before 1990-01-01; "not in the future" is checked by the database.
 */
export function validateKautionStichtag(value: unknown): ValidationResult<string | null> {
  if (value === undefined || value === null) return { ok: true, value: null };
  const datum = validateKautionDatum(value, "Stichtag");
  if (!datum.ok) return { ok: false, message: datum.message };
  return { ok: true, value: datum.value };
}
