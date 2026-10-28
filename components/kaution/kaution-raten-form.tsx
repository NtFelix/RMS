"use client";

import { useId, useRef, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { planeKautionRatenAction, type KautionActionError, type PlanRateInput } from "@/app/kautionen-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { betragZuEingabe, formatBetrag, heuteIso } from "@/components/kaution/kaution-format";
import { KautionBetragInput, KautionFeld, KautionFormularFehler, useDirtyMelder } from "@/components/kaution/kaution-feld";
import { KAUTION_MIN_WERTSTELLUNG, KAUTION_RATEN_MAX_ANZAHL } from "@/lib/kautionen-constants";
import { KAUTION_FEHLER_FALLBACK_MESSAGE } from "@/lib/kautionen-errors";
import { centsToDecimalString, getMoneyInputError, parseMoneyToCents } from "@/lib/kautionen-money";
import { berechneRatenVorschlag, ratenSummeAbweichung, type RatenAnzahl } from "@/lib/kautionen-raten";
import { validateKautionDatum } from "@/lib/kautionen-validation";
import { formatLocalDateToIso } from "@/utils/date-calculations";
import type { KautionRate } from "@/types/Kaution";

/**
 * Form "Ratenplan" of the Raten tab (phase 2): creates, replaces or removes the instalment plan of a deposit as a whole
 * (`planeKautionRatenAction`).
 *
 * - The rates are prefilled with the proposal of `berechneRatenVorschlag` (equal split of the target amount in cents,
 *   the last rate takes the remainder, monthly due dates). Changing the number of rates or the first due date creates
 *   the proposal again and overwrites the rate rows; every date and amount can be edited afterwards.
 * - A sum that differs from the target amount is only a warning: the database does not require it, the form does not block.
 * - Amounts are sent as exact decimal strings (`"333.33"`), dates as `YYYY-MM-DD`.
 * - "Ratenplan entfernen" sends an empty list. A locked plan (payments are assigned) is answered by the database with
 *   `KA009`, shown by the dialog as a toast.
 *
 * The form is mounted with a key derived from the stored plan (see the tab), so after every save it starts from the
 * stored state again. Security relevant (money): not production ready until the maintainer has reviewed it.
 */

/** Count of rates for a deposit without a plan (proposal starting point). */
const STANDARD_ANZAHL: RatenAnzahl = 3;

interface RateZeile {
  /** Due date `YYYY-MM-DD` or `""` (incomplete input). */
  datum: string;
  /** Value of the date picker. Only replaced for complete dates, so that typing is not overwritten. */
  kalender: Date | undefined;
  /** Amount exactly as typed (German notation). */
  betrag: string;
}

interface ZeilenFehler {
  datum?: string;
  betrag?: string;
}

export interface KautionRatenFormProps {
  kautionId: string;
  /** Target amount of the deposit (database value, display only; the proposal is built from its cents). */
  sollBetrag: number;
  /** The stored plan (empty = no plan). */
  raten: KautionRate[];
  /** Called after saving or removing (the dialog reloads its data). */
  onGespeichert: () => void | Promise<void>;
  onFehler: (error: KautionActionError) => boolean;
  onDirtyChange?: (dirty: boolean) => void;
}

/** Local calendar date for the date picker (no time zone shift). */
function isoZuLokalemDatum(iso: string): Date {
  const [jahr, monat, tag] = iso.split("-").map(Number);
  return new Date(jahr, monat - 1, tag);
}

/** Cents -> text in German notation (`33333` -> `"333,33"`). */
function centsZuEingabe(cents: number): string {
  return centsToDecimalString(cents).replace(".", ",");
}

/** Rate rows for a count and a first due date: the proposal, or empty rows if no proposal is possible. */
function zeilenAusVorschlag(anzahl: RatenAnzahl, ersteIso: string, sollCents: number | null): RateZeile[] {
  const vorschlag = sollCents !== null && ersteIso !== "" ? berechneRatenVorschlag(sollCents, ersteIso, anzahl) : null;
  return Array.from({ length: anzahl }, (_, index) => {
    const eintrag = vorschlag?.[index];
    if (!eintrag) return { datum: "", kalender: undefined, betrag: "" };
    return {
      datum: eintrag.faelligkeitsdatum,
      kalender: isoZuLokalemDatum(eintrag.faelligkeitsdatum),
      betrag: centsZuEingabe(eintrag.sollCents),
    };
  });
}

/** Comparable form of the rows: due dates and amounts in exact cents (or the trimmed text while unparsable). */
function planSchluessel(zeilen: RateZeile[]): string {
  return zeilen.map((zeile) => `${zeile.datum}|${parseMoneyToCents(zeile.betrag) ?? zeile.betrag.trim()}`).join(";");
}

function anzahlText(anzahl: RatenAnzahl): string {
  return anzahl === 1 ? "1 Rate" : `${anzahl} Raten`;
}

export function KautionRatenForm({ kautionId, sollBetrag, raten, onGespeichert, onFehler, onDirtyChange }: KautionRatenFormProps) {
  const basisId = useId();
  const sollCents = parseMoneyToCents(sollBetrag);
  const hatPlan = raten.length > 0;

  // Start values: the stored plan, or the proposal for the standard count starting today.
  const [start] = useState(() => {
    if (raten.length > 0) {
      const anzahl = Math.min(raten.length, KAUTION_RATEN_MAX_ANZAHL) as RatenAnzahl;
      return {
        anzahl,
        erste: raten[0].faelligkeitsdatum,
        zeilen: raten.map((rate) => ({
          datum: rate.faelligkeitsdatum,
          kalender: isoZuLokalemDatum(rate.faelligkeitsdatum),
          betrag: betragZuEingabe(rate.soll_betrag),
        })),
      };
    }
    const heute = heuteIso();
    return { anzahl: STANDARD_ANZAHL, erste: heute, zeilen: zeilenAusVorschlag(STANDARD_ANZAHL, heute, sollCents) };
  });

  const [anzahl, setAnzahl] = useState<RatenAnzahl>(start.anzahl);
  // Only read in the handlers (never shown): a ref avoids a redraw per change. The shown date is `ersteKalender`.
  const ersteDatumRef = useRef(start.erste);
  const [ersteKalender, setErsteKalender] = useState<Date | undefined>(() => isoZuLokalemDatum(start.erste));
  const [zeilen, setZeilen] = useState<RateZeile[]>(start.zeilen);
  // Without a stored plan there is nothing to compare with: the form counts as changed once the user touched it.
  const [beruehrt, setBeruehrt] = useState(false);
  const [fehler, setFehler] = useState<ZeilenFehler[]>([]);
  const [serverFehler, setServerFehler] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const startSchluessel = hatPlan ? planSchluessel(start.zeilen) : null;
  const isDirty = startSchluessel !== null ? planSchluessel(zeilen) !== startSchluessel : beruehrt;
  useDirtyMelder(isDirty, onDirtyChange);

  const gesperrt = isSubmitting;
  const heuteJahr = Number(heuteIso().slice(0, 4));

  // Sum of the rates (live, non-blocking). Only complete and valid amounts take part.
  const zeilenCents = zeilen.map((zeile) => parseMoneyToCents(zeile.betrag));
  const alleBetraegeGueltig = zeilenCents.every((cents) => cents !== null && cents > 0);
  const summeCents = zeilenCents.reduce<number>((gesamt, cents) => gesamt + (cents ?? 0), 0);
  const abweichung =
    alleBetraegeGueltig && sollCents !== null
      ? ratenSummeAbweichung(
          zeilenCents.map((cents) => ({ sollCents: cents ?? 0 })),
          sollCents
        )
      : 0;

  const aendereAnzahl = (wert: string) => {
    const neu = Number(wert);
    if (neu !== 1 && neu !== 2 && neu !== 3) return;
    setAnzahl(neu);
    setZeilen(zeilenAusVorschlag(neu, ersteDatumRef.current, sollCents));
    setBeruehrt(true);
  };

  const aendereErsteFaelligkeit = (datum: Date | undefined) => {
    setBeruehrt(true);
    if (!datum) {
      // Incomplete input: the rows stay as they are.
      ersteDatumRef.current = "";
      return;
    }
    const iso = formatLocalDateToIso(datum);
    ersteDatumRef.current = iso;
    setErsteKalender(datum);
    setZeilen(zeilenAusVorschlag(anzahl, iso, sollCents));
  };

  const aendereZeile = (index: number, aenderung: Partial<RateZeile>) => {
    setZeilen((vorher) => vorher.map((zeile, position) => (position === index ? { ...zeile, ...aenderung } : zeile)));
    setBeruehrt(true);
  };

  /** Sends the plan (complete list, `[]` removes it). The result is handled like the other deposit forms. */
  const sende = async (raten: PlanRateInput[], erfolgsText: string) => {
    submittingRef.current = true;
    setIsSubmitting(true);
    setServerFehler(null);
    try {
      const result = await planeKautionRatenAction({ kautionId, raten });
      if (result.success) {
        toast({ title: erfolgsText, variant: "success" });
        await onGespeichert();
      } else {
        const error = result.error ?? { message: KAUTION_FEHLER_FALLBACK_MESSAGE };
        // Handled by the dialog (toast, reload): nothing to show here. Otherwise the message stays at the form.
        if (!onFehler(error)) setServerFehler(error.message);
      }
    } catch {
      setServerFehler(KAUTION_FEHLER_FALLBACK_MESSAGE);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;

    const zeilenFehler: ZeilenFehler[] = [];
    const raten: PlanRateInput[] = [];
    let vorigesDatum: string | null = null;

    for (let index = 0; index < zeilen.length; index += 1) {
      const zeile = zeilen[index];
      const nummer = index + 1;
      const fehlerZeile: ZeilenFehler = {};

      const datum = validateKautionDatum(zeile.datum, `Fälligkeit der Rate ${nummer}`);
      if (!datum.ok) {
        fehlerZeile.datum = datum.message;
      } else if (vorigesDatum !== null && datum.value <= vorigesDatum) {
        fehlerZeile.datum = `Die Fälligkeit der Rate ${nummer} muss nach der Fälligkeit der vorherigen Rate liegen.`;
      }

      const betragFehler = getMoneyInputError(zeile.betrag);
      if (betragFehler) fehlerZeile.betrag = betragFehler;

      zeilenFehler.push(fehlerZeile);
      if (datum.ok) vorigesDatum = datum.value;

      const cents = parseMoneyToCents(zeile.betrag);
      if (datum.ok && cents !== null && !betragFehler && !fehlerZeile.datum) {
        raten.push({ faelligkeitsdatum: datum.value, sollBetrag: centsToDecimalString(cents) });
      }
    }

    setFehler(zeilenFehler);
    setServerFehler(null);
    const hatFehler = zeilenFehler.some((fehlerZeile) => fehlerZeile.datum !== undefined || fehlerZeile.betrag !== undefined);
    if (hatFehler || raten.length !== zeilen.length) return;

    await sende(raten, "Ratenplan gespeichert.");
  };

  const handleEntfernen = () => {
    if (submittingRef.current) return;
    setFehler([]);
    void sende([], "Ratenplan entfernt.");
  };

  return (
    <form onSubmit={handleSubmit} noValidate aria-labelledby={`${basisId}-titel`} className="space-y-4" data-testid="kaution-raten-form">
      <h3 id={`${basisId}-titel`} className="text-base font-semibold">
        {hatPlan ? "Ratenplan bearbeiten" : "Ratenplan anlegen"}
      </h3>

      <fieldset disabled={gesperrt} className="space-y-4">
        <legend className="sr-only">Angaben zum Ratenplan</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <KautionFeld
            id={`${basisId}-anzahl`}
            label="Anzahl der Raten"
            hinweis="Eine Änderung erstellt den Vorschlag neu und ersetzt die Raten unten."
          >
            {(props) => (
              <Select value={String(anzahl)} onValueChange={aendereAnzahl} disabled={gesperrt}>
                <SelectTrigger {...props}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: KAUTION_RATEN_MAX_ANZAHL }, (_, index) => index + 1).map((wert) => (
                    <SelectItem key={wert} value={String(wert)}>
                      {anzahlText(wert as RatenAnzahl)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </KautionFeld>

          <KautionFeld id={`${basisId}-erste`} label="Erste Fälligkeit" hinweis="Die weiteren Raten folgen monatlich.">
            {(props) => (
              <DatePicker
                id={props.id}
                aria-describedby={props["aria-describedby"]}
                value={ersteKalender}
                onChange={aendereErsteFaelligkeit}
                placeholder="TT.MM.JJJJ"
                fromYear={Number(KAUTION_MIN_WERTSTELLUNG.slice(0, 4))}
                toYear={heuteJahr + 10}
                showClearButton={false}
                disabled={gesperrt}
              />
            )}
          </KautionFeld>
        </div>

        {zeilen.map((zeile, index) => {
          const nummer = index + 1;
          return (
            <fieldset key={index} className="grid gap-4 rounded-lg border p-3 sm:grid-cols-2">
              <legend className="px-1 text-sm font-medium">Rate {nummer}</legend>

              <KautionFeld
                id={`${basisId}-r${index}-datum`}
                label="Fällig am"
                pflicht
                fehler={fehler[index]?.datum}
              >
                {(props) => (
                  <DatePicker
                    id={props.id}
                    aria-invalid={props["aria-invalid"]}
                    aria-describedby={props["aria-describedby"]}
                    value={zeile.kalender}
                    onChange={(datum) => (datum ? aendereZeile(index, { datum: formatLocalDateToIso(datum), kalender: datum }) : aendereZeile(index, { datum: "" }))}
                    placeholder="TT.MM.JJJJ"
                    fromYear={Number(KAUTION_MIN_WERTSTELLUNG.slice(0, 4))}
                    toYear={heuteJahr + 10}
                    showClearButton={false}
                    disabled={gesperrt}
                  />
                )}
              </KautionFeld>

              <KautionFeld id={`${basisId}-r${index}-betrag`} label="Soll-Betrag (€)" pflicht fehler={fehler[index]?.betrag}>
                {(props) => (
                  <KautionBetragInput
                    {...props}
                    value={zeile.betrag}
                    onWertChange={(text) => aendereZeile(index, { betrag: text })}
                  />
                )}
              </KautionFeld>
            </fieldset>
          );
        })}
      </fieldset>

      <div className="space-y-2" aria-live="polite">
        <p className="text-sm" data-testid="kaution-raten-form-summe">
          Summe der Raten: <span className="font-medium">{formatBetrag(summeCents / 100)}</span>
          {sollCents !== null ? (
            <>
              {" "}von {formatBetrag(sollBetrag)} Soll-Betrag
            </>
          ) : null}
        </p>
        {alleBetraegeGueltig && abweichung !== 0 ? (
          <Alert role="note" className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200 [&>svg]:text-amber-600">
            <TriangleAlert aria-hidden="true" className="h-4 w-4" />
            <AlertDescription>
              Die Summe der Raten weicht vom Soll-Betrag um {formatBetrag(Math.abs(abweichung) / 100)}{" "}
              {abweichung > 0 ? "nach oben" : "nach unten"} ab. Sie können den Ratenplan trotzdem speichern.
            </AlertDescription>
          </Alert>
        ) : null}
      </div>

      <KautionFormularFehler message={serverFehler} />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        {hatPlan ? (
          <Button type="button" variant="outline" onClick={handleEntfernen} disabled={gesperrt}>
            Ratenplan entfernen
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={gesperrt || !isDirty}>
          {isSubmitting ? "Wird gespeichert..." : "Ratenplan speichern"}
        </Button>
      </div>
    </form>
  );
}
