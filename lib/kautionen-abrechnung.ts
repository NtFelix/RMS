/**
 * Settlement ("Abrechnung", GH-6, phase 4): pure helpers for the PDF route and the settlement view.
 *
 * Request checks, file name, error status, worker payload and PDF check. No database and no network access, so the
 * functions are tested without mocks. Figures are never calculated here: the database (`get_kaution_abrechnung`) is the
 * only source, the app and the worker only format.
 *
 * Security relevant: the request form (JSON only, no cross-site request), the file name (only fixed parts, no names from
 * the user) and the PDF check belong to the PDF route. Not production ready until the maintainer has reviewed them.
 *
 * Not a "use server" file.
 */

import { WORKER_KAUTION_ABRECHNUNG_TEMPLATE } from "@/lib/constants/worker";
import { isKautionAbrechnungArt } from "@/lib/kautionen-constants";
import { validateKautionDatum, validateKautionStichtag, validateUuid, type ValidationResult } from "@/lib/kautionen-validation";
import type { KautionAbrechnung, KautionAbrechnungArt } from "@/types/Kaution";

/** Limit of the request body of the PDF route (the request holds an ID, a kind and a date). */
export const KAUTION_ABRECHNUNG_MAX_ANFRAGE_BYTES = 4 * 1024;

/** Upper bound of a PDF returned by the worker. Larger answers are refused (`502`). */
export const KAUTION_ABRECHNUNG_MAX_PDF_BYTES = 10 * 1024 * 1024;

/**
 * Total time budget of the request, counted from its start (sign-in, database and the worker call with at most one retry).
 * The route's `maxDuration` is above it, so the neutral 502 comes before the platform ends the function.
 */
export const KAUTION_ABRECHNUNG_WORKER_FRIST_MS = 30_000;

/** Template name the worker uses for the settlement PDF. */
export const KAUTION_ABRECHNUNG_WORKER_TEMPLATE = WORKER_KAUTION_ABRECHNUNG_TEMPLATE;

/** Name part of the file per kind: `Kautionsabrechnung-Zwischen-…` or `Kautionsabrechnung-End-…`. */
const ART_DATEITEIL: Record<KautionAbrechnungArt, string> = { zwischen: "Zwischen", end: "End" };

/** Checked request of the PDF route. Unknown fields of the body are dropped here. */
export interface AbrechnungAnfrage {
  tenantId: string;
  art: KautionAbrechnungArt;
  /** Settlement date `YYYY-MM-DD`, `null` = the database default (today). */
  stichtag: string | null;
}

/** Payload for the worker (`POST /` of the worker, template `kaution-abrechnung`). Only database figures and the kind. */
export interface KautionAbrechnungWorkerNutzlast {
  type: "pdf";
  template: typeof KAUTION_ABRECHNUNG_WORKER_TEMPLATE;
  filename: string;
  data: KautionAbrechnung & { art: KautionAbrechnungArt };
}

/**
 * Checks the body of the request (`{ tenantId, art, stichtag? }`). Anything else in the body is ignored and never
 * forwarded. Messages are German and never repeat the rejected value.
 */
export function parseAbrechnungAnfrage(body: unknown): ValidationResult<AbrechnungAnfrage> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, message: "Die Anfrage ist ungültig." };
  }
  const feld = body as Record<string, unknown>;

  const tenant = validateUuid(feld.tenantId, "Mieter-ID");
  if (!tenant.ok) return { ok: false, message: tenant.message };

  const art = feld.art;
  if (!isKautionAbrechnungArt(art)) return { ok: false, message: "Die Art der Abrechnung ist ungültig." };

  const stichtag = validateKautionStichtag(feld.stichtag);
  if (!stichtag.ok) return { ok: false, message: stichtag.message };

  return { ok: true, value: { tenantId: tenant.value, art, stichtag: stichtag.value } };
}

/**
 * File name of the settlement PDF: `Kautionsabrechnung-<Zwischen|End>-<Stichtag>.pdf`. Built only from fixed parts and a
 * validated date, so no name from the user or the database reaches the header. `null` for an invalid kind or date.
 */
export function baueKautionAbrechnungDateiname(art: unknown, stichtag: string): string | null {
  if (!isKautionAbrechnungArt(art)) return null;
  if (!validateKautionDatum(stichtag, "Stichtag").ok) return null;
  return `Kautionsabrechnung-${ART_DATEITEIL[art]}-${stichtag}.pdf`;
}

/** Result of the request-form check: `ok`, or the status and German message for the answer. */
export type AbrechnungKopfPruefung = { ok: true } | { ok: false; status: 403 | 415; message: string };

/**
 * Checks the form of the request before anything else runs. Only `application/json` is accepted: a plain HTML form from
 * another site cannot send it, and a script from another site needs a CORS preflight that this route does not answer.
 * Requests that the browser marks as cross-site (`Sec-Fetch-Site: cross-site` or `same-site`) are refused as well.
 * Requests without these headers (non-browser clients) are checked by the sign-in only.
 */
export function pruefeAbrechnungAnfrageKopf(contentType: string | null, secFetchSite: string | null): AbrechnungKopfPruefung {
  const medientyp = ((contentType ?? "").split(";")[0] ?? "").trim().toLowerCase();
  if (medientyp !== "application/json") {
    return { ok: false, status: 415, message: "Die Anfrage muss als JSON gesendet werden." };
  }
  if (secFetchSite !== null && secFetchSite !== "same-origin" && secFetchSite !== "none") {
    return { ok: false, status: 403, message: "Die Anfrage wurde abgelehnt." };
  }
  return { ok: true };
}

/** `true` if the declared body size is above the limit (checked before the body is read). */
export function istAbrechnungAnfrageZuGross(contentLength: string | null | undefined): boolean {
  if (typeof contentLength !== "string" || contentLength.trim() === "") return false;
  const groesse = Number(contentLength);
  return Number.isFinite(groesse) && groesse > KAUTION_ABRECHNUNG_MAX_ANFRAGE_BYTES;
}

/**
 * HTTP status for an error code of the settlement read action. `404` covers "not visible", "not found" and "no account"
 * alike (no hint whether the deposit exists). Unknown codes are server errors (`500`), their text is never shown.
 */
export function abrechnungFehlerStatus(code: string | undefined): number {
  switch (code) {
    case "KA001":
      return 401;
    case "42501":
      return 403;
    case "KA004":
    case "KA013":
      return 400;
    case "KA002":
    case "KA003":
    case "KA014":
      return 404;
    default:
      return 500;
  }
}

/**
 * Worker payload. The figures are the database result; the kind is the checked kind from the request and is written last,
 * so a field of the same name in the result cannot change it. No other field of the request is taken over.
 */
export function baueAbrechnungWorkerNutzlast(
  art: KautionAbrechnungArt,
  filename: string,
  abrechnung: KautionAbrechnung
): KautionAbrechnungWorkerNutzlast {
  return {
    type: "pdf",
    template: KAUTION_ABRECHNUNG_WORKER_TEMPLATE,
    filename,
    data: { ...abrechnung, art },
  };
}

/** `true` if the bytes start with the PDF signature `%PDF-`. */
export function istPdfBytes(bytes: Uint8Array): boolean {
  const signatur = [0x25, 0x50, 0x44, 0x46, 0x2d];
  return bytes.byteLength >= signatur.length && signatur.every((byte, index) => bytes[index] === byte);
}
