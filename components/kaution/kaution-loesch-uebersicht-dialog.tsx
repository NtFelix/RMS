"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { formatBetrag } from "@/components/kaution/kaution-format";
import { KautionFeld } from "@/components/kaution/kaution-feld";
import { useModalStore, type LoeschUebersichtConfig } from "@/hooks/use-modal-store";
import { KAUTION_ART_LABELS } from "@/lib/kautionen-constants";
import type { KautionLoeschauswirkung } from "@/types/Kaution";

/**
 * Global overview "Kautionen werden mitgelöscht": appears when houses, apartments or tenants with deposits WITH bookings are
 * deleted (see `lib/kautionen-loeschen.ts`). Shows what the database reports (no calculation in the browser) and asks
 * for a deliberate confirmation: the number of the affected tenants has to be typed. The database enforces the
 * confirmation again (checksum of exactly this overview, `soft_delete_mit_kautionen`).
 */
export function KautionLoeschUebersichtDialog() {
  const config = useModalStore((state) => state.loeschUebersichtConfig);
  const isOpen = useModalStore((state) => state.isLoeschUebersichtOpen);
  const closeLoeschUebersicht = useModalStore((state) => state.closeLoeschUebersicht);

  const entscheide = (bestaetigt: boolean) => {
    config?.onEntscheidung(bestaetigt);
    closeLoeschUebersicht();
  };

  // Der Dialog gehört zum Layout und bleibt beim Seitenwechsel bestehen, die anfragende Seite nicht: Wechselt die Seite, während die
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
    <AlertDialog open={isOpen && config !== null} onOpenChange={(open) => !open && entscheide(false)}>
      <AlertDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        {config ? <UebersichtInhalt key={config.auswirkung.pruefsumme ?? "ohne"} config={config} onEntscheidung={entscheide} /> : null}
      </AlertDialogContent>
    </AlertDialog>
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
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Kautionen werden mitgelöscht</AlertDialogTitle>
        <AlertDialogDescription>
          Sie löschen {betroffenText(auswirkung)}. Dabei kommen {zaehler(kautionen.mit_buchungen, "Kaution", "Kautionen")} mit Buchungen in den
          Papierkorb. Die Buchungen bleiben unverändert erhalten und lassen sich dort mit dem Mieter wiederherstellen. Eine Kaution mit
          Buchungen kann nicht endgültig gelöscht werden.
        </AlertDialogDescription>
      </AlertDialogHeader>

      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 rounded-xl bg-muted px-3 py-3 text-sm" data-testid="kaution-loesch-summen">
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

      <div>
        <p className="mb-1 text-sm font-medium" id={`${basisId}-liste`}>
          Kautionen mit Buchungen
        </p>
        {/* Scrollable region: reachable and operable with the keyboard, labelled. */}
        <div
          role="region"
          aria-labelledby={`${basisId}-liste`}
          tabIndex={0}
          className="max-h-48 overflow-y-auto rounded-xl border text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ul className="divide-y">
            {kautionen.mit_buchungen_liste.map((eintrag) => (
              <li key={eintrag.mieter_id} className="flex items-baseline justify-between gap-3 px-3 py-2">
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
          <p className="mt-1 text-xs text-muted-foreground">Es werden die ersten 100 Kautionen angezeigt.</p>
        ) : null}
      </div>

      <KautionFeld id={`${basisId}-bestaetigung`} label={`Zur Bestätigung geben Sie die Anzahl der betroffenen Mieter ein (${erwartet})`} pflicht fehler={fehler}>
        {(props) => <Input {...props} inputMode="numeric" autoComplete="off" value={eingabe} onChange={(event) => setEingabe(event.target.value)} />}
      </KautionFeld>

      <AlertDialogFooter>
        <AlertDialogCancel onClick={() => onEntscheidung(false)}>Abbrechen</AlertDialogCancel>
        <AlertDialogAction
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          disabled={!bestaetigt}
          onClick={(event) => {
            event.preventDefault();
            if (bestaetigt) onEntscheidung(true);
          }}
        >
          Löschen
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
}
