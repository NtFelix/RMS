"use client";

import { useId, useState } from "react";
import { entferneKautionBelegAction, type KautionActionError } from "@/app/kautionen-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { KautionBelegUpload, type KautionBelegAuswahl } from "@/components/kaution/kaution-beleg-upload";
import { oeffneKautionBeleg } from "@/components/kaution/kaution-beleg-oeffnen";
import { bewegungBeschreibung, formatDatum } from "@/components/kaution/kaution-format";
import { KAUTION_FEHLER_FALLBACK_MESSAGE } from "@/lib/kautionen-errors";
import { anzeigeNameAusDateiname, belegTypLabel, formatBelegGroesse } from "@/lib/kautionen-belege";
import type { KautionBeleg, KautionDetails, KautionRechte } from "@/types/Kaution";

/**
 * Tab "Dokumente" (function flag `dokumente`): the receipts of the deposit bookings.
 *
 * - The list comes from the database (`details.belege`, one per booking). The booking of a receipt is looked up in the
 *   statement by its ID (date, type, amount); a cancelled booking is marked "storniert".
 * - "Öffnen" asks for a short-lived download link (`getKautionBelegUrlAction`); the database checks the access.
 * - "Beleg lösen" removes only the LINK to the booking; the file stays in the document management. It asks first.
 * - Users with `bearbeiten` see the form "Beleg hinzufügen"; without the right the tab is read-only and says why.
 *
 * Accessibility: each button has its file name as text for assistive technology; status and errors go through toasts
 * and the form (role alert). Security relevant: not production ready until the maintainer has reviewed it.
 */

interface KautionDokumenteTabProps {
  details: KautionDetails;
  rechte: KautionRechte;
  /** Called after an upload or after a receipt was removed from a booking (the dialog reloads its data). */
  onGeaendert: () => void | Promise<void>;
  /** Errors: `true` if the deposit dialog handled them (toast, reload, close, sign-in). */
  onFehler: (fehler: KautionActionError) => boolean;
}

export function KautionDokumenteTab({ details, rechte, onGeaendert, onFehler }: KautionDokumenteTabProps) {
  const basisId = useId();
  const belege = details.belege ?? [];
  const bewegungen = new Map(details.kontoauszug.map((bewegung) => [bewegung.id, bewegung]));
  const [oeffnetId, setOeffnetId] = useState<string | null>(null);
  const [loesenZiel, setLoesenZiel] = useState<KautionBeleg | null>(null);
  const [loest, setLoest] = useState(false);

  // Only bookings that are not cancelled can get a new receipt.
  const auswahl: KautionBelegAuswahl[] = details.kontoauszug
    .filter((bewegung) => bewegung.storniert_am === null)
    .map((bewegung) => ({ bewegungId: bewegung.id, label: bewegungBeschreibung(bewegung) }));

  const oeffnen = async (beleg: KautionBeleg) => {
    if (oeffnetId !== null) return;
    setOeffnetId(beleg.dokument_id);
    try {
      await oeffneKautionBeleg(beleg.dokument_id, onFehler);
    } finally {
      setOeffnetId(null);
    }
  };

  const loesen = async () => {
    if (!loesenZiel || loest) return;
    const ziel = loesenZiel;
    setLoest(true);
    try {
      const ergebnis = await entferneKautionBelegAction({ bewegungId: ziel.bewegung_id });
      setLoesenZiel(null);
      if (ergebnis.success) {
        toast({ title: "Beleg von der Buchung gelöst.", variant: "success" });
        await onGeaendert();
      } else {
        const fehler = ergebnis.error ?? { message: KAUTION_FEHLER_FALLBACK_MESSAGE };
        if (!onFehler(fehler)) toast({ title: "Beleg nicht gelöst", description: fehler.message, variant: "destructive" });
      }
    } catch {
      setLoesenZiel(null);
      toast({ title: "Beleg nicht gelöst", description: KAUTION_FEHLER_FALLBACK_MESSAGE, variant: "destructive" });
    } finally {
      setLoest(false);
    }
  };

  return (
    <div className="space-y-4">
      <section aria-labelledby={`${basisId}-liste`} className="space-y-3">
        <h3 id={`${basisId}-liste`} className="text-base font-semibold">
          Belege
        </h3>

        {belege.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground" data-testid="kaution-belege-leer">
            Zu dieser Kaution sind noch keine Belege hinterlegt.
          </p>
        ) : (
          <ul className="divide-y rounded-xl border" data-testid="kaution-belege-liste">
            {belege.map((beleg) => {
              const bewegung = bewegungen.get(beleg.bewegung_id);
              const name = anzeigeNameAusDateiname(beleg.dateiname);
              return (
                <li key={`${beleg.bewegung_id}-${beleg.dokument_id}`} className="flex flex-wrap items-start justify-between gap-3 p-4" data-testid="kaution-beleg-zeile">
                  <div className="min-w-0 space-y-1">
                    <p className="break-all font-medium">{name}</p>
                    <p className="text-xs text-muted-foreground">
                      {belegTypLabel(beleg.mime_type)} · {formatBelegGroesse(beleg.dateigroesse)}
                    </p>
                    <div className="text-sm">
                      {bewegung ? bewegungBeschreibung(bewegung) : "Buchung nicht im Kontoauszug"}
                      {bewegung?.storniert_am ? (
                        <Badge variant="outline" className="ml-2 border-slate-500/40 bg-slate-500/10 text-slate-700 dark:text-slate-300">
                          storniert
                        </Badge>
                      ) : null}
                    </div>
                    {bewegung ? <p className="text-xs text-muted-foreground">Wertstellung {formatDatum(bewegung.wertstellung)}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={oeffnetId !== null}
                      onClick={() => void oeffnen(beleg)}
                    >
                      Öffnen<span className="sr-only"> Beleg {name}</span>
                    </Button>
                    {rechte.bearbeiten ? (
                      <Button type="button" variant="ghost" size="sm" disabled={loest} onClick={() => setLoesenZiel(beleg)}>
                        Beleg lösen<span className="sr-only"> ({name})</span>
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        {rechte.bearbeiten ? (
          <KautionBelegUpload auswahl={auswahl} onHochgeladen={onGeaendert} onFehler={onFehler} />
        ) : (
          <p className="text-xs text-muted-foreground">Das Hochladen und Lösen von Belegen ist mit Ihren Rechten nicht möglich.</p>
        )}
      </section>

      <AlertDialog
        open={loesenZiel !== null}
        onOpenChange={(offen) => {
          if (!offen && !loest) setLoesenZiel(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Beleg von der Buchung lösen?</AlertDialogTitle>
            <AlertDialogDescription>
              Die Datei bleibt in der Dokumentenverwaltung erhalten. Sie wird nur nicht mehr dieser Buchung zugeordnet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loest}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              disabled={loest}
              onClick={(event) => {
                // Stays open until the answer: the dialog closes itself in `loesen`.
                event.preventDefault();
                void loesen();
              }}
            >
              Lösen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
