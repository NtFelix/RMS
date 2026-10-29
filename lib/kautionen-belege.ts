/**
 * Belege ("Dokumente") zu Buchungen der Kaution (GH-6, Phase 2b): reine Hilfsfunktionen.
 *
 * Dateinamen, Speicherpfade, Prüfung der Datei, Zuordnung von Fehlercode zu HTTP-Status und die Anzeige von
 * Typ und Größe. Keine Datenbank- und keine Netzwerkzugriffe, daher ohne Mocks testbar.
 *
 * Sicherheit: Der Ordner eines Belegs wird NIE aus dem Client übernommen. Er entsteht aus den IDs, die die
 * Route aus der Datenbank liest (`baueBelegOrdner`). Der Dateiname des Clients wird bereinigt, bevor er als
 * Speicherschlüssel dient. Logs enthalten weder Dateinamen noch Beträge (nur Art und Fehlercode).
 *
 * Nicht sicherheitsgeprüft für Produktion: Upload und Zuordnung sind sicherheitsrelevant und brauchen eine
 * Prüfung durch den Verantwortlichen.
 *
 * Keine "use server"-Datei (sie exportiert keine async-Funktionen als Server Actions).
 */

import { MAX_FILE_SIZE, MAX_FILE_SIZE_LABEL, isSupportedMimeType } from "@/lib/finance-file-constants";
import { KAUTION_FEHLER_FALLBACK_MESSAGE, mapKautionError, type KautionRpcError } from "@/lib/kautionen-errors";
import { isUuid } from "@/lib/kautionen-validation";
import { sharedPath } from "@/lib/storage-paths";

/** Storage bucket for all documents (same bucket as the finance documents). */
export const BELEG_STORAGE_BUCKET = "documents";

/** Lifetime of the signed download link in seconds (short: the link is only needed to open the receipt once). */
export const BELEG_DOWNLOAD_GUELTIG_SEKUNDEN = 300;

/** Upper bound for the name of a receipt (characters, including the extension). */
const MAX_DATEINAME_ZEICHEN = 120;

/** Longest extension kept (`.docx`, `.jpeg` and the like). */
const MAX_ENDUNG_ZEICHEN = 10;

/** Allowance for the form fields (booking ID, multipart boundaries) on top of the file limit. */
const ANFRAGE_ZUSATZ_BYTES = 1024 * 1024;

/** Timestamp prefix that the upload puts in front of the stored file name (`1765000000000_name.pdf`). */
const ZEITSTEMPEL_PRAEFIX = /^\d{10,}_/;

/** Result of the file check: `ok` or the HTTP status with a German message for the user. */
export type BelegDateiPruefung = { ok: true } | { ok: false; status: 400 | 413; message: string };

/**
 * Turns a client file name into a safe name for the storage key: only the last path segment (both separators),
 * no control characters, no leading dots, unsafe characters become `_`, extension cut to a sane length. Never empty.
 */
export function bereinigeBelegDateiname(eingabe: unknown): string {
  const roh = typeof eingabe === "string" ? eingabe : "";
  const letztesSegment = roh.split(/[\\/]/).pop() ?? "";
  const ohneSteuerzeichen = letztesSegment.replace(/[\u0000-\u001f\u007f]/g, "");
  const ersetzt = ohneSteuerzeichen
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9äöüÄÖÜß._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[._]+/, "");

  const punkt = ersetzt.lastIndexOf(".");
  const endungRoh = punkt > 0 ? ersetzt.slice(punkt + 1) : "";
  const endung = endungRoh.replace(/[^a-zA-Z0-9]/g, "").slice(0, MAX_ENDUNG_ZEICHEN);
  const basisRoh = punkt > 0 ? ersetzt.slice(0, punkt) : ersetzt;
  const platz = MAX_DATEINAME_ZEICHEN - (endung.length > 0 ? endung.length + 1 : 0);
  const basis = basisRoh.replace(/[._]+$/, "").slice(0, Math.max(platz, 1));

  const name = endung.length > 0 && basis.length > 0 ? `${basis}.${endung}` : basis;
  return name.length > 0 ? name : "Beleg";
}

/**
 * Unique storage name: the timestamp prefix (as in the finance upload) plus the sanitized client name.
 * The timestamp is a parameter so the function stays deterministic in tests.
 */
export function erzeugeBelegDateiname(eingabe: unknown, zeitstempel: number): string {
  return `${Math.trunc(zeitstempel)}_${bereinigeBelegDateiname(eingabe)}`;
}

/** Name shown to the user and used for the download: the stored name without the timestamp prefix. */
export function anzeigeNameAusDateiname(dateiname: string): string {
  const ohnePraefix = dateiname.replace(ZEITSTEMPEL_PRAEFIX, "");
  return ohnePraefix.length > 0 ? ohnePraefix : dateiname;
}

/**
 * Folder of a receipt: `org_{orgId}/shared/{haus}/{wohnung}/{mieter}` (GH-27: ID-based, house-scoped, see `lib/storage-paths.ts`).
 * Returns `null` if one of the IDs is not a UUID, so no folder is built from malformed values.
 *
 * TRANSITION (GH-27 PR 2 -> PR 3): receipts uploaded before this layout are stored under `user_{uid}/...`. Their path is
 * read from the database (`Dokumente_Metadaten.dateipfad`) and is never rebuilt. Only NEW uploads use this function.
 * Reads of legacy receipts are allowed for their own uploader only (`checkStoragePathAccess` with
 * `allowLegacyOwnRead`); deleting them is not allowed. TODO(GH-27 PR3): backfill, then remove the legacy rule.
 */
export function baueBelegOrdner(ids: { orgId: string; hausId: string; wohnungId: string; mieterId: string }): string | null {
  if (!isUuid(ids.orgId) || !isUuid(ids.hausId) || !isUuid(ids.wohnungId) || !isUuid(ids.mieterId)) return null;
  try {
    return sharedPath(ids.orgId, ids.hausId, ids.wohnungId, ids.mieterId);
  } catch {
    return null;
  }
}

/** Storage key of a receipt: folder (`dateipfad`) plus file name (`dateiname`), as the document management uses it. */
export function baueBelegPfad(dateipfad: string, dateiname: string): string {
  return `${dateipfad}/${dateiname}`;
}

/** Checks a file before it is uploaded: presence, empty, size limit, supported type. Messages are German, formal. */
export function pruefeBelegDatei(datei: { size: number; type: string } | null | undefined): BelegDateiPruefung {
  if (!datei) return { ok: false, status: 400, message: "Bitte wählen Sie eine Datei aus." };
  if (datei.size === 0) return { ok: false, status: 400, message: "Die Datei ist leer." };
  if (datei.size > MAX_FILE_SIZE) {
    return { ok: false, status: 413, message: `Die Datei ist zu groß (max. ${MAX_FILE_SIZE_LABEL}).` };
  }
  if (!isSupportedMimeType(datei.type)) {
    return { ok: false, status: 400, message: "Dieser Dateityp wird nicht unterstützt." };
  }
  return { ok: true };
}

/** `true` if the request is larger than the file limit plus the allowance for the fields (checked before the body is read). */
export function istBelegAnfrageZuGross(contentLength: string | null | undefined): boolean {
  if (typeof contentLength !== "string" || contentLength.trim() === "") return false;
  const groesse = Number(contentLength);
  return Number.isFinite(groesse) && groesse > MAX_FILE_SIZE + ANFRAGE_ZUSATZ_BYTES;
}

/**
 * `true` if the request has no usable declared size (no `Content-Length`, or not a non-negative number). Such a (chunked) request
 * would be buffered completely by `formData()` before the size of the file can be checked, so the upload route refuses it.
 * Browsers always send the length for a `FormData` body; the server enforces that the body is not longer than declared.
 */
export function fehltBelegAnfrageGroesse(contentLength: string | null | undefined): boolean {
  if (typeof contentLength !== "string" || contentLength.trim() === "") return true;
  const groesse = Number(contentLength);
  return !Number.isFinite(groesse) || groesse < 0;
}

/** Status of a mapped deposit error code for the upload route. Unknown codes are server errors (500). */
export function belegFehlerStatus(code: string | undefined): number {
  switch (code) {
    case "KA001":
      return 401;
    case "42501":
    case "KA002":
      return 403;
    case "KA003":
      return 404;
    case "KA004":
    case "KA013":
      return 400;
    case "KA008":
    case "KA009":
    case "23503":
    case "55P03":
      return 409;
    default:
      return 500;
  }
}

export interface BelegFehlerAntwort {
  status: number;
  /** JSON body of the route: `{ error: { message, code? } }`. */
  body: { error: { message: string; code?: string } };
  /** `true` for unclassified errors (for the log: "error" instead of "failed"). */
  unerwartet: boolean;
}

/** Maps an RPC error of `kaution_beleg_zuordnen` to HTTP status and JSON body (message and code only, no raw details). */
export function belegFehlerAntwort(error: KautionRpcError | null | undefined): BelegFehlerAntwort {
  const abgebildet = mapKautionError(error);
  const unerwartet = abgebildet.message === KAUTION_FEHLER_FALLBACK_MESSAGE;
  return {
    status: belegFehlerStatus(abgebildet.code),
    body: { error: abgebildet.code ? { message: abgebildet.message, code: abgebildet.code } : { message: abgebildet.message } },
    unerwartet,
  };
}

/** `true` only for the "not signed in" error of `ensureAuth` (any other failure is not a login problem). */
export function istNichtAngemeldetFehler(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith("Nicht authentifiziert");
}

/**
 * Reads the message of an error body of the upload route on the client. Only a short German message from the
 * server is used; anything else gets the generic fallback text.
 */
export function parseBelegFehler(body: unknown): { message: string; code?: string } {
  const fehler = typeof body === "object" && body !== null && "error" in body ? (body as { error: unknown }).error : null;
  if (typeof fehler === "object" && fehler !== null) {
    const { message, code } = fehler as { message?: unknown; code?: unknown };
    if (typeof message === "string" && message.trim() !== "" && message.length <= 500) {
      return { message, code: typeof code === "string" ? code : undefined };
    }
  }
  return { message: KAUTION_FEHLER_FALLBACK_MESSAGE };
}

/** Short German label of the file type for the list ("PDF", "JPEG-Bild", "Excel-Tabelle" ...). */
export function belegTypLabel(mimeType: string | null | undefined): string {
  switch (mimeType) {
    case "application/pdf":
      return "PDF";
    case "image/jpeg":
      return "JPEG-Bild";
    case "image/png":
      return "PNG-Bild";
    case "image/gif":
      return "GIF-Bild";
    case "image/webp":
      return "WebP-Bild";
    case "application/msword":
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return "Word-Dokument";
    case "application/vnd.ms-excel":
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return "Excel-Tabelle";
    case "text/plain":
      return "Textdatei";
    case "text/csv":
      return "CSV-Datei";
    default:
      return "Datei";
  }
}

/** File size for display in German notation ("512 B", "12,5 KB", "1,2 MB"); a missing value shows a dash. */
export function formatBelegGroesse(bytes: number | null | undefined): string {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes < 0) return "–";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace(".", ",")} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
