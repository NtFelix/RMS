/**
 * Error mapping for the deposit management ("Kautionsmanagement", GH-6).
 *
 * Contract between database and app: all deposit functions raise
 * `RAISE EXCEPTION '<CODE>: <deutsche Meldung>' USING ERRCODE = '<SQLSTATE>'`. PostgREST returns the
 * SQLSTATE as `error.code` and the text as `error.message`. The app branches on `error.code` (stable),
 * never on the message text.
 *
 * Privacy: only the code and the messages listed here ever leave this function. The generic
 * PostgREST fields `details` and `hint` are never passed on (a unique violation puts key values in
 * `details`). For unknown errors the message is a fixed German sentence and the code is dropped (no raw
 * SQLSTATE/PostgREST code reaches the client); the raw message stays out of the UI and out of the logs.
 *
 * Not a "use server" file (it exports a non-async function and constants).
 */

import { stripDbCodePrefix } from "@/lib/bulk-delete-summary";

/** Shape of a PostgREST/Supabase error as far as it is used here. */
export interface KautionRpcError {
  code?: string;
  message?: string;
  details?: string;
}

/** What the UI should do with the error. */
export type KautionFehlerVerhalten =
  | "anmelden" // KA001: sign in again (redirect/toast)
  | "berechtigung" // 42501: disable the buttons
  | "dialog_schliessen" // KA002: close the dialog
  | "neu_laden" // KA003, KA006, KA008: reload the data
  | "formular" // KA004, KA005, KA007, KA011, KA013, KA014, KA015: show at the form, keep it open
  | "toast" // KA009, KA016, 23503 and unknown errors
  | "wiederholen"; // 55P03: offer to retry

export interface KautionFehler {
  /**
   * Normalised, stable code from the list of this module (`KA008` also for the unique violation `23505`, `KA001` also
   * for an invalid or expired JWT). `undefined` for unknown errors: raw SQLSTATE/PostgREST codes are not passed on.
   */
  code?: string;
  /** German, formal address, free of personal data. */
  message: string;
  verhalten: KautionFehlerVerhalten;
}

export const KAUTION_FEHLER_FALLBACK_MESSAGE =
  "Die Aktion konnte nicht ausgeführt werden. Bitte versuchen Sie es erneut.";

/** Name of the partial unique index "one active deposit per tenant row". */
const AKTIVE_KAUTION_INDEX = "idx_kautionen_mieter_id_aktiv";

/** Upper bound for pass-through messages, the database messages are short sentences. */
const MAX_DB_MESSAGE_LENGTH = 500;

interface FixedEntry {
  message: string;
  verhalten: KautionFehlerVerhalten;
}

interface PassThroughEntry {
  fallback: string;
  verhalten: KautionFehlerVerhalten;
}

// Maps instead of plain objects: the code comes from outside and must not hit `Object.prototype` keys.

const KA008_ENTRY: FixedEntry = {
  message: "Für diesen Mieter ist bereits eine Kaution angelegt.",
  verhalten: "neu_laden",
};

/** Codes with a fixed UI text (the database message is not used). */
const FIXED = new Map<string, FixedEntry>([
  ["KA001", { message: "Bitte melden Sie sich erneut an.", verhalten: "anmelden" }],
  ["42501", { message: "Für diese Aktion fehlt die Berechtigung (Modul Kautionen).", verhalten: "berechtigung" }],
  ["KA002", { message: "Kein Zugriff auf dieses Objekt.", verhalten: "dialog_schliessen" }],
  [
    "KA003",
    { message: "Der Datensatz wurde nicht gefunden (evtl. bereits geändert oder gelöscht).", verhalten: "neu_laden" },
  ],
  ["KA006", { message: "Die Buchung ist bereits storniert.", verhalten: "neu_laden" }],
  ["KA008", KA008_ENTRY],
  ["23503", { message: "Der Datensatz ist verknüpft und kann nicht gelöscht werden.", verhalten: "toast" }],
  [
    "55P03",
    {
      message: "Die Kaution wird gerade bearbeitet. Bitte versuchen Sie es in einem Moment erneut.",
      verhalten: "wiederholen",
    },
  ],
]);

/**
 * Codes whose (German) database message is passed on after removing the `CODE:` prefix.
 * The fallback text is used when the message is missing or empty.
 */
const PASS_THROUGH = new Map<string, PassThroughEntry>([
  ["KA004", { fallback: "Die Eingabe ist ungültig.", verhalten: "formular" }],
  ["KA005", { fallback: "Der Kontostand würde dadurch unter 0 fallen.", verhalten: "formular" }],
  ["KA007", { fallback: "Die Zinsgutschrift verletzt die zeitliche Reihenfolge.", verhalten: "formular" }],
  ["KA009", { fallback: "Die Aktion ist gesperrt, weil die Daten verknüpft oder unveränderlich sind.", verhalten: "toast" }],
  ["KA011", { fallback: "Der Ratenplan lässt diese Änderung nicht zu.", verhalten: "formular" }],
  ["KA013", { fallback: "Das Datum ist ungültig.", verhalten: "formular" }],
  ["KA014", { fallback: "Diese Kautionsart führt kein Konto.", verhalten: "formular" }],
  ["KA015", { fallback: "Diese Funktion ist noch nicht verfügbar.", verhalten: "formular" }],
  ["KA016", { fallback: "Die Auswirkung hat sich geändert. Bitte prüfen Sie die Übersicht erneut.", verhalten: "toast" }],
]);

/** PostgREST codes for an invalid (`PGRST301`) or expired (`PGRST303`) JWT: the user has to sign in again. */
const JWT_FEHLER_CODES: ReadonlySet<string> = new Set(["PGRST301", "PGRST303"]);

/** UI behaviour for an already mapped code (for components that only see `error.code` of an action result). */
export function getKautionFehlerVerhalten(code: string | undefined): KautionFehlerVerhalten {
  if (!code) return "toast";
  return FIXED.get(code)?.verhalten ?? PASS_THROUGH.get(code)?.verhalten ?? "toast";
}

/**
 * Maps a PostgREST/Supabase error of a deposit RPC to a UI message and behaviour.
 * Never throws; `null`, `undefined` and non-object values yield the generic message.
 */
export function mapKautionError(error: KautionRpcError | null | undefined): KautionFehler {
  // Unknown errors: neutral text, no code (the raw code stays inside this function).
  const generic = (): KautionFehler => ({ message: KAUTION_FEHLER_FALLBACK_MESSAGE, verhalten: "toast" });

  if (!error || typeof error !== "object") return generic();

  const rawCode = typeof error.code === "string" ? error.code : undefined;
  const message = typeof error.message === "string" ? error.message : "";

  if (!rawCode) return generic();
  const code = JWT_FEHLER_CODES.has(rawCode) ? "KA001" : rawCode;

  // Race on creating a deposit: only the partial unique index of "one active deposit per tenant" counts.
  // `details` is deliberately not read: it contains key values.
  if (code === "23505") {
    if (message.includes(AKTIVE_KAUTION_INDEX)) {
      return { code: "KA008", ...KA008_ENTRY };
    }
    return generic();
  }

  const fixed = FIXED.get(code);
  if (fixed) return { code, ...fixed };

  const passThrough = PASS_THROUGH.get(code);
  if (passThrough) {
    const text = stripDbCodePrefix(message);
    return {
      code,
      message: text ? text.slice(0, MAX_DB_MESSAGE_LENGTH) : passThrough.fallback,
      verhalten: passThrough.verhalten,
    };
  }

  // Unknown code (including KA010/KA012, which are deliberately not assigned): never show the raw message or code.
  return generic();
}
