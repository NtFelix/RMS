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

import { KAUTION_MIN_WERTSTELLUNG } from "@/lib/kautionen-constants";
import { UUID_REGEX } from "@/lib/supabase-env";

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
