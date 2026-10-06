"use client";

import { useCallback, useId, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { deleteKautionAction, type KautionActionError } from "@/app/kautionen-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ButtonWithTooltip } from "@/components/ui/button-with-tooltip";
import { toast } from "@/hooks/use-toast";
import { KEINE_BERECHTIGUNG_TEXT, KautionFormularFehler } from "@/components/kaution/kaution-feld";
import { formatBetrag, formatDatum } from "@/components/kaution/kaution-format";
import { KautionSaldoCard } from "@/components/kaution/kaution-saldo-card";
import { KautionVereinbarungForm } from "@/components/kaution/kaution-vereinbarung-form";
import { KAUTION_ART_LABELS } from "@/lib/kautionen-constants";
import { KAUTION_FEHLER_FALLBACK_MESSAGE } from "@/lib/kautionen-errors";
import type { KautionDetails, KautionRechte } from "@/types/Kaution";

/**
 * Tab "Übersicht": balance card, the agreement (shown, editable inline) and, for a deposit WITHOUT any booking,
 * the option to remove it again (to the trash bin). A deposit with bookings is locked by the database:
 * corrections are made by cancellation and new bookings.
 */

interface KautionUebersichtTabProps {
  details: KautionDetails;
  rechte: KautionRechte;
  tenantId: string;
  /** Called after the agreement was saved (the dialog reloads its data). */
  onGeaendert: () => void | Promise<void>;
  /** Called after the deposit was removed (the dialog reloads: the tenant has no deposit then). */
  onEntfernt: () => void | Promise<void>;
  onFehler: (error: KautionActionError) => boolean;
  onVereinbarungDirtyChange?: (dirty: boolean) => void;
}

export function KautionUebersichtTab({
  details,
  rechte,
  tenantId,
  onGeaendert,
  onEntfernt,
  onFehler,
  onVereinbarungDirtyChange,
}: KautionUebersichtTabProps) {
  const basisId = useId();
  const [bearbeiten, setBearbeiten] = useState(false);
  const [entfernenOffen, setEntfernenOffen] = useState(false);

  const { kaution, konto, mietende } = details;
  // Only a deposit without any booking (not even a cancelled one) may be removed.
  const entfernbar = konto.anzahl_aktiv + konto.anzahl_storniert === 0;

  const handleGespeichert = useCallback(async () => {
    setBearbeiten(false);
    await onGeaendert();
  }, [onGeaendert]);

  const handleBearbeitenAbbrechen = useCallback(() => setBearbeiten(false), []);

  return (
    <div className="space-y-4">
      <KautionSaldoCard details={details} />

      <section aria-labelledby={bearbeiten ? undefined : `${basisId}-vereinbarung`} className="space-y-3 rounded-xl border p-4 sm:p-6">
        {bearbeiten ? (
          <KautionVereinbarungForm
            tenantId={tenantId}
            kaution={kaution}
            darfBearbeiten={rechte.bearbeiten}
            onGespeichert={handleGespeichert}
            onFehler={onFehler}
            onAbbrechen={handleBearbeitenAbbrechen}
            onDirtyChange={onVereinbarungDirtyChange}
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id={`${basisId}-vereinbarung`} className="text-base font-semibold">
                Vereinbarung
              </h3>
              <ButtonWithTooltip
                type="button"
                variant="outline"
                size="sm"
                disabled={!rechte.bearbeiten}
                tooltip={KEINE_BERECHTIGUNG_TEXT}
                showTooltip={!rechte.bearbeiten}
                onClick={() => setBearbeiten(true)}
              >
                <Pencil aria-hidden="true" />
                Vereinbarung bearbeiten
              </ButtonWithTooltip>
            </div>
            {!rechte.bearbeiten ? (
              <p className="text-xs text-muted-foreground">Das Bearbeiten der Vereinbarung ist mit Ihren Rechten nicht möglich.</p>
            ) : null}
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Angabe label="Kautionsart" wert={KAUTION_ART_LABELS[kaution.kautionsart] ?? kaution.kautionsart} />
              <Angabe
                label="Miete bei Vertragsschluss"
                wert={kaution.miete_bei_vertragsschluss === null ? "nicht angegeben" : formatBetrag(kaution.miete_bei_vertragsschluss)}
              />
              <Angabe label="Mietende" wert={mietende ? formatDatum(mietende) : "nicht angegeben"} />
              <Angabe label="Interne Notiz" wert={kaution.interne_notiz ?? "–"} mehrzeilig />
            </dl>
          </>
        )}
      </section>

      {entfernbar ? (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed p-4">
          <p className="text-sm text-muted-foreground">
            Diese Kaution hat noch keine Buchungen. Sie kann entfernt werden und wird dabei in den Papierkorb verschoben.
          </p>
          <ButtonWithTooltip
            type="button"
            variant="outline"
            size="sm"
            disabled={!rechte.loeschen}
            tooltip={KEINE_BERECHTIGUNG_TEXT}
            showTooltip={!rechte.loeschen}
            onClick={() => setEntfernenOffen(true)}
          >
            <Trash2 aria-hidden="true" />
            Kaution entfernen
          </ButtonWithTooltip>
        </section>
      ) : null}

      <KautionEntfernenDialog
        open={entfernenOffen}
        onOpenChange={setEntfernenOffen}
        tenantId={tenantId}
        kautionId={kaution.id}
        onEntfernt={onEntfernt}
        onFehler={onFehler}
      />
    </div>
  );
}

function Angabe({ label, wert, mehrzeilig = false }: { label: string; wert: string; mehrzeilig?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mehrzeilig ? "whitespace-pre-wrap break-words font-medium" : "font-medium"}>{wert}</dd>
    </div>
  );
}

interface KautionEntfernenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  kautionId: string;
  onEntfernt: () => void | Promise<void>;
  onFehler: (error: KautionActionError) => boolean;
}

/** Confirmation before a deposit without bookings is moved to the trash bin (`deleteKautionAction`). */
function KautionEntfernenDialog({ open, onOpenChange, tenantId, kautionId, onEntfernt, onFehler }: KautionEntfernenDialogProps) {
  const [serverFehler, setServerFehler] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const handleOpenChange = (naechsterWert: boolean) => {
    if (!naechsterWert) setServerFehler(null);
    onOpenChange(naechsterWert);
  };

  const handleEntfernen = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setServerFehler(null);
    try {
      const result = await deleteKautionAction({ tenantId, kautionId });
      if (result.success) {
        toast({ title: "Kaution entfernt.", variant: "success" });
        onOpenChange(false);
        await onEntfernt();
      } else {
        const error = result.error ?? { message: KAUTION_FEHLER_FALLBACK_MESSAGE };
        // Handled by the dialog (toast, reload): this confirmation is obsolete. Otherwise show the message here.
        if (onFehler(error)) onOpenChange(false);
        else setServerFehler(error.message);
      }
    } catch {
      setServerFehler(KAUTION_FEHLER_FALLBACK_MESSAGE);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Kaution entfernen?</AlertDialogTitle>
          <AlertDialogDescription>
            Die Kaution wird in den Papierkorb verschoben. Eine Kaution mit Buchungen lässt sich nicht entfernen.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <KautionFormularFehler message={serverFehler} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isSubmitting}
            onClick={(event) => {
              event.preventDefault();
              void handleEntfernen();
            }}
          >
            {isSubmitting ? "Wird entfernt..." : "Entfernen"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
