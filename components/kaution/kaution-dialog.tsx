"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { KautionDokumenteTab } from "@/components/kaution/kaution-dokumente-tab";
import type { KautionBuchungVorgabe } from "@/components/kaution/kaution-buchung-form";
import { KautionRatenTab } from "@/components/kaution/kaution-raten-tab";
import { KautionStatusBadge } from "@/components/kaution/kaution-status-badge";
import { KautionUebersichtTab } from "@/components/kaution/kaution-uebersicht-tab";
import { KautionZinsenTab } from "@/components/kaution/kaution-zinsen-tab";
import { KautionAbrechnungTab } from "@/components/kaution/kaution-abrechnung-tab";
import { useKautionFlag } from "@/hooks/use-kaution-flag";
import {
  KAUTION_FEHLER_FALLBACK_MESSAGE,
  getKautionFehlerVerhalten,
  type KautionFehlerVerhalten,
} from "@/lib/kautionen-errors";
import { KAUTION_ART_LABELS, kautionHatKonto } from "@/lib/kautionen-constants";
import type { KautionDetails, KautionRate, KautionRechte, KautionVorschlag } from "@/types/Kaution";

/**
 * Deposit dialog ("Kautionsmanagement", GH-6), mounted once in `app/(dashboard)/layout-inner.tsx`.
 *
 * - Data: loaded on opening and after EVERY change from `getKautionDetailsAction` (one consistent snapshot of
 *   statement, balance, state and the module rights of the user). The browser calculates nothing: balance,
 *   state and deadlines come from the database. The server stays authoritative for every right, the rights
 *   here only enable/disable buttons (disabled instead of hidden, tooltip "Keine Berechtigung").
 * - States: loading (skeleton), error (alert + "Erneut laden"), no deposit (creation form with suggestion),
 *   deposit present (header + tabs "Übersicht" / "Kontoauszug", "Raten" only with the function flag `raten`, "Dokumente" only with `dokumente`,
 *   "Abrechnung" only with `abrechnung`; the bank account tabs need a bank account type).
 *   The frist badge shows only with the function flag `fristen`.
 * - Unsaved input: only the forms report it (`setKautionModalDirty`); closing then uses the confirmation
 *   dialog of the store. Both tabs stay mounted, so switching tabs never discards an open form.
 * - Errors of the actions: stable codes (`lib/kautionen-errors.ts`) decide where the message appears: at the
 *   form (validation, strict balance `KA005`), as a toast (+ reload / close) otherwise.
 * - No personal data in the dialog title or description; the tenant name is only shown as a subtitle.
 *
 * Security relevant (money booking, rights): not production ready until the maintainer has reviewed it.
 */

type KautionTab = "uebersicht" | "kontoauszug" | "zinsen" | "raten" | "dokumente" | "abrechnung";

/**
 * Start tab from the store. "zinsen", "raten", "dokumente" and "abrechnung" are checked against their flags and the deposit
 * type in the view (fallback: overview).
 */
function startTab(wunsch: string | undefined): KautionTab {
  if (wunsch === "kontoauszug") return "kontoauszug";
  if (wunsch === "zinsen") return "zinsen";
  if (wunsch === "raten") return "raten";
  if (wunsch === "dokumente") return "dokumente";
  if (wunsch === "abrechnung") return "abrechnung";
  return "uebersicht";
}

/**
 * Booking request of another tab: the statement opens the booking form for it (a rate payment from the Raten tab, an interest
 * credit from the Zinsen tab, a deduction or payout from the Abrechnung tab). `nonce`: new request each time.
 */
type ZahlungsVorgabe = KautionBuchungVorgabe & { nonce: number };

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
  const meldeRatenDirty = useCallback((dirty: boolean) => meldeDirty("raten", dirty), [meldeDirty]);
  const meldeZinsenDirty = useCallback((dirty: boolean) => meldeDirty("zinsen", dirty), [meldeDirty]);
  const meldeEinbehaltDirty = useCallback((dirty: boolean) => meldeDirty("einbehalt", dirty), [meldeDirty]);
  return {
    zuruecksetzen,
    meldeAnlegenDirty,
    meldeVereinbarungDirty,
    meldeBuchungDirty,
    meldeRatenDirty,
    meldeZinsenDirty,
    meldeEinbehaltDirty,
  };
}

export function KautionDialog() {
  const {
    isKautionModalOpen,
    kautionInitialData,
    isKautionModalDirty,
    closeKautionModal,
    setKautionModalDirty,
    isConfirmationModalOpen,
    openConfirmationModal,
    closeConfirmationModal,
  } = useModalStore();

  const tenantId = kautionInitialData?.tenant.id;
  const initialTab = kautionInitialData?.initialTab;

  const [ansicht, setAnsicht] = useState<Ansicht>({ phase: "laden" });
  const [aktualisiert, setAktualisiert] = useState(false);
  const [tab, setTab] = useState<KautionTab>("uebersicht");
  const [zahlungsVorgabe, setZahlungsVorgabe] = useState<ZahlungsVorgabe | null>(null);
  // Counter of the load requests: only the latest answer counts (reload after a change, dialog reopened).
  const ladeZaehler = useRef(0);
  // Tenant of the dialog that is open right now (`null` while closed). A late answer of an action that was started for
  // another tenant (its closure carries the old `tenantId`) must not reload, toast or close the dialog of the new one.
  const aktuellerMieter = useRef<string | null>(null);
  // Mirror of `ansicht` for the async loader (a silent reload must know whether content is already shown).
  const ansichtRef = useRef<Ansicht>(ansicht);
  // The question "discard input?" (booking type switch) is open: closing attempts of the dialog are ignored meanwhile.
  const rueckfrageOffen = useRef(false);
  // `useRouter` of Next is stable; the ref keeps `lade` independent of its identity (no reload loop).
  const router = useRouter();
  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  const setzeAnsicht = useCallback((neu: Ansicht) => {
    ansichtRef.current = neu;
    setAnsicht(neu);
  }, []);

  // --- Unsaved input -----------------------------------------------------------------------------------------
  const {
    zuruecksetzen,
    meldeAnlegenDirty,
    meldeVereinbarungDirty,
    meldeBuchungDirty,
    meldeRatenDirty,
    meldeZinsenDirty,
    meldeEinbehaltDirty,
  } = useDirtyQuellen(setKautionModalDirty);

  /** From the Raten tab: opens the payment form for the rate in the statement (the dialog switches the tab). */
  const oeffneZahlungFuerRate = useCallback((rate: KautionRate) => {
    setZahlungsVorgabe((vorher) => ({
      art: "einzahlung",
      rateId: rate.rate_id,
      rateNr: rate.rate_nr,
      betrag: rate.offen,
      nonce: (vorher?.nonce ?? 0) + 1,
    }));
    setTab("kontoauszug");
  }, []);

  /**
   * From the Zinsen tab (interest credit for the accrued period) and the Abrechnung tab (deduction, payout): opens the booking
   * form in the statement with the preset.
   */
  const oeffneBuchungMitVorgabe = useCallback((vorgabe: KautionBuchungVorgabe) => {
    setZahlungsVorgabe((vorher) => ({ ...vorgabe, nonce: (vorher?.nonce ?? 0) + 1 }));
    setTab("kontoauszug");
  }, []);

  // --- Loading -----------------------------------------------------------------------------------------------
  /** No access (anymore) or session expired: nothing to show, tell the user, (sign in again) and close. */
  const beendeMitHinweis = useCallback(
    (verhalten: "dialog_schliessen" | "anmelden", message: string) => {
      toast({ title: FEHLER_TITEL[verhalten], description: message, variant: "destructive" });
      if (verhalten === "anmelden") routerRef.current.push("/auth/login");
      closeKautionModal({ force: true });
    },
    [closeKautionModal]
  );

  const lade = useCallback(
    async (id: string, optionen?: { still?: boolean }) => {
      const aufruf = ++ladeZaehler.current;
      const still = optionen?.still === true;
      // "still": reload after a change, the current content stays visible (no skeleton flash).
      if (still) setAktualisiert(true);
      else setzeAnsicht({ phase: "laden" });

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
      if (neueAnsicht.phase !== "fehler") {
        setzeAnsicht(neueAnsicht);
        return;
      }

      // A failed silent reload keeps what is shown (tabs and forms stay mounted, input is not lost).
      const behalten = still && ansichtRef.current.phase === "bereit";
      if (!behalten) setzeAnsicht(neueAnsicht);
      const verhalten = getKautionFehlerVerhalten(neueAnsicht.fehler.code);
      if (verhalten === "dialog_schliessen" || verhalten === "anmelden") {
        beendeMitHinweis(verhalten, neueAnsicht.fehler.message);
      } else if (behalten) {
        toast({ title: "Aktualisierung fehlgeschlagen", description: neueAnsicht.fehler.message, variant: "destructive" });
      }
    },
    [beendeMitHinweis, setzeAnsicht]
  );

  const reload = useCallback(async () => {
    // Obsolete: the dialog was closed or reopened for another tenant since this closure was handed to a form.
    if (tenantId && aktuellerMieter.current === tenantId) await lade(tenantId, { still: true });
  }, [tenantId, lade]);

  // Init effect (like the legacy dialog, also correct with `<Activity>`): load when opened, reset when closed.
  useEffect(() => {
    ladeZaehler.current += 1; // invalidates answers of earlier openings
    zuruecksetzen();
    setAktualisiert(false);

    if (!isKautionModalOpen || !tenantId) {
      aktuellerMieter.current = null;
      if (ansichtRef.current.phase !== "laden") setzeAnsicht({ phase: "laden" });
      return;
    }
    aktuellerMieter.current = tenantId;
    setTab(startTab(initialTab));
    setZahlungsVorgabe(null);
    void lade(tenantId);
    return () => {
      ladeZaehler.current += 1;
      aktuellerMieter.current = null;
    };
  }, [isKautionModalOpen, kautionInitialData, tenantId, initialTab, lade, zuruecksetzen, setzeAnsicht]);

  // The confirmation of the store was closed (also by "Abbrechen"/Escape of the shared dialog): closing works again.
  useEffect(() => {
    if (!isConfirmationModalOpen) rueckfrageOffen.current = false;
  }, [isConfirmationModalOpen]);

  // --- Errors of actions -------------------------------------------------------------------------------------
  /**
   * Central handling of an error of an action (called by the forms).
   * Returns `true` if handled here (toast, reload, close, sign-in); `false` means: show the message at the form.
   * An answer for a tenant that is no longer the open one is obsolete: it returns `true` and does nothing.
   */
  const handleFehler = useCallback(
    (fehler: KautionActionError): boolean => {
      if (!tenantId || aktuellerMieter.current !== tenantId) return true;
      const verhalten = getKautionFehlerVerhalten(fehler.code);
      if (verhalten === "formular" || verhalten === "wiederholen") return false;

      if (verhalten === "dialog_schliessen" || verhalten === "anmelden") {
        beendeMitHinweis(verhalten, fehler.message);
        return true;
      }
      toast({ title: FEHLER_TITEL[verhalten], description: fehler.message, variant: "destructive" });
      // The data changed or the rights changed: show the current state ("berechtigung": buttons get disabled).
      if (verhalten === "neu_laden" || verhalten === "berechtigung") void reload();
      return true;
    },
    [tenantId, beendeMitHinweis, reload]
  );

  /**
   * Asks before unsaved input of the booking form is discarded (switching the booking type), with the same
   * confirmation dialog of the store that is used when the dialog is closed with unsaved input.
   */
  const frageVerwerfen = useCallback(
    (onBestaetigt: () => void) => {
      rueckfrageOffen.current = true;
      openConfirmationModal({
        title: "Eingaben verwerfen?",
        description: "Wenn Sie die Buchungsart wechseln, gehen Ihre bisherigen Eingaben verloren. Möchten Sie sie wirklich verwerfen?",
        confirmText: "Verwerfen",
        cancelText: "Abbrechen",
        onConfirm: () => {
          rueckfrageOffen.current = false;
          onBestaetigt();
          closeConfirmationModal();
        },
        onCancel: () => {
          rueckfrageOffen.current = false;
          closeConfirmationModal();
        },
      });
    },
    [openConfirmationModal, closeConfirmationModal]
  );

  // The store asks for confirmation if a form holds unsaved input. While the question "discard input?" is open, the
  // focus change to its dialog counts as an interaction outside: it must not replace the question or close the dialog.
  const handleAttemptClose = () => {
    if (!rueckfrageOffen.current) closeKautionModal();
  };
  const handleOpenChange = (open: boolean) => {
    if (!open) handleAttemptClose();
  };

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
            onRatenDirtyChange={meldeRatenDirty}
            onZinsenDirtyChange={meldeZinsenDirty}
            zahlungsVorgabe={zahlungsVorgabe}
            onZahlungErfassen={oeffneZahlungFuerRate}
            onZinsgutschriftErfassen={oeffneBuchungMitVorgabe}
            onBuchungErfassen={oeffneBuchungMitVorgabe}
            onEinbehaltDirtyChange={meldeEinbehaltDirty}
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
  onRatenDirtyChange: (dirty: boolean) => void;
  onZinsenDirtyChange: (dirty: boolean) => void;
  zahlungsVorgabe: ZahlungsVorgabe | null;
  onZahlungErfassen: (rate: KautionRate) => void;
  onZinsgutschriftErfassen: (vorgabe: KautionBuchungVorgabe) => void;
  onBuchungErfassen: (vorgabe: KautionBuchungVorgabe) => void;
  onEinbehaltDirtyChange: (dirty: boolean) => void;
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
  onRatenDirtyChange,
  onZinsenDirtyChange,
  zahlungsVorgabe,
  onZahlungErfassen,
  onZinsgutschriftErfassen,
  onBuchungErfassen,
  onEinbehaltDirtyChange,
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
          onRatenDirtyChange={onRatenDirtyChange}
          onZinsenDirtyChange={onZinsenDirtyChange}
          zahlungsVorgabe={zahlungsVorgabe}
          onZahlungErfassen={onZahlungErfassen}
          onZinsgutschriftErfassen={onZinsgutschriftErfassen}
          onBuchungErfassen={onBuchungErfassen}
          onEinbehaltDirtyChange={onEinbehaltDirtyChange}
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
  onRatenDirtyChange: (dirty: boolean) => void;
  onZinsenDirtyChange: (dirty: boolean) => void;
  zahlungsVorgabe: ZahlungsVorgabe | null;
  onZahlungErfassen: (rate: KautionRate) => void;
  onZinsgutschriftErfassen: (vorgabe: KautionBuchungVorgabe) => void;
  onBuchungErfassen: (vorgabe: KautionBuchungVorgabe) => void;
  onEinbehaltDirtyChange: (dirty: boolean) => void;
}

/**
 * Deposit present: state/balance header and the tabs. The bank account tabs ("Kontoauszug", "Zinsen", "Raten") exist only for
 * bank account types; guarantee and insurance show the overview only (no bookings, no instalments, no interest: KA014, KA015).
 * Each optional tab also needs its function flag.
 */
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
  onRatenDirtyChange,
  onZinsenDirtyChange,
  zahlungsVorgabe,
  onZahlungErfassen,
  onZinsgutschriftErfassen,
  onBuchungErfassen,
  onEinbehaltDirtyChange,
}: KautionMitDetailsProps) {
  const { funktionen } = useKautionFlag();
  const hatKonto = kautionHatKonto(details.kaution.kautionsart);
  const kontoauszugAktiv = hatKonto;
  const zinsenAktiv = hatKonto && funktionen.zinsen;
  const ratenAktiv = hatKonto && funktionen.raten;
  const dokumenteAktiv = hatKonto && funktionen.dokumente;
  const abrechnungAktiv = hatKonto && funktionen.abrechnung;
  const fristAktiv = hatKonto && funktionen.fristen;
  // Without its flag or type the tab does not exist: the view falls back to the overview, the state follows (effect below).
  const aktiverTab: KautionTab =
    (tab === "kontoauszug" && !kontoauszugAktiv) ||
    (tab === "zinsen" && !zinsenAktiv) ||
    (tab === "raten" && !ratenAktiv) ||
    (tab === "dokumente" && !dokumenteAktiv) ||
    (tab === "abrechnung" && !abrechnungAktiv)
      ? "uebersicht"
      : tab;
  useEffect(() => {
    if (aktiverTab !== tab) onTabChange(aktiverTab);
  }, [aktiverTab, tab, onTabChange]);

  return (
    <div className="space-y-4" aria-busy={aktualisiert}>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <KautionStatusBadge zustand={details.zustand} />
            {hatKonto ? null : <span className="text-sm text-muted-foreground">{KAUTION_ART_LABELS[details.kaution.kautionsart]}</span>}
          </div>
          {/* Live region: the balance is announced after every booking. Only for bank accounts. */}
          {hatKonto ? (
            <div role="status" aria-live="polite" aria-atomic="true" className="text-sm" data-testid="kaution-kopf-kontostand">
              <span className="text-muted-foreground">Kontostand: </span>
              <span className="font-semibold tabular-nums">{formatBetrag(details.konto.kontostand)}</span>
            </div>
          ) : null}
        </div>
        {/* Deadline hint: only with the function flag `fristen` and once the database delivers `frist`. Neutral wording. */}
        {fristAktiv && details.frist ? <KautionFristBadge stufe={details.frist.stufe} ausfuehrlich /> : null}
      </div>

      <Tabs value={aktiverTab} onValueChange={(wert) => onTabChange(startTab(wert))}>
        <TabsList>
          <TabsTrigger value="uebersicht">Übersicht</TabsTrigger>
          {kontoauszugAktiv ? <TabsTrigger value="kontoauszug">Kontoauszug</TabsTrigger> : null}
          {zinsenAktiv ? <TabsTrigger value="zinsen">Zinsen</TabsTrigger> : null}
          {ratenAktiv ? <TabsTrigger value="raten">Raten</TabsTrigger> : null}
          {dokumenteAktiv ? <TabsTrigger value="dokumente">Dokumente</TabsTrigger> : null}
          {abrechnungAktiv ? <TabsTrigger value="abrechnung">Abrechnung</TabsTrigger> : null}
        </TabsList>
        {/* forceMount + hidden: an open form keeps its input when the user switches the tab. */}
        <TabsContent value="uebersicht" forceMount hidden={aktiverTab !== "uebersicht"}>
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
        {kontoauszugAktiv ? (
          <TabsContent value="kontoauszug" forceMount hidden={aktiverTab !== "kontoauszug"}>
            <KautionKontoauszugTab
              details={details}
              rechte={rechte}
              tenantId={tenantId}
              onGeaendert={onGeaendert}
              onFehler={onFehler}
              onBuchungDirtyChange={onBuchungDirtyChange}
              onVerwerfenBestaetigen={onVerwerfenBestaetigen}
              zahlungsVorgabe={zahlungsVorgabe}
            />
          </TabsContent>
        ) : null}
        {zinsenAktiv ? (
          <TabsContent value="zinsen" forceMount hidden={aktiverTab !== "zinsen"}>
            <KautionZinsenTab
              details={details}
              rechte={rechte}
              onGeaendert={onGeaendert}
              onFehler={onFehler}
              onZinsstaffelDirtyChange={onZinsenDirtyChange}
              onZinsgutschriftErfassen={onZinsgutschriftErfassen}
            />
          </TabsContent>
        ) : null}
        {ratenAktiv ? (
          <TabsContent value="raten" forceMount hidden={aktiverTab !== "raten"}>
            <KautionRatenTab
              details={details}
              rechte={rechte}
              onGeaendert={onGeaendert}
              onFehler={onFehler}
              onRatenDirtyChange={onRatenDirtyChange}
              onZahlungErfassen={onZahlungErfassen}
            />
          </TabsContent>
        ) : null}
        {dokumenteAktiv ? (
          <TabsContent value="dokumente" forceMount hidden={aktiverTab !== "dokumente"}>
            <KautionDokumenteTab details={details} rechte={rechte} onGeaendert={onGeaendert} onFehler={onFehler} />
          </TabsContent>
        ) : null}
        {abrechnungAktiv ? (
          <TabsContent value="abrechnung" forceMount hidden={aktiverTab !== "abrechnung"}>
            <KautionAbrechnungTab
              tenantId={tenantId}
              details={details}
              rechte={rechte}
              onGeaendert={onGeaendert}
              onFehler={onFehler}
              onEinbehaltDirtyChange={onEinbehaltDirtyChange}
              onBuchungErfassen={onBuchungErfassen}
            />
          </TabsContent>
        ) : null}
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
