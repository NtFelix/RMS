"use client";

import { useEffect } from "react";
import { useModalStore } from "@/hooks/use-modal-store";

/**
 * Hält das Modulrecht `kautionen: ansehen` im Modal-Store aktuell (GH-6, Kautionsmanagement).
 *
 * Das Mieter-Bearbeiten-Fenster ist global im Dashboard-Layout gemountet und wird von vielen Stellen geöffnet
 * (Mieterliste, Befehlspalette, Haus- und Wohnungsübersicht). Sein Menüpunkt "Kaution" darf deshalb nicht davon
 * abhängen, welche Seite zuletzt geladen wurde. Das Recht wird serverseitig im Dashboard-Layout ermittelt
 * (`hasPermission('kautionen', 'ansehen')`) und hier in den Store geschrieben.
 *
 * Zurücksetzen: Der Wert gilt für genau einen Nutzer. Ändern sich Recht oder Nutzer (das Layout wird nach einem
 * Wechsel neu berechnet; der Wechsel der Organisation lädt die Seite ohnehin komplett neu), wird erst auf `false`
 * zurückgesetzt und dann der neue Wert geschrieben. Verlässt der Nutzer den Dashboard-Bereich (Abmeldung), fällt
 * der Wert ebenfalls auf `false`: Ein anderer Nutzer im selben Browser-Tab erbt das Recht nie.
 *
 * Nur UX: Der Kautionsdialog bekommt seine Rechte autoritativ vom Server, die Datenbank prüft erneut.
 */

interface KautionenRechtSyncProps {
  /** Modulrecht `kautionen: ansehen` des angemeldeten Nutzers (serverseitig ermittelt). */
  canViewKautionen: boolean;
  /** Angemeldeter Nutzer; ein anderer Nutzer löst das Zurücksetzen und Neuschreiben des Rechts aus. */
  userId: string | null;
}

export function KautionenRechtSync({ canViewKautionen, userId }: KautionenRechtSyncProps) {
  useEffect(() => {
    // `userId` steht bewusst in den Abhängigkeiten: Bei einem anderen Nutzer läuft das Aufräumen (Reset) zuerst.
    void userId;
    useModalStore.getState().setCanViewKautionen(canViewKautionen);
    return () => {
      useModalStore.getState().setCanViewKautionen(false);
    };
  }, [canViewKautionen, userId]);

  return null;
}
