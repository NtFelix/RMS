"use client";

import { useCallback } from "react";
import { getKautionenListeAction } from "@/app/kautionen-actions";
import { useModalStore } from "@/hooks/use-modal-store";
import type { Tenant } from "@/types/Tenant";

type KautionOeffnenMieter = Pick<Tenant, "id" | "name"> & { wohnung_id?: string | null };
type KautionOeffnenOptionen = { tab?: "uebersicht" | "raten" | "kontoauszug" | "dokumente"; kautionId?: string };

/**
 * Öffnet die Kaution eines Mieters. Hat der Mieter mehrere Kautionen (höchstens eine je Mietverhältnis), erscheint
 * zuerst die Auswahl (`KautionAuswahlDialog`); sonst öffnet der Kautionsdialog direkt wie bisher.
 *
 * - Eine explizite `kautionId` (z. B. aus der Auswahl) öffnet immer direkt, ohne Liste.
 * - Scheitert das Laden der Liste oder liefert sie nichts Brauchbares, öffnet der Dialog trotzdem; diese Funktion wirft nie.
 * - Nur UX: Die Rechte prüft der Server bei jeder Aktion erneut.
 */
export function useKautionOeffnen() {
  return useCallback(async (tenant: KautionOeffnenMieter, options?: KautionOeffnenOptionen): Promise<void> => {
    if (options?.kautionId) {
      useModalStore.getState().openKautionModal(tenant, options);
      return;
    }

    try {
      const result = await getKautionenListeAction(tenant.id);
      const kautionen = result?.success ? result.data?.kautionen : undefined;
      if (Array.isArray(kautionen) && kautionen.length > 1) {
        useModalStore.getState().openKautionAuswahl(tenant, kautionen);
        return;
      }
    } catch {
      // Die Liste ist nur Komfort: bei einem Fehler öffnet der Dialog wie bisher.
    }

    useModalStore.getState().openKautionModal(tenant, options);
  }, []);
}
