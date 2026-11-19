"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { format } from "date-fns";
import { Calendar, Euro, Loader2, Users } from "lucide-react";
import {
  getMitmieterUebersichtAction,
  mieterTrennenAction,
  mieterZusammenfuehrenAction,
} from "@/app/mietverhaeltnis-actions";
import { Button } from "@/components/ui/button";
import { CustomCombobox, type ComboboxOption } from "@/components/ui/custom-combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { NumberInput } from "@/components/ui/number-input";
import { toast } from "@/hooks/use-toast";
import { PropertyHeader } from "@/components/tenants/property-header";
import { FEHLER_BETRAG, FEHLER_DATUM, istGueltigesDatum, parseBetragEingabe } from "@/components/tenants/mietverhaeltnis/miete-format";
import { DATUM, FEHLERTEXT, FELD, KARTE, UEBERSCHRIFT, ZEILE } from "@/components/tenants/mietverhaeltnis/stile";
import type { Mietverhaeltnis, MitmieterUebersicht } from "@/types/Mietverhaeltnis";

interface MitmieterSectionProps {
  mieterId: string;
  mietverhaeltnis: Mietverhaeltnis;
  /** Called after a change that affects the tenancy shown above (join, separate). */
  onGeaendert: () => void;
}

type Formular = "keins" | "zusammenfuehren" | "trennen";

const ROLLEN: ComboboxOption[] = [
  { value: "hauptmieter", label: "Hauptmieter" },
  { value: "mitmieter", label: "Mitmieter" },
];
const ROLLEN_ANZEIGE: Record<string, string> = { hauptmieter: "Hauptmieter", mitmieter: "Mitmieter" };
const FEHLER_ZIEL = "Bitte wählen Sie ein Mietverhältnis aus.";
const SYSTEMFEHLER = "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.";

const alsIso = (date: Date | undefined) => (date ? format(date, "yyyy-MM-dd") : "");

/**
 * Several tenants in one tenancy (GH-17, phase 6): shows who shares the tenancy, lets the tenant join another tenancy of
 * the same apartment or leave a shared one. There is no separate settlement switch: whoever shares a tenancy is settled
 * together, for the period in which they shared it. Renders nothing when there is nobody to share with. The app checks no
 * legal rules: pair or shared-flat deposit, roles and the addressee of a shared settlement are legal questions (professional advice).
 */
export function MitmieterSection({ mieterId, mietverhaeltnis, onGeaendert }: MitmieterSectionProps) {
  const id = useId();
  const [daten, setDaten] = useState<MitmieterUebersicht | null>(null);
  const [formular, setFormular] = useState<Formular>("keins");
  const [isSaving, setIsSaving] = useState(false);

  const [ziel, setZiel] = useState("");
  const [rolle, setRolle] = useState("");
  const [datum, setDatum] = useState("");
  const [miete, setMiete] = useState("");
  const [fehler, setFehler] = useState<{ ziel?: string; datum?: string; miete?: string }>({});

  const laden = useCallback(async () => {
    try {
      const result = await getMitmieterUebersichtAction(mieterId);
      // A failed read only hides the section: the rest of the tenancy stays usable.
      setDaten(result.success ? result.data : null);
    } catch {
      setDaten(null);
    }
  }, [mieterId]);

  useEffect(() => {
    void laden();
  }, [laden, mietverhaeltnis.id]);

  const schliessen = () => {
    setFormular("keins");
    setZiel("");
    setRolle("");
    setDatum("");
    setMiete("");
    setFehler({});
  };

  const abschliessen = async (erfolg: string) => {
    toast({ title: "Erfolg", description: erfolg, variant: "success" });
    schliessen();
    await laden();
    onGeaendert();
  };

  const melde = (message: string) => toast({ title: "Fehler", description: message, variant: "destructive" });

  const handleZusammenfuehren = async () => {
    if (isSaving) return;
    const neuerFehler: { ziel?: string; datum?: string } = {};
    if (ziel === "") neuerFehler.ziel = FEHLER_ZIEL;
    if (!istGueltigesDatum(datum)) neuerFehler.datum = FEHLER_DATUM;
    setFehler(neuerFehler);
    if (Object.keys(neuerFehler).length > 0) return;
    setIsSaving(true);
    try {
      const result = await mieterZusammenfuehrenAction({
        mieterId,
        zielMietverhaeltnisId: ziel,
        datum,
        rolle: rolle === "hauptmieter" || rolle === "mitmieter" ? rolle : null,
      });
      if (result.success) await abschliessen("Der Mieter wurde dem Mietverhältnis hinzugefügt.");
      else melde(result.error.message);
    } catch {
      toast({ title: "Systemfehler", description: SYSTEMFEHLER, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTrennen = async () => {
    if (isSaving) return;
    const neuerFehler: { datum?: string; miete?: string } = {};
    if (!istGueltigesDatum(datum)) neuerFehler.datum = FEHLER_DATUM;
    const betrag = miete.trim() === "" ? null : parseBetragEingabe(miete);
    if (miete.trim() !== "" && betrag === null) neuerFehler.miete = FEHLER_BETRAG;
    setFehler(neuerFehler);
    if (Object.keys(neuerFehler).length > 0) return;
    setIsSaving(true);
    try {
      const result = await mieterTrennenAction({ mieterId, datum, miete: betrag });
      if (result.success) await abschliessen("Der Mieter hat jetzt ein eigenes Mietverhältnis.");
      else melde(result.error.message);
    } catch {
      toast({ title: "Systemfehler", description: SYSTEMFEHLER, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (!daten || (daten.mitmieter.length === 0 && daten.kandidaten.length === 0)) return null;

  const zielOptionen: ComboboxOption[] = daten.kandidaten.map((kandidat) => ({
    value: kandidat.mietverhaeltnisId,
    label: kandidat.mieterNamen.length > 0 ? kandidat.mieterNamen.join(", ") : "Mietverhältnis ohne Namen",
  }));
  const fehlerAttribute = (feld: "ziel" | "datum" | "miete") =>
    fehler[feld] ? { "aria-invalid": true as const, "aria-describedby": `${id}-${feld}-fehler` } : {};
  const fehlerText = (feld: "ziel" | "datum" | "miete") =>
    fehler[feld] ? <p id={`${id}-${feld}-fehler`} className={FEHLERTEXT}>{fehler[feld]}</p> : null;

  return (
    <div className="space-y-3" data-testid="mitmieter-section">
      <h4 className={UEBERSCHRIFT}>Mehrere Mieter</h4>

      {daten.mitmieter.length > 0 && (
        <div className={`${KARTE} p-3 sm:p-4 space-y-3`}>
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Users className="size-4 text-muted-foreground" aria-hidden="true" />
              Weitere Mieter in diesem Mietverhältnis
            </p>
            <ul className="text-sm text-muted-foreground">
              {daten.mitmieter.map((person) => (
                <li key={person.mieterId}>
                  {person.name || "Ohne Namen"}
                  {person.rolle ? ` (${ROLLEN_ANZEIGE[person.rolle]})` : ""}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-muted-foreground">
            Die Mieter dieses Mietverhältnisses werden gemeinsam abgerechnet, für den Zeitraum, in dem sie es teilen. Frühere Zeiträume
            bleiben beim damaligen Mietverhältnis. Wer der Adressat ist und ob das zulässig ist, ist rechtlich zu klären.
          </p>
        </div>
      )}

      {formular === "keins" && (
        <div className="space-y-2">
          {daten.kandidaten.length > 0 && (
            <Button type="button" variant="outline" size="sm" onClick={() => setFormular("zusammenfuehren")} className="w-full hover:scale-[1.005] active:scale-[0.995]">
              Zu einem anderen Mietverhältnis der Wohnung hinzufügen
            </Button>
          )}
          {daten.mitmieter.length > 0 && (
            <Button type="button" variant="outline" size="sm" onClick={() => setFormular("trennen")} className="w-full hover:scale-[1.005] active:scale-[0.995]">
              Aus dem gemeinsamen Mietverhältnis lösen
            </Button>
          )}
        </div>
      )}

      {formular === "zusammenfuehren" && (
        <div className={`${KARTE} p-3 sm:p-4 space-y-3 animate-in fade-in slide-in-from-top-1`}>
          <p className="text-sm text-muted-foreground">
            Das bisherige Mietverhältnis des Mieters endet am Vortag und bleibt als Historie bestehen. Eine Kaution bleibt an dem
            Mietverhältnis, in dem sie vereinbart wurde.
          </p>
          <div className="sm:grid sm:gap-4 space-y-2 sm:space-y-0">
            <div className={ZEILE}>
              <PropertyHeader icon={Users} label="Mietverhältnis" htmlFor={`${id}-ziel`} infoText="Ein anderes Mietverhältnis derselben Wohnung, dessen Mieter hier genannt sind." />
              <div>
                <CustomCombobox
                  width="w-full"
                  options={zielOptionen}
                  value={ziel}
                  onChange={(value) => setZiel(value ?? "")}
                  placeholder="Mietverhältnis auswählen"
                  searchPlaceholder="Suchen..."
                  emptyText="Kein Mietverhältnis gefunden."
                  disabled={isSaving}
                  id={`${id}-ziel`}
                  triggerClassName="hover:scale-100 active:scale-[0.995] shadow-none hover:shadow-none hover:bg-hover-bg hover:text-foreground"
                />
                {fehlerText("ziel")}
              </div>
            </div>
            <div className={ZEILE}>
              <PropertyHeader icon={Calendar} label="Gemeinsam ab" htmlFor={`${id}-datum`} infoText="Ab diesem Datum gehört der Mieter zum gewählten Mietverhältnis. Sein bisheriges endet am Tag davor." />
              <div>
                <DatePicker id={`${id}-datum`} value={datum} onChange={(date) => setDatum(alsIso(date))} placeholder="TT.MM.JJJJ" disabled={isSaving} className={DATUM} {...fehlerAttribute("datum")} />
                {fehlerText("datum")}
              </div>
            </div>
            <div className={ZEILE}>
              <PropertyHeader icon={Users} label="Rolle" htmlFor={`${id}-rolle`} infoText="Optional. Reines Infofeld ohne Auswirkung auf Berechnungen." />
              <CustomCombobox
                width="w-full"
                options={ROLLEN}
                value={rolle}
                onChange={(value) => setRolle(value ?? "")}
                placeholder="Optional"
                searchPlaceholder="Suchen..."
                emptyText="Keine Auswahl."
                disabled={isSaving}
                id={`${id}-rolle`}
                triggerClassName="hover:scale-100 active:scale-[0.995] shadow-none hover:shadow-none hover:bg-hover-bg hover:text-foreground"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" disabled={isSaving} onClick={schliessen}>
              Abbrechen
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={() => void handleZusammenfuehren()}>
              {isSaving && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
              Hinzufügen
            </Button>
          </div>
        </div>
      )}

      {formular === "trennen" && (
        <div className={`${KARTE} p-3 sm:p-4 space-y-3 animate-in fade-in slide-in-from-top-1`}>
          <p className="text-sm text-muted-foreground">
            Der Mieter bekommt in derselben Wohnung ein eigenes Mietverhältnis. Das gemeinsame läuft für die übrigen Mieter weiter. Eine
            Kaution bleibt am gemeinsamen Mietverhältnis.
          </p>
          <div className="sm:grid sm:gap-4 space-y-2 sm:space-y-0">
            <div className={ZEILE}>
              <PropertyHeader icon={Calendar} label="Eigenes ab" htmlFor={`${id}-datum`} infoText="Beginn des eigenen Mietverhältnisses." />
              <div>
                <DatePicker id={`${id}-datum`} value={datum} onChange={(date) => setDatum(alsIso(date))} placeholder="TT.MM.JJJJ" disabled={isSaving} className={DATUM} {...fehlerAttribute("datum")} />
                {fehlerText("datum")}
              </div>
            </div>
            <div className={ZEILE}>
              <PropertyHeader icon={Euro} label="Miete" htmlFor={`${id}-miete`} infoText="Miete des eigenen Mietverhältnisses ab dem Beginn (optional). Ohne Angabe gilt die Miete der Wohnung." />
              <div>
                <NumberInput id={`${id}-miete`} step="0.01" placeholder="Optional (€)" value={miete} onChange={(event) => setMiete(event.target.value)} disabled={isSaving} className={FELD} {...fehlerAttribute("miete")} />
                {fehlerText("miete")}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" disabled={isSaving} onClick={schliessen}>
              Abbrechen
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={() => void handleTrennen()}>
              {isSaving && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
              Lösen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
