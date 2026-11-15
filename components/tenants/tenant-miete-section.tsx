"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  getMietverhaeltnisUebersichtAction,
  mieteEntfernenAction,
  mieteSetzenAction,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import type { MietEintrag, MietEintragKurz, Mietverhaeltnis, MietverhaeltnisActionError } from "@/types/Mietverhaeltnis";

interface TenantMieteSectionProps {
  /** Tenant to show. The section is only rendered for an existing tenant. */
  mieterId: string;
}

interface Uebersicht {
  mietverhaeltnis: Mietverhaeltnis | null;
  mieten: MietEintrag[];
  wohnungsmiete: number | null;
}

const euroFormatter = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });

function formatEuro(betrag: number): string {
  return euroFormatter.format(betrag);
}

/** `YYYY-MM-DD` as `TT.MM.JJJJ` without time zone effects. */
function formatDatum(iso: string): string {
  const [jahr, monat, tag] = iso.split("-");
  return jahr && monat && tag ? `${tag}.${monat}.${jahr}` : iso;
}

/** Today as `YYYY-MM-DD` in local time. */
function heuteIso(): string {
  const jetzt = new Date();
  const monat = String(jetzt.getMonth() + 1).padStart(2, "0");
  const tag = String(jetzt.getDate()).padStart(2, "0");
  return `${jetzt.getFullYear()}-${monat}-${tag}`;
}

/** Current rent: the entry with the latest `gueltig_ab` up to `stichtag`, or `null` if there is none. */
function aktuelleMiete(mieten: MietEintragKurz[], stichtag: string): number | null {
  let treffer: MietEintragKurz | null = null;
  for (const eintrag of mieten) {
    if (eintrag.gueltig_ab <= stichtag && (treffer === null || eintrag.gueltig_ab > treffer.gueltig_ab)) {
      treffer = eintrag;
    }
  }
  return treffer ? treffer.betrag : null;
}

/** German decimal input (`850,50` or `850.50`, at most two places) as number, or `null`. */
function parseBetragEingabe(text: string): number | null {
  const normalisiert = text.trim().replace(",", ".");
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(normalisiert)) return null;
  const betrag = Number(normalisiert);
  return Number.isFinite(betrag) && betrag <= 99999999.99 ? betrag : null;
}

function istGueltigesDatum(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [jahr, monat, tag] = iso.split("-").map(Number);
  const datum = new Date(Date.UTC(jahr, monat - 1, tag));
  return datum.getUTCFullYear() === jahr && datum.getUTCMonth() === monat - 1 && datum.getUTCDate() === tag;
}

/**
 * Tenancy and rent history in the tenant dialog (GH-17). Without a tenancy it shows a note and the apartment rent;
 * the tenant dialog does not show an error for that. Rights are checked by the server actions.
 */
export function TenantMieteSection({ mieterId }: TenantMieteSectionProps) {
  const id = useId();
  const [uebersicht, setUebersicht] = useState<Uebersicht | null>(null);
  const [ladeStatus, setLadeStatus] = useState<"laedt" | "fehler" | "bereit">("laedt");
  const [ladeFehler, setLadeFehler] = useState<string | null>(null);

  const [gueltigAb, setGueltigAb] = useState("");
  const [betragText, setBetragText] = useState("");
  const [grund, setGrund] = useState("");
  const [formFehler, setFormFehler] = useState<{ gueltigAb?: string; betrag?: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  const [zuEntfernen, setZuEntfernen] = useState<MietEintrag | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const laden = useCallback(async () => {
    setLadeStatus("laedt");
    setLadeFehler(null);
    try {
      const result = await getMietverhaeltnisUebersichtAction(mieterId);
      if (result.success) {
        setUebersicht(result.data);
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

  const handleSpeichern = async () => {
    if (isSaving) return;
    const fehler: { gueltigAb?: string; betrag?: string } = {};
    if (!istGueltigesDatum(gueltigAb)) fehler.gueltigAb = "Bitte geben Sie ein gültiges Datum an.";
    const betrag = parseBetragEingabe(betragText);
    if (betrag === null) fehler.betrag = "Bitte geben Sie einen Betrag von 0 bis 99.999.999,99 mit höchstens zwei Nachkommastellen an.";
    setFormFehler(fehler);
    if (fehler.gueltigAb || fehler.betrag || betrag === null) return;

    setIsSaving(true);
    try {
      const grundText = grund.trim();
      const result = await mieteSetzenAction({ mieterId, gueltigAb, betrag, grund: grundText === "" ? null : grundText });
      if (result.success) {
        toast({ title: "Erfolg", description: "Die Miete wurde gespeichert.", variant: "success" });
        setGueltigAb("");
        setBetragText("");
        setGrund("");
        await laden();
      } else {
        meldeFehler(result.error);
      }
    } catch {
      toast({ title: "Systemfehler", description: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
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
      // A plain Enter in a field would submit the surrounding tenant form: this section saves with its own button.
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
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Für diesen Mieter ist noch kein Mietverhältnis angelegt. Es gilt die Miete der Wohnung.</p>
          {uebersicht.wohnungsmiete !== null && (
            <p>
              Miete der Wohnung: <span className="font-medium text-foreground">{formatEuro(uebersicht.wohnungsmiete)}</span>
            </p>
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

          <div className="space-y-3">
            <h4 className="text-sm font-medium">Neue Miete</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor={`${id}-gueltig-ab`}>Gültig ab</Label>
                <Input
                  id={`${id}-gueltig-ab`}
                  type="date"
                  value={gueltigAb}
                  onChange={(event) => setGueltigAb(event.target.value)}
                  disabled={isSaving}
                  aria-invalid={formFehler.gueltigAb ? true : undefined}
                  aria-describedby={formFehler.gueltigAb ? `${id}-gueltig-ab-fehler` : undefined}
                />
                {formFehler.gueltigAb && (
                  <p id={`${id}-gueltig-ab-fehler`} className="text-xs text-destructive">{formFehler.gueltigAb}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${id}-betrag`}>Monatliche Miete (EUR)</Label>
                <Input
                  id={`${id}-betrag`}
                  type="text"
                  inputMode="decimal"
                  placeholder="z. B. 850,00"
                  value={betragText}
                  onChange={(event) => setBetragText(event.target.value)}
                  disabled={isSaving}
                  aria-invalid={formFehler.betrag ? true : undefined}
                  aria-describedby={formFehler.betrag ? `${id}-betrag-fehler` : undefined}
                />
                {formFehler.betrag && (
                  <p id={`${id}-betrag-fehler`} className="text-xs text-destructive">{formFehler.betrag}</p>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${id}-grund`}>Grund (optional)</Label>
              <Input
                id={`${id}-grund`}
                type="text"
                maxLength={500}
                value={grund}
                onChange={(event) => setGrund(event.target.value)}
                disabled={isSaving}
              />
            </div>
            <div>
              <Button type="button" onClick={() => void handleSpeichern()} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                Miete speichern
              </Button>
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
