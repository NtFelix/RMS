"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  getMietverhaeltnisUebersichtAction,
  mieteEntfernenAction,
} from "@/app/mietverhaeltnis-actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import type { MietEintrag, MietverhaeltnisActionError, MietverhaeltnisUebersicht } from "@/types/Mietverhaeltnis";
import { MietverhaeltnisAnlegenForm } from "@/components/tenants/mietverhaeltnis/mietverhaeltnis-anlegen-form";
import { MieterhoehungForm } from "@/components/tenants/mietverhaeltnis/mieterhoehung-form";
import { VertragsdatenForm } from "@/components/tenants/mietverhaeltnis/vertragsdaten-form";
import {
  aktuelleMiete,
  formatDatum,
  formatEuro,
  heuteIso,
} from "@/components/tenants/mietverhaeltnis/miete-format";

interface TenantMieteSectionProps {
  /** Tenant to show. The section is only rendered for an existing tenant. */
  mieterId: string;
}

/** Type of change as shown in the history: first letter capitalised ("vereinbarung" becomes "Vereinbarung"). */
function artAnzeige(text: string): string {
  return text.length > 0 ? text.charAt(0).toLocaleUpperCase("de-DE") + text.slice(1) : text;
}

/**
 * Tenancy and rent history in the tenant dialog (GH-17). Without a tenancy it offers to create one (not for
 * applicants); with a tenancy it shows contract data, the rent history and the form for rent changes. Rights are
 * checked by the server actions. The app calculates no deadlines and gives no legal advice.
 */
export function TenantMieteSection({ mieterId }: TenantMieteSectionProps) {
  const id = useId();
  const [uebersicht, setUebersicht] = useState<MietverhaeltnisUebersicht | null>(null);
  const [ladeStatus, setLadeStatus] = useState<"laedt" | "fehler" | "bereit">("laedt");
  const [ladeFehler, setLadeFehler] = useState<string | null>(null);
  /** Counts successful loads; the contract form uses it as `key` so it shows the saved values again. */
  const [ladeZaehler, setLadeZaehler] = useState(0);

  const [zuEntfernen, setZuEntfernen] = useState<MietEintrag | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const laden = useCallback(async () => {
    setLadeStatus("laedt");
    setLadeFehler(null);
    try {
      const result = await getMietverhaeltnisUebersichtAction(mieterId);
      if (result.success) {
        setUebersicht(result.data);
        setLadeZaehler((zaehler) => zaehler + 1);
        setLadeStatus("bereit");
      } else {
        setLadeFehler(result.error.message);
        setLadeStatus("fehler");
      }
    } catch {
      setLadeFehler("Die Miete konnte nicht geladen werden. Bitte versuchen Sie es erneut.");
      setLadeStatus("fehler");
    }
  }, [mieterId]);

  useEffect(() => {
    void laden();
  }, [laden]);

  /** Shows the error of a failed action in a toast. */
  const meldeFehler = (error: MietverhaeltnisActionError) => {
    toast({ title: "Fehler", description: error.message, variant: "destructive" });
  };

  const handleEntfernen = async () => {
    if (!zuEntfernen || isRemoving) return;
    setIsRemoving(true);
    try {
      const result = await mieteEntfernenAction({ mieterId, mieteId: zuEntfernen.miete_id });
      if (result.success) {
        toast({ title: "Erfolg", description: "Der Eintrag wurde entfernt.", variant: "success" });
        await laden();
      } else {
        meldeFehler(result.error);
      }
    } catch {
      toast({ title: "Systemfehler", description: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.", variant: "destructive" });
    } finally {
      setIsRemoving(false);
      setZuEntfernen(null);
    }
  };

  const heute = heuteIso();

  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="sm:space-y-4 sm:pt-3 sm:border-t sm:border-border/40"
      // A plain Enter in a field would submit the surrounding tenant form: this section saves with its own buttons.
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement) event.preventDefault();
      }}
    >
      <h3 id={`${id}-heading`} className="flex items-center gap-2 text-xs font-bold text-muted-foreground/50 uppercase tracking-widest">
        Mietverhältnis
      </h3>

      {ladeStatus === "laedt" && (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Mietverhältnis wird geladen …
        </p>
      )}

      {ladeStatus === "fehler" && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>{ladeFehler}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void laden()}>
              Erneut versuchen
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {ladeStatus === "bereit" && uebersicht && !uebersicht.mietverhaeltnis && (
        <div className="space-y-6">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Für diesen Mieter ist noch kein Mietverhältnis angelegt. Es gilt die Miete der Wohnung.</p>
            {uebersicht.wohnungsmiete !== null && (
              <p>
                Miete der Wohnung: <span className="font-medium text-foreground">{formatEuro(uebersicht.wohnungsmiete)}</span>
              </p>
            )}
            {uebersicht.istBewerber && (
              <p>Für Bewerber wird ein Mietverhältnis erst angelegt, wenn sie als Mieter geführt werden.</p>
            )}
          </div>
          {!uebersicht.istBewerber && (
            <MietverhaeltnisAnlegenForm
              key={`anlegen-${ladeZaehler}`}
              mieterId={mieterId}
              mieterEinzug={uebersicht.mieterEinzug}
              wohnungsmiete={uebersicht.wohnungsmiete}
              onAngelegt={() => void laden()}
            />
          )}
        </div>
      )}

      {ladeStatus === "bereit" && uebersicht?.mietverhaeltnis && (
        <div className="space-y-6">
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Vertragsbeginn</dt>
              <dd className="font-medium">{formatDatum(uebersicht.mietverhaeltnis.vertragsbeginn)}</dd>
            </div>
            {uebersicht.mietverhaeltnis.vertragsende && (
              <div>
                <dt className="text-muted-foreground">Vertragsende</dt>
                <dd className="font-medium">{formatDatum(uebersicht.mietverhaeltnis.vertragsende)}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted-foreground">Aktuelle Miete</dt>
              <dd className="font-medium">
                {(() => {
                  const aktuell = aktuelleMiete(uebersicht.mieten, heute);
                  if (aktuell !== null) return formatEuro(aktuell);
                  if (uebersicht.wohnungsmiete !== null) return `${formatEuro(uebersicht.wohnungsmiete)} (Miete der Wohnung)`;
                  return "Keine Miete erfasst";
                })()}
              </dd>
            </div>
          </dl>

          <VertragsdatenForm
            key={`vertrag-${ladeZaehler}`}
            mieterId={mieterId}
            mietverhaeltnis={uebersicht.mietverhaeltnis}
            onGespeichert={() => void laden()}
          />

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Miethistorie</h4>
            {uebersicht.mieten.length === 0 ? (
              <p className="text-sm text-muted-foreground">Noch keine Miete in der Historie erfasst.</p>
            ) : (
              <ul className="divide-y divide-border/60 rounded-md border border-border/60">
                {uebersicht.mieten.map((eintrag) => (
                  <li key={eintrag.miete_id} className="flex items-start justify-between gap-3 p-3 text-sm">
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium">
                        ab {formatDatum(eintrag.gueltig_ab)}: {formatEuro(eintrag.betrag)}
                      </p>
                      {eintrag.aenderungsart && <p className="text-muted-foreground break-words">Art: {artAnzeige(eintrag.aenderungsart)}</p>}
                      {eintrag.erklaert_am && (
                        <p className="text-muted-foreground">erklärt am {formatDatum(eintrag.erklaert_am)}</p>
                      )}
                      {eintrag.grund && <p className="text-muted-foreground break-words">{eintrag.grund}</p>}
                      {eintrag.quelle === "migration_bestand" && (
                        <p className="text-xs text-muted-foreground">aus Bestand übernommen</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setZuEntfernen(eintrag)}
                      aria-label={`Miete ab ${formatDatum(eintrag.gueltig_ab)} entfernen`}
                    >
                      Entfernen
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <MieterhoehungForm key={`erhoehung-${ladeZaehler}`} mieterId={mieterId} onErfasst={() => void laden()} />
        </div>
      )}

      <AlertDialog open={zuEntfernen !== null} onOpenChange={(offen) => !offen && setZuEntfernen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eintrag entfernen?</AlertDialogTitle>
            <AlertDialogDescription>
              Der Eintrag zur Miete ab {zuEntfernen ? formatDatum(zuEntfernen.gueltig_ab) : ""} wird aus der Miethistorie
              entfernt. Diese Änderung lässt sich nicht rückgängig machen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleEntfernen();
              }}
              disabled={isRemoving}
            >
              Entfernen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
