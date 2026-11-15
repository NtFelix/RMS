"use client";

import { useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { vertragsdatenSpeichernAction } from "@/app/mietverhaeltnis-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import type { Mietverhaeltnis } from "@/types/Mietverhaeltnis";
import { FormFeld, fehlerAttribute } from "@/components/tenants/mietverhaeltnis/form-feld";
import {
  datumEingabe,
  FEHLER_DATUM,
  NOTIZ_MAX_LAENGE,
  textOderNull,
  zeichenZahl,
} from "@/components/tenants/mietverhaeltnis/miete-format";

interface VertragsdatenFormProps {
  mieterId: string;
  mietverhaeltnis: Mietverhaeltnis;
  /** Called after a successful save so the section reloads. */
  onGespeichert: () => void;
}

type Durch = "" | "mieter" | "vermieter";

interface VertragsdatenFehler {
  vertragsende?: string;
  befristetBis?: string;
  kuendigungEingangAm?: string;
  kuendigungZum?: string;
  notiz?: string;
}

const selectClassName =
  "flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Contract data of the tenancy: end, fixed term, termination and note. Saved with its own button. The app
 * calculates no deadlines and gives no legal advice; the form only stores what the user enters.
 */
export function VertragsdatenForm({ mieterId, mietverhaeltnis, onGespeichert }: VertragsdatenFormProps) {
  const id = useId();
  const feldId = (name: string) => `${id}-${name}`;
  const [vertragsende, setVertragsende] = useState(mietverhaeltnis.vertragsende ?? "");
  const [befristetBis, setBefristetBis] = useState(mietverhaeltnis.befristet_bis ?? "");
  const [kuendigungEingangAm, setKuendigungEingangAm] = useState(mietverhaeltnis.kuendigung_eingang_am ?? "");
  const [kuendigungZum, setKuendigungZum] = useState(mietverhaeltnis.kuendigung_zum ?? "");
  const [kuendigungDurch, setKuendigungDurch] = useState<Durch>(mietverhaeltnis.kuendigung_durch ?? "");
  const [notiz, setNotiz] = useState(mietverhaeltnis.notiz ?? "");
  const [fehler, setFehler] = useState<VertragsdatenFehler>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleSpeichern = async () => {
    if (isSaving) return;
    const ende = datumEingabe(vertragsende);
    const befristet = datumEingabe(befristetBis);
    const eingang = datumEingabe(kuendigungEingangAm);
    const zum = datumEingabe(kuendigungZum);

    const neuerFehler: VertragsdatenFehler = {};
    if (ende === undefined) neuerFehler.vertragsende = FEHLER_DATUM;
    if (befristet === undefined) neuerFehler.befristetBis = FEHLER_DATUM;
    if (eingang === undefined) neuerFehler.kuendigungEingangAm = FEHLER_DATUM;
    if (zum === undefined) neuerFehler.kuendigungZum = FEHLER_DATUM;
    if (zeichenZahl(notiz.trim()) > NOTIZ_MAX_LAENGE) {
      neuerFehler.notiz = `Die Notiz darf höchstens ${NOTIZ_MAX_LAENGE} Zeichen lang sein.`;
    }
    setFehler(neuerFehler);
    if (Object.keys(neuerFehler).length > 0 || ende === undefined || befristet === undefined || eingang === undefined || zum === undefined) {
      return;
    }

    setIsSaving(true);
    try {
      const result = await vertragsdatenSpeichernAction({
        mieterId,
        vertragsende: ende,
        befristetBis: befristet,
        kuendigungEingangAm: eingang,
        kuendigungZum: zum,
        kuendigungDurch: kuendigungDurch === "" ? null : kuendigungDurch,
        notiz: textOderNull(notiz),
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

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Vertragsdaten</h4>
        <p className="text-xs text-muted-foreground">Die App berechnet keine Fristen.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormFeld id={feldId("vertragsende")} label="Vertragsende" fehler={fehler.vertragsende}>
            <Input
              id={feldId("vertragsende")}
              type="date"
              value={vertragsende}
              onChange={(event) => setVertragsende(event.target.value)}
              disabled={isSaving}
              {...fehlerAttribute(feldId("vertragsende"), fehler.vertragsende)}
            />
          </FormFeld>
          <FormFeld id={feldId("befristet")} label="Befristet bis" fehler={fehler.befristetBis}>
            <Input
              id={feldId("befristet")}
              type="date"
              value={befristetBis}
              onChange={(event) => setBefristetBis(event.target.value)}
              disabled={isSaving}
              {...fehlerAttribute(feldId("befristet"), fehler.befristetBis)}
            />
          </FormFeld>
        </div>

        <fieldset className="space-y-3 rounded-md border border-border/60 p-3">
          <legend className="px-1 text-sm font-medium">Kündigung</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <FormFeld id={feldId("eingang")} label="Eingang am" fehler={fehler.kuendigungEingangAm}>
              <Input
                id={feldId("eingang")}
                type="date"
                value={kuendigungEingangAm}
                onChange={(event) => setKuendigungEingangAm(event.target.value)}
                disabled={isSaving}
                {...fehlerAttribute(feldId("eingang"), fehler.kuendigungEingangAm)}
              />
            </FormFeld>
            <FormFeld id={feldId("wirksam")} label="Wirksam zum" fehler={fehler.kuendigungZum}>
              <Input
                id={feldId("wirksam")}
                type="date"
                value={kuendigungZum}
                onChange={(event) => setKuendigungZum(event.target.value)}
                disabled={isSaving}
                {...fehlerAttribute(feldId("wirksam"), fehler.kuendigungZum)}
              />
            </FormFeld>
            <FormFeld id={feldId("durch")} label="Durch">
              <select
                id={feldId("durch")}
                className={selectClassName}
                value={kuendigungDurch}
                onChange={(event) => setKuendigungDurch(event.target.value as Durch)}
                disabled={isSaving}
              >
                <option value="">keine Angabe</option>
                <option value="mieter">Mieter</option>
                <option value="vermieter">Vermieter</option>
              </select>
            </FormFeld>
          </div>
        </fieldset>

        <FormFeld id={feldId("notiz")} label="Notiz" fehler={fehler.notiz}>
          <Textarea
            id={feldId("notiz")}
            maxLength={NOTIZ_MAX_LAENGE}
            value={notiz}
            onChange={(event) => setNotiz(event.target.value)}
            disabled={isSaving}
            {...fehlerAttribute(feldId("notiz"), fehler.notiz)}
          />
        </FormFeld>
      </div>
      <div>
        <Button type="button" onClick={() => void handleSpeichern()} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          Vertragsdaten speichern
        </Button>
      </div>
    </div>
  );
}
