"use client";

import { useId, useRef, useState } from "react";
import { berechneKautionZinsenAction, bucheKautionBewegungAction, type KautionActionError } from "@/app/kautionen-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ButtonWithTooltip } from "@/components/ui/button-with-tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  betragZuEingabe,
  formatBetrag,
  formatDatum,
  heuteIso,
  neuerIdempotenzSchluessel,
} from "@/components/kaution/kaution-format";
import {
  KEINE_BERECHTIGUNG_TEXT,
  KautionBetragInput,
  KautionFeld,
  KautionFormularFehler,
  useDirtyMelder,
} from "@/components/kaution/kaution-feld";
import {
  KAUTION_ABZUG_KATEGORIEN,
  KAUTION_ABZUG_KATEGORIE_LABELS,
  KAUTION_BUCHUNG_TITEL,
  KAUTION_MIN_WERTSTELLUNG,
  KAUTION_TEXT_LIMITS,
  KAUTION_ZINSMETHODE_LABELS,
} from "@/lib/kautionen-constants";
import { KautionZinsSegmenteTabelle } from "@/components/kaution/kaution-zins-segmente";
import { KAUTION_FEHLER_FALLBACK_MESSAGE } from "@/lib/kautionen-errors";
import { centsToDecimalString, getMoneyInputError, parseMoneyToCents } from "@/lib/kautionen-money";
import { addiereTage, endeEinschliessendSicher, endeExklusiv, istIsoDatum } from "@/lib/kautionen-zinsen";
import { validateKautionDatum, validateKautionText, validateZinszeitraum } from "@/lib/kautionen-validation";
import { formatLocalDateToIso } from "@/utils/date-calculations";
import type { KautionAbzugKategorie, KautionBewegungsArt, KautionZinsVorschlag } from "@/types/Kaution";

/**
 * Inline form "Neue Buchung" of the account statement: deposit (Einzahlung), payout (Auszahlung), deduction (Abzug)
 * or, for bank accounts with the interest function, interest credit (Zinsgutschrift). No nested dialog.
 *
 * - The payout is prefilled with the available rest (the balance, as displayed by the database).
 * - Value date: default today, never later than today (the database checks again, `KA013`).
 * - One idempotency key per opening of the form: a repeated request books nothing twice. After a failed attempt the
 *   key is kept for an identical retry and renewed as soon as the input differs from the failed attempt (a changed
 *   booking is another booking).
 * - The strict balance (never negative on any date) is checked by the database. A rejection (`KA005`) is shown
 *   here at the form and the form stays open with the input.
 *
 * Interest credit: the period is captured with the END INCLUSIVE ("bis einschließlich"), the database works with the
 * exclusive end, so the form sends the day after (`endeExklusiv`). The amount comes from the database proposal
 * (`berechneKautionZinsenAction`), which has to be calculated for the current period before the booking. The browser
 * calculates no interest: a deviating amount needs a reason, a missing proposal too.
 *
 * Security relevant (money booking): not production ready until the maintainer has reviewed it; the form only
 * collects input, the action and the RPC validate and book.
 */

/**
 * Preset of a booking form opened from another tab. A deposit payment for one rate of the plan (Raten tab) or an
 * interest credit for the period of the open interest (Zinsen tab). `von` and `bis` as the database returns them:
 * `bis` is EXCLUSIVE.
 */
export type KautionBuchungVorgabe =
  | {
      art: "einzahlung";
      /** Rate the payment is assigned to. */
      rateId: string;
      /** Rate number 1..3, shown to the user. */
      rateNr: number;
      /** Open amount of the rate (display number from the database, prefilled as text). */
      betrag: number;
    }
  | {
      art: "zinsgutschrift";
      /** Start of the interest period `YYYY-MM-DD` (inclusive). */
      von: string;
      /** End of the interest period `YYYY-MM-DD` (exclusive, as the database gives it). */
      bis: string;
    };

interface KautionBuchungFormProps {
  art: KautionBewegungsArt;
  tenantId: string;
  kautionId: string;
  /** Balance as displayed by the database: starting value of a payout. */
  kontostand: number;
  darfBuchen: boolean;
  /** Set when the booking comes from another tab (rate payment or interest credit for a period). */
  vorgabe?: KautionBuchungVorgabe | null;
  /** Called after a successful booking (the dialog reloads the statement). */
  onGebucht: () => void | Promise<void>;
  onFehler: (error: KautionActionError) => boolean;
  onAbbrechen: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

interface FeldFehler {
  betrag?: string;
  wertstellung?: string;
  kategorie?: string;
  grund?: string;
  empfaenger?: string;
  notiz?: string;
  zinsVon?: string;
  zinsBis?: string;
  zinsBerechnung?: string;
}

/** Interest period as the database takes it: start inclusive, end exclusive. */
interface ZinsPeriode {
  von: string;
  bisExkl: string;
}

/** Last calculated proposal, with the period it was calculated for. `ergebnis: null`: the database returned no proposal. */
interface BerechneterVorschlag {
  von: string;
  bisExkl: string;
  ergebnis: KautionZinsVorschlag | null;
}

/** Local calendar date (no time zone shift) for the date picker. */
function isoZuLokalemDatum(iso: string): Date | undefined {
  if (!istIsoDatum(iso)) return undefined;
  const [jahr, monat, tag] = iso.split("-").map(Number);
  return new Date(jahr, monat - 1, tag);
}

/** Value date of an interest credit: the day after the (inclusive) end of the period, never in the future. */
function wertstellungFuerZinsen(bisEinschliessend: string | null, heute: string): string {
  if (bisEinschliessend === null) return heute;
  const tagDanach = addiereTage(bisEinschliessend, 1);
  return tagDanach > heute ? heute : tagDanach;
}

/** Decimal string of an amount (cents), the comparison basis of the deviation check. */
function dezimalText(betrag: string | number | null | undefined): string | null {
  if (betrag === null || betrag === undefined) return null;
  const cents = parseMoneyToCents(betrag);
  return cents === null ? null : centsToDecimalString(cents);
}

export function KautionBuchungForm({
  art,
  tenantId,
  kautionId,
  kontostand,
  darfBuchen,
  vorgabe = null,
  onGebucht,
  onFehler,
  onAbbrechen,
  onDirtyChange,
}: KautionBuchungFormProps) {
  const basisId = useId();
  const istZins = art === "zinsgutschrift";

  // Start values: a rate prefills its open amount, the payout is prefilled with the available rest (nothing to pay out
  // at a balance of 0 or less), an interest credit takes its period from the request.
  const [start] = useState(() => {
    const heute = heuteIso();
    if (vorgabe?.art === "zinsgutschrift") {
      const von = istIsoDatum(vorgabe.von) ? vorgabe.von : "";
      const bisEinschliessend = endeEinschliessendSicher(vorgabe.bis);
      return {
        betrag: "",
        heute,
        von,
        bis: bisEinschliessend ?? "",
        wertstellung: wertstellungFuerZinsen(bisEinschliessend, heute),
      };
    }
    return {
      betrag: vorgabe?.art === "einzahlung"
        ? betragZuEingabe(vorgabe.betrag)
        : art === "auszahlung" && kontostand > 0
          ? betragZuEingabe(kontostand)
          : "",
      heute,
      von: "",
      bis: "",
      wertstellung: heute,
    };
  });
  // Only read in the submit handler, never rendered: a ref avoids a re-render on every change.
  // Created lazily in the submit handler (never during render); reset to null after a successful booking.
  const startSchluessel = useRef<string | null>(null);
  // Last attempt (key and the input that was sent): a retry with identical input reuses the key, changed input does not.
  const letzterVersuch = useRef<{ schluessel: string; eingabe: string } | null>(null);

  const [betrag, setBetrag] = useState(start.betrag);
  // `wertstellung` is a valid ISO date or "" (incomplete input). `datumWert` is the value handed to the date
  // picker: it is only updated for valid dates, so that typing a date is not overwritten while it is incomplete.
  const [wertstellung, setWertstellung] = useState(start.wertstellung);
  const [datumWert, setDatumWert] = useState(() => isoZuLokalemDatum(start.wertstellung));
  // Interest period (inclusive end), same handling as the value date.
  const [zinsVon, setZinsVon] = useState(start.von);
  const [zinsVonDatum, setZinsVonDatum] = useState(() => isoZuLokalemDatum(start.von));
  const [zinsBis, setZinsBis] = useState(start.bis);
  const [zinsBisDatum, setZinsBisDatum] = useState(() => isoZuLokalemDatum(start.bis));
  const [vorschlag, setVorschlag] = useState<BerechneterVorschlag | null>(null);
  const [berechnungLaeuft, setBerechnungLaeuft] = useState(false);
  const [kategorie, setKategorie] = useState<KautionAbzugKategorie | "">("");
  const [grund, setGrund] = useState("");
  const [empfaenger, setEmpfaenger] = useState("");
  const [notiz, setNotiz] = useState("");
  const [fehler, setFehler] = useState<FeldFehler>({});
  const [serverFehler, setServerFehler] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const isDirty =
    betrag !== start.betrag ||
    wertstellung !== start.wertstellung ||
    zinsVon !== start.von ||
    zinsBis !== start.bis ||
    kategorie !== "" ||
    grund !== "" ||
    empfaenger !== "" ||
    notiz !== "";
  useDirtyMelder(isDirty, onDirtyChange);

  // Period for the database (exclusive end), only for a complete and valid period.
  const zinsPeriode: ZinsPeriode | null =
    istZins && istIsoDatum(zinsVon) && istIsoDatum(zinsBis) ? { von: zinsVon, bisExkl: endeExklusiv(zinsBis) } : null;
  // The period must be plausible before the database is asked (a period ending before its start is refused by KA013 anyway).
  const zeitraumGueltig = zinsPeriode !== null && validateZinszeitraum(zinsPeriode.von, zinsPeriode.bisExkl).ok;
  // The proposal counts only for the period it was calculated for: changing the period makes it stale.
  const berechnungPasst =
    zinsPeriode !== null && vorschlag !== null && vorschlag.von === zinsPeriode.von && vorschlag.bisExkl === zinsPeriode.bisExkl;
  const ergebnis = berechnungPasst && vorschlag ? vorschlag.ergebnis : null;
  const vorschlagBetrag = ergebnis?.moeglich === true ? ergebnis.betrag : null;
  const keinVorschlag = berechnungPasst && (ergebnis === null || ergebnis.moeglich === false);
  const betragAbweichend = vorschlagBetrag !== null && dezimalText(betrag) !== dezimalText(vorschlagBetrag);
  // Interest credit: a reason is mandatory for a deviating amount and when the database has no proposal.
  const grundPflicht = art === "auszahlung" || art === "abzug" || (istZins && (keinVorschlag || betragAbweichend));

  const gesperrt = !darfBuchen || isSubmitting;
  const aktuellesJahr = Number(start.heute.slice(0, 4));
  const mussGrundHaben = grundPflicht;

  const handleDatum = (datum: Date | undefined) => {
    if (datum) {
      setDatumWert(datum);
      setWertstellung(formatLocalDateToIso(datum));
    } else {
      setWertstellung("");
    }
  };

  const handleZinsDatum = (feld: "von" | "bis") => (datum: Date | undefined) => {
    const iso = datum ? formatLocalDateToIso(datum) : "";
    if (feld === "von") {
      if (datum) setZinsVonDatum(datum);
      setZinsVon(iso);
    } else {
      if (datum) setZinsBisDatum(datum);
      setZinsBis(iso);
    }
  };

  /**
   * Asks the database for the proposal of the current period (`berechneKautionZinsenAction`). A proposal fills the amount;
   * the user may still change it (then a reason is needed).
   */
  const handleBerechnen = async () => {
    if (!zinsPeriode || berechnungLaeuft || !darfBuchen) return;
    const periode = zinsPeriode;
    setBerechnungLaeuft(true);
    setServerFehler(null);
    setFehler((vorher) => ({ ...vorher, zinsBerechnung: undefined }));
    try {
      const result = await berechneKautionZinsenAction({ kautionId, von: periode.von, bis: periode.bisExkl });
      if (result.success) {
        const ergebnisNeu = result.data ?? null;
        setVorschlag({ von: periode.von, bisExkl: periode.bisExkl, ergebnis: ergebnisNeu });
        if (ergebnisNeu?.moeglich === true) setBetrag(betragZuEingabe(ergebnisNeu.betrag));
      } else {
        setVorschlag(null);
        const error = result.error ?? { message: KAUTION_FEHLER_FALLBACK_MESSAGE };
        if (!onFehler(error)) setServerFehler(error.message);
      }
    } catch {
      setVorschlag(null);
      setServerFehler(KAUTION_FEHLER_FALLBACK_MESSAGE);
    } finally {
      setBerechnungLaeuft(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current || !darfBuchen) return;

    const neueFehler: FeldFehler = {};

    const betragFehler = getMoneyInputError(betrag);
    if (betragFehler) neueFehler.betrag = betragFehler;

    const datumPruefung = validateKautionDatum(wertstellung);
    if (wertstellung === "") {
      // Incomplete input in the date field (it expects DD.MM.YYYY, the validator speaks ISO).
      neueFehler.wertstellung = "Bitte geben Sie ein gültiges Datum im Format TT.MM.JJJJ an.";
    } else if (!datumPruefung.ok) {
      neueFehler.wertstellung = datumPruefung.message;
    } else if (datumPruefung.value > heuteIso()) {
      neueFehler.wertstellung = "Die Wertstellung darf nicht in der Zukunft liegen.";
    }

    if (art === "abzug" && kategorie === "") neueFehler.kategorie = "Bitte wählen Sie eine Kategorie.";

    // Interest period: the form captures the end inclusive, the database gets it exclusive (+1 day).
    let zeitraum: ZinsPeriode | null = null;
    if (istZins) {
      const vonPruefung = validateKautionDatum(zinsVon, "Der Zinszeitraum (von)");
      const bisPruefung = validateKautionDatum(zinsBis, "Der Zinszeitraum (bis)");
      if (!vonPruefung.ok) {
        neueFehler.zinsVon = vonPruefung.message;
      } else if (!bisPruefung.ok) {
        neueFehler.zinsBis = bisPruefung.message;
      } else {
        const periodePruefung = validateZinszeitraum(vonPruefung.value, endeExklusiv(bisPruefung.value));
        if (!periodePruefung.ok) {
          neueFehler.zinsBis = periodePruefung.message;
        } else {
          zeitraum = { von: periodePruefung.value.von, bisExkl: periodePruefung.value.bis };
          if (!zinsPeriode || !berechnungPasst) {
            neueFehler.zinsBerechnung = "Bitte berechnen Sie zuerst die Zinsen für diesen Zeitraum.";
          }
        }
      }
    }

    const grundPruefung = validateKautionText(grund, {
      label: "Der Grund",
      min: mussGrundHaben ? KAUTION_TEXT_LIMITS.grund.min : 0,
      max: KAUTION_TEXT_LIMITS.grund.max,
      required: mussGrundHaben,
    });
    if (!grundPruefung.ok) {
      neueFehler.grund =
        istZins && mussGrundHaben
          ? keinVorschlag
            ? "Bitte begründen Sie den manuell erfassten Betrag (mindestens 3 Zeichen)."
            : "Bitte begründen Sie die Abweichung vom berechneten Betrag (mindestens 3 Zeichen)."
          : grundPruefung.message;
    }

    const empfaengerPruefung = validateKautionText(art === "auszahlung" ? empfaenger : "", {
      label: "Der Empfänger",
      max: KAUTION_TEXT_LIMITS.empfaenger.max,
    });
    if (!empfaengerPruefung.ok) neueFehler.empfaenger = empfaengerPruefung.message;

    const notizPruefung = validateKautionText(notiz, { label: "Die interne Notiz", max: KAUTION_TEXT_LIMITS.interneNotiz.max });
    if (!notizPruefung.ok) neueFehler.notiz = notizPruefung.message;

    setFehler(neueFehler);
    setServerFehler(null);
    if (
      Object.keys(neueFehler).length > 0 ||
      !datumPruefung.ok ||
      !grundPruefung.ok ||
      !empfaengerPruefung.ok ||
      !notizPruefung.ok ||
      (istZins && zeitraum === null)
    ) {
      return;
    }

    const eingabe = {
      art,
      betrag,
      wertstellung: datumPruefung.value,
      kategorie: art === "abzug" && kategorie !== "" ? kategorie : undefined,
      grund: grundPruefung.value ?? undefined,
      interneNotiz: notizPruefung.value ?? undefined,
      empfaenger: empfaengerPruefung.value ?? undefined,
      rateId: vorgabe?.art === "einzahlung" ? vorgabe.rateId : undefined,
      zinszeitraumVon: zeitraum?.von,
      zinszeitraumBis: zeitraum?.bisExkl,
    };
    const eingabeText = JSON.stringify(eingabe);
    const vorher = letzterVersuch.current;
    const idempotenzSchluessel =
      vorher === null ? (startSchluessel.current ??= neuerIdempotenzSchluessel()) : vorher.eingabe === eingabeText ? vorher.schluessel : neuerIdempotenzSchluessel();
    letzterVersuch.current = { schluessel: idempotenzSchluessel, eingabe: eingabeText };

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const result = await bucheKautionBewegungAction({ tenantId, kautionId, ...eingabe, idempotenzSchluessel });
      if (result.success) {
        // Next booking from this form (if it stays open): new key.
        letzterVersuch.current = null;
        startSchluessel.current = null;
        toast({ title: "Buchung erfasst.", variant: "success" });
        await onGebucht();
      } else {
        const error = result.error ?? { message: KAUTION_FEHLER_FALLBACK_MESSAGE };
        // e.g. KA005 (balance would fall below 0): shown at the form, the form stays open with the input.
        if (!onFehler(error)) setServerFehler(error.message);
      }
    } catch {
      // Network or transport error. A retry with the same idempotency key cannot book twice.
      setServerFehler(KAUTION_FEHLER_FALLBACK_MESSAGE);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  /** Hint under the amount field: the proposal, the reason rule or the preset of a rate. */
  const betragHinweis = (): string | undefined => {
    if (istZins) {
      if (vorschlagBetrag !== null) return `Vorschlag: ${formatBetrag(vorschlagBetrag)}. Bei einer Abweichung bitte den Grund angeben.`;
      if (keinVorschlag) return "Für diesen Zeitraum gibt es keinen Zinsvorschlag. Bitte erfassen Sie den Betrag manuell und begründen Sie ihn.";
      return "Bitte berechnen Sie zuerst die Zinsen. Der Betrag wird dann vorbelegt.";
    }
    if (vorgabe?.art === "einzahlung" && start.betrag !== "") {
      return `Vorbelegt mit dem offenen Betrag der Rate ${vorgabe.rateNr}. Sie können den Betrag ändern.`;
    }
    if (art === "auszahlung" && start.betrag !== "") {
      return `Vorbelegt mit dem verfügbaren Rest (Kontostand ${formatBetrag(kontostand)}). Sie können den Betrag ändern.`;
    }
    return undefined;
  };

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <form
          onSubmit={handleSubmit}
          noValidate
          aria-labelledby={`${basisId}-titel`}
          className="space-y-4"
          data-testid="kaution-buchung-form"
          data-bewegungsart={art}
        >
          <div className="space-y-0.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Neue Buchung</p>
            <h3 id={`${basisId}-titel`} className="text-base font-semibold">
              {KAUTION_BUCHUNG_TITEL[art]}
            </h3>
          </div>

          {vorgabe?.art === "einzahlung" ? (
            <p className="text-sm" data-testid="kaution-buchung-rate">
              Die Zahlung wird der Rate {vorgabe.rateNr} zugeordnet.
            </p>
          ) : null}

          <fieldset disabled={gesperrt} className="grid gap-4 sm:grid-cols-2">
            <legend className="sr-only">Angaben zur Buchung</legend>

            {istZins ? (
              <>
                <KautionFeld id={`${basisId}-zins-von`} label="Zinszeitraum von" pflicht fehler={fehler.zinsVon}>
                  {(props) => (
                    <DatePicker
                      id={props.id}
                      aria-invalid={props["aria-invalid"]}
                      aria-describedby={props["aria-describedby"]}
                      value={zinsVonDatum}
                      onChange={handleZinsDatum("von")}
                      placeholder="TT.MM.JJJJ"
                      fromYear={Number(KAUTION_MIN_WERTSTELLUNG.slice(0, 4))}
                      toYear={aktuellesJahr}
                      showClearButton={false}
                      disabled={gesperrt}
                    />
                  )}
                </KautionFeld>

                <KautionFeld
                  id={`${basisId}-zins-bis`}
                  label="Zinszeitraum bis (einschließlich)"
                  pflicht
                  fehler={fehler.zinsBis}
                  hinweis="Der Zeitraum endet mit diesem Tag."
                >
                  {(props) => (
                    <DatePicker
                      id={props.id}
                      aria-invalid={props["aria-invalid"]}
                      aria-describedby={props["aria-describedby"]}
                      value={zinsBisDatum}
                      onChange={handleZinsDatum("bis")}
                      placeholder="TT.MM.JJJJ"
                      fromYear={Number(KAUTION_MIN_WERTSTELLUNG.slice(0, 4))}
                      toYear={aktuellesJahr}
                      showClearButton={false}
                      disabled={gesperrt}
                    />
                  )}
                </KautionFeld>

                <div className="sm:col-span-2 space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void handleBerechnen()}
                    disabled={gesperrt || !zeitraumGueltig || berechnungLaeuft}
                  >
                    {berechnungLaeuft ? "Wird berechnet..." : "Zinsen berechnen"}
                  </Button>

                  {fehler.zinsBerechnung ? (
                    <p role="alert" className="text-xs font-medium text-destructive">
                      {fehler.zinsBerechnung}
                    </p>
                  ) : null}

                  <div aria-live="polite" data-testid="kaution-zins-vorschlag">
                    {berechnungPasst && ergebnis?.moeglich === true ? (
                      <div className="space-y-2 rounded-lg border p-3 text-sm">
                        <p>
                          Berechneter Zinsbetrag: <span className="font-medium tabular-nums">{formatBetrag(ergebnis.betrag)}</span> (
                          {KAUTION_ZINSMETHODE_LABELS[ergebnis.methode]}, {ergebnis.tage} Tage)
                        </p>
                        <KautionZinsSegmenteTabelle segmente={ergebnis.segmente} />
                      </div>
                    ) : null}

                    {berechnungPasst && ergebnis?.moeglich === false ? (
                      <Alert role="note" className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200 [&>svg]:text-amber-600">
                        <AlertDescription>
                          Für den Zeitraum ist kein Zinssatz hinterlegt (ab {formatDatum(ergebnis.erster_tag_ohne_satz)}). Bitte erfassen Sie den
                          Betrag manuell und begründen Sie ihn.
                        </AlertDescription>
                      </Alert>
                    ) : null}

                    {berechnungPasst && ergebnis === null ? (
                      <Alert role="note" className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200 [&>svg]:text-amber-600">
                        <AlertDescription>
                          Für diesen Zeitraum liegt kein Zinsvorschlag vor. Bitte erfassen Sie den Betrag manuell und begründen Sie ihn.
                        </AlertDescription>
                      </Alert>
                    ) : null}
                  </div>
                </div>
              </>
            ) : null}

            <KautionFeld
              id={`${basisId}-betrag`}
              label="Betrag (€)"
              pflicht
              fehler={fehler.betrag}
              hinweis={betragHinweis()}
            >
              {(props) => (
                <KautionBetragInput {...props} autoFocus={!istZins} value={betrag} onWertChange={setBetrag} />
              )}
            </KautionFeld>

            <KautionFeld
              id={`${basisId}-wertstellung`}
              label="Wertstellung"
              fehler={fehler.wertstellung}
              hinweis={
                istZins
                  ? `Vorgabe: Tag nach dem Zeitraum, höchstens heute (${formatDatum(start.heute)}).`
                  : `Höchstens heute (${formatDatum(start.heute)}).`
              }
            >
              {(props) => (
                <DatePicker
                  id={props.id}
                  aria-invalid={props["aria-invalid"]}
                  aria-describedby={props["aria-describedby"]}
                  value={datumWert}
                  onChange={handleDatum}
                  placeholder="TT.MM.JJJJ"
                  fromYear={Number(KAUTION_MIN_WERTSTELLUNG.slice(0, 4))}
                  toYear={aktuellesJahr}
                  showClearButton={false}
                  disabled={gesperrt}
                />
              )}
            </KautionFeld>

            {art === "abzug" ? (
              <KautionFeld id={`${basisId}-kategorie`} label="Kategorie (Pflicht)" pflicht fehler={fehler.kategorie} className="sm:col-span-2">
                {(props) => (
                  <Select
                    value={kategorie}
                    onValueChange={(wert) => setKategorie(wert as KautionAbzugKategorie)}
                    disabled={gesperrt}
                  >
                    <SelectTrigger {...props}>
                      <SelectValue placeholder="Kategorie auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {KAUTION_ABZUG_KATEGORIEN.map((eintrag) => (
                        <SelectItem key={eintrag} value={eintrag}>
                          {KAUTION_ABZUG_KATEGORIE_LABELS[eintrag]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </KautionFeld>
            ) : null}

            <KautionFeld
              id={`${basisId}-grund`}
              label={
                istZins
                  ? grundPflicht
                    ? "Grund (Pflicht, mindestens 3 Zeichen)"
                    : "Grund (optional)"
                  : mussGrundHaben
                    ? "Grund (Pflicht, mindestens 3 Zeichen)"
                    : "Grund (optional)"
              }
              pflicht={mussGrundHaben}
              fehler={fehler.grund}
              hinweis={
                istZins && betragAbweichend
                  ? "Abweichung vom berechneten Betrag begründen (z. B. Gutschrift der Bank)."
                  : undefined
              }
              className="sm:col-span-2"
            >
              {(props) => (
                <Textarea
                  {...props}
                  rows={2}
                  maxLength={KAUTION_TEXT_LIMITS.grund.max}
                  value={grund}
                  onChange={(event) => setGrund(event.target.value)}
                />
              )}
            </KautionFeld>

            {art === "auszahlung" ? (
              <KautionFeld id={`${basisId}-empfaenger`} label="Empfänger (optional)" fehler={fehler.empfaenger} className="sm:col-span-2">
                {(props) => (
                  <Input
                    {...props}
                    type="text"
                    autoComplete="off"
                    maxLength={KAUTION_TEXT_LIMITS.empfaenger.max}
                    value={empfaenger}
                    onChange={(event) => setEmpfaenger(event.target.value)}
                  />
                )}
              </KautionFeld>
            ) : null}

            <KautionFeld id={`${basisId}-notiz`} label="Interne Notiz (optional)" fehler={fehler.notiz} className="sm:col-span-2">
              {(props) => (
                <Textarea
                  {...props}
                  rows={2}
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
            <ButtonWithTooltip type="submit" disabled={gesperrt} tooltip={KEINE_BERECHTIGUNG_TEXT} showTooltip={!darfBuchen}>
              {isSubmitting ? "Wird gespeichert..." : "Buchen"}
            </ButtonWithTooltip>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
