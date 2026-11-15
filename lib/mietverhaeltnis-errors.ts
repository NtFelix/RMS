/**
 * Error mapping for the tenancy and rent history ("Mietverhältnis", GH-17).
 *
 * Contract between database and app: the tenancy functions raise with an `MVnnn` SQLSTATE-like code in
 * `error.code` (PostgREST passes it on). The app branches on that code, never on the message text. Only the
 * fixed German messages below leave this function: database messages, `details` and `hint` are never passed on
 * (they can contain IDs or values). Unknown codes get the fixed fallback and the code `UNBEKANNT`.
 *
 * Not a "use server" file (it exports a non-async function and constants).
 */

import type { MietverhaeltnisActionError, MietverhaeltnisFehlerCode } from "@/types/Mietverhaeltnis";

/** Shape of a PostgREST/Supabase error as far as it is used here. */
interface MietverhaeltnisRpcError {
  code?: unknown;
  message?: unknown;
}

export const MIETVERHAELTNIS_FEHLER_FALLBACK_MESSAGE =
  "Die Aktion konnte nicht ausgeführt werden. Bitte versuchen Sie es erneut.";

/** PostgREST codes for an invalid (`PGRST301`) or expired (`PGRST303`) JWT: the user has to sign in again. */
const JWT_FEHLER_CODES: ReadonlySet<string> = new Set(["PGRST301", "PGRST303"]);

// Map instead of a plain object: the code comes from outside and must not hit `Object.prototype` keys.
const MESSAGES = new Map<MietverhaeltnisFehlerCode, string>([
  ["MV001", "Bitte melden Sie sich erneut an."],
  ["MV003", "Das Mietverhältnis oder der Eintrag wurde nicht gefunden."],
  ["MV004", "Die Eingabe ist ungültig."],
  ["MV005", "Die Miethistorie kann nicht vollständig entfernt werden."],
  ["MV006", "Das Mietverhältnis hat noch aktive Mieter. Die Änderung ist nicht möglich."],
  ["MV007", "Die Wohnung fehlt oder befindet sich im Papierkorb."],
  ["MV008", "Die Verknüpfung ist ungültig."],
  ["MV009", "Die Herkunft dieses Eintrags kann nicht geändert werden."],
  ["MV010", "Der Eintrag ist mit einem Dokument verknüpft und kann nicht entfernt werden."],
  ["42501", "Für diese Aktion fehlt die Berechtigung (Modul Mieter)."],
  ["23503", "Der Datensatz ist verknüpft und kann nicht geändert werden."],
  ["UNBEKANNT", MIETVERHAELTNIS_FEHLER_FALLBACK_MESSAGE],
]);

const KNOWN_CODES: ReadonlySet<string> = new Set(MESSAGES.keys());

/** Error for a fixed code, for errors the actions detect themselves (e.g. validation with `MV004`). */
export function mietverhaeltnisFehler(code: MietverhaeltnisFehlerCode): MietverhaeltnisActionError {
  return { code, message: MESSAGES.get(code) ?? MIETVERHAELTNIS_FEHLER_FALLBACK_MESSAGE };
}

/**
 * Maps an error of a tenancy RPC or query to the UI error. Never throws; `null`, `undefined` and non-object
 * values yield the fallback with code `UNBEKANNT`.
 */
export function mapMietverhaeltnisError(error: unknown): MietverhaeltnisActionError {
  if (!error || typeof error !== "object") return mietverhaeltnisFehler("UNBEKANNT");

  const rawCode = (error as MietverhaeltnisRpcError).code;
  if (typeof rawCode !== "string") return mietverhaeltnisFehler("UNBEKANNT");

  const code = JWT_FEHLER_CODES.has(rawCode) ? "MV001" : rawCode;
  if (KNOWN_CODES.has(code)) return mietverhaeltnisFehler(code as MietverhaeltnisFehlerCode);

  return mietverhaeltnisFehler("UNBEKANNT");
}

/** Constraint of the foreign key tenant -> tenancy; the database raises `23503` with this name when the apartment changes. */
const WOHNUNGSWECHSEL_CONSTRAINT = "fk_mieter_mietverhaeltnis";

export const WOHNUNGSWECHSEL_MIETVERHAELTNIS_MESSAGE =
  "Die Wohnung kann nicht geändert werden, weil der Mieter zu einem Mietverhältnis in der bisherigen Wohnung gehört.";

/**
 * Message for a blocked apartment change of a tenant with a tenancy (`23503`, constraint
 * `fk_mieter_mietverhaeltnis`), otherwise `null`. Only the code and the constraint name are read; database text is
 * never returned.
 */
export function ermittleWohnungswechselFehler(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const { code, message, details } = error as { code?: unknown; message?: unknown; details?: unknown };
  if (code !== "23503") return null;
  const text = [message, details].filter((part): part is string => typeof part === "string").join(" ");
  return text.includes(WOHNUNGSWECHSEL_CONSTRAINT) ? WOHNUNGSWECHSEL_MIETVERHAELTNIS_MESSAGE : null;
}
