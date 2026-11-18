"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { ExternalLink, FileText, Loader2, Unlink } from "lucide-react";
import {
  getVertragsdokumentAction,
  listeVertragsdokumentKandidatenAction,
  vertragsdokumentOeffnenAction,
  vertragsdokumentSetzenAction,
  type VertragsdokumentInfo,
} from "@/app/mietverhaeltnis-dokument-actions";
import { Button } from "@/components/ui/button";
import { CustomCombobox, type ComboboxOption } from "@/components/ui/custom-combobox";
import { toast } from "@/hooks/use-toast";
import { PropertyHeader } from "@/components/tenants/property-header";
import { KARTE, UEBERSCHRIFT, WERT, ZEILE } from "@/components/tenants/mietverhaeltnis/stile";

interface VertragsdokumentSectionProps {
  mieterId: string;
  /** `vertrag_dokument_id` of the tenancy; a change reloads the section. */
  vertragDokumentId: string | null;
  /** Called after the link was set or removed, so the parent reloads the tenancy. */
  onGeaendert: () => void;
}

const SYSTEMFEHLER = "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.";

/**
 * Contract document of the tenancy (GH-17, phase 4). No upload here: a file that lies in the document storage of
 * the house is linked, opened or unlinked. Files are uploaded in the document area ("Dateien").
 */
export function VertragsdokumentSection({ mieterId, vertragDokumentId, onGeaendert }: VertragsdokumentSectionProps) {
  const id = useId();
  const [dokument, setDokument] = useState<VertragsdokumentInfo | null>(null);
  const [ladeStatus, setLadeStatus] = useState<"laedt" | "bereit" | "fehler">("laedt");
  const [auswahlOffen, setAuswahlOffen] = useState(false);
  const [kandidaten, setKandidaten] = useState<VertragsdokumentInfo[] | null>(null);
  const [auswahl, setAuswahl] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const laden = useCallback(async () => {
    try {
      const result = await getVertragsdokumentAction(mieterId);
      if (result.success) {
        setDokument(result.data);
        setLadeStatus("bereit");
      } else {
        setLadeStatus("fehler");
      }
    } catch {
      setLadeStatus("fehler");
    }
  }, [mieterId]);

  useEffect(() => {
    void laden();
  }, [laden, vertragDokumentId]);

  const melde = (message: string) => toast({ title: "Fehler", description: message, variant: "destructive" });

  /** Runs one action; shows its error as a toast and reports whether it worked. */
  const ausfuehren = async <T,>(aktion: () => Promise<{ success: true; data: T } | { success: false; error: { message: string } }>): Promise<T | undefined> => {
    if (isBusy) return undefined;
    setIsBusy(true);
    try {
      const result = await aktion();
      if (result.success) return result.data;
      melde(result.error.message);
    } catch {
      toast({ title: "Systemfehler", description: SYSTEMFEHLER, variant: "destructive" });
    } finally {
      setIsBusy(false);
    }
    return undefined;
  };

  const handleAuswahlOeffnen = async () => {
    setAuswahlOffen(true);
    if (kandidaten !== null) return;
    const liste = await ausfuehren(() => listeVertragsdokumentKandidatenAction(mieterId));
    if (liste) setKandidaten(liste);
    else setAuswahlOffen(false);
  };

  const handleVerknuepfen = async () => {
    if (auswahl === "") return;
    const ergebnis = await ausfuehren(async () => {
      const result = await vertragsdokumentSetzenAction({ mieterId, dokumentId: auswahl });
      return result.success ? { success: true as const, data: true } : result;
    });
    if (ergebnis) {
      toast({ title: "Erfolg", description: "Das Vertragsdokument wurde verknüpft.", variant: "success" });
      setAuswahlOffen(false);
      setAuswahl("");
      await laden();
      onGeaendert();
    }
  };

  const handleLoesen = async () => {
    const ergebnis = await ausfuehren(async () => {
      const result = await vertragsdokumentSetzenAction({ mieterId, dokumentId: null });
      return result.success ? { success: true as const, data: true } : result;
    });
    if (ergebnis) {
      toast({ title: "Erfolg", description: "Die Verknüpfung wurde gelöst. Die Datei bleibt in der Ablage.", variant: "success" });
      await laden();
      onGeaendert();
    }
  };

  const handleOeffnen = async () => {
    const ergebnis = await ausfuehren(() => vertragsdokumentOeffnenAction(mieterId));
    if (ergebnis) window.open(ergebnis.url, "_blank", "noopener,noreferrer");
  };

  const optionen: ComboboxOption[] = (kandidaten ?? []).map((eintrag) => ({
    value: eintrag.id,
    label: eintrag.ordner ? `${eintrag.name} (${eintrag.ordner})` : eintrag.name,
  }));
  // A link whose document is not visible (or moved away) is shown as such, never silently dropped
  const verknuepftNichtVerfuegbar = ladeStatus === "bereit" && vertragDokumentId !== null && dokument === null;

  return (
    <div className="space-y-3" data-testid="vertragsdokument-section">
      <h4 className={UEBERSCHRIFT}>Vertragsdokument</h4>
      <div className={`${KARTE} p-3 sm:p-4 space-y-3`}>
        {ladeStatus === "laedt" && (
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Vertragsdokument wird geladen …
          </p>
        )}
        {ladeStatus === "fehler" && <p role="alert" className="text-sm text-muted-foreground">Das Vertragsdokument konnte nicht geladen werden.</p>}

        {ladeStatus === "bereit" && (
          <>
            <div className={ZEILE}>
              <PropertyHeader icon={FileText} label="Dokument" htmlFor={`${id}-dokument`} infoText="Eine Datei aus der Dokumentenablage des Hauses. Hochgeladen wird im Bereich Dateien." />
              <p id={`${id}-dokument`} className={WERT}>
                {dokument ? (
                  <>
                    <span className="font-medium">{dokument.name}</span>
                    {dokument.ordner ? <span className="text-muted-foreground"> ({dokument.ordner})</span> : null}
                  </>
                ) : verknuepftNichtVerfuegbar ? (
                  <span className="text-muted-foreground">Verknüpft, aber nicht verfügbar (fehlende Berechtigung oder verschoben)</span>
                ) : (
                  <span className="text-muted-foreground">Kein Vertragsdokument verknüpft</span>
                )}
              </p>
            </div>

            {!auswahlOffen && (
              <div className="flex flex-wrap justify-end gap-2">
                {dokument && (
                  <Button type="button" variant="ghost" size="sm" disabled={isBusy} onClick={() => void handleOeffnen()}>
                    <ExternalLink className="mr-2 size-4" aria-hidden="true" />
                    Öffnen
                  </Button>
                )}
                {(dokument || verknuepftNichtVerfuegbar) && (
                  <Button type="button" variant="ghost" size="sm" disabled={isBusy} onClick={() => void handleLoesen()}>
                    <Unlink className="mr-2 size-4" aria-hidden="true" />
                    Verknüpfung lösen
                  </Button>
                )}
                <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={() => void handleAuswahlOeffnen()}>
                  {dokument ? "Anderes Dokument wählen" : "Dokument auswählen"}
                </Button>
              </div>
            )}

            {auswahlOffen && kandidaten !== null && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
                {optionen.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    In der Ablage dieses Hauses liegt noch kein Dokument. Laden Sie die Datei zuerst im Bereich Dateien hoch.
                  </p>
                ) : (
                  <CustomCombobox
                    width="w-full"
                    options={optionen}
                    value={auswahl}
                    onChange={(value) => setAuswahl(value ?? "")}
                    placeholder="Dokument auswählen"
                    searchPlaceholder="Dokument suchen..."
                    emptyText="Kein Dokument gefunden."
                    disabled={isBusy}
                    id={`${id}-auswahl`}
                    triggerClassName="hover:scale-100 active:scale-[0.995] shadow-none hover:shadow-none hover:bg-hover-bg hover:text-foreground"
                  />
                )}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" disabled={isBusy} onClick={() => { setAuswahlOffen(false); setAuswahl(""); }}>
                    Abbrechen
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled={isBusy || auswahl === ""} onClick={() => void handleVerknuepfen()}>
                    {isBusy && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
                    Verknüpfen
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
