"use client";

import { useId } from "react";
import { ArrowDownToLine } from "lucide-react";
import type { KautionActionError } from "@/app/kautionen-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ButtonWithTooltip } from "@/components/ui/button-with-tooltip";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { KautionBuchungVorgabe } from "@/components/kaution/kaution-buchung-form";
import { KEINE_BERECHTIGUNG_TEXT } from "@/components/kaution/kaution-feld";
import { formatBetrag, formatDatum } from "@/components/kaution/kaution-format";
import { KautionZinsstaffelForm } from "@/components/kaution/kaution-zinsstaffel-form";
import { endeEinschliessendSicher } from "@/lib/kautionen-zinsen";
import { cn } from "@/lib/utils";
import type { KautionDetails, KautionRechte } from "@/types/Kaution";

/**
 * Tab "Zinsen" (phase 3), only for bank accounts with the function flag `zinsen`:
 * - the balance including the accrued interest proposal, clearly marked as NOT yet credited (the database calculates it,
 *   the period ends the day before today),
 * - the interest schedule (`KautionZinsstaffelForm`),
 * - the interest credits booked so far; cancelled ones stay visible, struck through and marked.
 *
 * "Zinsgutschrift erfassen" hands the accrued period to the statement tab, where the booking form opens for it.
 */

interface KautionZinsenTabProps {
  details: KautionDetails;
  rechte: KautionRechte;
  /** Called after the schedule was saved (the dialog reloads its data). */
  onGeaendert: () => void | Promise<void>;
  onFehler: (error: KautionActionError) => boolean;
  onZinsstaffelDirtyChange?: (dirty: boolean) => void;
  /** Opens the interest credit form in the statement for the accrued period (`bis` exclusive, as the database gives it). */
  onZinsgutschriftErfassen: (vorgabe: KautionBuchungVorgabe) => void;
}

export function KautionZinsenTab({
  details,
  rechte,
  onGeaendert,
  onFehler,
  onZinsstaffelDirtyChange,
  onZinsgutschriftErfassen,
}: KautionZinsenTabProps) {
  const basisId = useId();
  const { kaution, konto, kontoauszug, zinsstaffel, kontostand_inkl_zinsen: kontostandInklZinsen } = details;
  const aufgelaufen = details.zins_aufgelaufen ?? null;
  const zinsGutschriften = kontoauszug.filter((bewegung) => bewegung.bewegungsart === "zinsgutschrift");
  const aktiveGutschriften = zinsGutschriften.filter((bewegung) => bewegung.storniert_am === null).length;

  const handleZinsgutschrift = () => {
    if (!aufgelaufen) return;
    onZinsgutschriftErfassen({ art: "zinsgutschrift", von: aufgelaufen.von, bis: aufgelaufen.bis });
  };

  return (
    <div className="space-y-4">
      <section aria-labelledby={`${basisId}-kontostand`} className="space-y-3 rounded-xl border p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id={`${basisId}-kontostand`} className="text-base font-semibold">
            Kontostand inkl. aufgelaufener Zinsen
          </h3>
          <ButtonWithTooltip
            type="button"
            variant="outline"
            size="sm"
            disabled={!rechte.erstellen || aufgelaufen === null}
            tooltip={KEINE_BERECHTIGUNG_TEXT}
            showTooltip={!rechte.erstellen}
            onClick={handleZinsgutschrift}
          >
            <ArrowDownToLine aria-hidden="true" />
            Zinsgutschrift erfassen
          </ButtonWithTooltip>
        </div>

        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-muted-foreground">Kontostand</dt>
            <dd className="font-medium tabular-nums">{formatBetrag(konto.kontostand)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted-foreground">Kontostand inkl. aufgelaufener Zinsen</dt>
            <dd className="font-medium tabular-nums" data-testid="kaution-zins-kontostand-inkl">
              {typeof kontostandInklZinsen === "number" ? formatBetrag(kontostandInklZinsen) : "–"}
            </dd>
          </div>
        </dl>

        {aufgelaufen === null ? (
          <p className="text-sm text-muted-foreground">Derzeit sind keine Zinsen aufgelaufen.</p>
        ) : aufgelaufen.moeglich === true ? (
          <div className="space-y-1 text-sm" data-testid="kaution-zins-aufgelaufen">
            <p className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 font-normal text-amber-800 dark:text-amber-300">
                Vorschlag, noch nicht gutgeschrieben
              </Badge>
            </p>
            <p>
              Aufgelaufen vom {formatDatum(aufgelaufen.von)} bis {formatDatum(endeEinschliessendSicher(aufgelaufen.bis))}:{" "}
              <span className="font-medium tabular-nums">{formatBetrag(aufgelaufen.betrag)}</span>
            </p>
          </div>
        ) : (
          <Alert role="note" className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200 [&>svg]:text-amber-600">
            <AlertDescription>
              {aufgelaufen.grund === "ZEITRAUM_ZU_LANG"
                ? `Der Zeitraum seit ${formatDatum(aufgelaufen.von)} ist länger als zehn Jahre und kann nicht in einem Schritt berechnet werden. Die Zinsen sind in den Beträgen nicht enthalten. Erfassen Sie zuerst Zinsgutschriften für frühere Zeiträume (je höchstens zehn Jahre).`
                : `Für den Zeitraum ist kein Zinssatz hinterlegt (ab ${formatDatum(aufgelaufen.erster_tag_ohne_satz)}). Bitte hinterlegen Sie die Zinsstaffel oder erfassen Sie die Zinsgutschrift manuell.`}
            </AlertDescription>
          </Alert>
        )}
      </section>

      <section aria-label="Zinsstaffel" className="space-y-3 rounded-xl border p-4 sm:p-6">
        <KautionZinsstaffelForm
          key={(zinsstaffel ?? []).map((zeile) => `${zeile.gueltig_ab}:${zeile.zinssatz_prozent}`).join("|") || "keine-staffel"}
          kautionId={kaution.id}
          staffel={zinsstaffel ?? []}
          darfBearbeiten={rechte.bearbeiten}
          onGespeichert={onGeaendert}
          onFehler={onFehler}
          onDirtyChange={onZinsstaffelDirtyChange}
        />
      </section>

      <section aria-labelledby={`${basisId}-gutschriften`} className="space-y-3 rounded-xl border p-4 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id={`${basisId}-gutschriften`} className="text-base font-semibold">
            Bisherige Zinsgutschriften
          </h3>
          <p className="text-sm text-muted-foreground" data-testid="kaution-zins-aktiv-anzahl">
            Aktive Zinsgutschriften: {aktiveGutschriften}
          </p>
        </div>

        {zinsGutschriften.length === 0 ? (
          <p className="text-sm text-muted-foreground">Es sind noch keine Zinsgutschriften vorhanden.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableCaption className="sr-only">Zinsgutschriften der Kaution mit Zinszeitraum, Wertstellung und Betrag</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Zinszeitraum</TableHead>
                  <TableHead>Wertstellung</TableHead>
                  <TableHead className="text-right">Betrag</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zinsGutschriften.map((bewegung) => {
                  const storniert = bewegung.storniert_am !== null;
                  return (
                    <TableRow key={bewegung.id} data-storniert={storniert ? "true" : undefined}>
                      <TableCell className={cn("whitespace-nowrap", storniert && "text-muted-foreground line-through")}>
                        {bewegung.zinszeitraum_von
                          ? `${formatDatum(bewegung.zinszeitraum_von)} – ${formatDatum(endeEinschliessendSicher(bewegung.zinszeitraum_bis))}`
                          : "–"}
                      </TableCell>
                      <TableCell className={cn("whitespace-nowrap tabular-nums", storniert && "text-muted-foreground line-through")}>
                        {formatDatum(bewegung.wertstellung)}
                      </TableCell>
                      <TableCell className={cn("whitespace-nowrap text-right tabular-nums", storniert && "text-muted-foreground line-through")}>
                        {formatBetrag(bewegung.betrag)}
                      </TableCell>
                      <TableCell>
                        {storniert ? (
                          <Badge variant="outline" className="border-slate-500/40 bg-slate-500/10 text-slate-700 dark:text-slate-300">
                            storniert
                          </Badge>
                        ) : (
                          <span className="text-sm">gutgeschrieben</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
