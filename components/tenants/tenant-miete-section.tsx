"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Calendar, Euro, Loader2, Trash2 } from "lucide-react";
import {
  getMietverhaeltnisUebersichtAction,
  mieteEntfernenAction,
} from "@/app/mietverhaeltnis-actions";
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
import type { ComboboxOption } from "@/components/ui/custom-combobox";
import { toast } from "@/hooks/use-toast";
import { PropertyHeader } from "@/components/tenants/property-header";
import { KARTE, UEBERSCHRIFT, WERT, ZEILE } from "@/components/tenants/mietverhaeltnis/stile";
import type { MietEintrag, MietverhaeltnisActionError, MietverhaeltnisUebersicht } from "@/types/Mietverhaeltnis";
import { MietverhaeltnisAnlegenForm } from "@/components/tenants/mietverhaeltnis/mietverhaeltnis-anlegen-form";
import { MieterhoehungForm } from "@/components/tenants/mietverhaeltnis/mieterhoehung-form";
import { VertragsdatenForm } from "@/components/tenants/mietverhaeltnis/vertragsdaten-form";
import { UmzugForm } from "@/components/tenants/mietverhaeltnis/umzug-form";
import { MitmieterSection } from "@/components/tenants/mietverhaeltnis/mitmieter-section";
import {
  aktuelleMiete,
  formatDatum,
  formatEuro,
  heuteIso,
} from "@/components/tenants/mietverhaeltnis/miete-format";

interface TenantMieteSectionProps {
  /** Tenant to show. The section is only rendered for an existing tenant. */
  mieterId: string;
  /** Apartments for the move to another apartment. Without them (or an empty list) the move is not offered. */
  wohnungen?: ComboboxOption[];
  /** Called after a move was saved, with the new apartment (the tenant dialog takes it over). */
  onUmzug?: (wohnungId: string) => void;
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
export function TenantMieteSection({ mieterId, wohnungen = [], onUmzug }: TenantMieteSectionProps) {
  const id = useId();
  const [uebersicht, setUebersicht] = useState<MietverhaeltnisUebersicht | null>(null);
  const [ladeStatus, setLadeStatus] = useState<"laedt" | "fehler" | "bereit">("laedt");
  const [ladeFehler, setLadeFehler] = useState<string | null>(null);
  /** Counts successful loads; the contract form uses it as `key` so it shows the saved values again. */
  const [ladeZaehler, setLadeZaehler] = useState(0);

  /** The form for a rent change is shown inside the history card after a click. */
  const [erfassenOffen, setErfassenOffen] = useState(false);
  /** The move form is shown in its own card after a click. */
  const [umzugOffen, setUmzugOffen] = useState(false);
  /** After a move a note points to the deposit; it stays until the dialog closes. Nothing is moved automatically. */
  const [umzugHinweis, setUmzugHinweis] = useState(false);

  const [zuEntfernen, setZuEntfernen] = useState<MietEintrag | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  /**
   * Loads the overview. The first load shows the loading card; a reload after a save keeps the content visible
   * (`imHintergrund`), so the section does not collapse and jump.
   */
  const laden = useCallback(async (imHintergrund = false) => {
    if (!imHintergrund) setLadeStatus("laedt");
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
        await laden(true);
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

  /** After a move: the form closes, the section reloads in the background, the parent gets the new apartment. */
  const handleUmgezogen = (wohnungId: string) => {
    setUmzugOffen(false);
    setUmzugHinweis(true);
    void laden(true);
    onUmzug?.(wohnungId);
  };

  const heute = heuteIso();
  const mietverhaeltnis = uebersicht?.mietverhaeltnis ?? null;
  const aktuell = uebersicht ? aktuelleMiete(uebersicht.mieten, heute) : null;
  // The current apartment of the tenancy is never a target of the move.
  const umzugOptionen = mietverhaeltnis ? wohnungen.filter((wohnung) => wohnung.value !== mietverhaeltnis.wohnung_id) : [];

  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="space-y-3 sm:space-y-4 sm:pt-3 sm:border-t sm:border-border/40"
      // A plain Enter in a field would submit the surrounding tenant form: this section saves with its own buttons.
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement) event.preventDefault();
      }}
    >
      <h3 id={`${id}-heading`} className={UEBERSCHRIFT}>
        Mietverhältnis
      </h3>

      {ladeStatus === "laedt" && (
        <div className={KARTE}>
          <p role="status" className="flex items-center justify-center gap-2 h-20 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Mietverhältnis wird geladen …
          </p>
        </div>
      )}

      {ladeStatus === "fehler" && (
        <div className={KARTE}>
          <div role="alert" className="flex flex-col items-center justify-center gap-3 p-4 text-center text-sm text-muted-foreground">
            <span>{ladeFehler}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void laden()}>
              Erneut versuchen
            </Button>
          </div>
        </div>
      )}

      {ladeStatus === "bereit" && uebersicht && !mietverhaeltnis && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Für diesen Mieter ist noch kein Mietverhältnis angelegt. Es gilt die Miete der Wohnung
            {uebersicht.wohnungsmiete !== null && (
              <>
                {" "}
                (<span className="font-medium text-foreground">{formatEuro(uebersicht.wohnungsmiete)}</span>)
              </>
            )}
            .
          </p>
          {uebersicht.istBewerber ? (
            <p className="text-sm text-muted-foreground">
              Für Bewerber wird ein Mietverhältnis erst angelegt, wenn sie als Mieter geführt werden.
            </p>
          ) : (
            <MietverhaeltnisAnlegenForm
              key={`anlegen-${ladeZaehler}`}
              mieterId={mieterId}
              mieterEinzug={uebersicht.mieterEinzug}
              wohnungsmiete={uebersicht.wohnungsmiete}
              onAngelegt={() => void laden(true)}
            />
          )}
        </div>
      )}

      {ladeStatus === "bereit" && uebersicht && mietverhaeltnis && (
        <div className="space-y-4 sm:space-y-6">
          <div className="sm:grid sm:gap-4 space-y-2 sm:space-y-0">
            <div className={ZEILE}>
              <PropertyHeader icon={Calendar} label="Beginn" htmlFor={`${id}-beginn`} infoText="Beginn des Mietverhältnisses. Er lässt sich hier nicht ändern." />
              <p id={`${id}-beginn`} className={WERT}>
                {formatDatum(mietverhaeltnis.vertragsbeginn)}
              </p>
            </div>
            <div className={ZEILE}>
              <PropertyHeader icon={Euro} label="Miete" htmlFor={`${id}-miete`} infoText="Aktuell gültige Miete aus der Miethistorie. Ohne Eintrag gilt die Miete der Wohnung." />
              <p id={`${id}-miete`} className={WERT}>
                {aktuell !== null ? (
                  <span className="font-medium">{formatEuro(aktuell)}</span>
                ) : uebersicht.wohnungsmiete !== null ? (
                  <>
                    <span className="font-medium">{formatEuro(uebersicht.wohnungsmiete)}</span>{" "}
                    <span className="text-muted-foreground">(Miete der Wohnung)</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Keine Miete erfasst</span>
                )}
              </p>
            </div>
          </div>

          <VertragsdatenForm
            key={`vertrag-${ladeZaehler}`}
            mieterId={mieterId}
            mietverhaeltnis={mietverhaeltnis}
            onGespeichert={() => void laden(true)}
          />

          <MitmieterSection mieterId={mieterId} mietverhaeltnis={mietverhaeltnis} onGeaendert={() => void laden(true)} />

          {umzugOptionen.length > 0 && (
            <div className="space-y-3">
              <h4 className={UEBERSCHRIFT}>Wohnungswechsel</h4>
              {umzugHinweis && (
                <div role="status" className={`${KARTE} p-3 sm:p-4 text-sm text-muted-foreground`}>
                  Der Umzug ist gespeichert. Eine hinterlegte Kaution bleibt unverändert bei dieser Person, es wird nichts
                  automatisch übertragen oder abgerechnet. Ob sie weitergeführt oder abgerechnet wird, entscheiden Sie im
                  Bereich Kaution.
                </div>
              )}
              {umzugOffen ? (
                <div className={`${KARTE} p-3 sm:p-4`}>
                  <UmzugForm
                    key={`umzug-${ladeZaehler}`}
                    mieterId={mieterId}
                    wohnungen={umzugOptionen}
                    onUmgezogen={handleUmgezogen}
                    onAbbrechen={() => setUmzugOffen(false)}
                  />
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setUmzugOffen(true)}
                  className="w-full hover:scale-[1.005] active:scale-[0.995]"
                >
                  Umzug in eine andere Wohnung
                </Button>
              )}
            </div>
          )}

          <div className="space-y-3">
            <h4 className={UEBERSCHRIFT}>Miethistorie</h4>
            <div className={KARTE}>
              {uebersicht.mieten.length === 0 ? (
                <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
                  Noch keine Miete in der Historie erfasst
                </div>
              ) : (
                <ul className={uebersicht.mieten.length > 3 ? "max-h-56 overflow-y-auto" : undefined}>
                  {uebersicht.mieten.map((eintrag) => {
                    const details = [
                      // The default type says nothing; only a type that was entered on purpose is shown.
                      eintrag.aenderungsart && eintrag.aenderungsart !== "vereinbarung" ? artAnzeige(eintrag.aenderungsart) : null,
                      eintrag.erklaert_am ? `erklärt am ${formatDatum(eintrag.erklaert_am)}` : null,
                      eintrag.grund,
                      eintrag.quelle === "migration_bestand" ? "aus Bestand übernommen" : null,
                    ].filter((teil): teil is string => Boolean(teil));
                    return (
                      <li
                        key={eintrag.miete_id}
                        className="grid grid-cols-[1fr_auto] items-center gap-2 px-3 py-2 sm:px-4 border-b border-border/40 last:border-b-0"
                      >
                        <div className="min-w-0">
                          <p className="text-sm">
                            <span className="font-medium">{formatEuro(eintrag.betrag)}</span>{" "}
                            <span className="text-muted-foreground">ab {formatDatum(eintrag.gueltig_ab)}</span>
                          </p>
                          {details.length > 0 && <p className="text-xs text-muted-foreground break-words">{details.join(" · ")}</p>}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setZuEntfernen(eintrag)}
                          aria-label={`Miete ab ${formatDatum(eintrag.gueltig_ab)} entfernen`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="border-t border-border/40 p-3 sm:p-4">
                {erfassenOffen ? (
                  <MieterhoehungForm
                    key={`erhoehung-${ladeZaehler}`}
                    mieterId={mieterId}
                    onAbbrechen={() => setErfassenOffen(false)}
                    onErfasst={() => {
                      setErfassenOffen(false);
                      void laden(true);
                    }}
                  />
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setErfassenOffen(true)}
                    className="w-full hover:scale-[1.005] active:scale-[0.995]"
                  >
                    Mietänderung erfassen
                  </Button>
                )}
              </div>
            </div>
          </div>
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
