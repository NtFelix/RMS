/**
 * Tests of the deposit dialog for the phase 3 types (GH-6): which tabs exist per deposit type and function flag,
 * the guarantee/insurance view (overview only, no balance), and the handover from the Zinsen tab to the statement.
 *
 * All values are synthetic. The server actions, the modal store and the feature flag are mocked.
 */

import React from "react";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KautionDialog } from "@/components/kaution/kaution-dialog";
import { useModalStore } from "@/hooks/use-modal-store";
import { getKautionDetailsAction } from "@/app/kautionen-actions";
import { useKautionFlag } from "@/hooks/use-kaution-flag";
import type { KautionDetails, KautionRechte, KautionZinsVorschlag } from "@/types/Kaution";
import type { KautionFunktion } from "@/lib/kautionen-flag";

jest.mock("@/hooks/use-modal-store", () => ({ useModalStore: jest.fn() }));
jest.mock("@/hooks/use-toast", () => ({ toast: jest.fn(), useToast: jest.fn() }));
jest.mock("@/hooks/use-kaution-flag", () => ({ useKautionFlag: jest.fn() }));
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
  berechneKautionZinsenAction: jest.fn(),
  planeKautionZinsstaffelAction: jest.fn(),
  storniereKautionBewegungAction: jest.fn(),
  deleteKautionAction: jest.fn(),
  getKautionBelegUrlAction: jest.fn(),
  entferneKautionBelegAction: jest.fn(),
}));

const TENANT_ID = "11111111-1111-4111-8111-111111111111";
const KAUTION_ID = "22222222-2222-4222-8222-222222222222";
const ALLE_RECHTE: KautionRechte = { ansehen: true, erstellen: true, bearbeiten: true, loeschen: true };

const getDetailsMock = getKautionDetailsAction as jest.Mock;
const flagMock = useKautionFlag as unknown as jest.Mock;
const closeKautionModal = jest.fn();

function setzeFunktionen(funktionen: Partial<Record<KautionFunktion, boolean>> = {}) {
  flagMock.mockReturnValue({
    aktiv: true,
    arten: ["barkaution", "buergschaft"],
    bewegungsarten: ["einzahlung", "zinsgutschrift", "auszahlung", "abzug"],
    funktionen: { raten: false, dokumente: false, fristen: false, zinsen: false, abrechnung: false, ...funktionen },
  });
}

function mockStore() {
  (useModalStore as unknown as jest.Mock).mockReturnValue({
    isKautionModalOpen: true,
    kautionInitialData: { tenant: { id: TENANT_ID, name: "Erika Mustermann" } },
    isKautionModalDirty: false,
    closeKautionModal,
    setKautionModalDirty: jest.fn(),
    openConfirmationModal: jest.fn(),
    closeConfirmationModal: jest.fn(),
  });
}

/** Deposit with bank account (synthetic): balance 1.000,00 €, no bookings, accrued interest proposal. */
function barDetails(aenderung: Partial<KautionDetails> = {}): KautionDetails {
  const aufgelaufen: KautionZinsVorschlag = {
    moeglich: true,
    regelwerk_version: 1,
    methode: "act_365",
    von: "2025-01-01",
    bis: "2026-10-17",
    tage: 655,
    betrag: 40.5,
    betrag_exakt: "40.5",
    staffel: [],
    segmente: [],
  };
  return {
    kaution: {
      id: KAUTION_ID,
      organisation_id: "44444444-4444-4444-8444-444444444444",
      mieter_id: TENANT_ID,
      kautionsart: "barkaution",
      soll_betrag: 1000,
      miete_bei_vertragsschluss: 500,
      interne_notiz: null,
      quelle: "app",
      erstellt_am: "2026-01-05T09:00:00Z",
      geaendert_am: "2026-01-05T09:00:00Z",
      zinsmethode: "act_365",
    },
    konto: {
      summe_einzahlungen: 1000,
      summe_zinsgutschriften: 0,
      summe_auszahlungen: 0,
      summe_abzuege: 0,
      kontostand: 1000,
      erste_einzahlung: "2025-01-05",
      letzte_wertstellung: "2025-01-05",
      anzahl_aktiv: 1,
      anzahl_storniert: 0,
    },
    zustand: "verwahrt",
    mietende: null,
    stichtag: "2026-10-17",
    warnungen: { dreifache_miete: 1500, soll_ueber_dreifache_miete: false, einzahlungen_ueber_dreifache_miete: false },
    kontoauszug: [
      {
        id: "33333333-3333-4333-8333-333333333331",
        bewegungsart: "einzahlung",
        vorzeichen: 1,
        betrag: 1000,
        wertstellung: "2025-01-05",
        kategorie: null,
        grund: null,
        interne_notiz: null,
        empfaenger: null,
        quelle: "app",
        erstellt_am: "2025-01-05T09:00:00Z",
        storniert_am: null,
        storno_grund: null,
        saldo_nach_buchung: 1000,
      },
    ],
    zinsstaffel: [],
    zins_aufgelaufen: aufgelaufen,
    kontostand_inkl_zinsen: 1040.5,
    ...aenderung,
  };
}

/** Guarantee (synthetic): no account, no bookings, document data only. */
function buergschaftDetails(): KautionDetails {
  return {
    ...barDetails(),
    kaution: {
      ...barDetails().kaution,
      kautionsart: "buergschaft",
      soll_betrag: 3000,
      iban: null,
      bank: null,
      kontoinhaber: null,
      getrennt_angelegt: null,
      buerge_versicherer: "Beispiel Bürge GmbH (Testdaten)",
      urkundennummer: "BU-0001-TEST",
    },
    konto: { ...barDetails().konto, summe_einzahlungen: 0, kontostand: 0, anzahl_aktiv: 0 },
    zustand: "dokumentiert",
    kontoauszug: [],
    zinsstaffel: undefined,
    zins_aufgelaufen: null,
    kontostand_inkl_zinsen: null,
  };
}

async function oeffne(details: KautionDetails, rechte: KautionRechte = ALLE_RECHTE) {
  getDetailsMock.mockResolvedValue({ success: true, data: { details, rechte, vorschlag: null } });
  mockStore();
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  render(<KautionDialog />);
  await screen.findByRole("tab", { name: "Übersicht" });
  return user;
}

beforeEach(() => {
  jest.resetAllMocks();
  setzeFunktionen({ zinsen: true });
});

/**
 * Räumt nach jedem Test auf, bevor `jest.setup.js` die Fake-Timer leert (Muster wie in `kaution-dialog.test.tsx`).
 * Die Hooks stehen in einem `describe`, damit sie vor denen von `jest.setup.js` laufen.
 */
function raeumeNachJedemTestAuf() {
  afterEach(async () => {
    cleanup();
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
  });
}

describe("KautionDialog: Tabs je Kautionsart und Funktion", () => {
  raeumeNachJedemTestAuf();

  it("zeigt bei einem Bankkonto mit Zinsfunktion den Zinsen-Tab", async () => {
    await oeffne(barDetails());

    expect(screen.getByRole("tab", { name: "Kontoauszug" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Zinsen" })).toBeInTheDocument();
  });

  it("zeigt den Zinsen-Tab ohne Zinsfunktion nicht", async () => {
    setzeFunktionen({ zinsen: false });
    await oeffne(barDetails());

    expect(screen.getByRole("tab", { name: "Kontoauszug" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Zinsen" })).not.toBeInTheDocument();
  });

  it("zeigt bei Bürgschaft nur die Übersicht, ohne Kontostand, mit Summe und Urkundennummer", async () => {
    setzeFunktionen({ zinsen: true, raten: true, dokumente: true });
    await oeffne(buergschaftDetails());

    expect(screen.getAllByRole("tab")).toHaveLength(1);
    expect(screen.getByRole("tab", { name: "Übersicht" })).toBeInTheDocument();
    expect(screen.queryByTestId("kaution-kopf-kontostand")).not.toBeInTheDocument();
    expect(screen.getByText("Dokumentiert")).toBeInTheDocument();

    const dokument = screen.getByRole("region", { name: "Dokumentierte Sicherheit" });
    expect(within(dokument).getByText("Summe")).toBeInTheDocument();
    expect(within(dokument).getByText("BU-0001-TEST")).toBeInTheDocument();
    expect(within(dokument).getByText("Beispiel Bürge GmbH (Testdaten)")).toBeInTheDocument();
  });
});

describe("KautionDialog: Zinsen-Tab", () => {
  raeumeNachJedemTestAuf();

  it("öffnet aus dem Zinsen-Tab die Zinsgutschrift im Kontoauszug mit dem aufgelaufenen Zeitraum", async () => {
    const user = await oeffne(barDetails());

    await user.click(screen.getByRole("tab", { name: "Zinsen" }));
    await user.click(screen.getByRole("button", { name: "Zinsgutschrift erfassen" }));

    expect(await screen.findByRole("tab", { name: "Kontoauszug", selected: true })).toBeInTheDocument();
    const formular = await screen.findByTestId("kaution-buchung-form");
    expect(formular).toHaveAttribute("data-bewegungsart", "zinsgutschrift");
    expect(within(formular).getByLabelText("Zinszeitraum von")).toHaveValue("01.01.2025");
    expect(within(formular).getByLabelText("Zinszeitraum bis (einschließlich)")).toHaveValue("16.10.2026");
  });
});
