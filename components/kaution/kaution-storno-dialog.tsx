"use client";

import { useId, useRef, useState } from "react";
import { storniereKautionBewegungAction, type KautionActionError } from "@/app/kautionen-actions";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { formatBetrag, formatDatum } from "@/components/kaution/kaution-format";
import { KautionFeld, KautionFormularFehler } from "@/components/kaution/kaution-feld";
import { KAUTION_BEWEGUNGSART_LABELS, KAUTION_TEXT_LIMITS } from "@/lib/kautionen-constants";
import { KAUTION_FEHLER_FALLBACK_MESSAGE, getKautionFehlerVerhalten } from "@/lib/kautionen-errors";
import { validateKautionText } from "@/lib/kautionen-validation";
import type { KautionBewegung } from "@/types/Kaution";

/**
 * Cancellation ("Storno") of a booking. An `AlertDialog` with a mandatory reason (3 to 500 characters), opened
 * on top of the deposit dialog.
 *
 * A booking is never deleted: it stays in the statement, no longer counts towards the balance and carries the
 * reason. A cancellation runs through the strict balance like a payout: cancelling a deposit after a payout is
 * rejected by the database (`KA005`). The database message is shown IN this dialog and the dialog stays open.
 *
 * `onFehler` returns `true` if the deposit dialog handled the error itself (toast, reload, close, sign-in). This
 * dialog closes for the behaviours that change the situation (reload, rights, no access, sign-in); for a plain toast
 * (unknown error, `KA009`, `23503`) it stays open, keeps the typed reason and shows the message here as well.
 */

interface KautionStornoDialogProps {
  tenantId: string;
  /** The booking to cancel; `null` while the dialog is closed. */
  bewegung: KautionBewegung | null;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful cancellation (the deposit dialog reloads the statement). */
  onStorniert: () => void | Promise<void>;
  onFehler: (error: KautionActionError) => boolean;
}

export function KautionStornoDialog({ tenantId, bewegung, onOpenChange, onStorniert, onFehler }: KautionStornoDialogProps) {
  return (
    <AlertDialog open={bewegung !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        {bewegung ? (
          // `key`: the input starts empty for every booking and every opening.
          <StornoInhalt
            key={bewegung.id}
            tenantId={tenantId}
            bewegung={bewegung}
            onSchliessen={() => onOpenChange(false)}
            onStorniert={onStorniert}
            onFehler={onFehler}
          />
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface StornoInhaltProps {
  tenantId: string;
  bewegung: KautionBewegung;
  onSchliessen: () => void;
  onStorniert: () => void | Promise<void>;
  onFehler: (error: KautionActionError) => boolean;
}

function StornoInhalt({ tenantId, bewegung, onSchliessen, onStorniert, onFehler }: StornoInhaltProps) {
  const basisId = useId();
  const [grund, setGrund] = useState("");
  const [serverFehler, setServerFehler] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const pruefung = validateKautionText(grund, {
    label: "Der Grund",
    min: KAUTION_TEXT_LIMITS.stornoGrund.min,
    max: KAUTION_TEXT_LIMITS.stornoGrund.max,
    required: true,
  });
  // Confirm only with a valid reason. A hint appears as soon as something was typed (not on the empty field).
  const grundFehler = !pruefung.ok && grund.trim() !== "" ? pruefung.message : null;

  const handleStorno = async () => {
    if (submittingRef.current || !pruefung.ok || pruefung.value === null) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setServerFehler(null);
    try {
      const result = await storniereKautionBewegungAction({ tenantId, bewegungId: bewegung.id, grund: pruefung.value });
      if (result.success) {
        toast({ title: "Buchung storniert.", variant: "success" });
        await onStorniert();
        onSchliessen();
      } else {
        const error = result.error ?? { message: KAUTION_FEHLER_FALLBACK_MESSAGE };
        // The deposit dialog handles the error first (toast, reload, close, sign-in). This dialog only closes when the
        // situation changed (data reloaded, rights gone, no access): then it is obsolete. Otherwise (e.g. KA005,
        // an unknown error with a toast) it stays open with the reason that was typed and shows the message here.
        const verhalten = getKautionFehlerVerhalten(error.code);
        const behandelt = onFehler(error);
        if (behandelt && (verhalten === "neu_laden" || verhalten === "berechtigung" || verhalten === "dialog_schliessen" || verhalten === "anmelden")) {
          onSchliessen();
        } else {
          setServerFehler(error.message);
        }
      }
    } catch {
      setServerFehler(KAUTION_FEHLER_FALLBACK_MESSAGE);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Buchung stornieren</AlertDialogTitle>
        <AlertDialogDescription>
          Die Buchung bleibt im Kontoauszug sichtbar und wird nicht mehr im Kontostand berücksichtigt. Für eine Korrektur buchen Sie
          anschließend neu.
        </AlertDialogDescription>
      </AlertDialogHeader>

      <p className="rounded-xl bg-muted px-3 py-2 text-sm" data-testid="kaution-storno-buchung">
        {KAUTION_BEWEGUNGSART_LABELS[bewegung.bewegungsart] ?? "Buchung"} vom {formatDatum(bewegung.wertstellung)} über{" "}
        <span className="font-medium tabular-nums">{formatBetrag(bewegung.betrag)}</span>
      </p>

      <KautionFeld id={`${basisId}-grund`} label="Grund (Pflicht, mindestens 3 Zeichen)" pflicht fehler={grundFehler}>
        {(props) => (
          <Textarea
            {...props}
            rows={3}
            maxLength={KAUTION_TEXT_LIMITS.stornoGrund.max}
            value={grund}
            disabled={isSubmitting}
            onChange={(event) => setGrund(event.target.value)}
          />
        )}
      </KautionFeld>

      <KautionFormularFehler message={serverFehler} />

      <AlertDialogFooter>
        <AlertDialogCancel disabled={isSubmitting}>Abbrechen</AlertDialogCancel>
        <AlertDialogAction
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          disabled={!pruefung.ok || isSubmitting}
          onClick={(event) => {
            // The default of the action closes the dialog: only close after a successful cancellation.
            event.preventDefault();
            void handleStorno();
          }}
        >
          {isSubmitting ? "Wird storniert..." : "Storno bestätigen"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}
