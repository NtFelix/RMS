"use client";

import { useCallback, useId, useRef, useState } from "react";
import { Info, Pencil, Trash2 } from "lucide-react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ButtonWithTooltip } from "@/components/ui/button-with-tooltip";
import { toast } from "@/hooks/use-toast";
import { useKautionFlag } from "@/hooks/use-kaution-flag";
import { KEINE_BERECHTIGUNG_TEXT, KautionFormularFehler } from "@/components/kaution/kaution-feld";
import { formatBetrag, formatDatum } from "@/components/kaution/kaution-format";
import { KautionSaldoCard } from "@/components/kaution/kaution-saldo-card";
import { KautionVereinbarungForm } from "@/components/kaution/kaution-vereinbarung-form";
import {
  KAUTION_ART_LABELS,
  KAUTION_ZINSMETHODE_LABELS,
  KAUTION_ZINSMETHODE_STANDARD,
  kautionHatKonto,
} from "@/lib/kautionen-constants";
import { KAUTION_FEHLER_FALLBACK_MESSAGE } from "@/lib/kautionen-errors";
import { formatiereIban, GETRENNT_HINWEIS_TEXT, GETRENNT_WAHL_LABELS, wertZuGetrenntWahl } from "@/lib/kautionen-vereinbarung";
import type { KautionDetails, KautionRechte } from "@/types/Kaution";

/**
 * Tab "Übersicht": balance card (account types) or the one-line document summary (guarantee, insurance), the agreement
 * (shown, editable inline: bank account data or guarantor and document number, interest method with the interest
 * function) and, for a deposit WITHOUT any booking, the option to remove it again (to the trash bin). A deposit with
 * bookings is locked by the database: corrections are made by cancellation and new bookings.
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
  const { funktionen } = useKautionFlag();
  const [bearbeiten, setBearbeiten] = useState(false);
  const [entfernenOffen, setEntfernenOffen] = useState(false);

  const { kaution, konto, mietende, warnungen } = details;
  const hatKonto = kautionHatKonto(kaution.kautionsart);
  // Only a deposit without any booking (not even a cancelled one) may be removed.
  const entfernbar = konto.anzahl_aktiv + konto.anzahl_storniert === 0;
  // The deposit type may only change while nothing is booked, planned or scheduled (the database rejects it otherwise, KA009).
  const artAenderbar =
    details.kontoauszug.length === 0 && (details.raten ?? []).length === 0 && (details.zinsstaffel ?? []).length === 0;

  const handleGespeichert = useCallback(async () => {
    setBearbeiten(false);
    await onGeaendert();
  }, [onGeaendert]);

  const handleBearbeitenAbbrechen = useCallback(() => setBearbeiten(false), []);

  return (
    <div className="space-y-4">
      {hatKonto ? <KautionSaldoCard details={details} /> : <KautionDokumentZeile details={details} />}

      <section aria-labelledby={bearbeiten ? undefined : `${basisId}-vereinbarung`} className="space-y-3 rounded-xl border p-4 sm:p-6">
        {bearbeiten ? (
          <KautionVereinbarungForm
            tenantId={tenantId}
            kaution={kaution}
            darfBearbeiten={rechte.bearbeiten}
            artAenderbar={artAenderbar}
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
            {warnungen.getrennt_nicht_bestaetigt && hatKonto ? (
              <Alert role="note" className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200 [&>svg]:text-amber-600">
                <Info aria-hidden="true" className="h-4 w-4" />
                <AlertDescription>{GETRENNT_HINWEIS_TEXT}</AlertDescription>
              </Alert>
            ) : null}
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Angabe label="Kautionsart" wert={KAUTION_ART_LABELS[kaution.kautionsart] ?? kaution.kautionsart} />
              <Angabe
                label="Miete bei Vertragsschluss"
                wert={kaution.miete_bei_vertragsschluss === null ? "nicht angegeben" : formatBetrag(kaution.miete_bei_vertragsschluss)}
              />
              <Angabe label="Mietende" wert={mietende ? formatDatum(mietende) : "nicht angegeben"} />
              {hatKonto ? (
                <>
                  <Angabe label="IBAN" wert={kaution.iban ? formatiereIban(kaution.iban) : "nicht angegeben"} />
                  <Angabe label="Bank" wert={kaution.bank ?? "nicht angegeben"} />
                  <Angabe label="Kontoinhaber" wert={kaution.kontoinhaber ?? "nicht angegeben"} />
                  <Angabe label="Getrennt vom eigenen Vermögen angelegt" wert={GETRENNT_WAHL_LABELS[wertZuGetrenntWahl(kaution.getrennt_angelegt)]} />
                  {funktionen.zinsen ? (
                    <Angabe label="Zinsmethode" wert={KAUTION_ZINSMETHODE_LABELS[kaution.zinsmethode ?? KAUTION_ZINSMETHODE_STANDARD]} />
                  ) : null}
                </>
              ) : (
                <>
                  <Angabe label="Bürge / Versicherer" wert={kaution.buerge_versicherer ?? "nicht angegeben"} />
                  <Angabe label="Urkunden-/Policennummer" wert={kaution.urkundennummer ?? "nicht angegeben"} />
                </>
              )}
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

/**
 * Summary of a guarantee or insurance (no account): one row instead of the balance card. The amount is the target sum
 * of the document, it is not a balance.
 */
function KautionDokumentZeile({ details }: { details: KautionDetails }) {
  const { kaution } = details;
  return (
    <section aria-label="Dokumentierte Sicherheit" className="rounded-xl border p-4 sm:p-6">
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
        <Angabe label="Kautionsart" wert={KAUTION_ART_LABELS[kaution.kautionsart] ?? kaution.kautionsart} />
        <Angabe label="Summe" wert={formatBetrag(kaution.soll_betrag)} />
        <Angabe label="Bürge / Versicherer" wert={kaution.buerge_versicherer ?? "nicht angegeben"} />
        <Angabe label="Urkundennummer" wert={kaution.urkundennummer ?? "nicht angegeben"} />
      </dl>
    </section>
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
