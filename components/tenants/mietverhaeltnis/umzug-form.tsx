"use client";

import { useId, useState } from "react";
import { format } from "date-fns";
import { Building2, Calendar, Euro, Loader2 } from "lucide-react";
import { mieterUmzugAction } from "@/app/mietverhaeltnis-actions";
import { Button } from "@/components/ui/button";
import { CustomCombobox, type ComboboxOption } from "@/components/ui/custom-combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { NumberInput } from "@/components/ui/number-input";
import { toast } from "@/hooks/use-toast";
import { PropertyHeader } from "@/components/tenants/property-header";
import { FEHLER_BETRAG, FEHLER_DATUM, istGueltigesDatum, parseBetragEingabe } from "@/components/tenants/mietverhaeltnis/miete-format";
import { DATUM, FEHLERTEXT, FELD, ZEILE } from "@/components/tenants/mietverhaeltnis/stile";

interface UmzugFormProps {
  mieterId: string;
  /** Apartments the tenant can move to (without the current apartment of the tenancy). */
  wohnungen: ComboboxOption[];
  /** Called after the move was saved; gets the new apartment. The section reloads and closes the form. */
  onUmgezogen: (wohnungId: string) => void;
  /** Closes the form without saving. */
  onAbbrechen: () => void;
}

interface Fehler {
  wohnung?: string;
  datum?: string;
  miete?: string;
}

const FEHLER_WOHNUNG = "Bitte wählen Sie eine Wohnung aus.";

const alsIso = (date: Date | undefined) => (date ? format(date, "yyyy-MM-dd") : "");

/**
 * Moves a tenant with a tenancy into another apartment: new apartment, move date and optional rent of the new
 * tenancy. Shown in a card inside the tenancy section. No deadlines or legal hints are checked here.
 */
export function UmzugForm({ mieterId, wohnungen, onUmgezogen, onAbbrechen }: UmzugFormProps) {
  const id = useId();
  const [wohnungId, setWohnungId] = useState("");
  const [datum, setDatum] = useState("");
  const [miete, setMiete] = useState("");
  const [fehler, setFehler] = useState<Fehler>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleSpeichern = async () => {
    if (isSaving) return;
    const neuerFehler: Fehler = {};
    if (wohnungId === "") neuerFehler.wohnung = FEHLER_WOHNUNG;
    if (!istGueltigesDatum(datum)) neuerFehler.datum = FEHLER_DATUM;
    const betrag = miete.trim() === "" ? null : parseBetragEingabe(miete);
    if (miete.trim() !== "" && betrag === null) neuerFehler.miete = FEHLER_BETRAG;
    setFehler(neuerFehler);
    if (Object.keys(neuerFehler).length > 0) return;

    setIsSaving(true);
    try {
      const result = await mieterUmzugAction({ mieterId, wohnungId, datum, miete: betrag });
      if (result.success) {
        toast({ title: "Erfolg", description: "Der Umzug wurde gespeichert.", variant: "success" });
        onUmgezogen(wohnungId);
      } else {
        toast({ title: "Fehler", description: result.error.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Systemfehler", description: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const fehlerAttribute = (feld: keyof Fehler) =>
    fehler[feld] ? { "aria-invalid": true as const, "aria-describedby": `${id}-${feld}-fehler` } : {};
  const fehlerText = (feld: keyof Fehler) =>
    fehler[feld] ? <p id={`${id}-${feld}-fehler`} className={FEHLERTEXT}>{fehler[feld]}</p> : null;

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
      <p className="text-sm text-muted-foreground">
        Das bisherige Mietverhältnis endet am Vortag. In der neuen Wohnung beginnt ein neues Mietverhältnis.
      </p>
      <div className="sm:grid sm:gap-4 space-y-2 sm:space-y-0">
        <div className={ZEILE}>
          <PropertyHeader icon={Building2} label="Neue Wohnung" htmlFor={`${id}-umzugWohnung`} infoText="Die Wohnung, in die der Mieter umzieht. Die aktuelle Wohnung steht nicht zur Auswahl." />
          <div>
            <div className="relative">
              <CustomCombobox
                width="w-full"
                options={wohnungen}
                value={wohnungId}
                onChange={(value) => setWohnungId(value ?? "")}
                placeholder="Wohnung auswählen"
                searchPlaceholder="Wohnung suchen..."
                emptyText="Keine Wohnung gefunden."
                disabled={isSaving}
                id={`${id}-umzugWohnung`}
                triggerClassName="hover:scale-100 active:scale-[0.995] shadow-none hover:shadow-none hover:bg-hover-bg hover:text-foreground"
              />
            </div>
            {fehlerText("wohnung")}
          </div>
        </div>
        <div className={ZEILE}>
          <PropertyHeader icon={Calendar} label="Umzug am" htmlFor={`${id}-umzugDatum`} infoText="Datum des Umzugs. Das bisherige Mietverhältnis endet am Tag davor." />
          <div>
            <DatePicker
              id={`${id}-umzugDatum`}
              value={datum}
              onChange={(date) => setDatum(alsIso(date))}
              placeholder="TT.MM.JJJJ"
              disabled={isSaving}
              className={DATUM}
              {...fehlerAttribute("datum")}
            />
            {fehlerText("datum")}
          </div>
        </div>
        <div className={ZEILE}>
          <PropertyHeader icon={Euro} label="Neue Miete" htmlFor={`${id}-umzugMiete`} infoText="Miete des neuen Mietverhältnisses ab dem Umzugstag (optional). Ohne Angabe gilt die Miete der neuen Wohnung." />
          <div>
            <NumberInput
              id={`${id}-umzugMiete`}
              step="0.01"
              placeholder="Optional (€)"
              value={miete}
              onChange={(event) => setMiete(event.target.value)}
              disabled={isSaving}
              className={FELD}
              {...fehlerAttribute("miete")}
            />
            {fehlerText("miete")}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" disabled={isSaving} onClick={onAbbrechen}>
          Abbrechen
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={() => void handleSpeichern()}>
          {isSaving && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
          Umzug speichern
        </Button>
      </div>
    </div>
  );
}
