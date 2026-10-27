"use client";

import { useId, useRef, useState } from "react";
import { ArrowUpFromLine } from "lucide-react";
import { setzeKautionEinbehaltAction, type KautionActionError } from "@/app/kautionen-actions";
import { Button } from "@/components/ui/button";
import { ButtonWithTooltip } from "@/components/ui/button-with-tooltip";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { KEINE_BERECHTIGUNG_TEXT, KautionFeld, KautionFormularFehler, useDirtyMelder } from "@/components/kaution/kaution-feld";
import type { KautionBuchungVorgabe } from "@/components/kaution/kaution-buchung-form";
import { KAUTION_FEHLER_FALLBACK_MESSAGE } from "@/lib/kautionen-errors";
import { formatBetrag, formatDatum, heuteIso } from "@/components/kaution/kaution-format";
import { KAUTION_MIN_WERTSTELLUNG, KAUTION_TEXT_LIMITS } from "@/lib/kautionen-constants";
import { parseMoneyToCents } from "@/lib/kautionen-money";
import { validateKautionDatum, validateKautionText } from "@/lib/kautionen-validation";
import { formatLocalDateToIso, isoToLocalDate } from "@/utils/date-calculations";
import type { KautionDetails, KautionRechte } from "@/types/Kaution";

/**
 * Section "4. Auszahlung und Einbehalt" of the settlement tab.
 *
 * - "Auszahlung erfassen" hands over to the statement (booking form with the type "Auszahlung", prefilled with the balance).
 * - Einbehalt: a reason and the date since when the balance is held back. It is NOT a booking: the amount held back is always
 *   the balance from the database. Set, change and remove need the right `bearbeiten`.
 * - Without a balance there is nothing to hold back: no form, a hint instead. A hold that is still stored without a balance
 *   (paid out or cancelled to 0) is shown and can only be removed, so it does not come back with a stale reason.
 *
 * Errors of the actions: stable codes decide (`onFehler`), a form error (`KA004`, `KA013`, `KA014`) stays at the form.
 */

interface KautionAbrechnungEinbehaltProps {
  details: KautionDetails;
  rechte: KautionRechte;
  /** Called after a hold was saved or removed (the dialog reloads its data). */
  onGeaendert: () => void | Promise<void>;
  onFehler: (error: KautionActionError) => boolean;
  /** Unsaved input of the hold form (reported to the dialog, which asks before closing). */
  onEinbehaltDirtyChange?: (dirty: boolean) => void;
  onBuchungErfassen: (vorgabe: KautionBuchungVorgabe) => void;
}

export function KautionAbrechnungEinbehalt({
  details,
  rechte,
  onGeaendert,
  onFehler,
  onEinbehaltDirtyChange,
  onBuchungErfassen,
}: KautionAbrechnungEinbehaltProps) {
  const basisId = useId();
  const { kaution, konto, einbehalt } = details;
  // Comparison in exact cents (no float): a balance above 0 allows a hold and a payout.
  const hatGuthaben = (parseMoneyToCents(konto.kontostand) ?? 0) > 0;
  const [aendernOffen, setAendernOffen] = useState(false);
  const [aufhebenLaeuft, setAufhebenLaeuft] = useState(false);
  const [serverFehler, setServerFehler] = useState<string | null>(null);
  const aufhebenRef = useRef(false);

  const formularSichtbar = hatGuthaben && (!einbehalt || aendernOffen);

  const handleAufheben = async () => {
    if (aufhebenRef.current || !rechte.bearbeiten) return;
    aufhebenRef.current = true;
    setAufhebenLaeuft(true);
    setServerFehler(null);
    try {
      const result = await setzeKautionEinbehaltAction({ kautionId: kaution.id, grund: null, seit: null });
      if (result.success) {
        toast({ title: "Einbehalt aufgehoben.", variant: "success" });
        setAendernOffen(false);
        await onGeaendert();
      } else {
        const error = result.error ?? { message: KAUTION_FEHLER_FALLBACK_MESSAGE };
        if (!onFehler(error)) setServerFehler(error.message);
      }
    } catch {
      setServerFehler(KAUTION_FEHLER_FALLBACK_MESSAGE);
    } finally {
      aufhebenRef.current = false;
      setAufhebenLaeuft(false);
    }
  };

  return (
    <section aria-labelledby={`${basisId}-titel`} className="space-y-4 rounded-xl border p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`${basisId}-titel`} className="text-base font-semibold">
          4. Auszahlung und Einbehalt
        </h3>
        <ButtonWithTooltip
          type="button"
          variant="outline"
          size="sm"
          disabled={!rechte.erstellen}
          tooltip={KEINE_BERECHTIGUNG_TEXT}
          showTooltip={!rechte.erstellen}
          onClick={() => onBuchungErfassen({ art: "auszahlung" })}
        >
          <ArrowUpFromLine aria-hidden="true" />
          Auszahlung erfassen
        </ButtonWithTooltip>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold">Einbehalt</h4>

        {einbehalt ? (
          <div className="space-y-3">
            {hatGuthaben ? (
              <p className="text-sm" data-testid="kaution-einbehalt-zeile">
                Noch einbehalten: <span className="font-medium tabular-nums">{formatBetrag(konto.kontostand)}</span> – {einbehalt.grund}, seit{" "}
                {formatDatum(einbehalt.seit)} ({einbehalt.liegedauer_tage} Tage)
              </p>
            ) : (
              <p className="text-sm" data-testid="kaution-einbehalt-ohne-guthaben">
                Es liegt kein Guthaben auf dem Konto, es ist aber noch ein Einbehalt gespeichert: {einbehalt.grund}, seit{" "}
                {formatDatum(einbehalt.seit)}. Er gilt wieder, sobald Guthaben auf dem Konto liegt. Heben Sie ihn auf, wenn er erledigt ist.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {hatGuthaben ? (
                <ButtonWithTooltip
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-expanded={aendernOffen}
                  disabled={!rechte.bearbeiten || aufhebenLaeuft}
                  tooltip={KEINE_BERECHTIGUNG_TEXT}
                  showTooltip={!rechte.bearbeiten}
                  onClick={() => setAendernOffen((offen) => !offen)}
                >
                  Einbehalt ändern
                </ButtonWithTooltip>
              ) : null}
              <ButtonWithTooltip
                type="button"
                variant="outline"
                size="sm"
                disabled={!rechte.bearbeiten || aufhebenLaeuft}
                tooltip={KEINE_BERECHTIGUNG_TEXT}
                showTooltip={!rechte.bearbeiten}
                onClick={() => void handleAufheben()}
              >
                {aufhebenLaeuft ? "Wird aufgehoben..." : "Einbehalt aufheben"}
              </ButtonWithTooltip>
            </div>
          </div>
        ) : null}

        {!einbehalt && !hatGuthaben ? (
          <p className="text-sm text-muted-foreground" data-testid="kaution-einbehalt-kein-guthaben">
            Es liegt kein Guthaben auf dem Konto.
          </p>
        ) : null}

        {!einbehalt && hatGuthaben ? (
          <p className="text-sm text-muted-foreground">Dokumentieren Sie, warum und seit wann ein Teil des Guthabens einbehalten wird.</p>
        ) : null}

        <KautionFormularFehler message={serverFehler} />

        {formularSichtbar ? (
          <KautionEinbehaltForm
            // New start values after every saved change of the hold.
            key={einbehalt ? `aendern-${einbehalt.seit}-${einbehalt.grund}` : "neu"}
            kautionId={kaution.id}
            startGrund={einbehalt?.grund ?? ""}
            startSeit={einbehalt?.seit ?? ""}
            titel={einbehalt ? "Einbehalt ändern" : "Einbehalt dokumentieren"}
            darfBearbeiten={rechte.bearbeiten}
            onGespeichert={async () => {
              setAendernOffen(false);
              await onGeaendert();
            }}
            onAbbrechen={einbehalt ? () => setAendernOffen(false) : undefined}
            onFehler={onFehler}
            onDirtyChange={onEinbehaltDirtyChange}
          />
        ) : null}
      </div>
    </section>
  );
}

interface KautionEinbehaltFormProps {
  kautionId: string;
  /** Stored reason (empty for a new hold). */
  startGrund: string;
  /** Stored date `YYYY-MM-DD` (empty for a new hold: then today). */
  startSeit: string;
  titel: string;
  darfBearbeiten: boolean;
  onGespeichert: () => void | Promise<void>;
  /** Only with an existing hold: leaves the change without saving. */
  onAbbrechen?: () => void;
  onFehler: (error: KautionActionError) => boolean;
  onDirtyChange?: (dirty: boolean) => void;
}

/** Form "Einbehalt": reason (3 to 500 characters) and the date since when the balance is held back (not in the future). */
function KautionEinbehaltForm({
  kautionId,
  startGrund,
  startSeit,
  titel,
  darfBearbeiten,
  onGespeichert,
  onAbbrechen,
  onFehler,
  onDirtyChange,
}: KautionEinbehaltFormProps) {
  const basisId = useId();
  const [start] = useState(() => ({ grund: startGrund, seit: startSeit !== "" ? startSeit : heuteIso() }));
  const [grund, setGrund] = useState(start.grund);
  const [seit, setSeit] = useState(start.seit);
  const [seitKalender, setSeitKalender] = useState(() => isoToLocalDate(start.seit));
  const [fehler, setFehler] = useState<{ grund?: string; seit?: string }>({});
  const [serverFehler, setServerFehler] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const isDirty = grund !== start.grund || seit !== start.seit;
  useDirtyMelder(isDirty, onDirtyChange);

  const gesperrt = !darfBearbeiten || isSubmitting;
  const heute = heuteIso();
  const aktuellesJahr = Number(heute.slice(0, 4));

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current || !darfBearbeiten) return;

    const neueFehler: { grund?: string; seit?: string } = {};
    const grundPruefung = validateKautionText(grund, {
      label: "Der Grund",
      min: KAUTION_TEXT_LIMITS.einbehaltGrund.min,
      max: KAUTION_TEXT_LIMITS.einbehaltGrund.max,
      required: true,
    });
    if (!grundPruefung.ok) neueFehler.grund = grundPruefung.message;

    let seitWert: string | null = null;
    if (seit === "") {
      neueFehler.seit = "Bitte geben Sie das Datum an, seit dem einbehalten wird.";
    } else {
      const datumPruefung = validateKautionDatum(seit, "Das Datum des Einbehalts");
      if (!datumPruefung.ok) neueFehler.seit = datumPruefung.message;
      else if (datumPruefung.value > heute) neueFehler.seit = "Das Datum des Einbehalts darf nicht in der Zukunft liegen.";
      else seitWert = datumPruefung.value;
    }

    setFehler(neueFehler);
    setServerFehler(null);
    if (!grundPruefung.ok || seitWert === null || grundPruefung.value === null || Object.keys(neueFehler).length > 0) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const result = await setzeKautionEinbehaltAction({ kautionId, grund: grundPruefung.value, seit: seitWert });
      if (result.success) {
        toast({ title: "Einbehalt gespeichert.", variant: "success" });
        await onGespeichert();
      } else {
        const error = result.error ?? { message: KAUTION_FEHLER_FALLBACK_MESSAGE };
        // KA004, KA013, KA014: shown at the form, the form stays open with the input.
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
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby={`${basisId}-titel`}
      className="space-y-4 rounded-lg border p-4"
      data-testid="kaution-einbehalt-form"
    >
      <h5 id={`${basisId}-titel`} className="text-sm font-semibold">
        {titel}
      </h5>

      <fieldset disabled={gesperrt} className="grid gap-4 sm:grid-cols-2">
        <legend className="sr-only">Angaben zum Einbehalt</legend>

        <KautionFeld id={`${basisId}-grund`} label="Grund (Pflicht, 3 bis 500 Zeichen)" pflicht fehler={fehler.grund} className="sm:col-span-2">
          {(props) => (
            <Textarea
              {...props}
              rows={2}
              maxLength={KAUTION_TEXT_LIMITS.einbehaltGrund.max}
              value={grund}
              onChange={(event) => setGrund(event.target.value)}
            />
          )}
        </KautionFeld>

        <KautionFeld id={`${basisId}-seit`} label="Einbehalten seit" pflicht fehler={fehler.seit} hinweis={`Höchstens heute (${formatDatum(heute)}).`}>
          {(props) => (
            <DatePicker
              id={props.id}
              aria-invalid={props["aria-invalid"]}
              aria-describedby={props["aria-describedby"]}
              value={seitKalender}
              onChange={(datum) => {
                if (datum) {
                  setSeitKalender(datum);
                  setSeit(formatLocalDateToIso(datum));
                } else {
                  setSeit("");
                }
              }}
              placeholder="TT.MM.JJJJ"
              fromYear={Number(KAUTION_MIN_WERTSTELLUNG.slice(0, 4))}
              toYear={aktuellesJahr}
              showClearButton={false}
              disabled={gesperrt}
            />
          )}
        </KautionFeld>
      </fieldset>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onAbbrechen ? (
          <Button type="button" variant="outline" onClick={onAbbrechen} disabled={isSubmitting}>
            Abbrechen
          </Button>
        ) : null}
        <ButtonWithTooltip type="submit" disabled={gesperrt} tooltip={KEINE_BERECHTIGUNG_TEXT} showTooltip={!darfBearbeiten}>
          {isSubmitting ? "Wird gespeichert..." : "Einbehalt speichern"}
        </ButtonWithTooltip>
      </div>
      <KautionFormularFehler message={serverFehler} />
    </form>
  );
}
