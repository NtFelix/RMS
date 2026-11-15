"use client";

import { useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { mietverhaeltnisAnlegenAction } from "@/app/mietverhaeltnis-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { FormFeld, fehlerAttribute } from "@/components/tenants/mietverhaeltnis/form-feld";
import { betragAlsEingabe, FEHLER_BETRAG, FEHLER_DATUM, istGueltigesDatum, parseBetragEingabe } from "@/components/tenants/mietverhaeltnis/miete-format";

interface MietverhaeltnisAnlegenFormProps {
  mieterId: string;
  /** Move-in date of the tenant, pre-filled as contract start. */
  mieterEinzug: string | null;
  /** Apartment rent, pre-filled as first rent (optional). */
  wohnungsmiete: number | null;
  /** Called after a successful creation so the section reloads. */
  onAngelegt: () => void;
}

interface AnlegenFehler {
  vertragsbeginn?: string;
  miete?: string;
}

/** Creates the tenancy of a tenant without one. Shown in the tenant dialog only for tenants, not applicants. */
export function MietverhaeltnisAnlegenForm({ mieterId, mieterEinzug, wohnungsmiete, onAngelegt }: MietverhaeltnisAnlegenFormProps) {
  const id = useId();
  const beginnId = `${id}-beginn`;
  const mieteId = `${id}-miete`;
  const [vertragsbeginn, setVertragsbeginn] = useState(mieterEinzug ?? "");
  const [miete, setMiete] = useState(wohnungsmiete !== null ? betragAlsEingabe(wohnungsmiete) : "");
  const [fehler, setFehler] = useState<AnlegenFehler>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleAnlegen = async () => {
    if (isSaving) return;
    const beginn = vertragsbeginn.trim();
    const betragText = miete.trim();
    const betrag = betragText === "" ? null : parseBetragEingabe(betragText);

    const neuerFehler: AnlegenFehler = {};
    if (!istGueltigesDatum(beginn)) neuerFehler.vertragsbeginn = FEHLER_DATUM;
    if (betragText !== "" && betrag === null) neuerFehler.miete = FEHLER_BETRAG;
    setFehler(neuerFehler);
    if (neuerFehler.vertragsbeginn || neuerFehler.miete) return;

    setIsSaving(true);
    try {
      const result = await mietverhaeltnisAnlegenAction({ mieterId, vertragsbeginn: beginn, miete: betrag });
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
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Mietverhältnis anlegen</h4>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormFeld id={beginnId} label="Vertragsbeginn" fehler={fehler.vertragsbeginn}>
          <Input
            id={beginnId}
            type="date"
            value={vertragsbeginn}
            onChange={(event) => setVertragsbeginn(event.target.value)}
            disabled={isSaving}
            {...fehlerAttribute(beginnId, fehler.vertragsbeginn)}
          />
        </FormFeld>
        <FormFeld id={mieteId} label="Monatliche Miete (EUR, optional)" fehler={fehler.miete}>
          <Input
            id={mieteId}
            type="text"
            inputMode="decimal"
            placeholder="z. B. 850,00"
            value={miete}
            onChange={(event) => setMiete(event.target.value)}
            disabled={isSaving}
            {...fehlerAttribute(mieteId, fehler.miete)}
          />
        </FormFeld>
      </div>
      <div>
        <Button type="button" onClick={() => void handleAnlegen()} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          Mietverhältnis anlegen
        </Button>
      </div>
    </div>
  );
}
