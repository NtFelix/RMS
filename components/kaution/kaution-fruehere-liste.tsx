"use client";

/**
 * Block "Frühere Kautionen" of the deposit dialog (tenant after a move, without a deposit at the current tenancy): one row
 * per earlier deposit of the tenant with a button "Übernehmen". The deposit is moved to the current tenancy by
 * `kautionUebernehmenAction`; nothing happens automatically. Afterwards the dialog reloads its data (`onUebernommen`).
 *
 * - Renders nothing without entries.
 * - `disabled` (missing right `erstellen`, the dialog decides): the buttons stay visible but disabled, with the tooltip
 *   "Keine Berechtigung" (disabled instead of hidden). While a takeover runs, all buttons are disabled.
 * - Errors: `onFehler` decides like in the other deposit forms (toast, reload, close); if it returns `false`, the
 *   message is shown here.
 *
 * Security relevant (moves a deposit between tenancies): not production ready until the maintainer has reviewed it.
 */

import { useId, useRef, useState } from "react";
import { kautionUebernehmenAction, type KautionActionError } from "@/app/kautionen-actions";
import { ButtonWithTooltip } from "@/components/ui/button-with-tooltip";
import { toast } from "@/hooks/use-toast";
import { KEINE_BERECHTIGUNG_TEXT, KautionFormularFehler } from "@/components/kaution/kaution-feld";
import { formatBetrag, formatDatum } from "@/components/kaution/kaution-format";
import { KAUTION_ART_LABELS } from "@/lib/kautionen-constants";
import { KAUTION_FEHLER_FALLBACK_MESSAGE } from "@/lib/kautionen-errors";
import type { KautionListenEintrag } from "@/types/Kaution";

interface KautionFruehereListeProps {
  tenantId: string;
  /** Earlier deposits of the tenant that are not at the current tenancy. */
  eintraege: KautionListenEintrag[];
  /** Called after the deposit was taken over (the dialog reloads its data). */
  onUebernommen: () => void | Promise<void>;
  /** Error handling of the dialog: `true` if handled there (toast, reload, close), `false` shows the message here. */
  onFehler: (error: KautionActionError) => boolean;
  /** Missing right (`erstellen`): buttons disabled with the tooltip. */
  disabled?: boolean;
}

/** Kautionsart label, falls back to the raw value (unknown types never break the list). */
function artText(kautionsart: string): string {
  return (KAUTION_ART_LABELS as Record<string, string>)[kautionsart] ?? "Kaution";
}

/** "Mietverhältnis: 01.02.2023 – 31.12.2024" (open end: "offen"). Dates are shown only, never calculated. */
function zeitraumText(eintrag: KautionListenEintrag): string {
  if (!eintrag.vertragsbeginn && !eintrag.vertragsende) return "Mietverhältnis ohne Datum";
  const von = eintrag.vertragsbeginn ? formatDatum(eintrag.vertragsbeginn) : "–";
  const bis = eintrag.vertragsende ? formatDatum(eintrag.vertragsende) : "offen";
  return `Mietverhältnis: ${von} – ${bis}`;
}

export function KautionFruehereListe({ tenantId, eintraege, onUebernommen, onFehler, disabled = false }: KautionFruehereListeProps) {
  const basisId = useId();
  const [laeuftId, setLaeuftId] = useState<string | null>(null);
  const [serverFehler, setServerFehler] = useState<string | null>(null);
  // Set synchronously: a second click before the state update is already refused.
  const laeuftRef = useRef(false);

  if (eintraege.length === 0) return null;

  const gesperrt = disabled || laeuftId !== null;

  const handleUebernehmen = async (kautionId: string) => {
    if (laeuftRef.current || disabled) return;
    laeuftRef.current = true;
    setLaeuftId(kautionId);
    setServerFehler(null);
    try {
      const result = await kautionUebernehmenAction(tenantId, kautionId);
      if (result.success) {
        toast({ title: "Die Kaution wurde übernommen.", variant: "success" });
        await onUebernommen();
      } else {
        const error = result.error ?? { message: KAUTION_FEHLER_FALLBACK_MESSAGE };
        if (!onFehler(error)) setServerFehler(error.message);
      }
    } catch {
      // Network or transport error: nothing was reported by the server.
      setServerFehler(KAUTION_FEHLER_FALLBACK_MESSAGE);
    } finally {
      laeuftRef.current = false;
      setLaeuftId(null);
    }
  };

  return (
    <section aria-labelledby={`${basisId}-titel`} className="space-y-3 rounded-xl border p-4 sm:p-6" data-testid="kaution-fruehere-liste">
      <div className="space-y-1">
        <h3 id={`${basisId}-titel`} className="text-base font-semibold">
          Frühere Kautionen
        </h3>
        <p className="text-sm text-muted-foreground">
          Sie können eine frühere Kaution für das aktuelle Mietverhältnis übernehmen oder unten eine neue anlegen.
        </p>
        {disabled ? <p className="text-sm text-muted-foreground">Für das Übernehmen einer Kaution fehlt Ihnen die Berechtigung.</p> : null}
      </div>

      <ul className="divide-y rounded-md border">
        {eintraege.map((eintrag) => {
          const infoId = `${basisId}-${eintrag.kautionId}-info`;
          return (
            <li key={eintrag.kautionId} className="flex flex-col gap-2 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div id={infoId} className="min-w-0 space-y-0.5">
                <p className="font-medium">{artText(eintrag.kautionsart)}</p>
                <p className="text-muted-foreground tabular-nums">
                  Soll-Betrag {formatBetrag(eintrag.sollBetrag)} · Kontostand {formatBetrag(eintrag.kontostand)}
                </p>
                <p className="text-muted-foreground">{zeitraumText(eintrag)}</p>
              </div>
              <ButtonWithTooltip
                type="button"
                variant="outline"
                size="sm"
                className="self-start sm:self-center"
                disabled={gesperrt}
                tooltip={KEINE_BERECHTIGUNG_TEXT}
                showTooltip={disabled}
                aria-describedby={infoId}
                aria-busy={laeuftId === eintrag.kautionId}
                onClick={() => void handleUebernehmen(eintrag.kautionId)}
              >
                {laeuftId === eintrag.kautionId ? "Wird übernommen..." : "Übernehmen"}
              </ButtonWithTooltip>
            </li>
          );
        })}
      </ul>

      <KautionFormularFehler message={serverFehler} />
    </section>
  );
}
