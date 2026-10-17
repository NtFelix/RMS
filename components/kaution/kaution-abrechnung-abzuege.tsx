"use client";

import { useId } from "react";
import { Minus } from "lucide-react";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ButtonWithTooltip } from "@/components/ui/button-with-tooltip";
import type { KautionBuchungVorgabe } from "@/components/kaution/kaution-buchung-form";
import { KEINE_BERECHTIGUNG_TEXT } from "@/components/kaution/kaution-feld";
import { formatBetrag, formatDatum } from "@/components/kaution/kaution-format";
import { KAUTION_ABZUG_KATEGORIE_LABELS } from "@/lib/kautionen-constants";
import type { KautionDetails, KautionRechte } from "@/types/Kaution";

/**
 * Section "1. Abzüge erfassen" of the settlement tab: the deductions that are not cancelled (from the statement, database
 * data only), and the button to book another one. The button hands over to the statement, where the booking form opens
 * with the type "Abzug" (category and reason are entered there).
 */

interface KautionAbrechnungAbzuegeProps {
  details: KautionDetails;
  rechte: KautionRechte;
  /** Opens the booking form of the statement with the preset (the dialog switches the tab). */
  onBuchungErfassen: (vorgabe: KautionBuchungVorgabe) => void;
}

export function KautionAbrechnungAbzuege({ details, rechte, onBuchungErfassen }: KautionAbrechnungAbzuegeProps) {
  const basisId = useId();
  const abzuege = details.kontoauszug.filter((bewegung) => bewegung.bewegungsart === "abzug" && bewegung.storniert_am === null);

  return (
    <section aria-labelledby={`${basisId}-titel`} className="space-y-3 rounded-xl border p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`${basisId}-titel`} className="text-base font-semibold">
          1. Abzüge erfassen
        </h3>
        <ButtonWithTooltip
          type="button"
          variant="outline"
          size="sm"
          disabled={!rechte.erstellen}
          tooltip={KEINE_BERECHTIGUNG_TEXT}
          showTooltip={!rechte.erstellen}
          onClick={() => onBuchungErfassen({ art: "abzug" })}
        >
          <Minus aria-hidden="true" />
          Abzug erfassen
        </ButtonWithTooltip>
      </div>

      {abzuege.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="kaution-abzuege-leer">
          Es sind noch keine Abzüge erfasst.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableCaption className="sr-only">Nicht stornierte Abzüge der Kaution mit Datum, Kategorie, Grund und Betrag</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Kategorie</TableHead>
                <TableHead>Grund</TableHead>
                <TableHead className="text-right">Betrag</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {abzuege.map((bewegung) => (
                <TableRow key={bewegung.id} data-testid="kaution-abzug-zeile">
                  <TableCell className="whitespace-nowrap tabular-nums">{formatDatum(bewegung.wertstellung)}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {bewegung.kategorie ? KAUTION_ABZUG_KATEGORIE_LABELS[bewegung.kategorie] : "–"}
                  </TableCell>
                  <TableCell className="whitespace-pre-wrap break-words">{bewegung.grund ?? "–"}</TableCell>
                  <TableCell className="whitespace-nowrap text-right tabular-nums">{formatBetrag(bewegung.betrag)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
