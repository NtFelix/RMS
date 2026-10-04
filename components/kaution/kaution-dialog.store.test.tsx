/**
 * Integration of the deposit dialog with the REAL modal store ("Kautionsmanagement", GH-6): opening via
 * `openKautionModal`, the "unsaved input" handshake (forms report, the store asks before closing) and reopening
 * for another tenant. `kaution-dialog.test.tsx` mocks the store; this file makes sure that the two fit together
 * (no render loop through `setKautionModalDirty`, the confirmation of the store appears, state is reset).
 *
 * All values are synthetic placeholders. The server actions are mocked.
 */

import React from "react";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KautionDialog } from "@/components/kaution/kaution-dialog";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useModalStore } from "@/hooks/use-modal-store";
import { toast } from "@/hooks/use-toast";
import { bucheKautionBewegungAction, getKautionDetailsAction } from "@/app/kautionen-actions";
import type { KautionDetails, KautionRechte } from "@/types/Kaution";

// `jest.setup.js` ersetzt den Store global durch einen Mock: hier läuft der echte Store.
const echterStore = jest.requireActual<typeof import("@/hooks/use-modal-store")>("@/hooks/use-modal-store").useModalStore;

jest.mock("@/hooks/use-modal-store", () => ({ useModalStore: jest.fn() }));
jest.mock("@/hooks/use-toast", () => ({ toast: jest.fn(), useToast: jest.fn() }));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock("@/app/kautionen-actions", () => ({
  getKautionDetailsAction: jest.fn(),
  createKautionAction: jest.fn(),
  updateKautionVereinbarungAction: jest.fn(),
  bucheKautionBewegungAction: jest.fn(),
  storniereKautionBewegungAction: jest.fn(),
  deleteKautionAction: jest.fn(),
}));

const TENANT_A = "11111111-1111-4111-8111-111111111111";
const TENANT_B = "11111111-1111-4111-8111-222222222222";
const KAUTION_ID = "22222222-2222-4222-8222-222222222222";
const ALLE_RECHTE: KautionRechte = { ansehen: true, erstellen: true, bearbeiten: true, loeschen: true };

const getDetailsMock = getKautionDetailsAction as jest.Mock;
const bucheMock = bucheKautionBewegungAction as jest.Mock;
const toastMock = toast as unknown as jest.Mock;

/** Kontostand je Mieter, damit sichtbar ist, welche Daten der Dialog gerade zeigt. */
const KONTOSTAND_A = 100;
const KONTOSTAND_B = 777;

function baueDetails(mieterId = TENANT_A, kontostand = KONTOSTAND_A): KautionDetails {
  return {
    kaution: {
      id: KAUTION_ID,
      organisation_id: "44444444-4444-4444-8444-444444444444",
      mieter_id: mieterId,
      kautionsart: "barkaution",
      soll_betrag: 1500,
      miete_bei_vertragsschluss: 500,
      interne_notiz: null,
      quelle: "app",
      erstellt_am: "2026-01-05T09:00:00Z",
      geaendert_am: "2026-01-05T09:00:00Z",
    },
    konto: {
      summe_einzahlungen: 0,
      summe_zinsgutschriften: 0,
      summe_auszahlungen: 0,
      summe_abzuege: 0,
      kontostand,
      erste_einzahlung: null,
      letzte_wertstellung: null,
      anzahl_aktiv: 0,
      anzahl_storniert: 0,
    },
    zustand: "offen",
    mietende: null,
    stichtag: "2026-10-02",
    warnungen: { dreifache_miete: 1500, soll_ueber_dreifache_miete: false, einzahlungen_ueber_dreifache_miete: false },
    kontoauszug: [],
  };
}

/**
 * Stand-in for the global host of the confirmation dialog (`app/(dashboard)/dashboard-overlay-host.tsx`): shows the
 * confirmation of the store with the real shared dialog, whose "Abbrechen" only closes it (without `onCancel`).
 */
function BestaetigungsHost() {
  const { isConfirmationModalOpen, confirmationModalConfig, closeConfirmationModal } = useModalStore();
  if (!isConfirmationModalOpen || !confirmationModalConfig) return null;
  return (
    <ConfirmationDialog
      isOpen
      onClose={closeConfirmationModal}
      onConfirm={() => confirmationModalConfig.onConfirm()}
      title={confirmationModalConfig.title}
      description={confirmationModalConfig.description}
      confirmText={confirmationModalConfig.confirmText}
      cancelText={confirmationModalConfig.cancelText}
    />
  );
}

/** Replies of `getKautionDetailsAction` per tenant (deposit with a tenant-specific balance). */
function antwortenProMieter() {
  getDetailsMock.mockImplementation(async (id: string) => ({
    success: true,
    data: { details: baueDetails(id, id === TENANT_B ? KONTOSTAND_B : KONTOSTAND_A), rechte: ALLE_RECHTE, vorschlag: null },
  }));
}

function oeffne(tenantId: string, tab?: "uebersicht" | "kontoauszug") {
  act(() => {
    echterStore.getState().openKautionModal({ id: tenantId, name: "Erika Mustermann" }, tab ? { tab } : undefined);
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  (useModalStore as unknown as jest.Mock).mockImplementation(echterStore);
  act(() => {
    echterStore.setState({
      isKautionModalOpen: false,
      kautionInitialData: undefined,
      isKautionModalDirty: false,
      isConfirmationModalOpen: false,
      confirmationModalConfig: null,
    });
  });
  getDetailsMock.mockResolvedValue({ success: true, data: { details: baueDetails(), rechte: ALLE_RECHTE, vorschlag: null } });
});

/** Promise that is settled from outside (an action that is still running). */
function offeneAntwort<T>() {
  let erfuelle!: (wert: T) => void;
  const promise = new Promise<T>((resolve) => {
    erfuelle = resolve;
  });
  return { promise, erfuelle };
}

// Räumt vor `clearAllTimers` aus `jest.setup.js` auf (Erklärung: siehe `kaution-dialog.test.tsx`).
afterEach(async () => {
  cleanup();
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
});

describe("KautionDialog mit dem echten Store", () => {
  it("bleibt geschlossen, bis der Store ihn öffnet, und lädt dann die Daten des Mieters", async () => {
    render(<KautionDialog />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(getDetailsMock).not.toHaveBeenCalled();

    oeffne(TENANT_A, "kontoauszug");

    expect(await screen.findByRole("tab", { name: "Kontoauszug", selected: true })).toBeInTheDocument();
    expect(getDetailsMock).toHaveBeenCalledTimes(1);
    expect(getDetailsMock).toHaveBeenCalledWith(TENANT_A);
  });

  it("fragt vor dem Schließen nach, wenn ein Formular ungespeicherte Eingaben hat, und verwirft sie nach Bestätigung", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<KautionDialog />);
    oeffne(TENANT_A, "kontoauszug");
    await screen.findByRole("tab", { name: "Kontoauszug", selected: true });

    await user.click(screen.getByRole("button", { name: "Einzahlung erfassen" }));
    expect(echterStore.getState().isKautionModalDirty).toBe(false);
    await user.type(await screen.findByLabelText("Betrag (€)"), "25");
    await waitFor(() => expect(echterStore.getState().isKautionModalDirty).toBe(true));

    // Schließen: der Store zeigt seinen Bestätigungsdialog, der Kaution-Dialog bleibt offen.
    await user.click(screen.getByRole("button", { name: "Schließen" }));
    await waitFor(() => expect(echterStore.getState().isConfirmationModalOpen).toBe(true));
    expect(echterStore.getState().confirmationModalConfig?.title).toBe("Ungespeicherte Änderungen verwerfen?");
    expect(echterStore.getState().isKautionModalOpen).toBe(true);

    // Verwerfen: Dialog zu, Dirty-Flag zurückgesetzt.
    act(() => {
      echterStore.getState().confirmationModalConfig?.onConfirm();
    });
    await waitFor(() => expect(echterStore.getState().isKautionModalOpen).toBe(false));
    expect(echterStore.getState().isKautionModalDirty).toBe(false);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("schließt ohne Nachfrage, wenn nichts ungespeichert ist", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<KautionDialog />);
    oeffne(TENANT_A);
    await screen.findByRole("tab", { name: "Übersicht" });

    await user.click(screen.getByRole("button", { name: "Schließen" }));

    await waitFor(() => expect(echterStore.getState().isKautionModalOpen).toBe(false));
    expect(echterStore.getState().isConfirmationModalOpen).toBe(false);
  });

  it("lädt beim erneuten Öffnen für einen anderen Mieter neu und zeigt nichts vom vorherigen", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<KautionDialog />);
    oeffne(TENANT_A, "kontoauszug");
    await screen.findByRole("tab", { name: "Kontoauszug", selected: true });
    await user.click(screen.getByRole("button", { name: "Einzahlung erfassen" }));
    await user.type(await screen.findByLabelText("Betrag (€)"), "25");

    act(() => {
      echterStore.getState().closeKautionModal({ force: true });
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    // Anderer Mieter ohne Kaution: Anlegen-Formular, kein Rest des Buchungsformulars, Start-Tab zurückgesetzt.
    getDetailsMock.mockResolvedValue({ success: true, data: { details: null, rechte: ALLE_RECHTE, vorschlag: null } });
    oeffne(TENANT_B);

    expect(await screen.findByText("Für diesen Mieter ist noch keine Kaution angelegt.")).toBeInTheDocument();
    expect(getDetailsMock).toHaveBeenLastCalledWith(TENANT_B);
    expect(screen.queryByTestId("kaution-buchung-form")).not.toBeInTheDocument();
    expect(echterStore.getState().isKautionModalDirty).toBe(false);
  });

  it("ersetzt die Rückfrage 'Eingaben verwerfen?' nicht durch das Schließen des Dialogs, wenn sie den Fokus übernimmt", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(
      <>
        <KautionDialog />
        <BestaetigungsHost />
      </>
    );
    oeffne(TENANT_A, "kontoauszug");
    await screen.findByRole("tab", { name: "Kontoauszug", selected: true });
    await user.click(screen.getByRole("button", { name: "Einzahlung erfassen" }));
    await user.type(await screen.findByLabelText("Betrag (€)"), "25");
    await waitFor(() => expect(echterStore.getState().isKautionModalDirty).toBe(true));

    // Buchungsart wechseln: Rückfrage des Stores, der Fokus wechselt zu ihrem Dialog.
    await user.click(screen.getByRole("button", { name: "Auszahlung erfassen" }));
    const rueckfrage = (await screen.findByText("Eingaben verwerfen?")).closest<HTMLElement>('[role="dialog"]')!;
    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    expect(echterStore.getState().confirmationModalConfig?.title).toBe("Eingaben verwerfen?");
    expect(echterStore.getState().isKautionModalOpen).toBe(true);
    expect(screen.getByText("Eingaben verwerfen?").closest('[role="dialog"]')).toBe(rueckfrage);

    // "Abbrechen" des geteilten Dialogs schließt nur ihn (ohne onCancel): danach fragt das Schließen wieder nach.
    await user.click(within(rueckfrage).getByRole("button", { name: "Abbrechen" }));
    await waitFor(() => expect(echterStore.getState().isConfirmationModalOpen).toBe(false));
    expect(echterStore.getState().isKautionModalOpen).toBe(true);
    expect(screen.getByLabelText("Betrag (€)")).toHaveValue("25");

    await user.click(screen.getByRole("button", { name: "Schließen" }));
    await waitFor(() => expect(echterStore.getState().isConfirmationModalOpen).toBe(true));
    expect(echterStore.getState().confirmationModalConfig?.title).toBe("Ungespeicherte Änderungen verwerfen?");
  });

  describe("späte Antworten einer Aktion, die für einen anderen Mieter gestartet wurde", () => {
    /** Mieter A: Buchung läuft (Antwort offen), Dialog wird geschlossen und für Mieter B geöffnet. */
    async function starteBuchungUndWechsleZuMieterB() {
      antwortenProMieter();
      const antwort = offeneAntwort<unknown>();
      bucheMock.mockReturnValue(antwort.promise);
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<KautionDialog />);
      oeffne(TENANT_A, "kontoauszug");
      await screen.findByRole("tab", { name: "Kontoauszug", selected: true });
      await user.click(screen.getByRole("button", { name: "Einzahlung erfassen" }));
      await user.type(await screen.findByLabelText("Betrag (€)"), "25");
      await user.click(screen.getByRole("button", { name: "Buchen" }));
      await waitFor(() => expect(bucheMock).toHaveBeenCalledTimes(1));

      act(() => {
        echterStore.getState().closeKautionModal({ force: true });
      });
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      oeffne(TENANT_B);
      await waitFor(() => expect(screen.getByTestId("kaution-kopf-kontostand")).toHaveTextContent("777,00"));
      expect(getDetailsMock.mock.calls.map(([id]) => id)).toEqual([TENANT_A, TENANT_B]);
      return antwort;
    }

    it("lädt nach dem Erfolg der alten Buchung nicht neu: die Daten des neuen Mieters bleiben", async () => {
      const antwort = await starteBuchungUndWechsleZuMieterB();

      await act(async () => {
        antwort.erfuelle({ success: true, data: { bewegungId: "33333333-3333-4333-8333-333333333331" } });
      });

      // Kein zweiter Ladeaufruf für Mieter A, die Anzeige gehört weiter Mieter B.
      expect(getDetailsMock.mock.calls.map(([id]) => id)).toEqual([TENANT_A, TENANT_B]);
      expect(screen.getByTestId("kaution-kopf-kontostand")).toHaveTextContent("777,00");
      expect(echterStore.getState().isKautionModalOpen).toBe(true);
    });

    it.each([
      ["dialog_schliessen (KA002)", "KA002", "Kein Zugriff auf dieses Objekt."],
      ["neu_laden (KA003)", "KA003", "Der Datensatz wurde nicht gefunden (evtl. bereits geändert oder gelöscht)."],
      ["berechtigung (42501)", "42501", "Für diese Aktion fehlt die Berechtigung (Modul Kautionen)."],
      ["anmelden (KA001)", "KA001", "Bitte melden Sie sich erneut an."],
    ])("ignoriert den späten Fehler %s der alten Buchung (kein Schließen, Toast oder Neuladen für Mieter B)", async (_name, code, message) => {
      const antwort = await starteBuchungUndWechsleZuMieterB();

      await act(async () => {
        antwort.erfuelle({ success: false, error: { code, message } });
      });

      expect(echterStore.getState().isKautionModalOpen).toBe(true);
      expect(toastMock).not.toHaveBeenCalled();
      expect(getDetailsMock.mock.calls.map(([id]) => id)).toEqual([TENANT_A, TENANT_B]);
      expect(screen.getByTestId("kaution-kopf-kontostand")).toHaveTextContent("777,00");
    });
  });
});
