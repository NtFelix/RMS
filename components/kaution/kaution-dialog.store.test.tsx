/**
 * Integration of the deposit dialog with the REAL modal store ("Kautionsmanagement", GH-6): opening via
 * `openKautionModal`, the "unsaved input" handshake (forms report, the store asks before closing) and reopening
 * for another tenant. `kaution-dialog.test.tsx` mocks the store; this file makes sure that the two fit together
 * (no render loop through `setKautionModalDirty`, the confirmation of the store appears, state is reset).
 *
 * All values are synthetic placeholders. The server actions are mocked.
 */

import React from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KautionDialog } from "@/components/kaution/kaution-dialog";
import { useModalStore } from "@/hooks/use-modal-store";
import { getKautionDetailsAction } from "@/app/kautionen-actions";
import type { KautionDetails, KautionRechte } from "@/types/Kaution";

// `jest.setup.js` ersetzt den Store global durch einen Mock: hier läuft der echte Store.
const echterStore = jest.requireActual<typeof import("@/hooks/use-modal-store")>("@/hooks/use-modal-store").useModalStore;

jest.mock("@/hooks/use-modal-store", () => ({ useModalStore: jest.fn() }));
jest.mock("@/hooks/use-toast", () => ({ toast: jest.fn(), useToast: jest.fn() }));
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

function baueDetails(): KautionDetails {
  return {
    kaution: {
      id: KAUTION_ID,
      organisation_id: "44444444-4444-4444-8444-444444444444",
      mieter_id: TENANT_A,
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
      kontostand: 0,
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
});
