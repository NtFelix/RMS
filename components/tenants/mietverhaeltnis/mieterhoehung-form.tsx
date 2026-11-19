"use client";

import { useId, useState } from "react";
import { format } from "date-fns";
import { Calendar, Euro, Loader2, MessageSquareText } from "lucide-react";
import { mieteSetzenAction } from "@/app/mietverhaeltnis-actions";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { toast } from "@/hooks/use-toast";
import { PropertyHeader } from "@/components/tenants/property-header";
import {
  FEHLER_BETRAG,
  FEHLER_DATUM,
  GRUND_MAX_LAENGE,
  istGueltigesDatum,
  parseBetragEingabe,
  textOderNull,
  zeichenZahl,
} from "@/components/tenants/mietverhaeltnis/miete-format";
import { DATUM, FEHLERTEXT, FELD, ZEILE } from "@/components/tenants/mietverhaeltnis/stile";

interface MieterhoehungFormProps {
  mieterId: string;
  /** Called after the change was saved so the section reloads. */
  onErfasst: () => void;
  /** Closes the form without saving. */
  onAbbrechen: () => void;
}

interface Fehler {
  betrag?: string;
  wirksamAb?: string;
  grund?: string;
}

const alsIso = (date: Date | undefined) => (date ? format(date, "yyyy-MM-dd") : "");

/**
 * Records a rent change as one entry of the rent history: the new rent, the date it applies from and an optional
 * reason. Deliberately simple: no type of change, no deadlines, limits or legal hints. Shown inside the rent
 * history card.
 */
export function MieterhoehungForm({ mieterId, onErfasst, onAbbrechen }: MieterhoehungFormProps) {
  const id = useId();
  const [betrag, setBetrag] = useState("");
  const [wirksamAb, setWirksamAb] = useState("");
  const [grund, setGrund] = useState("");
  const [fehler, setFehler] = useState<Fehler>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleSpeichern = async () => {
    if (isSaving) return;
    const neuerFehler: Fehler = {};
    const betragZahl = parseBetragEingabe(betrag);
    if (betragZahl === null) neuerFehler.betrag = FEHLER_BETRAG;
    if (!istGueltigesDatum(wirksamAb)) neuerFehler.wirksamAb = FEHLER_DATUM;
    if (zeichenZahl(grund.trim()) > GRUND_MAX_LAENGE) neuerFehler.grund = `Die Begründung darf höchstens ${GRUND_MAX_LAENGE} Zeichen lang sein.`;
    setFehler(neuerFehler);
    if (Object.keys(neuerFehler).length > 0 || betragZahl === null) return;

    setIsSaving(true);
    try {
      const result = await mieteSetzenAction({ mieterId, gueltigAb: wirksamAb, betrag: betragZahl, grund: textOderNull(grund) });
      if (result.success) {
        toast({ title: "Erfolg", description: "Die Mietänderung wurde gespeichert.", variant: "success" });
        onErfasst();
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
      <div className="sm:grid sm:gap-4 space-y-2 sm:space-y-0">
        <div className={ZEILE}>
          <PropertyHeader icon={Euro} label="Neue Miete" htmlFor={`${id}-betrag`} infoText="Neue monatliche Miete in Euro." />
          <div>
            <NumberInput
              id={`${id}-betrag`}
              step="0.01"
              placeholder="Betrag (€)"
              value={betrag}
              onChange={(event) => setBetrag(event.target.value)}
              disabled={isSaving}
              className={FELD}
              {...fehlerAttribute("betrag")}
            />
            {fehlerText("betrag")}
          </div>
        </div>
        <div className={ZEILE}>
          <PropertyHeader icon={Calendar} label="Wirksam ab" htmlFor={`${id}-wirksamAb`} infoText="Datum, ab dem die neue Miete gilt. Ein Eintrag mit demselben Datum wird ersetzt." />
          <div>
            <DatePicker
              id={`${id}-wirksamAb`}
              value={wirksamAb}
              onChange={(date) => setWirksamAb(alsIso(date))}
              placeholder="TT.MM.JJJJ"
              disabled={isSaving}
              className={DATUM}
              {...fehlerAttribute("wirksamAb")}
            />
            {fehlerText("wirksamAb")}
          </div>
        </div>
        <div className={ZEILE}>
          <PropertyHeader icon={MessageSquareText} label="Begründung" htmlFor={`${id}-grund`} infoText="Kurze Begründung der Mietänderung (optional)." />
          <div>
            <Input
              id={`${id}-grund`}
              value={grund}
              onChange={(event) => setGrund(event.target.value)}
              placeholder="Optional"
              disabled={isSaving}
              className={FELD}
              {...fehlerAttribute("grund")}
            />
            {fehlerText("grund")}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" disabled={isSaving} onClick={onAbbrechen}>
          Abbrechen
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={() => void handleSpeichern()}>
          {isSaving && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
          Mietänderung speichern
        </Button>
      </div>
    </div>
  );
}
