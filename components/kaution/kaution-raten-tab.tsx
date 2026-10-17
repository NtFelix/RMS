"use client";

import { useId } from "react";
import { ArrowDownToLine, Circle, CircleCheck, CircleDashed, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { KautionActionError } from "@/app/kautionen-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KautionRatenForm } from "@/components/kaution/kaution-raten-form";
import { formatBetrag, formatDatum } from "@/components/kaution/kaution-format";
import { KAUTION_RATE_STATUS_LABELS } from "@/lib/kautionen-constants";
import { parseMoneyToCents } from "@/lib/kautionen-money";
import { ratenSummeAbweichung } from "@/lib/kautionen-raten";
import { cn } from "@/lib/utils";
import type { KautionDetails, KautionRate, KautionRateStatus, KautionRechte } from "@/types/Kaution";

/**
 * Tab "Raten" (phase 2): the instalment plan of the deposit, its state per rate and, for users with the right to edit, the
 * form to create, replace or remove the plan.
 *
 * - Everything shown comes from the database (`get_kaution_details`): due dates, amounts, paid and open amounts, status.
 *   The browser only compares the sum of the rates with the target amount (non-blocking warning, the database does not
 *   require equality).
 * - The status is never conveyed by colour alone: every status has a text and an icon.
 * - "Zahlung erfassen" (users with the right to book) hands the open amount of a rate to the statement tab: the payment
 *   is booked as a deposit payment assigned to this rate.
 */

interface KautionRatenTabProps {
  details: KautionDetails;
  rechte: KautionRechte;
  /** Called after the plan was saved or removed (the dialog reloads its data). */
  onGeaendert: () => void | Promise<void>;
  onFehler: (error: KautionActionError) => boolean;
  onRatenDirtyChange?: (dirty: boolean) => void;
  /** "Zahlung erfassen" for one rate: the dialog switches to the statement and opens the payment form for it. */
  onZahlungErfassen: (rate: KautionRate) => void;
}

const STATUS_ICONS: Record<KautionRateStatus, LucideIcon> = {
  offen: Circle,
  teilweise: CircleDashed,
  bezahlt: CircleCheck,
  ueberfaellig: TriangleAlert,
};

const STATUS_FARBEN: Record<KautionRateStatus, string> = {
  offen: "border-slate-500/30 bg-slate-500/5 text-slate-700 dark:text-slate-300",
  teilweise: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  bezahlt: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  ueberfaellig: "border-red-500/40 bg-red-500/10 text-red-900 dark:text-red-200",
};

/** Status of a rate as text and icon (never colour alone). An unexpected value must not break the tab. */
function KautionRateStatusBadge({ status }: { status: KautionRateStatus }) {
  const bekannt = status in STATUS_ICONS;
  const Icon = bekannt ? STATUS_ICONS[status] : Circle;
  const label = bekannt ? KAUTION_RATE_STATUS_LABELS[status] : "Unbekannt";
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium", bekannt ? STATUS_FARBEN[status] : STATUS_FARBEN.offen)} data-status={status}>
      <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
    </Badge>
  );
}

export function KautionRatenTab({ details, rechte, onGeaendert, onFehler, onRatenDirtyChange, onZahlungErfassen }: KautionRatenTabProps) {
  const basisId = useId();
  const { kaution, raten_summe: ratenSumme } = details;
  const raten = details.raten ?? [];
  const hatPlan = raten.length > 0;

  // Sum of the rates against the target amount: only for a complete plan with exact amounts.
  const sollCents = parseMoneyToCents(kaution.soll_betrag);
  const ratenCents = raten.map((rate) => parseMoneyToCents(rate.soll_betrag));
  const ratenCentsGueltig = ratenCents.filter((cents): cents is number => cents !== null);
  const ratenKomplett = ratenCentsGueltig.length === raten.length;
  const abweichung =
    hatPlan && ratenKomplett && sollCents !== null
      ? ratenSummeAbweichung(
          ratenCentsGueltig.map((cents) => ({ sollCents: cents })),
          sollCents
        )
      : 0;

  // Changes when the stored plan changes: the form starts again from the stored state after every save.
  const planSchluessel = raten.map((rate) => `${rate.rate_id}:${rate.faelligkeitsdatum}:${rate.soll_betrag}`).join("|") || "kein-plan";

  return (
    <div className="space-y-4">
      <section aria-labelledby={`${basisId}-titel`} className="space-y-3 rounded-xl border p-4 sm:p-6">
        <h3 id={`${basisId}-titel`} className="text-base font-semibold">
          Ratenplan
        </h3>

        {hatPlan ? (
          <>
            <p className="text-sm" data-testid="kaution-raten-zusammenfassung">
              Der Ratenplan umfasst {raten.length === 1 ? "eine Rate" : `${raten.length} Raten`}. Summe der Raten:{" "}
              <span className="font-medium">{formatBetrag(ratenSumme ?? ratenCentsGueltig.reduce((summe, cents) => summe + cents, 0) / 100)}</span>
              , Soll-Betrag: <span className="font-medium">{formatBetrag(kaution.soll_betrag)}</span>.
            </p>

            {ratenKomplett && abweichung !== 0 ? (
              <Alert role="note" className="border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200 [&>svg]:text-amber-600">
                <TriangleAlert aria-hidden="true" className="h-4 w-4" />
                <AlertDescription>
                  Die Summe der Raten weicht vom Soll-Betrag um {formatBetrag(Math.abs(abweichung) / 100)}{" "}
                  {abweichung > 0 ? "nach oben" : "nach unten"} ab. Bitte prüfen Sie den Ratenplan. Die Buchungen sind davon nicht betroffen.
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="overflow-x-auto rounded-xl border">
              <Table>
                <TableCaption className="sr-only">
                  Ratenplan der Kaution: Fälligkeit, Soll-Betrag, bereits bezahlter und offener Betrag sowie Status je Rate
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rate</TableHead>
                    <TableHead>Fällig am</TableHead>
                    <TableHead className="text-right">Soll</TableHead>
                    <TableHead className="text-right">Bezahlt</TableHead>
                    <TableHead className="text-right">Offen</TableHead>
                    <TableHead>Status</TableHead>
                    {rechte.erstellen ? (
                      <TableHead>
                        <span className="sr-only">Aktionen</span>
                      </TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {raten.map((rate) => (
                    <TableRow key={rate.rate_id} data-testid="kaution-raten-zeile">
                      <TableCell className="font-medium">Rate {rate.rate_nr}</TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">{formatDatum(rate.faelligkeitsdatum)}</TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">{formatBetrag(rate.soll_betrag)}</TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">{formatBetrag(rate.gezahlt)}</TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">{formatBetrag(rate.offen)}</TableCell>
                      <TableCell>
                        <KautionRateStatusBadge status={rate.status} />
                      </TableCell>
                      {rechte.erstellen ? (
                        <TableCell className="text-right">
                          {rate.offen > 0 ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              aria-label={`Zahlung für Rate ${rate.rate_nr} erfassen`}
                              onClick={() => onZahlungErfassen(rate)}
                            >
                              <ArrowDownToLine aria-hidden="true" />
                              Zahlung erfassen
                            </Button>
                          ) : null}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground" data-testid="kaution-raten-leer">
            Für diese Kaution ist kein Ratenplan hinterlegt. Ein Ratenplan ist optional: Er teilt den Soll-Betrag in bis zu drei Raten
            mit Fälligkeitsdatum auf.
          </p>
        )}
      </section>

      <section className="space-y-3 rounded-xl border p-4 sm:p-6">
        {rechte.bearbeiten ? (
          <KautionRatenForm
            key={planSchluessel}
            kautionId={kaution.id}
            sollBetrag={kaution.soll_betrag}
            raten={raten}
            onGespeichert={onGeaendert}
            onFehler={onFehler}
            onDirtyChange={onRatenDirtyChange}
          />
        ) : (
          <p className="text-xs text-muted-foreground">Das Bearbeiten des Ratenplans ist mit Ihren Rechten nicht möglich.</p>
        )}
      </section>
    </div>
  );
}
