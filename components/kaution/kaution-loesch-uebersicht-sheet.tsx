"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatBetrag } from "@/components/kaution/kaution-format";
import { KautionFeld } from "@/components/kaution/kaution-feld";
import { useModalStore, type LoeschUebersichtConfig } from "@/hooks/use-modal-store";
import { KAUTION_ART_LABELS } from "@/lib/kautionen-constants";
import type { KautionLoeschauswirkung } from "@/types/Kaution";

/**
 * Global side panel "Kautionen werden mitgelöscht" (same look as the edit panels): appears when houses, apartments or tenants
 * with deposits WITH bookings are deleted (see `lib/kautionen-loeschen.ts`). Shows what the database reports (no calculation
 * in the browser) and asks for a deliberate confirmation: the number of the affected tenants has to be typed. The database
 * enforces the confirmation again (checksum of exactly this overview, `soft_delete_mit_kautionen`). Closing the panel
 * (button, Escape, click next to it) cancels.
 */
export function KautionLoeschUebersichtSheet() {
  const config = useModalStore((state) => state.loeschUebersichtConfig);
  const isOpen = useModalStore((state) => state.isLoeschUebersichtOpen);
  const closeLoeschUebersicht = useModalStore((state) => state.closeLoeschUebersicht);

  const entscheide = (bestaetigt: boolean) => {
    config?.onEntscheidung(bestaetigt);
    closeLoeschUebersicht();
  };

  // Beim Schließen ist `config` sofort null, die Seitenleiste soll aber während der Schließen-Animation noch ihren Inhalt zeigen:
  // letzte Anfrage merken (Radix hängt den Inhalt nach der Animation aus, die Eingabe beginnt beim nächsten Öffnen leer).
  const [letzteConfig, setLetzteConfig] = useState(config);
  useEffect(() => {
    if (config) setLetzteConfig(config);
  }, [config]);
  const angezeigt = config ?? letzteConfig;

  // Das Panel gehört zum Layout und bleibt beim Seitenwechsel bestehen, die anfragende Seite nicht: Wechselt die Seite, während die
  // Übersicht offen ist, gilt das als Abbruch (sonst löschte eine spätere Bestätigung etwas, das der Nutzer nicht mehr vor sich hat).
  const pathname = usePathname();
  const pfadBeimOeffnen = useRef<string | null>(null);
  useEffect(() => {
    if (!config) {
      pfadBeimOeffnen.current = null;
      return;
    }
    if (pfadBeimOeffnen.current === null) {
      pfadBeimOeffnen.current = pathname;
    } else if (pfadBeimOeffnen.current !== pathname) {
      pfadBeimOeffnen.current = null;
      config.onEntscheidung(false);
      closeLoeschUebersicht();
    }
  }, [config, pathname, closeLoeschUebersicht]);

  return (
    <Sheet open={isOpen && config !== null} onOpenChange={(open) => !open && entscheide(false)}>
      <SheetContent id="kaution-loesch-uebersicht" className="w-full sm:max-w-xl flex flex-col h-full p-0 gap-0">
        {angezeigt ? <UebersichtInhalt key={angezeigt.auswirkung.pruefsumme ?? "ohne"} config={angezeigt} onEntscheidung={entscheide} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function zaehler(anzahl: number, einzahl: string, mehrzahl: string): string {
  return `${anzahl} ${anzahl === 1 ? einzahl : mehrzahl}`;
}

/** "2 Häuser, 3 Wohnungen und 5 Mieter": only what is affected. */
function betroffenText(auswirkung: KautionLoeschauswirkung): string {
  const teile = [
    auswirkung.anzahl_haeuser > 0 ? zaehler(auswirkung.anzahl_haeuser, "Haus", "Häuser") : null,
    auswirkung.anzahl_wohnungen > 0 ? zaehler(auswirkung.anzahl_wohnungen, "Wohnung", "Wohnungen") : null,
    auswirkung.anzahl_mieter > 0 ? zaehler(auswirkung.anzahl_mieter, "Mieter", "Mieter") : null,
  ].filter((teil): teil is string => teil !== null);
  if (teile.length <= 1) return teile[0] ?? "keine Einträge";
  return `${teile.slice(0, -1).join(", ")} und ${teile[teile.length - 1]}`;
}

interface UebersichtInhaltProps {
  config: LoeschUebersichtConfig;
  onEntscheidung: (bestaetigt: boolean) => void;
}

function Abschnitt({ titel, titelId, children }: { titel: string; titelId?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 sm:space-y-3 sm:pt-4 sm:border-t sm:border-border/40">
      <div id={titelId} className="text-xs font-bold text-muted-foreground/50 uppercase tracking-widest">
        {titel}
      </div>
      {children}
    </div>
  );
}

function UebersichtInhalt({ config, onEntscheidung }: UebersichtInhaltProps) {
  const basisId = useId();
  const [eingabe, setEingabe] = useState("");
  const { auswirkung } = config;
  const kautionen = auswirkung.kautionen;
  if (!kautionen) return null;

  const erwartet = String(auswirkung.anzahl_mieter);
  const bestaetigt = eingabe.trim() === erwartet;
  const fehler = eingabe.trim() !== "" && !bestaetigt ? `Bitte geben Sie ${erwartet} ein.` : null;

  return (
    <form
      className="flex flex-col flex-1 min-h-0"
      onSubmit={(event) => {
        event.preventDefault();
        if (bestaetigt) onEntscheidung(true);
      }}
    >
      <ScrollArea className="flex-1">
        <div className="max-w-[90%] mx-auto pt-10 sm:pt-14 pb-6 px-4 sm:px-8 space-y-4 sm:space-y-8">
          <div className="space-y-2 sm:space-y-3">
            <div className="text-destructive">
              <TriangleAlert className="h-8 w-8 sm:h-10 sm:w-10" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <SheetTitle className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">Kautionen werden mitgelöscht</SheetTitle>
              <SheetDescription className="text-sm sm:text-base text-muted-foreground/80">
                Sie löschen {betroffenText(auswirkung)}. Dabei kommen {zaehler(kautionen.mit_buchungen, "Kaution", "Kautionen")} mit Buchungen in
                den Papierkorb. Die Buchungen bleiben unverändert erhalten und lassen sich dort mit dem Mieter wiederherstellen. Eine
                Kaution mit Buchungen kann nicht endgültig gelöscht werden.
              </SheetDescription>
            </div>
          </div>

          <Abschnitt titel="Auswirkung">
            <dl
              className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 rounded-xl bg-muted/60 px-4 py-3 text-sm"
              data-testid="kaution-loesch-summen"
            >
              <dt>Kautionen insgesamt</dt>
              <dd className="text-right tabular-nums">
                {kautionen.anzahl}, davon {kautionen.mit_buchungen} mit Buchungen
              </dd>
              <dt>Noch offen (Soll abzüglich Eingezahltes)</dt>
              <dd className="text-right font-medium tabular-nums">{formatBetrag(kautionen.konto_noch_offen)}</dd>
              <dt>Verwahrt (Kontostand)</dt>
              <dd className="text-right font-medium tabular-nums">{formatBetrag(kautionen.konto_verwahrt)}</dd>
              {kautionen.dokumentiert_anzahl > 0 ? (
                <>
                  <dt>Bürgschaften und Versicherungen (ohne Konto)</dt>
                  <dd className="text-right tabular-nums">
                    {kautionen.dokumentiert_anzahl}, Soll zusammen {formatBetrag(kautionen.dokumentiert_summe)}
                  </dd>
                </>
              ) : null}
              {kautionen.mit_saldo_anzahl > 0 ? (
                <>
                  <dt>Mieter mit Kontostand ungleich 0</dt>
                  <dd className="text-right font-medium tabular-nums">{kautionen.mit_saldo_anzahl}</dd>
                </>
              ) : null}
            </dl>
          </Abschnitt>

          <Abschnitt titel="Kautionen mit Buchungen" titelId={`${basisId}-liste`}>
            <div role="region" aria-labelledby={`${basisId}-liste`} className="rounded-xl border text-sm">
              <ul className="divide-y">
                {kautionen.mit_buchungen_liste.map((eintrag) => (
                  <li key={eintrag.mieter_id} className="flex items-baseline justify-between gap-3 px-4 py-2.5">
                    <span className="min-w-0 truncate">
                      {eintrag.name ?? "Mieter"}
                      <span className="text-muted-foreground"> · {KAUTION_ART_LABELS[eintrag.kautionsart] ?? "Kaution"}</span>
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {formatBetrag(eintrag.kontostand)}
                      <span className="text-muted-foreground"> · {zaehler(eintrag.anzahl_buchungen, "Buchung", "Buchungen")}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            {kautionen.mit_buchungen_gekuerzt ? (
              <p className="text-xs text-muted-foreground">Es werden die ersten 100 Kautionen angezeigt.</p>
            ) : null}
          </Abschnitt>
        </div>
      </ScrollArea>

      {/* Bestätigung und Knöpfe bleiben beim Scrollen der Liste sichtbar */}
      <SheetFooter className="px-4 pb-8 pt-4 sm:p-8 sm:pb-14 sm:pt-5 border-t border-border/40">
        <div className="max-w-[90%] mx-auto w-full space-y-4">
          <KautionFeld
            id={`${basisId}-bestaetigung`}
            label={`Zur Bestätigung geben Sie die Anzahl der betroffenen Mieter ein (${erwartet})`}
            pflicht
            fehler={fehler}
          >
            {(props) => <Input {...props} inputMode="numeric" autoComplete="off" value={eingabe} onChange={(event) => setEingabe(event.target.value)} />}
          </KautionFeld>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onEntscheidung(false)}
              className="flex-1 rounded-xl h-11 text-muted-foreground hover:text-foreground hover:scale-[1.005] active:scale-[0.995] hover:shadow-none"
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={!bestaetigt}
              className="flex-1 rounded-xl h-11 shadow-sm font-semibold hover:scale-[1.005] active:scale-[0.995] hover:shadow-sm"
            >
              Löschen
            </Button>
          </div>
        </div>
      </SheetFooter>
    </form>
  );
}
