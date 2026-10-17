"use client";

import { useId, useRef, useState } from "react";
import { FileDown } from "lucide-react";
import { ButtonWithTooltip } from "@/components/ui/button-with-tooltip";
import { KEINE_BERECHTIGUNG_TEXT, KautionFormularFehler } from "@/components/kaution/kaution-feld";
import { ladeKautionAbrechnungPdf } from "@/components/kaution/kaution-abrechnung-download";
import { KAUTION_ABRECHNUNG_ART_LABELS } from "@/lib/kautionen-constants";
import type { KautionAbrechnungArt } from "@/types/Kaution";

/**
 * Section "PDF" of the settlement tab (phase 4): the interim (`zwischen`) and the final settlement (`end`) as PDF.
 *
 * - Only active for the settlement date that was calculated last (`stichtag` is `null` before a calculation): the PDF is
 *   built from the database figures of that date, never from figures of the browser.
 * - One request at a time: both buttons are disabled while a PDF is requested (no double click).
 * - The PDF is not stored. The note below says where to keep it (as receipt of the payout in the tab "Dokumente").
 */

interface KautionAbrechnungPdfProps {
  tenantId: string;
  /** Settlement date of the current calculation, `null` if nothing was calculated for the shown data. */
  stichtag: string | null;
  /** Right `ansehen`: without it the buttons are disabled and explain why. */
  darfAnsehen: boolean;
  /** The tab "Dokumente" exists (function flag `dokumente`): only then the note about the receipt makes sense. */
  dokumenteAktiv: boolean;
}

const ARTEN: KautionAbrechnungArt[] = ["zwischen", "end"];

export function KautionAbrechnungPdf({ tenantId, stichtag, darfAnsehen, dokumenteAktiv }: KautionAbrechnungPdfProps) {
  const basisId = useId();
  const [laeuft, setLaeuft] = useState<KautionAbrechnungArt | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  // Set synchronously: a second click before the state update is already refused.
  const laeuftRef = useRef(false);

  const gesperrt = !darfAnsehen || stichtag === null || laeuft !== null;

  const handleDownload = async (art: KautionAbrechnungArt) => {
    if (laeuftRef.current || stichtag === null || !darfAnsehen) return;
    laeuftRef.current = true;
    setLaeuft(art);
    setFehler(null);
    try {
      const ergebnis = await ladeKautionAbrechnungPdf({ tenantId, art, stichtag });
      if (!ergebnis.ok) setFehler(ergebnis.message);
    } finally {
      laeuftRef.current = false;
      setLaeuft(null);
    }
  };

  return (
    <section aria-labelledby={`${basisId}-titel`} className="space-y-3 rounded-xl border p-4 sm:p-6">
      <h3 id={`${basisId}-titel`} className="text-base font-semibold">
        3. PDF
      </h3>
      <p className="text-sm text-muted-foreground">
        {stichtag === null
          ? "Bitte berechnen Sie die Abrechnung zuerst. Das PDF wird aus den Zahlen dieser Berechnung erstellt."
          : "Das PDF enthält die Zahlen der Berechnung von oben."}
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {ARTEN.map((art) => (
          <ButtonWithTooltip
            key={art}
            type="button"
            variant="outline"
            disabled={gesperrt}
            tooltip={KEINE_BERECHTIGUNG_TEXT}
            showTooltip={!darfAnsehen}
            aria-busy={laeuft === art}
            onClick={() => void handleDownload(art)}
          >
            <FileDown aria-hidden="true" />
            {laeuft === art ? "Wird erstellt..." : `${KAUTION_ABRECHNUNG_ART_LABELS[art]} (PDF)`}
          </ButtonWithTooltip>
        ))}
      </div>

      <KautionFormularFehler message={fehler} />

      <p id={`${basisId}-hinweis`} className="text-xs text-muted-foreground">
        {dokumenteAktiv
          ? "Das PDF wird nicht gespeichert. Zum Aufbewahren laden Sie es als Beleg an der Auszahlung im Tab Dokumente hoch."
          : "Das PDF wird nicht gespeichert."}
      </p>
    </section>
  );
}
