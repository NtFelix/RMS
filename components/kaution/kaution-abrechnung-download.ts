"use client";

/**
 * Downloads the settlement PDF of a deposit ("Kautionsabrechnung", GH-6, phase 4) from `POST /api/kautionen/abrechnung`.
 *
 * The browser sends only the request (`{ tenantId, art, stichtag }`), never figures: the route takes the data from the
 * settlement read action. The answer is read as a Blob and handed to the browser as a download. The PDF is not stored here.
 *
 * Errors: the status is mapped to a fixed German text. The text of the server is never shown (the route answers with
 * neutral messages, but the UI does not depend on them). The file name comes from the `Content-Disposition` header only
 * if it has the expected shape; otherwise the fixed proposal of `lib/kautionen-abrechnung.ts` is used.
 *
 * Security relevant (download of financial data): not production ready until the maintainer has reviewed it.
 */

import { KAUTION_FEHLER_FALLBACK_MESSAGE } from "@/lib/kautionen-errors";
import { baueKautionAbrechnungDateiname } from "@/lib/kautionen-abrechnung";
import type { KautionAbrechnungArt } from "@/types/Kaution";

/** Route of the settlement PDF (`app/api/kautionen/abrechnung/route.ts`). */
export const KAUTION_ABRECHNUNG_PDF_ROUTE = "/api/kautionen/abrechnung";

/** Fixed texts per answer status of the route (no server text is shown). */
const STATUS_MELDUNGEN: Record<number, string> = {
  401: "Bitte melden Sie sich erneut an.",
  403: "Für diese Aktion fehlt die Berechtigung (Modul Kautionen).",
  404: "Die Kautionsabrechnung ist für diesen Mieter nicht verfügbar.",
  502: "Die Kautionsabrechnung konnte nicht erstellt werden. Bitte versuchen Sie es später erneut.",
};

/** Expected shape of the file name from the header: `Kautionsabrechnung-<Zwischen|End>-JJJJ-MM-TT.pdf`. */
const DATEINAME_MUSTER = /^Kautionsabrechnung-(?:Zwischen|End)-\d{4}-\d{2}-\d{2}\.pdf$/;

export type KautionAbrechnungPdfErgebnis = { ok: true } | { ok: false; message: string };

/** File name from `Content-Disposition: attachment; filename="…"`, only if it has the expected shape (`null` otherwise). */
export function dateinameAusContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const treffer = /filename="([^"]+)"/.exec(header);
  const name = treffer?.[1] ?? null;
  return name !== null && DATEINAME_MUSTER.test(name) ? name : null;
}

/**
 * Requests the PDF and starts the download. Resolves with `ok: false` and a German message for every failure; never
 * throws. The caller shows the message next to the buttons.
 */
export async function ladeKautionAbrechnungPdf(input: {
  tenantId: string;
  art: KautionAbrechnungArt;
  stichtag: string;
}): Promise<KautionAbrechnungPdfErgebnis> {
  let antwort: Response;
  try {
    antwort = await fetch(KAUTION_ABRECHNUNG_PDF_ROUTE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: input.tenantId, art: input.art, stichtag: input.stichtag }),
    });
  } catch {
    return { ok: false, message: KAUTION_FEHLER_FALLBACK_MESSAGE };
  }

  if (!antwort.ok) {
    return { ok: false, message: STATUS_MELDUNGEN[antwort.status] ?? KAUTION_FEHLER_FALLBACK_MESSAGE };
  }

  let blob: Blob;
  try {
    blob = await antwort.blob();
  } catch {
    return { ok: false, message: KAUTION_FEHLER_FALLBACK_MESSAGE };
  }

  const dateiname =
    dateinameAusContentDisposition(antwort.headers.get("content-disposition")) ??
    baueKautionAbrechnungDateiname(input.art, input.stichtag) ??
    "Kautionsabrechnung.pdf";

  // Temporary link: the object URL is released again after the download had time to start.
  const url = URL.createObjectURL(blob);
  const anker = document.createElement("a");
  anker.href = url;
  anker.download = dateiname;
  anker.rel = "noopener";
  anker.style.display = "none";
  document.body.appendChild(anker);
  anker.click();
  anker.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);

  return { ok: true };
}
