"use client";

import { useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { mieterhoehungErfassenAction } from "@/app/mietverhaeltnis-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { FormFeld, fehlerAttribute } from "@/components/tenants/mietverhaeltnis/form-feld";
import {
  datumEingabe,
  FEHLER_BETRAG,
  FEHLER_DATUM,
  GRUND_MAX_LAENGE,
  parseBetragEingabe,
  textOderNull,
  zeichenZahl,
} from "@/components/tenants/mietverhaeltnis/miete-format";

/** Suggestions for the type of change. Only suggestions: free text stays allowed. */
export const AENDERUNGSART_VORSCHLAEGE = ["Vereinbarung", "Staffelmiete", "Indexmiete", "Vergleichsmiete", "Modernisierung", "Sonstiges"];
const AENDERUNGSART_MAX_LAENGE = 50;

interface MieterhoehungFormProps {
  mieterId: string;
  /** Called after a successful save so the section reloads. */
  onErfasst: () => void;
}

interface MieterhoehungFehler {
  betrag?: string;
  wirksamAb?: string;
  aenderungsart?: string;
  erklaertAm?: string;
  grund?: string;
}

/**
 * Records a rent change as one process (new rent, valid from, type of change, optional declaration date and reason).
 * The app checks no deadlines, limits or legal requirements.
 */
export function MieterhoehungForm({ mieterId, onErfasst }: MieterhoehungFormProps) {
  const id = useId();
  const feldId = (name: string) => `${id}-${name}`;
  const artListId = feldId("art-vorschlaege");
  const [betragText, setBetragText] = useState("");
  const [wirksamAb, setWirksamAb] = useState("");
  const [aenderungsart, setAenderungsart] = useState("");
  const [erklaertAm, setErklaertAm] = useState("");
  const [grund, setGrund] = useState("");
  const [fehler, setFehler] = useState<MieterhoehungFehler>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleErfassen = async () => {
    if (isSaving) return;
    const betrag = parseBetragEingabe(betragText);
    const datum = wirksamAb.trim();
    const art = aenderungsart.trim();
    const erklaert = datumEingabe(erklaertAm);
    const grundText = grund.trim();

    const neuerFehler: MieterhoehungFehler = {};
    if (betrag === null) neuerFehler.betrag = FEHLER_BETRAG;
    if (datum === "" || datumEingabe(datum) === undefined) neuerFehler.wirksamAb = FEHLER_DATUM;
    if (art === "") {
      neuerFehler.aenderungsart = "Bitte geben Sie die Art der Mietänderung an.";
    } else if (zeichenZahl(art) > AENDERUNGSART_MAX_LAENGE) {
      neuerFehler.aenderungsart = `Die Art darf höchstens ${AENDERUNGSART_MAX_LAENGE} Zeichen lang sein.`;
    }
    if (erklaert === undefined) neuerFehler.erklaertAm = FEHLER_DATUM;
    if (zeichenZahl(grundText) > GRUND_MAX_LAENGE) {
      neuerFehler.grund = `Der Grund darf höchstens ${GRUND_MAX_LAENGE} Zeichen lang sein.`;
    }
    setFehler(neuerFehler);
    if (Object.keys(neuerFehler).length > 0 || betrag === null || erklaert === undefined) return;

    setIsSaving(true);
    try {
      const result = await mieterhoehungErfassenAction({
        mieterId,
        wirksamAb: datum,
        betrag,
        aenderungsart: art,
        erklaertAm: erklaert,
        grund: textOderNull(grundText),
      });
      if (result.success) {
        toast({ title: "Erfolg", description: "Die Mietänderung wurde erfasst.", variant: "success" });
        setBetragText("");
        setWirksamAb("");
        setAenderungsart("");
        setErklaertAm("");
        setGrund("");
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

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Mietänderung erfassen</h4>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormFeld id={feldId("betrag")} label="Neue Miete (EUR)" fehler={fehler.betrag}>
          <Input
            id={feldId("betrag")}
            type="text"
            inputMode="decimal"
            placeholder="z. B. 920,00"
            value={betragText}
            onChange={(event) => setBetragText(event.target.value)}
            disabled={isSaving}
            {...fehlerAttribute(feldId("betrag"), fehler.betrag)}
          />
        </FormFeld>
        <FormFeld id={feldId("wirksam")} label="Wirksam ab" fehler={fehler.wirksamAb}>
          <Input
            id={feldId("wirksam")}
            type="date"
            value={wirksamAb}
            onChange={(event) => setWirksamAb(event.target.value)}
            disabled={isSaving}
            {...fehlerAttribute(feldId("wirksam"), fehler.wirksamAb)}
          />
        </FormFeld>
        <FormFeld id={feldId("art")} label="Art (Pflicht)" fehler={fehler.aenderungsart}>
          <Input
            id={feldId("art")}
            type="text"
            list={artListId}
            autoComplete="off"
            value={aenderungsart}
            onChange={(event) => setAenderungsart(event.target.value)}
            disabled={isSaving}
            aria-required="true"
            {...fehlerAttribute(feldId("art"), fehler.aenderungsart)}
          />
          <datalist id={artListId}>
            {AENDERUNGSART_VORSCHLAEGE.map((vorschlag) => (
              <option key={vorschlag} value={vorschlag} />
            ))}
          </datalist>
        </FormFeld>
        <FormFeld id={feldId("erklaert")} label="Datum der Erklärung (optional)" fehler={fehler.erklaertAm}>
          <Input
            id={feldId("erklaert")}
            type="date"
            value={erklaertAm}
            onChange={(event) => setErklaertAm(event.target.value)}
            disabled={isSaving}
            {...fehlerAttribute(feldId("erklaert"), fehler.erklaertAm)}
          />
        </FormFeld>
      </div>
      <FormFeld id={feldId("grund")} label="Grund (optional)" fehler={fehler.grund}>
        <Input
          id={feldId("grund")}
          type="text"
          maxLength={GRUND_MAX_LAENGE}
          value={grund}
          onChange={(event) => setGrund(event.target.value)}
          disabled={isSaving}
          {...fehlerAttribute(feldId("grund"), fehler.grund)}
        />
      </FormFeld>
      <div>
        <Button type="button" onClick={() => void handleErfassen()} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          Mietänderung speichern
        </Button>
      </div>
    </div>
  );
}
