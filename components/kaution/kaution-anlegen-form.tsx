"use client";

import { useId, useRef, useState } from "react";
import { createKautionAction, type KautionActionError } from "@/app/kautionen-actions";
import { Button } from "@/components/ui/button";
import { ButtonWithTooltip } from "@/components/ui/button-with-tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { formatNumber } from "@/utils/format";
import { betragZuEingabe, formatBetrag } from "@/components/kaution/kaution-format";
import {
  KEINE_BERECHTIGUNG_TEXT,
  KautionBetragInput,
  KautionFeld,
  KautionFormularFehler,
  useDirtyMelder,
} from "@/components/kaution/kaution-feld";
import { KAUTION_ART_LABELS, KAUTION_ARTEN_VERFUEGBAR, KAUTION_TEXT_LIMITS } from "@/lib/kautionen-constants";
import { KAUTION_FEHLER_FALLBACK_MESSAGE } from "@/lib/kautionen-errors";
import { getMoneyInputError } from "@/lib/kautionen-money";
import { validateKautionText } from "@/lib/kautionen-validation";
import type { KautionArt, KautionVorschlag } from "@/types/Kaution";

/**
 * Form "Kaution anlegen" (tenant without deposit): target amount (prefilled with the suggestion of the
 * database, freely changeable), rent at contract date and an internal note. Phase 1: bar deposit only.
 *
 * The form only collects and pre-validates; the action and the database validate again. `onFehler` returns
 * `true` if the dialog handled the error itself (toast, reload, close); otherwise the message is shown here.
 */

interface KautionAnlegenFormProps {
  tenantId: string;
  vorschlag: KautionVorschlag | null;
  darfErstellen: boolean;
  /** Called after the deposit was created (the dialog reloads its data). */
  onErstellt: () => void | Promise<void>;
  onFehler: (error: KautionActionError) => boolean;
  onAbbrechen: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

interface FeldFehler {
  soll?: string;
  miete?: string;
  notiz?: string;
}

const STANDARD_ART: KautionArt = KAUTION_ARTEN_VERFUEGBAR[0] ?? "barkaution";

export function KautionAnlegenForm({
  tenantId,
  vorschlag,
  darfErstellen,
  onErstellt,
  onFehler,
  onAbbrechen,
  onDirtyChange,
}: KautionAnlegenFormProps) {
  const basisId = useId();
  const vorschlagBetrag = vorschlag?.vorschlag_betrag ?? null;

  // The suggestion is only the starting value: the user may change it freely.
  const [startWert] = useState(() => betragZuEingabe(vorschlagBetrag));
  const [art, setArt] = useState<KautionArt>(STANDARD_ART);
  const [soll, setSoll] = useState(startWert);
  const [miete, setMiete] = useState("");
  const [notiz, setNotiz] = useState("");
  const [fehler, setFehler] = useState<FeldFehler>({});
  const [serverFehler, setServerFehler] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const isDirty = soll !== startWert || miete !== "" || notiz !== "" || art !== STANDARD_ART;
  useDirtyMelder(isDirty, onDirtyChange);

  const mehrereArten = KAUTION_ARTEN_VERFUEGBAR.length > 1;
  const gesperrt = !darfErstellen || isSubmitting;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current || !darfErstellen) return;

    const neueFehler: FeldFehler = {};
    const sollFehler = getMoneyInputError(soll);
    if (sollFehler) neueFehler.soll = sollFehler;
    if (miete.trim() !== "") {
      const mieteFehler = getMoneyInputError(miete, { allowZero: true });
      if (mieteFehler) neueFehler.miete = mieteFehler;
    }
    const notizPruefung = validateKautionText(notiz, { label: "Die interne Notiz", max: KAUTION_TEXT_LIMITS.interneNotiz.max });
    if (!notizPruefung.ok) neueFehler.notiz = notizPruefung.message;

    setFehler(neueFehler);
    setServerFehler(null);
    if (Object.keys(neueFehler).length > 0) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const result = await createKautionAction({
        tenantId,
        kautionsart: art,
        sollBetrag: soll,
        // Empty: the database copies the current rent of the apartment.
        mieteBeiVertragsschluss: miete.trim() === "" ? undefined : miete,
        interneNotiz: notizPruefung.ok ? notizPruefung.value : null,
      });
      if (result.success) {
        toast({ title: "Kaution gespeichert.", variant: "success" });
        await onErstellt();
      } else {
        const error = result.error ?? { message: KAUTION_FEHLER_FALLBACK_MESSAGE };
        if (!onFehler(error)) setServerFehler(error.message);
      }
    } catch {
      // Network or transport error: nothing was reported by the server.
      setServerFehler(KAUTION_FEHLER_FALLBACK_MESSAGE);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate aria-labelledby={`${basisId}-titel`} className="space-y-4" data-testid="kaution-anlegen-form">
      <div className="space-y-1">
        <h3 id={`${basisId}-titel`} className="text-base font-semibold">
          Kaution anlegen
        </h3>
        <p className="text-sm text-muted-foreground">Für diesen Mieter ist noch keine Kaution angelegt.</p>
        {!darfErstellen ? (
          <p className="text-sm text-muted-foreground">Für das Anlegen einer Kaution fehlt Ihnen die Berechtigung.</p>
        ) : null}
      </div>

      <fieldset disabled={gesperrt} className="space-y-4">
        <legend className="sr-only">Angaben zur Kaution</legend>

        {mehrereArten ? (
          <KautionFeld id={`${basisId}-art`} label="Kautionsart">
            {(props) => (
              <Select value={art} onValueChange={(wert) => setArt(wert as KautionArt)} disabled={gesperrt}>
                <SelectTrigger {...props}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KAUTION_ARTEN_VERFUEGBAR.map((verfuegbar) => (
                    <SelectItem key={verfuegbar} value={verfuegbar}>
                      {KAUTION_ART_LABELS[verfuegbar]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </KautionFeld>
        ) : (
          <div className="space-y-1.5">
            <p className="text-sm font-medium leading-none">Kautionsart</p>
            <p className="text-sm">{KAUTION_ART_LABELS[STANDARD_ART]}</p>
          </div>
        )}

        <KautionFeld
          id={`${basisId}-soll`}
          label="Soll-Betrag (€)"
          pflicht
          fehler={fehler.soll}
          hinweis={
            vorschlagBetrag !== null
              ? `Vorschlag: 3 × Miete (aktuelle Kaltmiete der Wohnung): ${formatBetrag(vorschlagBetrag)}. Sie können den Betrag frei ändern.`
              : undefined
          }
        >
          {(props) => (
            <KautionBetragInput {...props} value={soll} onWertChange={setSoll} />
          )}
        </KautionFeld>

        <KautionFeld
          id={`${basisId}-miete`}
          label="Miete bei Vertragsschluss (€, optional)"
          fehler={fehler.miete}
          hinweis="Wenn Sie das Feld leer lassen, wird die aktuelle Miete der Wohnung übernommen (falls vorhanden)."
        >
          {(props) => (
            <KautionBetragInput
              {...props}
              placeholder={typeof vorschlag?.miete === "number" ? formatNumber(vorschlag.miete, 2) : "0,00"}
              value={miete}
              onWertChange={setMiete}
            />
          )}
        </KautionFeld>

        <KautionFeld id={`${basisId}-notiz`} label="Interne Notiz (optional)" fehler={fehler.notiz}>
          {(props) => (
            <Textarea
              {...props}
              rows={3}
              maxLength={KAUTION_TEXT_LIMITS.interneNotiz.max}
              value={notiz}
              onChange={(event) => setNotiz(event.target.value)}
            />
          )}
        </KautionFeld>
      </fieldset>

      <KautionFormularFehler message={serverFehler} />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onAbbrechen} disabled={isSubmitting}>
          Abbrechen
        </Button>
        <ButtonWithTooltip
          type="submit"
          disabled={gesperrt}
          tooltip={KEINE_BERECHTIGUNG_TEXT}
          showTooltip={!darfErstellen}
        >
          {isSubmitting ? "Wird gespeichert..." : "Kaution anlegen"}
        </ButtonWithTooltip>
      </div>
    </form>
  );
}
