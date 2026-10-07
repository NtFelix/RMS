import { getKautionLoeschauswirkungAction } from "@/app/kautionen-actions";
import { useModalStore } from "@/hooks/use-modal-store";
import { toast } from "@/hooks/use-toast";
import { KAUTION_FEHLER_FALLBACK_MESSAGE } from "@/lib/kautionen-errors";
import type { KautionLoeschauswirkung, KautionLoeschTabelle } from "@/types/Kaution";

/** Checksum of the shown impact per ID; it belongs to the confirmed deletion (empty if no deposit with bookings is affected). */
export type Pruefsummen = Record<string, string>;

/**
 * `auswirkung` is set only if deposits WITH bookings are affected (then the overview must be confirmed); otherwise `null`
 * (no deposits, only deposits without bookings, or no right to see deposits): the usual deletion applies.
 */
type LoeschVorabpruefung = { ok: true; auswirkung: KautionLoeschauswirkung | null } | { ok: false };

/**
 * Loads the impact of deleting these records on the deposits.
 *
 * - No right to see deposits (`42501`), no deposits or only deposits without bookings: `ok` without an impact. The usual
 *   deletion applies (an empty deposit goes to the trash bin with its tenant; the database still blocks deposits with
 *   bookings).
 * - Any other error (e.g. no access to the object): the message is shown, nothing is deleted (`ok: false`).
 */
export async function pruefeLoeschenMitKautionen(tabelle: KautionLoeschTabelle, ids: string[]): Promise<LoeschVorabpruefung> {
  let result: Awaited<ReturnType<typeof getKautionLoeschauswirkungAction>>;
  try {
    result = await getKautionLoeschauswirkungAction({ tabelle, ids });
  } catch {
    toast({ title: "Fehler", description: KAUTION_FEHLER_FALLBACK_MESSAGE, variant: "destructive" });
    return { ok: false };
  }

  if (!result.success || !result.data) {
    if (result.error?.code === "42501") return { ok: true, auswirkung: null };
    toast({ title: "Fehler", description: result.error?.message ?? KAUTION_FEHLER_FALLBACK_MESSAGE, variant: "destructive" });
    return { ok: false };
  }

  const auswirkung = result.data;
  if (!auswirkung.kautionen_sichtbar || !auswirkung.kautionen || auswirkung.kautionen.mit_buchungen === 0) {
    return { ok: true, auswirkung: null };
  }
  return { ok: true, auswirkung };
}

/** Shows the overview "Kautionen werden mitgelöscht" and waits for the decision: the checksums if confirmed, `null` if cancelled. */
async function zeigeLoeschUebersicht(auswirkung: KautionLoeschauswirkung): Promise<Pruefsummen | null> {
  const bestaetigt = await new Promise<boolean>((resolve) => {
    useModalStore.getState().openLoeschUebersicht({ auswirkung, onEntscheidung: resolve });
  });
  if (!bestaetigt) return null;

  const pruefsummen: Pruefsummen = {};
  for (const eintrag of auswirkung.eintraege) {
    if (typeof eintrag.pruefsumme === "string") pruefsummen[eintrag.id] = eintrag.pruefsumme;
  }
  return pruefsummen;
}

interface LoeschenStartHandlers {
  /** No deposit with bookings is affected: show the usual "Are you sure?" question of the screen; its confirmation deletes without checksums. */
  einfach: () => void;
  /** Deposits with bookings are affected and the overview was confirmed: delete right away (the overview IS the confirmation). */
  loeschen: (pruefsummen: Pruefsummen) => void | Promise<void>;
}

// A second press while the impact is still loading (or the overview is open) is ignored: one start at a time.
let startLaeuft = false;

/**
 * Call when the user presses "Löschen" (BEFORE any question): loads the impact first, then shows exactly ONE dialog.
 * Without booked deposits that is the usual question of the screen (`einfach`); with booked deposits it is the overview
 * "Kautionen werden mitgelöscht", whose confirmation replaces the usual question (`loeschen`). Cancelling the overview or
 * an error deletes nothing.
 */
export async function starteLoeschenMitKautionen(tabelle: KautionLoeschTabelle, ids: string[], handlers: LoeschenStartHandlers): Promise<void> {
  if (startLaeuft) return;
  startLaeuft = true;
  try {
    const vorab = await pruefeLoeschenMitKautionen(tabelle, ids);
    if (!vorab.ok) return;
    if (!vorab.auswirkung) {
      handlers.einfach();
      return;
    }
    const pruefsummen = await zeigeLoeschUebersicht(vorab.auswirkung);
    if (pruefsummen) await handlers.loeschen(pruefsummen);
  } finally {
    startLaeuft = false;
  }
}
