import { NextRequest, NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { getKautionAbrechnungAction } from "@/app/kautionen-actions";
import { logAction } from "@/lib/logging-middleware";
import { NO_CACHE_HEADERS } from "@/lib/constants/http";
import { KAUTION_FEHLER_FALLBACK_MESSAGE } from "@/lib/kautionen-errors";
import {
  KAUTION_ABRECHNUNG_MAX_ANFRAGE_BYTES,
  KAUTION_ABRECHNUNG_MAX_PDF_BYTES,
  KAUTION_ABRECHNUNG_WORKER_FRIST_MS,
  abrechnungFehlerStatus,
  baueAbrechnungWorkerNutzlast,
  baueKautionAbrechnungDateiname,
  istAbrechnungAnfrageZuGross,
  istPdfBytes,
  parseAbrechnungAnfrage,
  pruefeAbrechnungAnfrageKopf,
  type KautionAbrechnungWorkerNutzlast,
} from "@/lib/kautionen-abrechnung";

/**
 * Settlement PDF of a deposit ("Kautionsabrechnung", GH-6, phase 4).
 *
 * Request: `POST` with JSON `{ tenantId, art: "zwischen" | "end", stichtag? }`.
 * Flow: request form (JSON only, no cross-site request) -> input check -> figures ONLY from the settlement read action
 * (sign-in, module right `ansehen`, object scope and RPC `get_kaution_abrechnung` under the user's session; the client
 * never sends figures) -> worker `POST` (template `kaution-abrechnung`) -> PDF answer.
 *
 * The worker has no authentication of its own on the PDF path, so it is called only from this route, with the shared key
 * from the server environment. No redirects are followed, the call has one time budget (30 s) and at most one retry after
 * a network error. Errors come back as neutral German messages; the text of the worker is never passed on.
 *
 * Privacy: the log has the kind, the status, the duration and an error code only. No name, no figure, no file name.
 * Security relevant: not production ready until the maintainer has reviewed it.
 *
 * A route file only exports HTTP methods and segment config; helpers stay private here or live in
 * `lib/kautionen-abrechnung.ts`.
 */

export const maxDuration = 30;

const LOG_NAME = "kautionAbrechnungPdf";

const MSG_NICHT_VERFUEGBAR = "Die Kautionsabrechnung ist für diesen Mieter nicht verfügbar.";
const MSG_WORKER = "Die Kautionsabrechnung konnte nicht erstellt werden. Bitte versuchen Sie es später erneut.";
const MSG_ZU_GROSS = "Die Anfrage ist zu groß.";
const MSG_UNGUELTIG = "Die Anfrage ist ungültig.";

/** Pause before the one retry after a network error. */
const WORKER_WIEDERHOLUNG_PAUSE_MS = 500;

/** A retry only makes sense if at least this much of the time budget is left. */
const WORKER_MIN_RESTZEIT_FUER_WIEDERHOLUNG_MS = 5_000;

type WorkerErgebnis = { ok: true; puffer: ArrayBuffer } | { ok: false; code: string };

interface Protokoll {
  startedAt: number;
  art?: string;
  code?: string;
}

/** Message for the client: 404 is always neutral, 500 never shows a text of the database or the worker. */
function meldungFuerStatus(status: number, aktionMeldung: string | undefined): string {
  if (status === 404) return MSG_NICHT_VERFUEGBAR;
  if (status === 500) return KAUTION_FEHLER_FALLBACK_MESSAGE;
  return aktionMeldung ?? KAUTION_FEHLER_FALLBACK_MESSAGE;
}

/** Error answer `{ error: { message } }`. Only the status, the kind, the code and the duration reach the log. */
function ablehnen(status: number, message: string, protokoll: Protokoll, unerwartet = false): NextResponse {
  const attribute: Record<string, string | number> = { status, dauer_ms: Date.now() - protokoll.startedAt };
  if (protokoll.art) attribute.art = protokoll.art;
  if (protokoll.code) attribute.code = protokoll.code;
  logAction(LOG_NAME, unerwartet ? "error" : "failed", attribute);
  return NextResponse.json({ error: { message } }, { status, headers: NO_CACHE_HEADERS });
}

/** Releases the body of an answer we do not use (errors of the worker are not read or passed on). */
async function verwerfeAntwort(antwort: Response): Promise<void> {
  try {
    await antwort.body?.cancel();
  } catch {
    // Nothing to release; the answer is not used anyway.
  }
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls the worker with the figures from the database and returns the PDF bytes, or a short error code for the log.
 * One time budget for the whole call; a timeout is not retried (the worker might still be rendering), a network error
 * is retried once.
 */
async function erstelleAbrechnungsPdf(nutzlast: KautionAbrechnungWorkerNutzlast, frist: number): Promise<WorkerErgebnis> {
  const basisUrl = (process.env.MIETEVO_BACKEND_URL ?? "").trim().replace(/\/$/, "");
  const schluessel = process.env.WORKER_AUTH_KEY ?? "";
  if (basisUrl === "" || schluessel === "") return { ok: false, code: "KONFIGURATION" };
  // In production the shared key only travels over HTTPS.
  if (process.env.NODE_ENV === "production" && !basisUrl.startsWith("https://")) return { ok: false, code: "KONFIGURATION" };

  for (let versuch = 1; ; versuch++) {
    const restzeit = frist - Date.now();
    if (restzeit <= 0) return { ok: false, code: "TIMEOUT" };

    const abbruch = new AbortController();
    const timer = setTimeout(() => abbruch.abort(), restzeit);
    try {
      const antwort = await fetch(basisUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/pdf",
          "x-worker-auth": schluessel,
        },
        body: JSON.stringify(nutzlast),
        signal: abbruch.signal,
        // The key and the figures must never reach another host through a redirect.
        redirect: "error",
        cache: "no-store",
      });

      if (!antwort.ok) {
        await verwerfeAntwort(antwort);
        return { ok: false, code: `HTTP_${antwort.status}` };
      }

      const medientyp = ((antwort.headers.get("content-type") ?? "").split(";")[0] ?? "").trim().toLowerCase();
      if (medientyp !== "application/pdf") {
        await verwerfeAntwort(antwort);
        return { ok: false, code: "ANTWORT_TYP" };
      }

      const laenge = Number(antwort.headers.get("content-length") ?? 0);
      if (laenge > KAUTION_ABRECHNUNG_MAX_PDF_BYTES) {
        await verwerfeAntwort(antwort);
        return { ok: false, code: "ANTWORT_GROESSE" };
      }

      const pdf = await antwort.arrayBuffer();
      if (pdf.byteLength > KAUTION_ABRECHNUNG_MAX_PDF_BYTES) return { ok: false, code: "ANTWORT_GROESSE" };
      if (!istPdfBytes(new Uint8Array(pdf))) return { ok: false, code: "ANTWORT_INHALT" };

      return { ok: true, puffer: pdf };
    } catch (fehler) {
      if (fehler instanceof Error && fehler.name === "AbortError") return { ok: false, code: "TIMEOUT" };
      const restzeitNachFehler = frist - Date.now();
      if (versuch < 2 && restzeitNachFehler > WORKER_MIN_RESTZEIT_FUER_WIEDERHOLUNG_MS) {
        await pause(WORKER_WIEDERHOLUNG_PAUSE_MS);
        continue;
      }
      return { ok: false, code: "NETZ" };
    } finally {
      clearTimeout(timer);
    }
  }
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  try {
    // 1. Request form: JSON only, and not from another site (checked before anything is read or queried)
    const kopf = pruefeAbrechnungAnfrageKopf(request.headers.get("content-type"), request.headers.get("sec-fetch-site"));
    if (!kopf.ok) return ablehnen(kopf.status, kopf.message, { startedAt });

    // 2. Body: size limit from the declared length, then the text and the JSON
    if (istAbrechnungAnfrageZuGross(request.headers.get("content-length"))) {
      return ablehnen(413, MSG_ZU_GROSS, { startedAt });
    }
    let text: string;
    try {
      text = await request.text();
    } catch (lesefehler) {
      unstable_rethrow(lesefehler);
      return ablehnen(400, MSG_UNGUELTIG, { startedAt });
    }
    if (new TextEncoder().encode(text).byteLength > KAUTION_ABRECHNUNG_MAX_ANFRAGE_BYTES) {
      return ablehnen(413, MSG_ZU_GROSS, { startedAt });
    }
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return ablehnen(400, MSG_UNGUELTIG, { startedAt });
    }
    const anfrage = parseAbrechnungAnfrage(body);
    if (!anfrage.ok) return ablehnen(400, anfrage.message, { startedAt });
    const { tenantId, art, stichtag } = anfrage.value;
    const protokoll: Protokoll = { startedAt, art };

    // 3. Figures: only from the settlement read action (sign-in, module right, object scope, RPC under the user's session)
    const ergebnis = await getKautionAbrechnungAction({ tenantId, stichtag });
    if (!ergebnis.success) {
      const code = ergebnis.error?.code;
      const status = abrechnungFehlerStatus(code);
      return ablehnen(status, meldungFuerStatus(status, ergebnis.error?.message), { ...protokoll, code }, status === 500);
    }
    const abrechnung = ergebnis.data ?? null;
    // NULL: not visible, no account type or not found. Same answer in all three cases.
    if (abrechnung === null) return ablehnen(404, MSG_NICHT_VERFUEGBAR, { ...protokoll, code: "KEINE_DATEN" });

    // 4. File name from fixed parts and the validated settlement date
    const dateiname = baueKautionAbrechnungDateiname(art, abrechnung.stichtag);
    if (dateiname === null) return ablehnen(502, MSG_WORKER, { ...protokoll, code: "DATUM" }, true);

    // 5. PDF from the worker
    const pdf = await erstelleAbrechnungsPdf(
      baueAbrechnungWorkerNutzlast(art, dateiname, abrechnung),
      Date.now() + KAUTION_ABRECHNUNG_WORKER_FRIST_MS
    );
    if (!pdf.ok) return ablehnen(502, MSG_WORKER, { ...protokoll, code: pdf.code }, true);

    // 6. Answer: the PDF bytes, fixed file name, no caching, no content sniffing
    logAction(LOG_NAME, "success", { art, status: 200, dauer_ms: Date.now() - startedAt });
    return new NextResponse(pdf.puffer, {
      status: 200,
      headers: {
        ...NO_CACHE_HEADERS,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${dateiname}"`,
        "Content-Length": String(pdf.puffer.byteLength),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    unstable_rethrow(error);
    logAction(LOG_NAME, "error", { code: "UNEXPECTED", dauer_ms: Date.now() - startedAt });
    return NextResponse.json({ error: { message: KAUTION_FEHLER_FALLBACK_MESSAGE } }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
