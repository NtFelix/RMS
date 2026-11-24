"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ExternalLink, FileText, Loader2, Unlink } from "lucide-react";
import {
  getVertragsdokumentAction,
  listeVertragsdokumentKandidatenAction,
  vertragsdokumentOeffnenAction,
  vertragsdokumentSetzenAction,
  type VertragsdokumentInfo,
  type VertragsdokumentKandidaten,
} from "@/app/mietverhaeltnis-dokument-actions";
import { Button } from "@/components/ui/button";
import { CustomCombobox, type ComboboxOption } from "@/components/ui/custom-combobox";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { PropertyHeader } from "@/components/tenants/property-header";
import { KARTE, UEBERSCHRIFT, WERT, ZEILE } from "@/components/tenants/mietverhaeltnis/stile";
import type { MietverhaeltnisActionResult } from "@/types/Mietverhaeltnis";

interface VertragsdokumentSectionProps {
  mieterId: string;
  /** `vertrag_dokument_id` of the tenancy; a change reloads the section (the parent reloads after every change here). */
  vertragDokumentId: string | null;
  /** Called after the link was set or removed, so the parent reloads the tenancy. */
  onGeaendert: () => void;
}

const SYSTEMFEHLER = "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.";
/** Delay before a typed search term is sent. */
const SUCHE_VERZOEGERUNG_MS = 300;

/**
 * Contract document of the tenancy (GH-17, phase 4). No upload here: a file that lies in the document storage of
 * the house is linked, opened or unlinked. Files are uploaded in the document area ("Dateien").
 */
export function VertragsdokumentSection({ mieterId, vertragDokumentId, onGeaendert }: VertragsdokumentSectionProps) {
  const id = useId();
  const [dokument, setDokument] = useState<VertragsdokumentInfo | null>(null);
  const [ladeStatus, setLadeStatus] = useState<"laedt" | "bereit" | "fehler">("laedt");
  const [auswahlOffen, setAuswahlOffen] = useState(false);
  const [kandidaten, setKandidaten] = useState<VertragsdokumentKandidaten | null>(null);
  const [suche, setSuche] = useState("");
  const [auswahl, setAuswahl] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  /** Guards against a second click while an action runs (state updates come too late for a fast double click). */
  const laeuftRef = useRef(false);

  // One load per change of the link: after a change here the parent reloads and passes the new ID
  useEffect(() => {
    let abgebrochen = false;
    setLadeStatus((status) => (status === "bereit" ? status : "laedt"));
    getVertragsdokumentAction(mieterId)
      .then((result) => {
        if (abgebrochen) return;
        if (result.success) {
          setDokument(result.data);
          setLadeStatus("bereit");
        } else {
          setLadeStatus("fehler");
        }
      })
      .catch(() => {
        if (!abgebrochen) setLadeStatus("fehler");
      });
    return () => {
      abgebrochen = true;
    };
  }, [mieterId, vertragDokumentId]);

  const melde = (message: string) => toast({ title: "Fehler", description: message, variant: "destructive" });

  /** Runs one action once at a time; a failure is shown as a toast. Returns the result, `null` if it did not run or threw. */
  const ausfuehren = useCallback(async <T,>(aktion: () => Promise<MietverhaeltnisActionResult<T>>): Promise<MietverhaeltnisActionResult<T> | null> => {
    if (laeuftRef.current) return null;
    laeuftRef.current = true;
    setIsBusy(true);
    try {
      const result = await aktion();
      if (!result.success) toast({ title: "Fehler", description: result.error.message, variant: "destructive" });
      return result;
    } catch {
      toast({ title: "Systemfehler", description: SYSTEMFEHLER, variant: "destructive" });
      return null;
    } finally {
      laeuftRef.current = false;
      setIsBusy(false);
    }
  }, []);

  const ladeKandidaten = useCallback(
    async (begriff: string) => {
      const result = await ausfuehren(() => listeVertragsdokumentKandidatenAction(mieterId, begriff));
      if (result?.success) setKandidaten(result.data);
      return result?.success === true;
    },
    [ausfuehren, mieterId]
  );

  // Search: a typed term is sent after a short pause (the list is filtered on the server, the house can hold many files)
  useEffect(() => {
    if (!auswahlOffen || kandidaten === null) return;
    const timer = setTimeout(() => void ladeKandidaten(suche), SUCHE_VERZOEGERUNG_MS);
    return () => clearTimeout(timer);
    // `kandidaten` only gates the first load (handleAuswahlOeffnen); it must not retrigger the search
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suche]);

  const handleAuswahlOeffnen = async () => {
    setAuswahlOffen(true);
    if (kandidaten !== null) return;
    if (!(await ladeKandidaten(""))) setAuswahlOffen(false);
  };

  const schliesseAuswahl = () => {
    setAuswahlOffen(false);
    setAuswahl("");
    setSuche("");
    setKandidaten(null);
  };

  const handleVerknuepfen = async () => {
    if (auswahl === "") return;
    const result = await ausfuehren(() => vertragsdokumentSetzenAction({ mieterId, dokumentId: auswahl }));
    if (result?.success) {
      toast({ title: "Erfolg", description: "Das Vertragsdokument wurde verknüpft.", variant: "success" });
      schliesseAuswahl();
      onGeaendert();
    }
  };

  const handleLoesen = async () => {
    const result = await ausfuehren(() => vertragsdokumentSetzenAction({ mieterId, dokumentId: null }));
    if (result?.success) {
      toast({ title: "Erfolg", description: "Die Verknüpfung wurde gelöst. Die Datei bleibt in der Ablage.", variant: "success" });
      onGeaendert();
    }
  };

  const handleOeffnen = async () => {
    // The window opens synchronously in the click (browsers block a window that opens after an await), then gets the URL
    const fenster = window.open("about:blank", "_blank");
    if (!fenster) {
      melde("Das Dokument konnte nicht geöffnet werden. Bitte erlauben Sie Pop-ups für diese Seite.");
      return;
    }
    fenster.opener = null;
    const result = await ausfuehren(() => vertragsdokumentOeffnenAction(mieterId));
    if (result?.success) fenster.location.href = result.data.url;
    else fenster.close();
  };

  const optionen: ComboboxOption[] = (kandidaten?.dokumente ?? []).map((eintrag) => ({
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
                <Input
                  type="search"
                  aria-label="Dokument suchen"
                  placeholder="Name des Dokuments"
                  value={suche}
                  maxLength={100}
                  onChange={(event) => setSuche(event.target.value)}
                />
                {optionen.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {suche.trim() === ""
                      ? "In der Ablage dieses Hauses liegt noch kein Dokument. Laden Sie die Datei zuerst im Bereich Dateien hoch."
                      : "Kein Dokument mit diesem Namen gefunden."}
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
                {kandidaten.abgeschnitten && (
                  <p className="text-xs text-muted-foreground">
                    Es werden nur die ersten 200 Dokumente angezeigt. Geben Sie einen Teil des Namens ein, um gezielt zu suchen.
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" disabled={isBusy} onClick={schliesseAuswahl}>
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
