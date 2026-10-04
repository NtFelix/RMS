"use client";

import { useId, useRef, useState } from "react";
import { bucheKautionBewegungAction, type KautionActionError } from "@/app/kautionen-actions";
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
} from "@/lib/kautionen-constants";
import { KAUTION_FEHLER_FALLBACK_MESSAGE } from "@/lib/kautionen-errors";
import { getMoneyInputError } from "@/lib/kautionen-money";
import { validateKautionDatum, validateKautionText } from "@/lib/kautionen-validation";
import { formatLocalDateToIso } from "@/utils/date-calculations";
import type { KautionAbzugKategorie, KautionBewegungsArt } from "@/types/Kaution";

/**
 * Inline form "Neue Buchung" of the account statement: deposit (Einzahlung), payout (Auszahlung) or
 * deduction (Abzug). No nested dialog.
 *
 * - The payout is prefilled with the available rest (the balance, as displayed by the database).
 * - Value date: default today, never later than today (the database checks again, `KA013`).
 * - One idempotency key per opening of the form: a repeated request books nothing twice. After a failed attempt the
 *   key is kept for an identical retry and renewed as soon as the input differs from the failed attempt (a changed
 *   booking is another booking).
 * - The strict balance (never negative on any date) is checked by the database. A rejection (`KA005`) is shown
 *   here at the form and the form stays open with the input.
 *
 * Security relevant (money booking): not production ready until the maintainer has reviewed it; the form only
 * collects input, the action and the RPC validate and book.
 */

interface KautionBuchungFormProps {
  art: KautionBewegungsArt;
  tenantId: string;
  kautionId: string;
  /** Balance as displayed by the database: starting value of a payout. */
  kontostand: number;
  darfBuchen: boolean;
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
}

/** Local calendar date (no time zone shift) for the date picker. */
function isoZuLokalemDatum(iso: string): Date {
  const [jahr, monat, tag] = iso.split("-").map(Number);
  return new Date(jahr, monat - 1, tag);
}

export function KautionBuchungForm({
  art,
  tenantId,
  kautionId,
  kontostand,
  darfBuchen,
  onGebucht,
  onFehler,
  onAbbrechen,
  onDirtyChange,
}: KautionBuchungFormProps) {
  const basisId = useId();
  const mussGrundHaben = art === "auszahlung" || art === "abzug";

  // Start values: the payout is prefilled with the available rest (nothing to pay out at a balance of 0 or less).
  const [start] = useState(() => ({
    betrag: art === "auszahlung" && kontostand > 0 ? betragZuEingabe(kontostand) : "",
    heute: heuteIso(),
  }));
  // Only read in the submit handler, never rendered: a ref avoids a re-render on every change.
  const startSchluessel = useRef("");
  if (startSchluessel.current === "") startSchluessel.current = neuerIdempotenzSchluessel();
  // Last attempt (key and the input that was sent): a retry with identical input reuses the key, changed input does not.
  const letzterVersuch = useRef<{ schluessel: string; eingabe: string } | null>(null);

  const [betrag, setBetrag] = useState(start.betrag);
  // `wertstellung` is a valid ISO date or "" (incomplete input). `datumWert` is the value handed to the date
  // picker: it is only updated for valid dates, so that typing a date is not overwritten while it is incomplete.
  const [wertstellung, setWertstellung] = useState(start.heute);
  const [datumWert, setDatumWert] = useState(() => isoZuLokalemDatum(start.heute));
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
    wertstellung !== start.heute ||
    kategorie !== "" ||
    grund !== "" ||
    empfaenger !== "" ||
    notiz !== "";
  useDirtyMelder(isDirty, onDirtyChange);

  const gesperrt = !darfBuchen || isSubmitting;
  const aktuellesJahr = Number(start.heute.slice(0, 4));

  const handleDatum = (datum: Date | undefined) => {
    if (datum) {
      setDatumWert(datum);
      setWertstellung(formatLocalDateToIso(datum));
    } else {
      setWertstellung("");
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

    const grundPruefung = validateKautionText(grund, {
      label: "Der Grund",
      min: mussGrundHaben ? KAUTION_TEXT_LIMITS.grund.min : 0,
      max: KAUTION_TEXT_LIMITS.grund.max,
      required: mussGrundHaben,
    });
    if (!grundPruefung.ok) neueFehler.grund = grundPruefung.message;

    const empfaengerPruefung = validateKautionText(art === "auszahlung" ? empfaenger : "", {
      label: "Der Empfänger",
      max: KAUTION_TEXT_LIMITS.empfaenger.max,
    });
    if (!empfaengerPruefung.ok) neueFehler.empfaenger = empfaengerPruefung.message;

    const notizPruefung = validateKautionText(notiz, { label: "Die interne Notiz", max: KAUTION_TEXT_LIMITS.interneNotiz.max });
    if (!notizPruefung.ok) neueFehler.notiz = notizPruefung.message;

    setFehler(neueFehler);
    setServerFehler(null);
    if (Object.keys(neueFehler).length > 0 || !datumPruefung.ok || !grundPruefung.ok || !empfaengerPruefung.ok || !notizPruefung.ok) {
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
    };
    const eingabeText = JSON.stringify(eingabe);
    const vorher = letzterVersuch.current;
    const idempotenzSchluessel =
      vorher === null ? startSchluessel.current : vorher.eingabe === eingabeText ? vorher.schluessel : neuerIdempotenzSchluessel();
    letzterVersuch.current = { schluessel: idempotenzSchluessel, eingabe: eingabeText };

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const result = await bucheKautionBewegungAction({ tenantId, kautionId, ...eingabe, idempotenzSchluessel });
      if (result.success) {
        // Next booking from this form (if it stays open): new key.
        letzterVersuch.current = null;
        startSchluessel.current = neuerIdempotenzSchluessel();
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

          <fieldset disabled={gesperrt} className="grid gap-4 sm:grid-cols-2">
            <legend className="sr-only">Angaben zur Buchung</legend>

            <KautionFeld
              id={`${basisId}-betrag`}
              label="Betrag (€)"
              pflicht
              fehler={fehler.betrag}
              hinweis={
                art === "auszahlung" && start.betrag !== ""
                  ? `Vorbelegt mit dem verfügbaren Rest (Kontostand ${formatBetrag(kontostand)}). Sie können den Betrag ändern.`
                  : undefined
              }
            >
              {(props) => (
                <KautionBetragInput {...props} autoFocus value={betrag} onWertChange={setBetrag} />
              )}
            </KautionFeld>

            <KautionFeld
              id={`${basisId}-wertstellung`}
              label="Wertstellung"
              fehler={fehler.wertstellung}
              hinweis={`Höchstens heute (${formatDatum(start.heute)}).`}
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
              label={mussGrundHaben ? "Grund (Pflicht, mindestens 3 Zeichen)" : "Grund (optional)"}
              pflicht={mussGrundHaben}
              fehler={fehler.grund}
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
