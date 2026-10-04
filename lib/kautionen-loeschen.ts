import { getKautionLoeschauswirkungAction } from "@/app/kautionen-actions";
import { useModalStore } from "@/hooks/use-modal-store";
import { toast } from "@/hooks/use-toast";
import { KAUTION_FEHLER_FALLBACK_MESSAGE } from "@/lib/kautionen-errors";
import type { KautionLoeschTabelle } from "@/types/Kaution";

/**
 * Result of the question before deleting houses, apartments or tenants.
 * `pruefsummen` (checksum of the shown impact per ID) belongs to the confirmed deletion; it is empty if no deposit with
 * bookings is affected (then the usual deletion applies).
 */
export type LoeschBestaetigung = { ok: true; pruefsummen: Record<string, string> } | { ok: false };

/**
 * Call BEFORE deleting (after the usual "Are you sure?" question of the screen): loads the impact on the deposits and,
 * only if deposits WITH bookings are affected, shows the overview "Kautionen werden mitgelöscht" and waits for the
 * explicit confirmation.
 *
 * - No right to see deposits (`42501`), no deposits or only deposits without bookings: `ok` without a dialog. The
 *   usual deletion applies (an empty deposit goes to the trash bin with its tenant; the database still blocks deposits
 *   with bookings).
 * - Any other error (e.g. no access to the object): the message is shown, nothing is deleted (`ok: false`).
 * - Cancelled: `ok: false`.
 */
export async function bestaetigeLoeschenMitKautionen(tabelle: KautionLoeschTabelle, ids: string[]): Promise<LoeschBestaetigung> {
  let result: Awaited<ReturnType<typeof getKautionLoeschauswirkungAction>>;
  try {
    result = await getKautionLoeschauswirkungAction({ tabelle, ids });
  } catch {
    toast({ title: "Fehler", description: KAUTION_FEHLER_FALLBACK_MESSAGE, variant: "destructive" });
    return { ok: false };
  }

  if (!result.success || !result.data) {
    if (result.error?.code === "42501") return { ok: true, pruefsummen: {} };
    toast({ title: "Fehler", description: result.error?.message ?? KAUTION_FEHLER_FALLBACK_MESSAGE, variant: "destructive" });
    return { ok: false };
  }

  const auswirkung = result.data;
  if (!auswirkung.kautionen_sichtbar || !auswirkung.kautionen || auswirkung.kautionen.mit_buchungen === 0) {
    return { ok: true, pruefsummen: {} };
  }

  const bestaetigt = await new Promise<boolean>((resolve) => {
    useModalStore.getState().openLoeschUebersicht({ auswirkung, onEntscheidung: resolve });
  });
  if (!bestaetigt) return { ok: false };

  const pruefsummen: Record<string, string> = {};
  for (const eintrag of auswirkung.eintraege) {
    if (typeof eintrag.pruefsumme === "string") pruefsummen[eintrag.id] = eintrag.pruefsumme;
  }
  return { ok: true, pruefsummen };
}
