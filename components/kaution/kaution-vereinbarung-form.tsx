"use client";

import { useId, useRef, useState } from "react";
import { updateKautionVereinbarungAction, type KautionActionError } from "@/app/kautionen-actions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { betragZuEingabe } from "@/components/kaution/kaution-format";
import { KautionBetragInput, KautionFeld, KautionFormularFehler, useDirtyMelder } from "@/components/kaution/kaution-feld";
import { KAUTION_ART_LABELS, KAUTION_ARTEN_VERFUEGBAR, KAUTION_TEXT_LIMITS } from "@/lib/kautionen-constants";
import { KAUTION_FEHLER_FALLBACK_MESSAGE } from "@/lib/kautionen-errors";
import { getMoneyInputError, parseMoneyToCents } from "@/lib/kautionen-money";
import { validateKautionText } from "@/lib/kautionen-validation";
import type { Kaution, KautionArt } from "@/types/Kaution";

/**
 * Form "Vereinbarung bearbeiten" (existing deposit): target amount, rent at contract date, internal note and,
 * once more than one deposit type is released (phase 3), the deposit type. Only changed fields are sent.
 *
 * The database decides whether a change is allowed (`kaution_aendern`); `onFehler` returns `true` if the
 * dialog handled the error itself, otherwise the message is shown at the form.
 */

interface KautionVereinbarungFormProps {
  tenantId: string;
  kaution: Kaution;
  darfBearbeiten: boolean;
  /** Called after saving (the dialog reloads its data and leaves the edit mode). */
  onGespeichert: () => void | Promise<void>;
  onFehler: (error: KautionActionError) => boolean;
  onAbbrechen: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

interface FeldFehler {
  soll?: string;
  miete?: string;
  notiz?: string;
}

/** Comparable form of an amount text: exact cents if parsable, else the trimmed text. */
function betragSchluessel(text: string): string {
  const cents = parseMoneyToCents(text);
  return cents === null ? text.trim() : String(cents);
}

export function KautionVereinbarungForm({
  tenantId,
  kaution,
  darfBearbeiten,
  onGespeichert,
  onFehler,
  onAbbrechen,
  onDirtyChange,
}: KautionVereinbarungFormProps) {
  const basisId = useId();

  // Start values (what the database currently holds). Compared with the input to send only changes.
  const [start] = useState(() => ({
    art: kaution.kautionsart,
    soll: betragZuEingabe(kaution.soll_betrag),
    miete: betragZuEingabe(kaution.miete_bei_vertragsschluss),
    notiz: kaution.interne_notiz ?? "",
  }));

  const [art, setArt] = useState<KautionArt>(start.art);
  const [soll, setSoll] = useState(start.soll);
  const [miete, setMiete] = useState(start.miete);
  const [notiz, setNotiz] = useState(start.notiz);
  const [fehler, setFehler] = useState<FeldFehler>({});
  const [serverFehler, setServerFehler] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const artGeaendert = art !== start.art;
  const sollGeaendert = betragSchluessel(soll) !== betragSchluessel(start.soll);
  const mieteGeaendert = betragSchluessel(miete) !== betragSchluessel(start.miete);
  const notizGeaendert = notiz.trim() !== start.notiz.trim();
  const isDirty = artGeaendert || sollGeaendert || mieteGeaendert || notizGeaendert;
  useDirtyMelder(isDirty, onDirtyChange);

  const mehrereArten = KAUTION_ARTEN_VERFUEGBAR.length > 1;
  const gesperrt = !darfBearbeiten || isSubmitting;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current || !darfBearbeiten || !isDirty) return;

    const neueFehler: FeldFehler = {};
    if (sollGeaendert) {
      const sollFehler = getMoneyInputError(soll);
      if (sollFehler) neueFehler.soll = sollFehler;
    }
    if (mieteGeaendert && miete.trim() !== "") {
      const mieteFehler = getMoneyInputError(miete, { allowZero: true });
      if (mieteFehler) neueFehler.miete = mieteFehler;
    }
    const notizPruefung = validateKautionText(notiz, { label: "Die interne Notiz", max: KAUTION_TEXT_LIMITS.interneNotiz.max });
    if (!notizPruefung.ok) neueFehler.notiz = notizPruefung.message;

    setFehler(neueFehler);
    setServerFehler(null);
    if (Object.keys(neueFehler).length > 0) return;

    // Only changed fields (database keys). Cleared optional fields are sent as null.
    const felder: Record<string, string | boolean | null> = {};
    if (artGeaendert) felder.kautionsart = art;
    if (sollGeaendert) felder.soll_betrag = soll;
    if (mieteGeaendert) felder.miete_bei_vertragsschluss = miete.trim() === "" ? null : miete;
    if (notizGeaendert) felder.interne_notiz = notizPruefung.ok ? notizPruefung.value : null;

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const result = await updateKautionVereinbarungAction({ tenantId, kautionId: kaution.id, felder });
      if (result.success) {
        toast({ title: "Kaution gespeichert.", variant: "success" });
        await onGespeichert();
      } else {
        const error = result.error ?? { message: KAUTION_FEHLER_FALLBACK_MESSAGE };
        if (!onFehler(error)) setServerFehler(error.message);
      }
    } catch {
      setServerFehler(KAUTION_FEHLER_FALLBACK_MESSAGE);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate aria-labelledby={`${basisId}-titel`} className="space-y-4" data-testid="kaution-vereinbarung-form">
      <h3 id={`${basisId}-titel`} className="text-base font-semibold">
        Vereinbarung bearbeiten
      </h3>

      <fieldset disabled={gesperrt} className="space-y-4">
        <legend className="sr-only">Angaben zur Vereinbarung</legend>

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
        ) : null}

        <KautionFeld id={`${basisId}-soll`} label="Soll-Betrag (€)" pflicht fehler={fehler.soll}>
          {(props) => (
            <KautionBetragInput {...props} value={soll} onWertChange={setSoll} />
          )}
        </KautionFeld>

        <KautionFeld
          id={`${basisId}-miete`}
          label="Miete bei Vertragsschluss (€, optional)"
          fehler={fehler.miete}
          hinweis="Ein leeres Feld löscht die Angabe."
        >
          {(props) => (
            <KautionBetragInput {...props} value={miete} onWertChange={setMiete} />
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
        <Button type="submit" disabled={gesperrt || !isDirty}>
          {isSubmitting ? "Wird gespeichert..." : "Speichern"}
        </Button>
      </div>
    </form>
  );
}
