"use client";

import { useId, useRef, useState } from "react";
import { ArrowDownToLine, Calculator, TriangleAlert } from "lucide-react";
import { getKautionAbrechnungAction, type KautionActionError } from "@/app/kautionen-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ButtonWithTooltip } from "@/components/ui/button-with-tooltip";
import { DatePicker } from "@/components/ui/date-picker";
import { useKautionFlag } from "@/hooks/use-kaution-flag";
import type { KautionBuchungVorgabe } from "@/components/kaution/kaution-buchung-form";
import { KautionAbrechnungAbzuege } from "@/components/kaution/kaution-abrechnung-abzuege";
import { KautionAbrechnungEinbehalt } from "@/components/kaution/kaution-abrechnung-einbehalt";
import { KautionAbrechnungPdf } from "@/components/kaution/kaution-abrechnung-pdf";
import { KEINE_BERECHTIGUNG_TEXT, KautionFormularFehler } from "@/components/kaution/kaution-feld";
import { formatBetrag, formatDatum, heuteIso } from "@/components/kaution/kaution-format";
import { KAUTION_ABZUG_KATEGORIE_LABELS, KAUTION_MIN_WERTSTELLUNG } from "@/lib/kautionen-constants";
import { KAUTION_FEHLER_FALLBACK_MESSAGE } from "@/lib/kautionen-errors";
import { parseMoneyToCents } from "@/lib/kautionen-money";
import { endeEinschliessendSicher } from "@/lib/kautionen-zinsen";
import { validateKautionDatum } from "@/lib/kautionen-validation";
import { formatLocalDateToIso, isoToLocalDate } from "@/utils/date-calculations";
import type { KautionAbrechnung, KautionDetails, KautionRechte } from "@/types/Kaution";

/**
 * Tab "Abrechnung" (phase 4): the settlement assistant of a deposit with a bank account, as four numbered sections
 * (cards below each other, no fixed order, each section stays usable):
 *   1. deductions (list + "Abzug erfassen"),
 *   2. calculation for a settlement date (balance, deductions per category, payouts, interest not yet credited),
 *   3. PDF (interim or final settlement, from the calculation above),
 *   4. payout and hold ("Einbehalt").
 *
 * The browser calculates nothing: every amount comes from `getKautionAbrechnungAction` (database `get_kaution_abrechnung`)
 * or from `details`. Comparisons only on exact cents (`lib/kautionen-money.ts`).
 *
 * The calculation belongs to the data it was made from: after every change the dialog reloads its data (new `details`), the
 * calculation is then marked "veraltet" and has to be repeated. A new settlement date also needs a new calculation.
 *
 * Only shown with the function flag `abrechnung` and a bank account type (the dialog decides).
 * Security relevant (settlement and hold of money): not production ready until the maintainer has reviewed it.
 */

interface KautionAbrechnungTabProps {
  tenantId: string;
  details: KautionDetails;
  rechte: KautionRechte;
  /** Called after a change in the hold (the dialog reloads its data). */
  onGeaendert: () => void | Promise<void>;
  onFehler: (error: KautionActionError) => boolean;
  onEinbehaltDirtyChange?: (dirty: boolean) => void;
  /** Opens the booking form of the statement with the preset (deduction, payout, interest credit). */
  onBuchungErfassen: (vorgabe: KautionBuchungVorgabe) => void;
}

/**
 * Result of the last calculation. `details` is the data it was made from (identity: a reload creates new `details`), `stichtag`
 * the settlement date. `abrechnung: null`: the database answered NULL (not visible or no account type).
 */
interface Berechnung {
  stichtag: string;
  details: KautionDetails;
  abrechnung: KautionAbrechnung | null;
}

export function KautionAbrechnungTab({
  tenantId,
  details,
  rechte,
  onGeaendert,
  onFehler,
  onEinbehaltDirtyChange,
  onBuchungErfassen,
}: KautionAbrechnungTabProps) {
  const basisId = useId();
  const { funktionen } = useKautionFlag();
  const [stichtagStart] = useState(() => heuteIso());
  const [stichtag, setStichtag] = useState(stichtagStart);
  const [stichtagKalender, setStichtagKalender] = useState<Date | undefined>(() => isoToLocalDate(stichtagStart));
  const [stichtagFehler, setStichtagFehler] = useState<string | undefined>(undefined);
  const [berechnung, setBerechnung] = useState<Berechnung | null>(null);
  const [berechnungLaeuft, setBerechnungLaeuft] = useState(false);
  const [serverFehler, setServerFehler] = useState<string | null>(null);
  const laeuftRef = useRef(false);

  // Calculation of the shown data and settlement date. Other combinations are not shown (no stale numbers).
  const aktuell = berechnung !== null && berechnung.details === details && berechnung.stichtag === stichtag ? berechnung : null;
  const veraltet = berechnung !== null && berechnung.details !== details;
  const abrechnung = aktuell?.abrechnung ?? null;
  const zinsen = abrechnung?.zinsen_offen ?? null;
  // Exact comparison in cents: only an interest amount above 0 can be credited.
  const zinsCents = zinsen?.moeglich === true ? parseMoneyToCents(zinsen.betrag) : null;
  const zinsGutschriftMoeglich = zinsCents !== null && zinsCents > 0 && zinsen?.moeglich === true;

  const handleBerechnen = async () => {
    if (laeuftRef.current || !rechte.ansehen) return;
    const heute = heuteIso();
    const datumPruefung = validateKautionDatum(stichtag, "Das Auszahlungsdatum");
    if (!datumPruefung.ok) {
      setStichtagFehler(datumPruefung.message);
      return;
    }
    if (datumPruefung.value > heute) {
      setStichtagFehler("Das Auszahlungsdatum darf nicht in der Zukunft liegen.");
      return;
    }
    setStichtagFehler(undefined);
    setServerFehler(null);

    laeuftRef.current = true;
    setBerechnungLaeuft(true);
    // The data the calculation is made from: a reload while the request runs makes the result stale.
    const datenBeimStart = details;
    try {
      const result = await getKautionAbrechnungAction({ tenantId, stichtag: datumPruefung.value });
      if (result.success) {
        setBerechnung({ stichtag: datumPruefung.value, details: datenBeimStart, abrechnung: result.data ?? null });
      } else {
        setBerechnung(null);
        const error = result.error ?? { message: KAUTION_FEHLER_FALLBACK_MESSAGE };
        if (!onFehler(error)) setServerFehler(error.message);
      }
    } catch {
      setBerechnung(null);
      setServerFehler(KAUTION_FEHLER_FALLBACK_MESSAGE);
    } finally {
      laeuftRef.current = false;
      setBerechnungLaeuft(false);
    }
  };

  const handleZinsgutschrift = () => {
    if (!zinsen || zinsen.moeglich !== true || !zinsGutschriftMoeglich) return;
    onBuchungErfassen({ art: "zinsgutschrift", von: zinsen.von, bis: zinsen.bis });
  };

  const zinsGutschriftDarf = rechte.erstellen && funktionen.zinsen;

  return (
    <div className="space-y-4">
      <KautionAbrechnungAbzuege details={details} rechte={rechte} onBuchungErfassen={onBuchungErfassen} />

      <section aria-labelledby={`${basisId}-berechnung`} className="space-y-4 rounded-xl border p-4 sm:p-6">
        <h3 id={`${basisId}-berechnung`} className="text-base font-semibold">
          2. Berechnung
        </h3>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-1.5">
            <label htmlFor={`${basisId}-stichtag`} className="text-sm font-medium">
              Auszahlungsdatum (Stichtag)
            </label>
            <DatePicker
              id={`${basisId}-stichtag`}
              aria-invalid={stichtagFehler ? true : undefined}
              aria-describedby={stichtagFehler ? `${basisId}-stichtag-fehler` : undefined}
              value={stichtagKalender}
              onChange={(datum) => {
                if (datum) {
                  setStichtagKalender(datum);
                  setStichtag(formatLocalDateToIso(datum));
                } else {
                  setStichtag("");
                }
              }}
              placeholder="TT.MM.JJJJ"
              fromYear={Number(KAUTION_MIN_WERTSTELLUNG.slice(0, 4))}
              toYear={Number(stichtagStart.slice(0, 4))}
              showClearButton={false}
              disabled={berechnungLaeuft}
            />
            {stichtagFehler ? (
              <p id={`${basisId}-stichtag-fehler`} role="alert" className="text-xs font-medium text-destructive">
                {stichtagFehler}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Höchstens heute ({formatDatum(stichtagStart)}).</p>
            )}
          </div>
          <ButtonWithTooltip
            type="button"
            variant="outline"
            disabled={!rechte.ansehen || berechnungLaeuft}
            tooltip={KEINE_BERECHTIGUNG_TEXT}
            showTooltip={!rechte.ansehen}
            onClick={() => void handleBerechnen()}
          >
            <Calculator aria-hidden="true" />
            {berechnungLaeuft ? "Wird berechnet..." : "Berechnen"}
          </ButtonWithTooltip>
        </div>

        <KautionFormularFehler message={serverFehler} />

        {veraltet ? (
          <Alert role="note" className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200 [&>svg]:text-amber-600" data-testid="kaution-abrechnung-veraltet">
            <TriangleAlert aria-hidden="true" className="h-4 w-4" />
            <AlertDescription>
              Die Daten der Kaution haben sich geändert. Die Berechnung ist veraltet und muss neu berechnet werden.
            </AlertDescription>
          </Alert>
        ) : null}

        {aktuell && abrechnung === null ? (
          <Alert role="note" className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200 [&>svg]:text-amber-600">
            <AlertDescription>Für diese Kaution ist keine Abrechnung verfügbar.</AlertDescription>
          </Alert>
        ) : null}

        {abrechnung ? (
          <div className="space-y-4" data-testid="kaution-abrechnung-ergebnis">
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="text-muted-foreground">Kontostand</dt>
                <dd className="font-medium tabular-nums" data-testid="kaution-abrechnung-kontostand">
                  {formatBetrag(abrechnung.konto.kontostand)}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-muted-foreground">Bisherige Auszahlungen</dt>
                <dd className="font-medium tabular-nums">{formatBetrag(abrechnung.konto.summe_auszahlungen)}</dd>
              </div>
            </dl>

            <div className="space-y-2 text-sm">
              <p className="font-medium">Abzüge je Kategorie</p>
              {abrechnung.abzuege.length === 0 ? (
                <p className="text-muted-foreground">Keine Abzüge bis zum Auszahlungsdatum.</p>
              ) : (
                <ul className="space-y-1" data-testid="kaution-abrechnung-abzuege">
                  {abrechnung.abzuege.map((abzug) => (
                    <li key={abzug.kategorie} className="flex flex-wrap justify-between gap-2">
                      <span>
                        {KAUTION_ABZUG_KATEGORIE_LABELS[abzug.kategorie]} ({abzug.anzahl} {abzug.anzahl === 1 ? "Buchung" : "Buchungen"})
                      </span>
                      <span className="tabular-nums">{formatBetrag(abzug.summe)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2 text-sm" data-testid="kaution-abrechnung-zinsen">
              <p className="font-medium">Zinsen bis zum Auszahlungsdatum (noch nicht gutgeschrieben)</p>
              {zinsen === null ? (
                <p className="text-muted-foreground">Bis zum Auszahlungsdatum sind keine Zinsen aufgelaufen.</p>
              ) : zinsen.moeglich === true ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span>
                    Vom {formatDatum(zinsen.von)} bis {formatDatum(endeEinschliessendSicher(zinsen.bis))}:{" "}
                    <span className="font-medium tabular-nums">{formatBetrag(zinsen.betrag)}</span>
                  </span>
                  <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 font-normal text-amber-800 dark:text-amber-300">
                    Vorschlag, noch nicht gutgeschrieben
                  </Badge>
                </div>
              ) : (
                <Alert role="note" className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200 [&>svg]:text-amber-600">
                  <AlertDescription>
                    Kein Zinssatz hinterlegt (ab {formatDatum(zinsen.erster_tag_ohne_satz)}). Die Zinsen können nicht berechnet werden.
                  </AlertDescription>
                </Alert>
              )}
              {funktionen.zinsen && zinsGutschriftMoeglich ? (
                <ButtonWithTooltip
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!zinsGutschriftDarf}
                  tooltip={KEINE_BERECHTIGUNG_TEXT}
                  showTooltip={!rechte.erstellen}
                  onClick={handleZinsgutschrift}
                >
                  <ArrowDownToLine aria-hidden="true" />
                  Zinsen gutschreiben
                </ButtonWithTooltip>
              ) : null}
            </div>

            <p className="text-sm">
              <span className="text-muted-foreground">Betrag inkl. Zinsen: </span>
              <span className="font-semibold tabular-nums" data-testid="kaution-abrechnung-betrag-inkl-zinsen">
                {formatBetrag(abrechnung.betrag_inkl_zinsen)}
              </span>
            </p>
          </div>
        ) : null}
      </section>

      <KautionAbrechnungPdf
        tenantId={tenantId}
        // Only the settlement date of a current calculation: without it the PDF buttons stay disabled.
        stichtag={abrechnung !== null && aktuell !== null ? aktuell.stichtag : null}
        darfAnsehen={rechte.ansehen}
        dokumenteAktiv={funktionen.dokumente}
      />

      <KautionAbrechnungEinbehalt
        details={details}
        rechte={rechte}
        onGeaendert={onGeaendert}
        onFehler={onFehler}
        onEinbehaltDirtyChange={onEinbehaltDirtyChange}
        onBuchungErfassen={onBuchungErfassen}
      />
    </div>
  );
}
