"use client";

import { useId, useState } from "react";
import { format } from "date-fns";
import { CalendarCheck, CalendarClock, CalendarX, Loader2, StickyNote, UserRound } from "lucide-react";
import { vertragsdatenSpeichernAction } from "@/app/mietverhaeltnis-actions";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Mietverhaeltnis } from "@/types/Mietverhaeltnis";
import { PropertyHeader } from "@/components/tenants/property-header";
import { NOTIZ_MAX_LAENGE, textOderNull, zeichenZahl } from "@/components/tenants/mietverhaeltnis/miete-format";
import { DATUM, FEHLERTEXT, FELD, ZEILE, ZEILE_OBEN } from "@/components/tenants/mietverhaeltnis/stile";

interface VertragsdatenFormProps {
  mieterId: string;
  mietverhaeltnis: Mietverhaeltnis;
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

/**
 * Contract data of the tenancy: end, fixed term, termination and note, as rows like the rest of the tenant dialog.
 * Saved with its own button, which appears once something changed. The app calculates no deadlines and gives no
 * legal advice; the form only stores what the user enters.
 */
export function VertragsdatenForm({ mieterId, mietverhaeltnis, onGespeichert }: VertragsdatenFormProps) {
  const id = useId();
  const start = {
    vertragsende: mietverhaeltnis.vertragsende ?? "",
    befristetBis: mietverhaeltnis.befristet_bis ?? "",
    kuendigungEingangAm: mietverhaeltnis.kuendigung_eingang_am ?? "",
    kuendigungZum: mietverhaeltnis.kuendigung_zum ?? "",
    kuendigungDurch: (mietverhaeltnis.kuendigung_durch ?? "") as Durch,
    notiz: mietverhaeltnis.notiz ?? "",
  };
  const [werte, setWerte] = useState(start);
  const [notizFehler, setNotizFehler] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const setze = <K extends keyof typeof start>(feld: K, wert: (typeof start)[K]) => setWerte((alt) => ({ ...alt, [feld]: wert }));
  const geaendert = (Object.keys(start) as (keyof typeof start)[]).some((feld) => werte[feld] !== start[feld]);

  const handleSpeichern = async () => {
    if (isSaving) return;
    if (zeichenZahl(werte.notiz.trim()) > NOTIZ_MAX_LAENGE) {
      setNotizFehler(`Die Notiz darf höchstens ${NOTIZ_MAX_LAENGE} Zeichen lang sein.`);
      return;
    }
    setNotizFehler(null);

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
      });
      if (result.success) {
        toast({ title: "Erfolg", description: "Die Vertragsdaten wurden gespeichert.", variant: "success" });
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
          <Button type="button" variant="ghost" size="sm" disabled={isSaving} onClick={() => { setWerte(start); setNotizFehler(null); }}>
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
