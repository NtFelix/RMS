"use client";

/**
 * Opens a receipt ("Beleg") of a deposit booking: asks the server action for a short-lived download link and opens it
 * in a new tab (`noopener`). Shared by the tab "Dokumente" and the statement (paperclip button).
 *
 * Errors: the dialog decides first (`onFehler`: toast, reload, close, sign-in). If it did not handle the error, the
 * German message is shown as a toast here. The file name is never shown in an error message of this helper.
 */

import { getKautionBelegUrlAction, type KautionActionError } from "@/app/kautionen-actions";
import { toast } from "@/hooks/use-toast";
import { KAUTION_FEHLER_FALLBACK_MESSAGE } from "@/lib/kautionen-errors";

/** `true` if the link was obtained and the tab was opened. */
export async function oeffneKautionBeleg(dokumentId: string, onFehler: (fehler: KautionActionError) => boolean): Promise<boolean> {
  let ergebnis: Awaited<ReturnType<typeof getKautionBelegUrlAction>>;
  try {
    ergebnis = await getKautionBelegUrlAction({ dokumentId });
  } catch {
    ergebnis = { success: false, error: { message: KAUTION_FEHLER_FALLBACK_MESSAGE } };
  }

  if (!ergebnis.success || !ergebnis.data) {
    const fehler = ergebnis.error ?? { message: KAUTION_FEHLER_FALLBACK_MESSAGE };
    if (!onFehler(fehler)) {
      toast({ title: "Beleg nicht verfügbar", description: fehler.message, variant: "destructive" });
    }
    return false;
  }

  // With `noopener` the browser returns no window handle, so a blocked pop-up cannot be detected here.
  window.open(ergebnis.data.url, "_blank", "noopener");
  return true;
}
