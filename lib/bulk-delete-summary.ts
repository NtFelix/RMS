/**
 * Hilfen für das Löschen mehrerer Datensätze in der UI (GH-6, Kautionsmanagement).
 *
 * Seit der Kautionsverwaltung kann das Löschen eines Mieters (oder einer Wohnung/eines Hauses) von der Datenbank
 * abgelehnt werden, z. B. weil der Mieter eine hinterlegte Kaution hat. Diese Gründe sollen dem Nutzer angezeigt
 * werden, statt verworfen zu werden ("3 Mieter konnten nicht gelöscht werden" ohne Begründung).
 *
 * Datenschutz: Es werden ausschließlich die (deutschen, personenfreien) Meldungen der Datenbank verwendet,
 * nie Namen oder IDs. Kein "use server"-Modul (exportiert nur synchrone Funktionen).
 */

/** Ergebnisform der Server Actions zum Löschen (`{ success, error?: { message } }`). */
export interface DeleteActionResultLike {
  success: boolean;
  error?: { message?: string } | null;
}

export interface BulkDeleteSummary {
  successCount: number;
  errorCount: number;
  /** Verschiedene Gründe der fehlgeschlagenen Löschungen (je Grund einmal, in Reihenfolge des ersten Auftretens). */
  reasons: string[];
}

/** Obergrenze je Grund: Die Meldungen der Datenbank sind kurze Sätze. */
const MAX_REASON_LENGTH = 300;

/** SQLSTATE der Löschsperren der Datenbank (z. B. Mieter mit hinterlegter Kaution): fachliche Ablehnung, kein Serverfehler. */
export const DELETE_BLOCKED_SQLSTATE = "KA009";

/** Entfernt das stabile Präfix `KAUT_GESPERRT: ` einer Datenbankmeldung (Vertrag: `<CODE>: <deutsche Meldung>`). */
export function stripDbCodePrefix(message: string): string {
  return message.replace(/^[A-Z][A-Z_]*:\s*/, "").trim();
}

/**
 * Fehler einer abgelehnten Löschung: Meldung ohne technisches Präfix, SQLSTATE (falls bekannt) als `code`,
 * damit Aufrufer eine fachliche Ablehnung (`KA009`) von einem technischen Fehler unterscheiden können.
 */
export function createDeleteError(message: string, code?: string): Error {
  const error = new Error(stripDbCodePrefix(message));
  if (code) Object.assign(error, { code });
  return error;
}

/** `true`, wenn die Datenbank die Löschung fachlich abgelehnt hat (Löschsperre, SQLSTATE `KA009`). */
export function isDeleteBlockedError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === DELETE_BLOCKED_SQLSTATE;
}

/** Nimmt die (bereinigte, gekürzte) Meldung in die Liste der Gründe auf, falls sie neu und nicht leer ist. */
function addReason(reasons: string[], raw: unknown): void {
  if (typeof raw !== "string") return;
  const reason = stripDbCodePrefix(raw).slice(0, MAX_REASON_LENGTH);
  if (reason && !reasons.includes(reason)) reasons.push(reason);
}

/** Zählt Erfolge/Fehler und sammelt die verschiedenen Fehlergründe der Ergebnisse von `Promise.allSettled`. */
export function summarizeBulkDeleteResults(results: PromiseSettledResult<DeleteActionResultLike>[]): BulkDeleteSummary {
  let successCount = 0;
  let errorCount = 0;
  const reasons: string[] = [];

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.success) {
      successCount++;
      continue;
    }
    errorCount++;
    // Eine abgelehnte Promise hat keine verwertbare Meldung (technische Ausnahme): zählt nur als Fehler.
    if (result.status !== "fulfilled") continue;
    addReason(reasons, result.value.error?.message);
  }

  return { successCount, errorCount, reasons };
}

/**
 * Wie `summarizeBulkDeleteResults`, aber für Löschaufrufe, die eine Ablehnung als Ausnahme werfen
 * (`softDeleteEntryAction`, `createDeleteError`): Die Meldung der Ausnahme ist der Grund. `blocked` ist `true`,
 * wenn mindestens eine Löschung fachlich abgelehnt wurde (`KA009`).
 */
export function summarizeSettledDeletes(results: PromiseSettledResult<unknown>[]): BulkDeleteSummary & { blocked: boolean } {
  let successCount = 0;
  let errorCount = 0;
  let blocked = false;
  const reasons: string[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      successCount++;
      continue;
    }
    errorCount++;
    if (isDeleteBlockedError(result.reason)) blocked = true;
    addReason(reasons, result.reason instanceof Error ? result.reason.message : undefined);
  }

  return { successCount, errorCount, reasons, blocked };
}

/** Antwort der Massenlösch-Routen (`/api/.../bulk-delete`): HTTP-Status und JSON-Körper. */
export interface BulkDeleteResponse {
  status: number;
  body: BulkDeleteSummary & { error?: string };
}

/**
 * Baut die Antwort einer Massenlösch-Route aus dem Ergebnis aller Einzellöschungen.
 *
 * - Mindestens eine Löschung gelungen (auch bei Teilerfolg): HTTP 200 mit `successCount`, `errorCount` und den
 *   Gründen der übrigen. Die Liste muss neu geladen werden, der Client zeigt die Gründe an.
 * - Keine gelungen: HTTP 409 bei fachlicher Ablehnung (Löschsperre), sonst 500, mit `error` (Gründe, sonst
 *   `fallbackError`).
 */
export function buildBulkDeleteResponse(
  summary: BulkDeleteSummary & { blocked?: boolean },
  fallbackError: string
): BulkDeleteResponse {
  const { successCount, errorCount, reasons, blocked = false } = summary;
  const body = { successCount, errorCount, reasons };
  if (successCount > 0 || errorCount === 0) return { status: 200, body };
  return { status: blocked ? 409 : 500, body: { ...body, error: reasons.length > 0 ? reasons.join(" ") : fallbackError } };
}

/**
 * Text für einen Hinweis: "Grund: ..." bzw. "Gründe: ... | ...". Mehr als `maxReasons` verschiedene Gründe
 * werden gekürzt ("und N weitere"). Leere Liste: leerer Text.
 */
export function formatFailureReasons(reasons: string[], maxReasons = 3): string {
  if (reasons.length === 0) return "";
  const shown = reasons.slice(0, maxReasons);
  const rest = reasons.length - shown.length;
  const label = reasons.length === 1 ? "Grund" : "Gründe";
  return `${label}: ${shown.join(" | ")}${rest > 0 ? ` (und ${rest} weitere)` : ""}`;
}

/**
 * Satzende der Erfolgsmeldung einer Massenlöschung nach "N Einträge erfolgreich gelöscht": "." ohne Fehlschläge,
 * sonst ", M fehlgeschlagen. Grund: ..." (Gründe ohne technisches Präfix, siehe `formatFailureReasons`).
 */
export function formatBulkDeleteSuffix(failedCount: number, reasons: string[]): string {
  if (failedCount <= 0) return ".";
  const reasonText = formatFailureReasons(reasons);
  return `, ${failedCount} fehlgeschlagen.${reasonText ? ` ${reasonText}` : ""}`;
}
