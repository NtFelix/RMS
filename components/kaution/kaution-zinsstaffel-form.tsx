"use client";

import { useId, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { planeKautionZinsstaffelAction, type KautionActionError, type ZinsstaffelEingabe } from "@/app/kautionen-actions";
import { Button } from "@/components/ui/button";
import { ButtonWithTooltip } from "@/components/ui/button-with-tooltip";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { KEINE_BERECHTIGUNG_TEXT, KautionFeld, KautionFormularFehler, useDirtyMelder } from "@/components/kaution/kaution-feld";
import { heuteIso } from "@/components/kaution/kaution-format";
import {
  KAUTION_MIN_WERTSTELLUNG,
  KAUTION_ZINSSATZ_MAX_NACHKOMMASTELLEN,
  KAUTION_ZINSSTAFFEL_MAX_ZEILEN,
} from "@/lib/kautionen-constants";
import { KAUTION_FEHLER_FALLBACK_MESSAGE } from "@/lib/kautionen-errors";
import { parseZinssatzProzent } from "@/lib/kautionen-money";
import { validateKautionDatum } from "@/lib/kautionen-validation";
import { formatLocalDateToIso } from "@/utils/date-calculations";
import type { KautionZinssatz } from "@/types/Kaution";

/**
 * Form "Zinsstaffel" of the Zinsen tab (phase 3): the interest rates of a bank account deposit, each valid from a date
 * until the next row. The schedule is replaced as a whole (`planeKautionZinsstaffelAction`); an empty list removes it.
 *
 * - Rows: "Gültig ab" (date) and "Zinssatz in % p. a." as typed (`"1,5"`, `"1.50"`, `"0"`). The rates are checked here
 *   with the strict parser (`lib/kautionen-money.ts`); the action and the database check again.
 * - Up to 20 rows, dates strictly ascending. A rate of 0 is allowed.
 * - Once a booked interest credit covers a period, the database locks the schedule for that period (`KA009`): the
 *   message is shown at the form and as a toast.
 *
 * Interest rates are input only. The browser calculates nothing with them.
 */

/** One row as the form holds it. `id` is a stable React key (rows are added and removed). */
interface ZinsZeile {
  id: number;
  /** Valid from `YYYY-MM-DD` or `""` (incomplete input). */
  gueltigAb: string;
  /** Value of the date picker, only replaced for complete dates so that typing is not overwritten. */
  kalender: Date | undefined;
  /** Rate exactly as typed (German or point notation). */
  satz: string;
}

interface ZeilenFehler {
  datum?: string;
  satz?: string;
}

export interface KautionZinsstaffelFormProps {
  kautionId: string;
  /** The stored schedule (ascending), empty = none. */
  staffel: KautionZinssatz[];
  /** Right `bearbeiten`: without it the form is disabled and explains why. */
  darfBearbeiten: boolean;
  /** Called after saving (the dialog reloads its data). */
  onGespeichert: () => void | Promise<void>;
  onFehler: (error: KautionActionError) => boolean;
  onDirtyChange?: (dirty: boolean) => void;
}

/** Local calendar date for the date picker (no time zone shift). */
function isoZuLokalemDatum(iso: string): Date | undefined {
  const treffer = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!treffer) return undefined;
  return new Date(Number(treffer[1]), Number(treffer[2]) - 1, Number(treffer[3]));
}

/** Rate text of a stored rate (JSON number, display only): `1.5` becomes `"1,5"`. */
function satzZuEingabe(satz: number): string {
  return String(satz).replace(".", ",");
}

/** Comparable form of the rows: date and normalised rate per row (unparsable rates stay as typed). */
function zeilenSchluessel(zeilen: { gueltigAb: string; satz: string }[]): string {
  return zeilen.map((zeile) => `${zeile.gueltigAb}|${parseZinssatzProzent(zeile.satz) ?? zeile.satz.trim()}`).join(";");
}

export function KautionZinsstaffelForm({ kautionId, staffel, darfBearbeiten, onGespeichert, onFehler, onDirtyChange }: KautionZinsstaffelFormProps) {
  const basisId = useId();
  const naechsteId = useRef(staffel.length);
  const [start] = useState(() => staffel.map((zinssatz, index) => ({
    id: index,
    gueltigAb: zinssatz.gueltig_ab,
    kalender: isoZuLokalemDatum(zinssatz.gueltig_ab),
    satz: satzZuEingabe(zinssatz.zinssatz_prozent),
  })));

  const [zeilen, setZeilen] = useState<ZinsZeile[]>(start);
  const [fehler, setFehler] = useState<ZeilenFehler[]>([]);
  const [serverFehler, setServerFehler] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const isDirty = zeilenSchluessel(zeilen) !== zeilenSchluessel(start);
  useDirtyMelder(isDirty, onDirtyChange);

  const gesperrt = !darfBearbeiten || isSubmitting;
  const heuteJahr = Number(heuteIso().slice(0, 4));
  const maximalErreicht = zeilen.length >= KAUTION_ZINSSTAFFEL_MAX_ZEILEN;

  const aendereZeile = (id: number, aenderung: Partial<ZinsZeile>) => {
    setZeilen((vorher) => vorher.map((zeile) => (zeile.id === id ? { ...zeile, ...aenderung } : zeile)));
  };

  const hinzufuegen = () => {
    if (gesperrt || maximalErreicht) return;
    const id = naechsteId.current;
    naechsteId.current += 1;
    setZeilen((vorher) => [...vorher, { id, gueltigAb: "", kalender: undefined, satz: "" }]);
  };

  const entfernen = (id: number) => {
    if (gesperrt) return;
    setZeilen((vorher) => vorher.filter((zeile) => zeile.id !== id));
    setFehler([]);
  };

  /** Sends the schedule (complete list, `[]` removes it). A lock (`KA009`) is shown here and as a toast. */
  const sende = async (staffelEingabe: ZinsstaffelEingabe[], erfolgsText: string) => {
    submittingRef.current = true;
    setIsSubmitting(true);
    setServerFehler(null);
    try {
      const result = await planeKautionZinsstaffelAction({ kautionId, staffel: staffelEingabe });
      if (result.success) {
        toast({ title: erfolgsText, variant: "success" });
        await onGespeichert();
      } else {
        const error = result.error ?? { message: KAUTION_FEHLER_FALLBACK_MESSAGE };
        if (error.code === "KA009") {
          setServerFehler(error.message);
          onFehler(error);
        } else if (!onFehler(error)) {
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current || !darfBearbeiten) return;

    const zeilenFehler: ZeilenFehler[] = [];
    const eingabe: ZinsstaffelEingabe[] = [];
    let vorigesDatum: string | null = null;

    for (const zeile of zeilen) {
      const fehlerZeile: ZeilenFehler = {};

      const datum = validateKautionDatum(zeile.gueltigAb, "Das Gültigkeitsdatum");
      if (!datum.ok) {
        fehlerZeile.datum = datum.message;
      } else if (vorigesDatum !== null && datum.value <= vorigesDatum) {
        fehlerZeile.datum = "Das Gültigkeitsdatum muss nach dem Datum der vorherigen Zeile liegen.";
      }

      const satz = parseZinssatzProzent(zeile.satz);
      if (satz === null) {
        fehlerZeile.satz = `Der Zinssatz muss zwischen 0 und 100 liegen und höchstens ${KAUTION_ZINSSATZ_MAX_NACHKOMMASTELLEN} Nachkommastellen haben.`;
      }

      zeilenFehler.push(fehlerZeile);
      if (datum.ok && satz !== null && !fehlerZeile.datum) {
        eingabe.push({ gueltigAb: datum.value, zinssatzProzent: satz });
        vorigesDatum = datum.value;
      }
    }

    setFehler(zeilenFehler);
    setServerFehler(null);
    const hatFehler = zeilenFehler.some((fehlerZeile) => fehlerZeile.datum !== undefined || fehlerZeile.satz !== undefined);
    if (hatFehler || eingabe.length !== zeilen.length) return;

    await sende(eingabe, eingabe.length === 0 ? "Zinsstaffel entfernt." : "Zinsstaffel gespeichert.");
  };

  return (
    <form onSubmit={handleSubmit} noValidate aria-labelledby={`${basisId}-titel`} className="space-y-4" data-testid="kaution-zinsstaffel-form">
      <div className="space-y-1">
        <h3 id={`${basisId}-titel`} className="text-base font-semibold">
          Zinsstaffel
        </h3>
        <p className="text-sm text-muted-foreground">
          Jede Zeile gilt ab ihrem Datum bis zum Beginn der nächsten Zeile. Satz 0 ist zulässig (z. B. keine Verzinsungspflicht beim
          Studenten-/Jugendwohnheim).
        </p>
        {!darfBearbeiten ? (
          <p className="text-sm text-muted-foreground">Für das Bearbeiten der Zinsstaffel fehlt Ihnen die Berechtigung.</p>
        ) : null}
      </div>

      {zeilen.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="kaution-zinsstaffel-leer">
          Keine Zinsstaffel hinterlegt.
        </p>
      ) : null}

      <fieldset disabled={gesperrt} className="space-y-3">
        <legend className="sr-only">Zeilen der Zinsstaffel</legend>

        {zeilen.map((zeile, index) => {
          const nummer = index + 1;
          return (
            <fieldset key={zeile.id} className="grid gap-4 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
              <legend className="px-1 text-sm font-medium">Zeile {nummer}</legend>

              <KautionFeld id={`${basisId}-z${zeile.id}-datum`} label="Gültig ab" pflicht fehler={fehler[index]?.datum}>
                {(props) => (
                  <DatePicker
                    id={props.id}
                    aria-invalid={props["aria-invalid"]}
                    aria-describedby={props["aria-describedby"]}
                    value={zeile.kalender}
                    onChange={(datum) =>
                      datum
                        ? aendereZeile(zeile.id, { gueltigAb: formatLocalDateToIso(datum), kalender: datum })
                        : aendereZeile(zeile.id, { gueltigAb: "" })
                    }
                    placeholder="TT.MM.JJJJ"
                    fromYear={Number(KAUTION_MIN_WERTSTELLUNG.slice(0, 4))}
                    toYear={heuteJahr + 10}
                    showClearButton={false}
                    disabled={gesperrt}
                  />
                )}
              </KautionFeld>

              <KautionFeld id={`${basisId}-z${zeile.id}-satz`} label="Zinssatz in % p. a." pflicht fehler={fehler[index]?.satz}>
                {(props) => (
                  <Input
                    {...props}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="0,00"
                    value={zeile.satz}
                    onChange={(event) => aendereZeile(zeile.id, { satz: event.target.value })}
                  />
                )}
              </KautionFeld>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Zeile ${nummer} entfernen`}
                onClick={() => entfernen(zeile.id)}
                disabled={gesperrt}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </fieldset>
          );
        })}
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <ButtonWithTooltip
          type="button"
          variant="outline"
          size="sm"
          disabled={gesperrt || maximalErreicht}
          tooltip={KEINE_BERECHTIGUNG_TEXT}
          showTooltip={!darfBearbeiten}
          onClick={hinzufuegen}
        >
          <Plus aria-hidden="true" />
          Zeile hinzufügen
        </ButtonWithTooltip>
        <p className="text-xs text-muted-foreground">Höchstens {KAUTION_ZINSSTAFFEL_MAX_ZEILEN} Zeilen.</p>
      </div>

      <KautionFormularFehler message={serverFehler} />

      <div className="flex justify-end">
        <ButtonWithTooltip
          type="submit"
          disabled={gesperrt || !isDirty}
          tooltip={KEINE_BERECHTIGUNG_TEXT}
          showTooltip={!darfBearbeiten}
        >
          {isSubmitting ? "Wird gespeichert..." : "Zinsstaffel speichern"}
        </ButtonWithTooltip>
      </div>
    </form>
  );
}
