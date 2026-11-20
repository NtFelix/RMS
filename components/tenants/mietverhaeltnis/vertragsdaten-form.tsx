"use client";

import { useId, useState } from "react";
import { format } from "date-fns";
import { CalendarCheck, CalendarClock, CalendarX, Info, Loader2, Maximize2, StickyNote, UserRound } from "lucide-react";
import { restflaecheVerteilenSetzenAction, vertragsdatenSpeichernAction } from "@/app/mietverhaeltnis-actions";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { NumberInput } from "@/components/ui/number-input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { FlaechenStand, Mietverhaeltnis } from "@/types/Mietverhaeltnis";
import { flaechenHinweisText } from "@/utils/vertragsflaeche-hinweise";
import { PropertyHeader } from "@/components/tenants/property-header";
import { FEHLER_FLAECHE, NOTIZ_MAX_LAENGE, parseFlaecheEingabe, textOderNull, zeichenZahl } from "@/components/tenants/mietverhaeltnis/miete-format";
import { DATUM, FEHLERTEXT, FELD, ZEILE, ZEILE_OBEN } from "@/components/tenants/mietverhaeltnis/stile";

interface VertragsdatenFormProps {
  mieterId: string;
  mietverhaeltnis: Mietverhaeltnis;
  /** Contract area notes and remaining area option of the apartment (from the overview); `null` if not loaded. */
  flaechen?: FlaechenStand | null;
  /** Called after a successful save so the section reloads. */
  onGespeichert: () => void;
}

type Durch = "" | "mieter" | "vermieter";

const DURCH_OPTIONEN: { wert: Durch; label: string }[] = [
  { wert: "", label: "Keine Angabe" },
  { wert: "mieter", label: "Mieter" },
  { wert: "vermieter", label: "Vermieter" },
];

const alsIso = (date: Date | undefined) => (date ? format(date, "yyyy-MM-dd") : "");
/** Notes shown as a toast right after saving: the ones that change who pays what (the others stay visible below the field). */
const NACH_SPEICHERN = new Set(["summe_zu_gross", "leerstand"]);

/**
 * Contract data of the tenancy: end, fixed term, termination, contract area and note, as rows like the rest of the tenant dialog.
 * The contract area (optional, flat share with single contracts) includes the share of common areas the user agreed on. Notes
 * on the areas of the contracts running at the same time stay visible below the field (missing areas, vacancy, areas above the
 * apartment); the remaining area option of the apartment can be switched there (off by default, legal question).
 * Saved with its own button, which appears once something changed. The app calculates no deadlines and gives no
 * legal advice; the form only stores what the user enters.
 */
export function VertragsdatenForm({ mieterId, mietverhaeltnis, flaechen = null, onGespeichert }: VertragsdatenFormProps) {
  const id = useId();
  const start = {
    vertragsende: mietverhaeltnis.vertragsende ?? "",
    befristetBis: mietverhaeltnis.befristet_bis ?? "",
    kuendigungEingangAm: mietverhaeltnis.kuendigung_eingang_am ?? "",
    kuendigungZum: mietverhaeltnis.kuendigung_zum ?? "",
    kuendigungDurch: (mietverhaeltnis.kuendigung_durch ?? "") as Durch,
    notiz: mietverhaeltnis.notiz ?? "",
    // As typed (German decimal comma); the stored value comes back as a number
    flaeche: mietverhaeltnis.flaeche === null || mietverhaeltnis.flaeche === undefined ? "" : String(mietverhaeltnis.flaeche),
  };
  const [werte, setWerte] = useState(start);
  const [notizFehler, setNotizFehler] = useState<string | null>(null);
  const [flaecheFehler, setFlaecheFehler] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSchalten, setIsSchalten] = useState(false);

  const setze = <K extends keyof typeof start>(feld: K, wert: (typeof start)[K]) => setWerte((alt) => ({ ...alt, [feld]: wert }));
  const geaendert = (Object.keys(start) as (keyof typeof start)[]).some((feld) => werte[feld] !== start[feld]);

  const handleSpeichern = async () => {
    if (isSaving) return;
    if (zeichenZahl(werte.notiz.trim()) > NOTIZ_MAX_LAENGE) {
      setNotizFehler(`Die Notiz darf höchstens ${NOTIZ_MAX_LAENGE} Zeichen lang sein.`);
      return;
    }
    setNotizFehler(null);
    const flaeche = parseFlaecheEingabe(werte.flaeche);
    if (flaeche === undefined) {
      setFlaecheFehler(FEHLER_FLAECHE);
      return;
    }
    setFlaecheFehler(null);

    setIsSaving(true);
    try {
      const result = await vertragsdatenSpeichernAction({
        mieterId,
        vertragsende: werte.vertragsende || null,
        befristetBis: werte.befristetBis || null,
        kuendigungEingangAm: werte.kuendigungEingangAm || null,
        kuendigungZum: werte.kuendigungZum || null,
        kuendigungDurch: werte.kuendigungDurch === "" ? null : werte.kuendigungDurch,
        notiz: textOderNull(werte.notiz),
        flaeche,
      });
      if (result.success) {
        toast({ title: "Erfolg", description: "Die Vertragsdaten wurden gespeichert.", variant: "success" });
        for (const hinweis of result.data?.flaechen.hinweise ?? []) {
          if (NACH_SPEICHERN.has(hinweis.art)) toast({ title: "Hinweis zur Vertragsfläche", description: flaechenHinweisText(hinweis) });
        }
        onGespeichert();
      } else {
        toast({ title: "Fehler", description: result.error.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Systemfehler", description: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestflaeche = async (wert: boolean) => {
    if (isSchalten) return;
    setIsSchalten(true);
    try {
      const result = await restflaecheVerteilenSetzenAction({ mieterId, wert });
      if (result.success) {
        toast({
          title: "Erfolg",
          description: wert
            ? "Die Restfläche dieser Wohnung wird auf Mietverhältnisse ohne Vertragsfläche verteilt. Ob dieser gemischte Schlüssel zulässig ist, ist rechtlich zu klären."
            : "Die Restflächen-Option dieser Wohnung ist aus.",
          variant: "success",
        });
        onGespeichert();
      } else {
        toast({ title: "Fehler", description: result.error.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Systemfehler", description: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.", variant: "destructive" });
    } finally {
      setIsSchalten(false);
    }
  };

  const hinweise = flaechen?.hinweise ?? [];
  // The option matters only when some contracts have an area and others not; keep it visible while it is on, so it can be switched off
  const zeigeOption =
    flaechen !== null && flaechen.restflaecheVerteilen !== null && (flaechen.restflaecheVerteilen || hinweise.some((h) => h.art === "flaeche_fehlt"));

  const datumZeile = (
    feld: "vertragsende" | "befristetBis" | "kuendigungEingangAm" | "kuendigungZum",
    label: string,
    icon: typeof CalendarX,
    infoText: string
  ) => (
    <div className={ZEILE}>
      <PropertyHeader icon={icon} label={label} htmlFor={`${id}-${feld}`} infoText={infoText} />
      <DatePicker
        id={`${id}-${feld}`}
        value={werte[feld]}
        onChange={(date) => setze(feld, alsIso(date))}
        placeholder="TT.MM.JJJJ"
        disabled={isSaving}
        className={DATUM}
      />
    </div>
  );

  return (
    <div className="sm:grid sm:gap-4 space-y-2 sm:space-y-0">
      {datumZeile("vertragsende", "Vertragsende", CalendarX, "Ende des Mietverhältnisses (optional). Leer lassen, solange das Mietverhältnis läuft.")}
      {datumZeile("befristetBis", "Befristet bis", CalendarClock, "Ende einer vereinbarten Befristung (optional).")}
      {datumZeile("kuendigungEingangAm", "Kündigung am", CalendarCheck, "Datum, an dem die Kündigung eingegangen ist (optional). Die App berechnet keine Fristen.")}
      {datumZeile("kuendigungZum", "Wirksam zum", CalendarX, "Datum, zu dem die Kündigung wirksam wird (optional). Die App berechnet keine Fristen.")}

      <div className={ZEILE}>
        <PropertyHeader icon={UserRound} label="Gekündigt" htmlFor={`${id}-durch`} infoText="Wer gekündigt hat (optional)." />
        <div id={`${id}-durch`} role="group" aria-label="Gekündigt durch" className="flex flex-wrap gap-1 -mx-2">
          {DURCH_OPTIONEN.map((option) => (
            <Button
              key={option.wert || "keine"}
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={werte.kuendigungDurch === option.wert}
              disabled={isSaving}
              onClick={() => setze("kuendigungDurch", option.wert)}
              className={cn(
                "h-7 rounded-lg px-2 text-sm font-normal text-muted-foreground hover:bg-muted/10 hover:text-foreground",
                werte.kuendigungDurch === option.wert && "bg-muted/40 text-foreground font-medium"
              )}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className={ZEILE_OBEN}>
        <PropertyHeader
          icon={Maximize2}
          label="Vertragsfläche"
          htmlFor={`${id}-flaeche`}
          infoText="Nur bei WG mit Einzelverträgen (optional): Fläche dieses Mietvertrags in m² einschließlich des vereinbarten Anteils an Küche, Bad und Flur. Die Nebenkosten der Wohnung werden dann nach Fläche verteilt, ein leeres Zimmer trägt der Vermieter. Leer lassen: Kosten wie bisher gleich je Mitbewohner."
        />
        <div>
          <NumberInput
            id={`${id}-flaeche`}
            step="0.01"
            placeholder="Optional (m²)"
            value={werte.flaeche}
            onChange={(event) => setze("flaeche", event.target.value)}
            disabled={isSaving}
            aria-invalid={flaecheFehler ? true : undefined}
            aria-describedby={flaecheFehler ? `${id}-flaeche-fehler` : undefined}
            className={FELD}
          />
          {flaecheFehler && <p id={`${id}-flaeche-fehler`} className={FEHLERTEXT}>{flaecheFehler}</p>}
          {hinweise.length > 0 && (
            <ul className="mt-2 space-y-1" data-testid="flaechen-hinweise">
              {hinweise.map((hinweis) => (
                <li key={hinweis.art} className="flex gap-1.5 text-xs text-muted-foreground">
                  <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  <span>{flaechenHinweisText(hinweis)}</span>
                </li>
              ))}
            </ul>
          )}
          {zeigeOption && (
            <div className="mt-2 flex items-start gap-2">
              <Switch
                id={`${id}-restflaeche`}
                checked={flaechen?.restflaecheVerteilen === true}
                onCheckedChange={(wert) => void handleRestflaeche(wert)}
                disabled={isSchalten || isSaving || flaechen?.optionAenderbar === false}
                aria-describedby={`${id}-restflaeche-info`}
              />
              <div className="text-xs">
                <label htmlFor={`${id}-restflaeche`} className="font-medium text-foreground">
                  Restfläche auf Mietverhältnisse ohne Fläche verteilen
                </label>
                <p id={`${id}-restflaeche-info`} className="text-muted-foreground">
                  Gilt für die ganze Wohnung. Verträge mit Fläche tragen ihren Flächenanteil, der Rest der Wohnung geht zu gleichen
                  Teilen an die Verträge ohne Fläche. Ob dieser gemischte Schlüssel zulässig ist, ist rechtlich zu klären.
                  {flaechen?.optionAenderbar === false && " Zum Ändern brauchen Sie das Recht, Wohnungen zu bearbeiten."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={ZEILE_OBEN}>
        <PropertyHeader icon={StickyNote} label="Vertragsnotiz" htmlFor={`${id}-notiz`} infoText="Interne Notiz zum Mietvertrag, zum Beispiel zu Nachträgen (optional)." />
        <div>
          <Textarea
            id={`${id}-notiz`}
            value={werte.notiz}
            onChange={(event) => setze("notiz", event.target.value)}
            placeholder="Notiz zum Vertrag..."
            disabled={isSaving}
            aria-invalid={notizFehler ? true : undefined}
            aria-describedby={notizFehler ? `${id}-notiz-fehler` : undefined}
            className={cn(FELD, "resize-none min-h-[60px]")}
          />
          {notizFehler && <p id={`${id}-notiz-fehler`} className={FEHLERTEXT}>{notizFehler}</p>}
        </div>
      </div>

      {geaendert && (
        <div className="flex justify-end gap-2 pt-1 animate-in fade-in slide-in-from-top-1">
          <Button type="button" variant="ghost" size="sm" disabled={isSaving} onClick={() => { setWerte(start); setNotizFehler(null); setFlaecheFehler(null); }}>
            Verwerfen
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={() => void handleSpeichern()}>
            {isSaving && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
            Vertragsdaten speichern
          </Button>
        </div>
      )}
    </div>
  );
}
