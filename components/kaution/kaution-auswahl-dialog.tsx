"use client";

import { ChevronRight, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useModalStore } from "@/hooks/use-modal-store";
import { formatBetrag, formatDatum } from "@/components/kaution/kaution-format";
import { KAUTION_ART_LABELS } from "@/lib/kautionen-constants";
import type { KautionListenEintrag } from "@/types/Kaution";

/**
 * Auswahl bei mehreren Kautionen eines Mieters (GH-6): Der Kautionsdialog zeigt immer genau eine Kaution. Hat ein
 * Mieter mehrere, erscheint diese Liste zuerst; die Auswahl öffnet dann den Kautionsdialog mit der `kautionId`.
 * Ohne aktuelles Mietverhältnis bietet die Liste zusätzlich an, eine neue Kaution anzulegen (der Dialog ohne ID).
 *
 * Nur Anzeige: Die Liste kommt vom Server (`getKautionenListeAction`, geöffnet über `useKautionOeffnen`).
 */

function artLabel(kautionsart: string): string {
  return (KAUTION_ART_LABELS as Record<string, string>)[kautionsart] ?? "Kaution";
}

function zeitraum(eintrag: KautionListenEintrag): string {
  const beginn = formatDatum(eintrag.vertragsbeginn);
  const ende = eintrag.vertragsende ? formatDatum(eintrag.vertragsende) : "laufend";
  return `${beginn} – ${ende}`;
}

const ZEILE_KLASSEN =
  "group flex w-full items-center justify-between gap-3 rounded-2xl border border-zinc-200/50 bg-white p-3 text-left transition-[border-color,box-shadow] duration-200 hover:border-accent/40 hover:shadow-xs focus-visible:outline-hidden focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40 dark:border-zinc-800/30 dark:bg-zinc-900/40 dark:hover:border-accent/40";

export function KautionAuswahlDialog() {
  const auswahl = useModalStore((state) => state.kautionAuswahl);
  const closeKautionAuswahl = useModalStore((state) => state.closeKautionAuswahl);
  const openKautionModal = useModalStore((state) => state.openKautionModal);

  const offen = auswahl !== null;
  const eintraege = auswahl?.eintraege ?? [];
  const hatAktuelle = eintraege.some((eintrag) => eintrag.istAktuell);

  const waehleKaution = (kautionId: string) => {
    if (!auswahl) return;
    closeKautionAuswahl();
    openKautionModal(auswahl.tenant, { kautionId });
  };

  const waehleNeue = () => {
    if (!auswahl) return;
    closeKautionAuswahl();
    openKautionModal(auswahl.tenant);
  };

  return (
    <Dialog open={offen} onOpenChange={(open) => { if (!open) closeKautionAuswahl(); }}>
      <DialogContent size="md">
        {auswahl ? (
          <>
            <DialogHeader>
              <DialogTitle>Kaution von {auswahl.tenant.name}</DialogTitle>
              <DialogDescription>Dieser Mieter hat mehrere Kautionen. Bitte wählen Sie eine aus.</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-2">
              {eintraege.map((eintrag) => (
                <button
                  key={eintrag.kautionId}
                  type="button"
                  className={ZEILE_KLASSEN}
                  onClick={() => waehleKaution(eintrag.kautionId)}
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">{artLabel(eintrag.kautionsart)}</span>
                      {eintrag.istAktuell ? (
                        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
                          Aktuelles Mietverhältnis
                        </Badge>
                      ) : null}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Soll {formatBetrag(eintrag.sollBetrag)} · Kontostand {formatBetrag(eintrag.kontostand)}
                    </span>
                    <span className="text-sm text-muted-foreground">Mietverhältnis: {zeitraum(eintrag)}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:text-accent" aria-hidden="true" />
                </button>
              ))}

              {!hatAktuelle ? (
                <button
                  type="button"
                  className={ZEILE_KLASSEN}
                  onClick={waehleNeue}
                >
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    <Plus className="size-4 shrink-0 text-accent" aria-hidden="true" />
                    Neue Kaution für das aktuelle Mietverhältnis
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:text-accent" aria-hidden="true" />
                </button>
              ) : null}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => closeKautionAuswahl()}>
                Abbrechen
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
