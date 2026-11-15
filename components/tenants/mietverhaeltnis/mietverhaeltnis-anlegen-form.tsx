"use client";

import { useId, useState } from "react";
import { format } from "date-fns";
import { Calendar, Euro, Loader2 } from "lucide-react";
import { mietverhaeltnisAnlegenAction } from "@/app/mietverhaeltnis-actions";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { NumberInput } from "@/components/ui/number-input";
import { toast } from "@/hooks/use-toast";
import { PropertyHeader } from "@/components/tenants/property-header";
import { FEHLER_BETRAG, FEHLER_DATUM, istGueltigesDatum, parseBetragEingabe } from "@/components/tenants/mietverhaeltnis/miete-format";
import { DATUM, FEHLERTEXT, FELD, KARTE, ZEILE } from "@/components/tenants/mietverhaeltnis/stile";

interface MietverhaeltnisAnlegenFormProps {
  mieterId: string;
  /** Move-in date of the tenant, pre-fills the contract start. */
  mieterEinzug: string | null;
  /** Rent of the apartment, pre-fills the first rent. */
  wohnungsmiete: number | null;
  /** Called after the tenancy was created so the section reloads. */
  onAngelegt: () => void;
}

/** Creates the tenancy of a tenant: contract start and, optionally, the first rent. */
export function MietverhaeltnisAnlegenForm({ mieterId, mieterEinzug, wohnungsmiete, onAngelegt }: MietverhaeltnisAnlegenFormProps) {
  const id = useId();
  const [vertragsbeginn, setVertragsbeginn] = useState(mieterEinzug ?? "");
  const [miete, setMiete] = useState(wohnungsmiete !== null ? String(wohnungsmiete) : "");
  const [fehler, setFehler] = useState<{ vertragsbeginn?: string; miete?: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleAnlegen = async () => {
    if (isSaving) return;
    const neuerFehler: { vertragsbeginn?: string; miete?: string } = {};
    if (!istGueltigesDatum(vertragsbeginn)) neuerFehler.vertragsbeginn = FEHLER_DATUM;
    const betrag = miete.trim() === "" ? null : parseBetragEingabe(miete);
    if (miete.trim() !== "" && betrag === null) neuerFehler.miete = FEHLER_BETRAG;
    setFehler(neuerFehler);
    if (Object.keys(neuerFehler).length > 0) return;

    setIsSaving(true);
    try {
      const result = await mietverhaeltnisAnlegenAction({ mieterId, vertragsbeginn, miete: betrag });
      if (result.success) {
        toast({ title: "Erfolg", description: "Das Mietverhältnis wurde angelegt.", variant: "success" });
        onAngelegt();
      } else {
        toast({ title: "Fehler", description: result.error.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Systemfehler", description: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={KARTE}>
      <div className="p-3 sm:p-4 sm:grid sm:gap-4 space-y-2 sm:space-y-0">
        <div className={ZEILE}>
          <PropertyHeader icon={Calendar} label="Beginn" htmlFor={`${id}-beginn`} infoText="Beginn des Mietverhältnisses. Vorbelegt mit dem Einzug des Mieters." />
          <div>
            <DatePicker
              id={`${id}-beginn`}
              value={vertragsbeginn}
              onChange={(date) => setVertragsbeginn(date ? format(date, "yyyy-MM-dd") : "")}
              placeholder="TT.MM.JJJJ"
              disabled={isSaving}
              className={DATUM}
              aria-invalid={fehler.vertragsbeginn ? true : undefined}
              aria-describedby={fehler.vertragsbeginn ? `${id}-beginn-fehler` : undefined}
            />
            {fehler.vertragsbeginn && <p id={`${id}-beginn-fehler`} className={FEHLERTEXT}>{fehler.vertragsbeginn}</p>}
          </div>
        </div>
        <div className={ZEILE}>
          <PropertyHeader icon={Euro} label="Miete" htmlFor={`${id}-miete`} infoText="Monatliche Miete ab Vertragsbeginn. Vorbelegt mit der Miete der Wohnung. Leer lassen, wenn Sie die Miete später erfassen." />
          <div>
            <NumberInput
              id={`${id}-miete`}
              step="0.01"
              placeholder="Betrag (€)"
              value={miete}
              onChange={(event) => setMiete(event.target.value)}
              disabled={isSaving}
              className={FELD}
              aria-invalid={fehler.miete ? true : undefined}
              aria-describedby={fehler.miete ? `${id}-miete-fehler` : undefined}
            />
            {fehler.miete && <p id={`${id}-miete-fehler`} className={FEHLERTEXT}>{fehler.miete}</p>}
          </div>
        </div>
      </div>
      <div className="border-t border-border/40 p-3 sm:p-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void handleAnlegen()}
          disabled={isSaving}
          className="w-full hover:scale-[1.005] active:scale-[0.995]"
        >
          {isSaving && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
          Mietverhältnis anlegen
        </Button>
      </div>
    </div>
  );
}
