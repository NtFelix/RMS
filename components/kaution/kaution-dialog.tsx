"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { getKautionDetailsAction, type KautionActionError } from "@/app/kautionen-actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useModalStore } from "@/hooks/use-modal-store";
import { KautionAnlegenForm } from "@/components/kaution/kaution-anlegen-form";
import { formatBetrag } from "@/components/kaution/kaution-format";
import { KautionFristBadge } from "@/components/kaution/kaution-frist-badge";
import { KautionKontoauszugTab } from "@/components/kaution/kaution-kontoauszug-tab";
import { KautionStatusBadge } from "@/components/kaution/kaution-status-badge";
import { KautionUebersichtTab } from "@/components/kaution/kaution-uebersicht-tab";
import {
  KAUTION_FEHLER_FALLBACK_MESSAGE,
  getKautionFehlerVerhalten,
  type KautionFehlerVerhalten,
} from "@/lib/kautionen-errors";
import type { KautionDetails, KautionRechte, KautionVorschlag } from "@/types/Kaution";

/**
 * Deposit dialog ("Kautionsmanagement", GH-6), mounted once in `app/(dashboard)/layout-inner.tsx`.
 *
 * - Data: loaded on opening and after EVERY change from `getKautionDetailsAction` (one consistent snapshot of
 *   statement, balance, state and the module rights of the user). The browser calculates nothing: balance,
 *   state and deadlines come from the database. The server stays authoritative for every right, the rights
 *   here only enable/disable buttons (disabled instead of hidden, tooltip "Keine Berechtigung").
 * - States: loading (skeleton), error (alert + "Erneut laden"), no deposit (creation form with suggestion),
 *   deposit present (header + tabs "Übersicht" / "Kontoauszug"). Phase 2 adds "Raten" and "Dokumente".
 * - Unsaved input: only the forms report it (`setKautionModalDirty`); closing then uses the confirmation
 *   dialog of the store. Both tabs stay mounted, so switching tabs never discards an open form.
 * - Errors of the actions: stable codes (`lib/kautionen-errors.ts`) decide where the message appears: at the
 *   form (validation, strict balance `KA005`), as a toast (+ reload / close) otherwise.
 * - No personal data in the dialog title or description; the tenant name is only shown as a subtitle.
 *
 * Security relevant (money booking, rights): not production ready until the maintainer has reviewed it.
 */

type KautionTab = "uebersicht" | "kontoauszug";

/** Start tab from the store; tabs of later phases ("raten", "dokumente") fall back to the overview. */
function startTab(wunsch: string | undefined): KautionTab {
  return wunsch === "kontoauszug" ? "kontoauszug" : "uebersicht";
}

type Ansicht =
  | { phase: "laden" }
  | { phase: "fehler"; fehler: KautionActionError }
  | { phase: "bereit"; details: KautionDetails | null; rechte: KautionRechte; vorschlag: KautionVorschlag | null };

const FEHLER_TITEL: Record<KautionFehlerVerhalten, string> = {
  anmelden: "Anmeldung erforderlich",
  berechtigung: "Keine Berechtigung",
  dialog_schliessen: "Kein Zugriff",
  neu_laden: "Daten werden aktualisiert",
  formular: "Eingabe prüfen",
  toast: "Aktion nicht möglich",
  wiederholen: "Bitte erneut versuchen",
};

/**
 * Unsaved input: several forms can be open at the same time (agreement in the overview, booking in the statement), the
 * store flag is "any form dirty". It is only written when the combined value changes.
 */
function useDirtyQuellen(setKautionModalDirty: (dirty: boolean) => void) {
  const dirtyQuellen = useRef(new Set<string>());
  const zuletztGemeldet = useRef(false);
  const meldeDirty = useCallback(
    (quelle: string, dirty: boolean) => {
      if (dirty) dirtyQuellen.current.add(quelle);
      else dirtyQuellen.current.delete(quelle);
      const gesamt = dirtyQuellen.current.size > 0;
      if (gesamt !== zuletztGemeldet.current) {
        zuletztGemeldet.current = gesamt;
        setKautionModalDirty(gesamt);
      }
    },
    [setKautionModalDirty]
  );
  const zuruecksetzen = useCallback(() => {
    dirtyQuellen.current.clear();
    zuletztGemeldet.current = false;
  }, []);
  const meldeAnlegenDirty = useCallback((dirty: boolean) => meldeDirty("anlegen", dirty), [meldeDirty]);
  const meldeVereinbarungDirty = useCallback((dirty: boolean) => meldeDirty("vereinbarung", dirty), [meldeDirty]);
  const meldeBuchungDirty = useCallback((dirty: boolean) => meldeDirty("buchung", dirty), [meldeDirty]);
  return { zuruecksetzen, meldeAnlegenDirty, meldeVereinbarungDirty, meldeBuchungDirty };
}

export function KautionDialog() {
  const {
    isKautionModalOpen,
    kautionInitialData,
    isKautionModalDirty,
    closeKautionModal,
    setKautionModalDirty,
    openConfirmationModal,
    closeConfirmationModal,
  } = useModalStore();

  const tenantId = kautionInitialData?.tenant.id;
  const initialTab = kautionInitialData?.initialTab;

  const [ansicht, setAnsicht] = useState<Ansicht>({ phase: "laden" });
  const [aktualisiert, setAktualisiert] = useState(false);
  const [tab, setTab] = useState<KautionTab>("uebersicht");
  // Counter of the load requests: only the latest answer counts (reload after a change, dialog reopened).
  const ladeZaehler = useRef(0);

  // --- Unsaved input -----------------------------------------------------------------------------------------
  const { zuruecksetzen, meldeAnlegenDirty, meldeVereinbarungDirty, meldeBuchungDirty } = useDirtyQuellen(setKautionModalDirty);

  // --- Loading -----------------------------------------------------------------------------------------------
  const lade = useCallback(
    async (id: string, optionen?: { still?: boolean }) => {
      const aufruf = ++ladeZaehler.current;
      // "still": reload after a change, the current content stays visible (no skeleton flash).
      if (optionen?.still) setAktualisiert(true);
      else setAnsicht({ phase: "laden" });

      let neueAnsicht: Ansicht;
      try {
        const result = await getKautionDetailsAction(id);
        neueAnsicht =
          result.success && result.data
            ? { phase: "bereit", details: result.data.details, rechte: result.data.rechte, vorschlag: result.data.vorschlag }
            : { phase: "fehler", fehler: result.error ?? { message: KAUTION_FEHLER_FALLBACK_MESSAGE } };
      } catch {
        neueAnsicht = { phase: "fehler", fehler: { message: KAUTION_FEHLER_FALLBACK_MESSAGE } };
      }
      if (aufruf !== ladeZaehler.current) return; // a newer request or a closed dialog

      setAktualisiert(false);
      setAnsicht(neueAnsicht);
      if (neueAnsicht.phase === "fehler" && getKautionFehlerVerhalten(neueAnsicht.fehler.code) === "dialog_schliessen") {
        // No access to this object (anymore): there is nothing to show, tell the user and close.
        toast({ title: FEHLER_TITEL.dialog_schliessen, description: neueAnsicht.fehler.message, variant: "destructive" });
        closeKautionModal({ force: true });
      }
    },
    [closeKautionModal]
  );

  const reload = useCallback(async () => {
    if (tenantId) await lade(tenantId, { still: true });
  }, [tenantId, lade]);

  // Init effect (like the legacy dialog, also correct with `<Activity>`): load when opened, reset when closed.
  useEffect(() => {
    ladeZaehler.current += 1; // invalidates answers of earlier openings
    zuruecksetzen();
    setAktualisiert(false);

    if (!isKautionModalOpen || !tenantId) {
      setAnsicht((vorher) => (vorher.phase === "laden" ? vorher : { phase: "laden" }));
      return;
    }
    setTab(startTab(initialTab));
    void lade(tenantId);
    return () => {
      ladeZaehler.current += 1;
    };
  }, [isKautionModalOpen, kautionInitialData, tenantId, initialTab, lade, zuruecksetzen]);

  // --- Errors of actions -------------------------------------------------------------------------------------
  /**
   * Central handling of an error of an action (called by the forms).
   * Returns `true` if handled here (toast, reload, close); `false` means: show the message at the form.
   */
  const handleFehler = useCallback(
    (fehler: KautionActionError): boolean => {
      const verhalten = getKautionFehlerVerhalten(fehler.code);
      if (verhalten === "formular" || verhalten === "wiederholen") return false;

      toast({ title: FEHLER_TITEL[verhalten], description: fehler.message, variant: "destructive" });
      if (verhalten === "dialog_schliessen") closeKautionModal({ force: true });
      // The data changed or the rights changed: show the current state ("berechtigung": buttons get disabled).
      else if (verhalten === "neu_laden" || verhalten === "berechtigung") void reload();
      return true;
    },
    [closeKautionModal, reload]
  );

  /**
   * Asks before unsaved input of the booking form is discarded (switching the booking type), with the same
   * confirmation dialog of the store that is used when the dialog is closed with unsaved input.
   */
  const frageVerwerfen = useCallback(
    (onBestaetigt: () => void) => {
      openConfirmationModal({
        title: "Eingaben verwerfen?",
        description: "Wenn Sie die Buchungsart wechseln, gehen Ihre bisherigen Eingaben verloren. Möchten Sie sie wirklich verwerfen?",
        confirmText: "Verwerfen",
        cancelText: "Abbrechen",
        onConfirm: () => {
          onBestaetigt();
          closeConfirmationModal();
        },
        onCancel: () => closeConfirmationModal(),
      });
    },
    [openConfirmationModal, closeConfirmationModal]
  );

  const handleOpenChange = (open: boolean) => {
    if (!open) closeKautionModal();
  };
  // The store asks for confirmation if a form holds unsaved input.
  const handleAttemptClose = () => closeKautionModal();

  return (
    <Dialog open={isKautionModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent size="lg" isDirty={isKautionModalDirty} onAttemptClose={handleAttemptClose}>
        {isKautionModalOpen && kautionInitialData && tenantId ? (
          <KautionInhalt
            tenantId={tenantId}
            mieterName={kautionInitialData.tenant.name}
            ansicht={ansicht}
            aktualisiert={aktualisiert}
            tab={tab}
            onTabChange={setTab}
            onLaden={() => void lade(tenantId)}
            onGeaendert={reload}
            onFehler={handleFehler}
            onAbbrechen={handleAttemptClose}
            onVerwerfenBestaetigen={frageVerwerfen}
            onAnlegenDirtyChange={meldeAnlegenDirty}
            onVereinbarungDirtyChange={meldeVereinbarungDirty}
            onBuchungDirtyChange={meldeBuchungDirty}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

interface KautionInhaltProps {
  tenantId: string;
  mieterName: string | null | undefined;
  ansicht: Ansicht;
  aktualisiert: boolean;
  tab: KautionTab;
  onTabChange: (tab: KautionTab) => void;
  onLaden: () => void;
  onGeaendert: () => Promise<void>;
  onFehler: (fehler: KautionActionError) => boolean;
  onAbbrechen: () => void;
  onVerwerfenBestaetigen: (onBestaetigt: () => void) => void;
  onAnlegenDirtyChange: (dirty: boolean) => void;
  onVereinbarungDirtyChange: (dirty: boolean) => void;
  onBuchungDirtyChange: (dirty: boolean) => void;
}

/** Header and the content of the current phase (loading, error, creation form, deposit with tabs). */
function KautionInhalt({
  tenantId,
  mieterName,
  ansicht,
  aktualisiert,
  tab,
  onTabChange,
  onLaden,
  onGeaendert,
  onFehler,
  onAbbrechen,
  onVerwerfenBestaetigen,
  onAnlegenDirtyChange,
  onVereinbarungDirtyChange,
  onBuchungDirtyChange,
}: KautionInhaltProps) {
  const details = ansicht.phase === "bereit" ? ansicht.details : null;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Kaution</DialogTitle>
        <DialogDescription className="sr-only">
          Kontostand, Buchungen und Vereinbarung der Kaution dieses Mietverhältnisses.
        </DialogDescription>
        {mieterName ? <p className="text-sm text-muted-foreground">{mieterName}</p> : null}
      </DialogHeader>

      {ansicht.phase === "laden" ? <Ladezustand /> : null}

      {ansicht.phase === "fehler" ? <LadeFehler fehler={ansicht.fehler} onLaden={onLaden} /> : null}

      {ansicht.phase === "bereit" && details === null ? (
        <KautionAnlegenForm
          tenantId={tenantId}
          vorschlag={ansicht.vorschlag}
          darfErstellen={ansicht.rechte.erstellen}
          onErstellt={onGeaendert}
          onFehler={onFehler}
          onAbbrechen={onAbbrechen}
          onDirtyChange={onAnlegenDirtyChange}
        />
      ) : null}

      {ansicht.phase === "bereit" && details !== null ? (
        <KautionMitDetails
          tenantId={tenantId}
          details={details}
          rechte={ansicht.rechte}
          aktualisiert={aktualisiert}
          tab={tab}
          onTabChange={onTabChange}
          onGeaendert={onGeaendert}
          onFehler={onFehler}
          onVerwerfenBestaetigen={onVerwerfenBestaetigen}
          onVereinbarungDirtyChange={onVereinbarungDirtyChange}
          onBuchungDirtyChange={onBuchungDirtyChange}
        />
      ) : null}
    </>
  );
}

function LadeFehler({ fehler, onLaden }: { fehler: KautionActionError; onLaden: () => void }) {
  return (
    <div className="space-y-3">
      <Alert variant="destructive">
        <TriangleAlert aria-hidden="true" className="h-4 w-4" />
        <AlertTitle>Die Kaution konnte nicht geladen werden</AlertTitle>
        <AlertDescription>{fehler.message}</AlertDescription>
      </Alert>
      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={onLaden}>
          Erneut laden
        </Button>
      </div>
    </div>
  );
}

interface KautionMitDetailsProps {
  tenantId: string;
  details: KautionDetails;
  rechte: KautionRechte;
  aktualisiert: boolean;
  tab: KautionTab;
  onTabChange: (tab: KautionTab) => void;
  onGeaendert: () => Promise<void>;
  onFehler: (fehler: KautionActionError) => boolean;
  onVerwerfenBestaetigen: (onBestaetigt: () => void) => void;
  onVereinbarungDirtyChange: (dirty: boolean) => void;
  onBuchungDirtyChange: (dirty: boolean) => void;
}

/** Deposit present: state/balance header and the tabs "Übersicht" / "Kontoauszug". */
function KautionMitDetails({
  tenantId,
  details,
  rechte,
  aktualisiert,
  tab,
  onTabChange,
  onGeaendert,
  onFehler,
  onVerwerfenBestaetigen,
  onVereinbarungDirtyChange,
  onBuchungDirtyChange,
}: KautionMitDetailsProps) {
  return (
    <div className="space-y-4" aria-busy={aktualisiert}>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <KautionStatusBadge zustand={details.zustand} />
          </div>
          {/* Live region: the balance is announced after every booking. */}
          <div role="status" aria-live="polite" aria-atomic="true" className="text-sm" data-testid="kaution-kopf-kontostand">
            <span className="text-muted-foreground">Kontostand: </span>
            <span className="font-semibold tabular-nums">{formatBetrag(details.konto.kontostand)}</span>
          </div>
        </div>
        {/* Deadline hint (phase 2: the database delivers `frist` from then on). Neutral wording, text and icon. */}
        {details.frist ? <KautionFristBadge stufe={details.frist.stufe} ausfuehrlich /> : null}
      </div>

      <Tabs value={tab} onValueChange={(wert) => onTabChange(startTab(wert))}>
        <TabsList>
          <TabsTrigger value="uebersicht">Übersicht</TabsTrigger>
          <TabsTrigger value="kontoauszug">Kontoauszug</TabsTrigger>
        </TabsList>
        {/* forceMount + hidden: an open form keeps its input when the user switches the tab. */}
        <TabsContent value="uebersicht" forceMount hidden={tab !== "uebersicht"}>
          <KautionUebersichtTab
            details={details}
            rechte={rechte}
            tenantId={tenantId}
            onGeaendert={onGeaendert}
            onEntfernt={onGeaendert}
            onFehler={onFehler}
            onVereinbarungDirtyChange={onVereinbarungDirtyChange}
          />
        </TabsContent>
        <TabsContent value="kontoauszug" forceMount hidden={tab !== "kontoauszug"}>
          <KautionKontoauszugTab
            details={details}
            rechte={rechte}
            tenantId={tenantId}
            onGeaendert={onGeaendert}
            onFehler={onFehler}
            onBuchungDirtyChange={onBuchungDirtyChange}
            onVerwerfenBestaetigen={onVerwerfenBestaetigen}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Ladezustand() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="space-y-3" data-testid="kaution-laden">
      <span className="sr-only">Kaution wird geladen...</span>
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
