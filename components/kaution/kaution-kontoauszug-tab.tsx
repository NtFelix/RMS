"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, ChevronDown, ChevronRight, Minus, Plus, Scissors } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { KautionActionError } from "@/app/kautionen-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonWithTooltip } from "@/components/ui/button-with-tooltip";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KautionBuchungForm, KAUTION_BUCHUNG_TITEL } from "@/components/kaution/kaution-buchung-form";
import { KEINE_BERECHTIGUNG_TEXT } from "@/components/kaution/kaution-feld";
import { formatBetrag, formatDatum } from "@/components/kaution/kaution-format";
import { KautionStornoDialog } from "@/components/kaution/kaution-storno-dialog";
import {
  KAUTION_ABZUG_KATEGORIE_LABELS,
  KAUTION_BEWEGUNGSARTEN_VERFUEGBAR,
  KAUTION_BEWEGUNGSART_LABELS,
} from "@/lib/kautionen-constants";
import { cn } from "@/lib/utils";
import type { KautionBewegung, KautionBewegungsArt, KautionDetails, KautionRechte } from "@/types/Kaution";

/**
 * Tab "Kontoauszug": action bar, inline booking form ("Neue Buchung"), statement table and cancellation.
 *
 * The statement comes from the database in booking order with the running balance (`saldo_nach_buchung`). The
 * browser neither sorts nor calculates it. Cancelled rows stay visible, struck through and marked with the
 * badge "storniert"; they do not take part in the running balance (no balance is shown for them).
 * Amounts and directions are never conveyed by colour alone: sign, type column and an invisible text for
 * assistive technology say the same.
 *
 * Switching the booking type while the open form holds unsaved input asks first (`onVerwerfenBestaetigen`, the
 * confirmation dialog of the modal store): the form is replaced (new input, new idempotency key), so nothing is
 * discarded by accident. The scrollable statement is a focusable, labelled region so that it can be scrolled by
 * keyboard even if no row holds a focusable control.
 */

interface KautionKontoauszugTabProps {
  details: KautionDetails;
  rechte: KautionRechte;
  tenantId: string;
  /** Called after a booking or cancellation (the dialog reloads its data). */
  onGeaendert: () => void | Promise<void>;
  onFehler: (error: KautionActionError) => boolean;
  onBuchungDirtyChange?: (dirty: boolean) => void;
  /**
   * Asks whether unsaved input of the booking form may be discarded; runs `onBestaetigt` only after the user
   * agreed (the dialog uses the confirmation dialog of the modal store).
   */
  onVerwerfenBestaetigen: (onBestaetigt: () => void) => void;
}

const BUCHUNG_ICONS: Record<KautionBewegungsArt, LucideIcon> = {
  einzahlung: ArrowDownToLine,
  zinsgutschrift: Plus,
  auszahlung: ArrowUpFromLine,
  abzug: Minus,
};

/** Details that fit into the expandable row (reason, note, recipient, cancellation). */
function hatDetails(bewegung: KautionBewegung): boolean {
  return Boolean(
    bewegung.grund || bewegung.interne_notiz || bewegung.empfaenger || bewegung.storniert_am || bewegung.storno_grund
  );
}

function bewegungBeschreibung(bewegung: KautionBewegung): string {
  return `${KAUTION_BEWEGUNGSART_LABELS[bewegung.bewegungsart] ?? "Buchung"} vom ${formatDatum(bewegung.wertstellung)} über ${formatBetrag(bewegung.betrag)}`;
}

export function KautionKontoauszugTab({
  details,
  rechte,
  tenantId,
  onGeaendert,
  onFehler,
  onBuchungDirtyChange,
  onVerwerfenBestaetigen,
}: KautionKontoauszugTabProps) {
  const [aktiveBuchung, setAktiveBuchung] = useState<KautionBewegungsArt | null>(null);
  const [offeneZeilen, setOffeneZeilen] = useState<ReadonlySet<string>>(() => new Set());
  const [stornoZiel, setStornoZiel] = useState<KautionBewegung | null>(null);
  // After closing the booking form the focus goes back to the button that opened it (the form disappears
  // together with the focused element, otherwise the focus would fall back to the page).
  const knoepfe = useRef(new Map<KautionBewegungsArt, HTMLButtonElement>());
  const [fokusZurueck, setFokusZurueck] = useState<KautionBewegungsArt | null>(null);

  const { kontoauszug, konto, kaution } = details;

  useEffect(() => {
    if (fokusZurueck === null || aktiveBuchung !== null) return;
    knoepfe.current.get(fokusZurueck)?.focus();
    setFokusZurueck(null);
  }, [fokusZurueck, aktiveBuchung]);

  const zeileUmschalten = useCallback((id: string) => {
    setOffeneZeilen((vorher) => {
      const naechste = new Set(vorher);
      if (naechste.has(id)) naechste.delete(id);
      else naechste.add(id);
      return naechste;
    });
  }, []);

  const handleGebucht = useCallback(async () => {
    setFokusZurueck(aktiveBuchung);
    setAktiveBuchung(null);
    await onGeaendert();
  }, [aktiveBuchung, onGeaendert]);

  const handleBuchungAbbrechen = useCallback(() => {
    setFokusZurueck(aktiveBuchung);
    setAktiveBuchung(null);
  }, [aktiveBuchung]);

  // Does the open booking form hold unsaved input? Only read when another type is chosen: a ref is enough.
  const buchungHatEingaben = useRef(false);
  const handleBuchungDirty = useCallback(
    (dirty: boolean) => {
      buchungHatEingaben.current = dirty;
      onBuchungDirtyChange?.(dirty);
    },
    [onBuchungDirtyChange]
  );

  const waehleBuchungsart = (art: KautionBewegungsArt) => {
    if (art === aktiveBuchung) return;
    if (aktiveBuchung !== null && buchungHatEingaben.current) {
      // The form is replaced (`key`): ask before the input is discarded.
      onVerwerfenBestaetigen(() => setAktiveBuchung(art));
      return;
    }
    setAktiveBuchung(art);
  };

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Buchung erfassen" className="flex flex-wrap gap-2">
        {KAUTION_BEWEGUNGSARTEN_VERFUEGBAR.map((art) => {
          const Icon = BUCHUNG_ICONS[art];
          return (
            <ButtonWithTooltip
              key={art}
              ref={(element) => {
                if (element) knoepfe.current.set(art, element);
                else knoepfe.current.delete(art);
              }}
              type="button"
              size="sm"
              variant={aktiveBuchung === art ? "default" : "outline"}
              disabled={!rechte.erstellen}
              tooltip={KEINE_BERECHTIGUNG_TEXT}
              showTooltip={!rechte.erstellen}
              onClick={() => waehleBuchungsart(art)}
            >
              <Icon aria-hidden="true" />
              {KAUTION_BUCHUNG_TITEL[art]}
            </ButtonWithTooltip>
          );
        })}
      </div>

      {!rechte.erstellen || !rechte.loeschen ? (
        <p className="text-xs text-muted-foreground">
          {!rechte.erstellen
            ? "Das Erfassen von Buchungen ist mit Ihren Rechten nicht möglich."
            : "Das Stornieren von Buchungen ist mit Ihren Rechten nicht möglich."}
        </p>
      ) : null}

      {aktiveBuchung ? (
        <KautionBuchungForm
          // New key per type: every opening gets its own idempotency key and fresh input.
          key={aktiveBuchung}
          art={aktiveBuchung}
          tenantId={tenantId}
          kautionId={kaution.id}
          kontostand={konto.kontostand}
          darfBuchen={rechte.erstellen}
          onGebucht={handleGebucht}
          onFehler={onFehler}
          onAbbrechen={handleBuchungAbbrechen}
          onDirtyChange={handleBuchungDirty}
        />
      ) : null}

      {kontoauszug.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Es sind noch keine Buchungen vorhanden.
        </p>
      ) : (
        <div
          role="region"
          aria-label="Kontoauszug (scrollbarer Bereich)"
          // Focusable so that the scrollable area can be scrolled by keyboard (WCAG 2.1.1) even without focusable rows.
          tabIndex={0}
          className="max-h-[420px] overflow-auto rounded-xl border ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Table>
            <TableCaption className="sr-only">
              Kontoauszug der Kaution: Buchungen mit Wertstellung, Betrag und Kontostand nach der Buchung
            </TableCaption>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead className="w-8 px-1 md:px-2">
                  <span className="sr-only">Details</span>
                </TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>Buchung</TableHead>
                <TableHead className="text-right">Betrag</TableHead>
                <TableHead className="text-right">Kontostand danach</TableHead>
                <TableHead>
                  <span className="sr-only">Aktionen</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kontoauszug.map((bewegung) => {
                const storniert = bewegung.storniert_am !== null;
                const zugang = bewegung.vorzeichen === 1;
                const offen = offeneZeilen.has(bewegung.id);
                const mitDetails = hatDetails(bewegung);
                const detailId = `kaution-details-${bewegung.id}`;
                const kategorie = bewegung.kategorie ? KAUTION_ABZUG_KATEGORIE_LABELS[bewegung.kategorie] : null;
                const beschreibung = bewegungBeschreibung(bewegung);

                return (
                  <Fragment key={bewegung.id}>
                    <TableRow data-storniert={storniert ? "true" : undefined} data-bewegungsart={bewegung.bewegungsart}>
                      <TableCell className="w-8 px-1 md:px-2">
                        {mitDetails ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            aria-expanded={offen}
                            aria-controls={detailId}
                            aria-label={`Details zu ${beschreibung} ${offen ? "ausblenden" : "anzeigen"}`}
                            onClick={() => zeileUmschalten(bewegung.id)}
                          >
                            {offen ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
                          </Button>
                        ) : null}
                      </TableCell>
                      <TableCell className={cn("whitespace-nowrap tabular-nums", storniert && "text-muted-foreground line-through")}>
                        {formatDatum(bewegung.wertstellung)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className={cn("font-medium", storniert && "text-muted-foreground line-through")}>
                            {KAUTION_BEWEGUNGSART_LABELS[bewegung.bewegungsart] ?? bewegung.bewegungsart}
                            {kategorie ? <span className="font-normal"> ({kategorie})</span> : null}
                          </span>
                          {storniert ? (
                            <Badge variant="outline" className="border-slate-500/40 bg-slate-500/10 text-slate-700 dark:text-slate-300">
                              storniert
                            </Badge>
                          ) : null}
                          {bewegung.quelle === "migration_altbestand" ? (
                            <Badge variant="secondary" className="font-normal">
                              Altbestand
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">
                        <span
                          className={cn(
                            "font-medium",
                            storniert
                              ? "text-muted-foreground line-through"
                              : zugang
                                ? "text-emerald-700 dark:text-emerald-400"
                                : "text-red-700 dark:text-red-400"
                          )}
                        >
                          <span className="sr-only">{zugang ? "Zugang: " : "Abgang: "}</span>
                          {zugang ? "+" : "−"}
                          {formatBetrag(bewegung.betrag)}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums" data-testid="kaution-saldo-zelle">
                        {storniert || bewegung.saldo_nach_buchung === null ? (
                          <>
                            <span aria-hidden="true" className="text-muted-foreground">
                              –
                            </span>
                            <span className="sr-only">Kein Kontostand, die Buchung ist storniert</span>
                          </>
                        ) : (
                          formatBetrag(bewegung.saldo_nach_buchung)
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {storniert ? null : (
                          <ButtonWithTooltip
                            type="button"
                            variant="ghost"
                            size="xs"
                            disabled={!rechte.loeschen}
                            tooltip={KEINE_BERECHTIGUNG_TEXT}
                            showTooltip={!rechte.loeschen}
                            aria-label={`${beschreibung} stornieren`}
                            onClick={() => setStornoZiel(bewegung)}
                          >
                            <Scissors aria-hidden="true" />
                            Stornieren
                          </ButtonWithTooltip>
                        )}
                      </TableCell>
                    </TableRow>
                    {offen && mitDetails ? (
                      <TableRow id={detailId} className="bg-muted/30">
                        <TableCell />
                        <TableCell colSpan={5}>
                          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                            {bewegung.grund ? <DetailEintrag label="Grund" wert={bewegung.grund} /> : null}
                            {bewegung.empfaenger ? <DetailEintrag label="Empfänger" wert={bewegung.empfaenger} /> : null}
                            {bewegung.interne_notiz ? <DetailEintrag label="Notiz" wert={bewegung.interne_notiz} /> : null}
                            {storniert ? (
                              <DetailEintrag label="Storniert am" wert={formatDatum(bewegung.storniert_am)} />
                            ) : null}
                            {bewegung.storno_grund ? <DetailEintrag label="Storno-Grund" wert={bewegung.storno_grund} /> : null}
                          </dl>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <KautionStornoDialog
        tenantId={tenantId}
        bewegung={stornoZiel}
        onOpenChange={(open) => {
          if (!open) setStornoZiel(null);
        }}
        onStorniert={onGeaendert}
        onFehler={onFehler}
      />
    </div>
  );
}

function DetailEintrag({ label, wert }: { label: string; wert: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-wrap break-words text-sm">{wert}</dd>
    </div>
  );
}
