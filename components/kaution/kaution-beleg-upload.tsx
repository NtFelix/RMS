"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Paperclip } from "lucide-react";
import type { KautionActionError } from "@/app/kautionen-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { KautionFeld, KautionFormularFehler } from "@/components/kaution/kaution-feld";
import { FILE_INPUT_ACCEPT, MAX_FILE_SIZE_LABEL } from "@/lib/finance-file-constants";
import { parseBelegFehler, pruefeBelegDatei } from "@/lib/kautionen-belege";
import { KAUTION_FEHLER_FALLBACK_MESSAGE } from "@/lib/kautionen-errors";

/** Booking that a receipt can be attached to. `label` describes the booking only (type, date, amount), no names. */
export interface KautionBelegAuswahl {
  bewegungId: string;
  label: string;
}

interface KautionBelegUploadProps {
  auswahl: KautionBelegAuswahl[];
  /** Preselected booking (optional). */
  vorgabeBewegungId?: string;
  /** Called after a successful upload (the dialog reloads its data). */
  onHochgeladen: () => void | Promise<void>;
  /** Errors of the upload: `true` if the deposit dialog handled it (toast, reload, close, sign-in). */
  onFehler: (fehler: KautionActionError) => boolean;
  onAbbrechen?: () => void;
}

/**
 * Form "Beleg hinzufügen": booking and file, sent as `multipart/form-data` to `/api/kautionen/belege`.
 *
 * - The file is checked in the browser first (empty, size, type): the same rules as on the server (`lib/kautionen-belege.ts`).
 * - Double-submit guard (a ref, the state update comes too late for a second click), the button is disabled while sending.
 * - Status for assistive technology: `role="status"` with the text "Der Beleg wird hochgeladen." while sending.
 * - No logging here: neither the file name nor the booking leaves the form except as the request itself.
 */
export function KautionBelegUpload({ auswahl, vorgabeBewegungId, onHochgeladen, onFehler, onAbbrechen }: KautionBelegUploadProps) {
  const basisId = useId();
  const [bewegungId, setBewegungId] = useState<string>(vorgabeBewegungId ?? "");
  const [datei, setDatei] = useState<File | null>(null);
  // Changing the key replaces the file input, so the chosen file disappears after a successful upload.
  const [dateiSchluessel, setDateiSchluessel] = useState(0);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const sendenRef = useRef(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sendenRef.current || !bewegungId || !datei) return;

    const pruefung = pruefeBelegDatei({ size: datei.size, type: datei.type });
    if (!pruefung.ok) {
      setFehler(pruefung.message);
      return;
    }

    sendenRef.current = true;
    setLaeuft(true);
    setFehler(null);
    try {
      const formData = new FormData();
      formData.append("bewegungId", bewegungId);
      formData.append("file", datei, datei.name);

      const antwort = await fetch("/api/kautionen/belege", { method: "POST", body: formData });
      const body: unknown = await antwort.json().catch(() => null);
      const erfolgreich = antwort.ok && typeof body === "object" && body !== null && (body as { success?: unknown }).success === true;

      if (erfolgreich) {
        toast({ title: "Beleg hochgeladen.", variant: "success" });
        setBewegungId(vorgabeBewegungId ?? "");
        setDatei(null);
        setDateiSchluessel((schluessel) => schluessel + 1);
        await onHochgeladen();
      } else {
        const { message, code } = parseBelegFehler(body);
        // The dialog handles codes that change the situation; the rest (validation) stays at the form.
        if (!onFehler({ message, code })) setFehler(message);
      }
    } catch {
      setFehler(KAUTION_FEHLER_FALLBACK_MESSAGE);
    } finally {
      sendenRef.current = false;
      setLaeuft(false);
    }
  };

  if (auswahl.length === 0) {
    return <p className="text-sm text-muted-foreground">Es gibt noch keine Buchung, der ein Beleg zugeordnet werden kann.</p>;
  }

  return (
    <form onSubmit={handleSubmit} aria-labelledby={`${basisId}-titel`} className="space-y-3 rounded-xl border p-4">
      <h4 id={`${basisId}-titel`} className="text-sm font-semibold">
        Beleg hinzufügen
      </h4>

      <div className="grid gap-3 sm:grid-cols-2">
        <KautionFeld id={`${basisId}-buchung`} label="Buchung (Pflicht)">
          {(props) => (
            <Select value={bewegungId} onValueChange={setBewegungId} disabled={laeuft}>
              <SelectTrigger {...props}>
                <SelectValue placeholder="Buchung auswählen" />
              </SelectTrigger>
              <SelectContent>
                {auswahl.map((eintrag) => (
                  <SelectItem key={eintrag.bewegungId} value={eintrag.bewegungId}>
                    {eintrag.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </KautionFeld>

        <KautionFeld
          id={`${basisId}-datei`}
          label="Datei (Pflicht)"
          hinweis={`PDF, Bild, Word-, Excel-, Text- oder CSV-Datei, höchstens ${MAX_FILE_SIZE_LABEL}.`}
        >
          {(props) => (
            <Input
              key={dateiSchluessel}
              {...props}
              type="file"
              accept={FILE_INPUT_ACCEPT}
              disabled={laeuft}
              className="file:mr-3 file:font-medium"
              onChange={(event) => setDatei(event.target.files?.[0] ?? null)}
            />
          )}
        </KautionFeld>
      </div>

      <KautionFormularFehler message={fehler} />

      <div className="flex flex-wrap items-center justify-end gap-2">
        {onAbbrechen ? (
          <Button type="button" variant="outline" onClick={onAbbrechen} disabled={laeuft}>
            Abbrechen
          </Button>
        ) : null}
        <Button type="submit" disabled={laeuft || !bewegungId || !datei}>
          <Paperclip aria-hidden="true" />
          Beleg hochladen
        </Button>
      </div>

      <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
        {laeuft ? "Der Beleg wird hochgeladen." : ""}
      </p>
    </form>
  );
}
