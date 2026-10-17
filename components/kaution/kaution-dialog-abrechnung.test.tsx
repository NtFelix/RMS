/**
 * Tests of the deposit dialog for the settlement (GH-6, phase 4): the tab "Abrechnung" only with the function flag
 * `abrechnung` and a bank account, the hold line in the overview card, the start tab and the handover from the settlement
 * tab to the statement (deduction, payout).
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
import { standardKautionFlagKonfig, type KautionFunktion } from "@/lib/kautionen-flag";
import type { KautionDetails, KautionRechte } from "@/types/Kaution";

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
  getKautionAbrechnungAction: jest.fn(),
  setzeKautionEinbehaltAction: jest.fn(),
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

/** Function flags of the test (all others off). */
function setzeFunktionen(funktionen: Partial<Record<KautionFunktion, boolean>> = {}) {
  flagMock.mockReturnValue({
    ...standardKautionFlagKonfig(true),
    arten: ["barkaution", "buergschaft"],
    bewegungsarten: ["einzahlung", "zinsgutschrift", "auszahlung", "abzug"],
    funktionen: { raten: false, dokumente: false, fristen: false, zinsen: false, abrechnung: false, ...funktionen },
  });
}

function mockStore(initialTab?: string) {
  (useModalStore as unknown as jest.Mock).mockReturnValue({
    isKautionModalOpen: true,
    kautionInitialData: { tenant: { id: TENANT_ID, name: "Erika Mustermann" }, initialTab },
    isKautionModalDirty: false,
    closeKautionModal,
    setKautionModalDirty: jest.fn(),
    openConfirmationModal: jest.fn(),
    closeConfirmationModal: jest.fn(),
  });
}

/** Deposit with a bank account (synthetic): 900,00 € balance, one deduction, optionally a hold. */
function barDetails(aenderung: Partial<KautionDetails> = {}): KautionDetails {
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
      summe_abzuege: 100,
      kontostand: 900,
      erste_einzahlung: "2026-01-05",
      letzte_wertstellung: "2026-02-10",
      anzahl_aktiv: 2,
      anzahl_storniert: 0,
    },
    zustand: "verwahrt",
    mietende: "2026-02-28",
    stichtag: "2026-10-17",
    warnungen: { dreifache_miete: 1500, soll_ueber_dreifache_miete: false, einzahlungen_ueber_dreifache_miete: false },
    kontoauszug: [
      {
        id: "33333333-3333-4333-8333-333333333331",
        bewegungsart: "einzahlung",
        betrag: 1000,
        vorzeichen: 1,
        wertstellung: "2026-01-05",
        kategorie: null,
        grund: null,
        interne_notiz: null,
        empfaenger: null,
        quelle: "app",
        erstellt_am: "2026-01-05T09:00:00Z",
        storniert_am: null,
        storno_grund: null,
        saldo_nach_buchung: 1000,
      },
    ],
    einbehalt: null,
    ...aenderung,
  };
}

/** Guarantee (synthetic): no account, so no statement and no settlement tab. */
function buergschaftDetails(): KautionDetails {
  return {
    ...barDetails(),
    kaution: {
      ...barDetails().kaution,
      kautionsart: "buergschaft",
      buerge_versicherer: "Beispiel Bürge GmbH (Testdaten)",
      urkundennummer: "BU-0001-TEST",
    },
    konto: { ...barDetails().konto, kontostand: 0 },
    kontoauszug: [],
    einbehalt: null,
  };
}

function mockLadeErgebnis(details: KautionDetails) {
  getDetailsMock.mockResolvedValue({ success: true, data: { details, rechte: ALLE_RECHTE, vorschlag: null } });
}

async function oeffne(details: KautionDetails, initialTab?: string) {
  mockLadeErgebnis(details);
  mockStore(initialTab);
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  render(<KautionDialog />);
  await screen.findByRole("tab", { name: "Übersicht" });
  return user;
}

beforeEach(() => {
  jest.resetAllMocks();
  setzeFunktionen();
  mockStore();
});

/**
 * Räumt nach JEDEM Test auf, bevor `jest.setup.js` die Fake-Timer leert (Muster wie in `kaution-dialog.test.tsx`).
 */
function raeumeNachJedemTestAuf() {
  afterEach(async () => {
    cleanup();
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
  });
}

describe("KautionDialog: Tab Abrechnung", () => {
  raeumeNachJedemTestAuf();

  it("zeigt den Tab Abrechnung bei einem Bankkonto mit der Funktion abrechnung", async () => {
    setzeFunktionen({ abrechnung: true });
    await oeffne(barDetails());

    expect(screen.getByRole("tab", { name: "Abrechnung" })).toBeInTheDocument();
  });

  it("zeigt den Tab Abrechnung ohne die Funktion abrechnung nicht", async () => {
    setzeFunktionen({ abrechnung: false });
    await oeffne(barDetails());

    expect(screen.queryByRole("tab", { name: "Abrechnung" })).not.toBeInTheDocument();
  });

  it("zeigt den Tab Abrechnung bei einer Bürgschaft nicht, auch mit der Funktion", async () => {
    setzeFunktionen({ abrechnung: true });
    await oeffne(buergschaftDetails());

    expect(screen.getAllByRole("tab")).toHaveLength(1);
    expect(screen.queryByRole("tab", { name: "Abrechnung" })).not.toBeInTheDocument();
  });

  it("öffnet den Dialog direkt im Tab Abrechnung, wenn er so angefordert wird", async () => {
    setzeFunktionen({ abrechnung: true });
    await oeffne(barDetails(), "abrechnung");

    expect(screen.getByRole("tab", { name: "Abrechnung", selected: true })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "1. Abzüge erfassen" })).toBeInTheDocument();
  });

  it("öffnet aus „Abzug erfassen“ den Kontoauszug mit dem Buchungsformular Abzug", async () => {
    setzeFunktionen({ abrechnung: true });
    const user = await oeffne(barDetails(), "abrechnung");

    await user.click(screen.getByRole("button", { name: "Abzug erfassen" }));

    expect(await screen.findByRole("tab", { name: "Kontoauszug", selected: true })).toBeInTheDocument();
    const formular = await screen.findByTestId("kaution-buchung-form");
    expect(formular).toHaveAttribute("data-bewegungsart", "abzug");
    expect(within(formular).getByRole("heading", { name: "Abzug erfassen" })).toBeInTheDocument();
  });

  it("öffnet aus „Auszahlung erfassen“ den Kontoauszug mit dem Buchungsformular Auszahlung, vorbelegt mit dem Kontostand", async () => {
    setzeFunktionen({ abrechnung: true });
    const user = await oeffne(barDetails(), "abrechnung");

    await user.click(screen.getByRole("button", { name: "Auszahlung erfassen" }));

    expect(await screen.findByRole("tab", { name: "Kontoauszug", selected: true })).toBeInTheDocument();
    const formular = await screen.findByTestId("kaution-buchung-form");
    expect(formular).toHaveAttribute("data-bewegungsart", "auszahlung");
    expect(within(formular).getByLabelText("Betrag (€)")).toHaveValue("900,00");
  });
});

describe("KautionDialog: Einbehalt in der Übersicht", () => {
  raeumeNachJedemTestAuf();

  it("zeigt die Zeile Einbehalt mit Grund und Datum, wenn die Funktion abrechnung aktiv ist", async () => {
    setzeFunktionen({ abrechnung: true });
    await oeffne(barDetails({ einbehalt: { grund: "Nebenkostenabrechnung offen (Testdaten)", seit: "2026-03-01", liegedauer_tage: 14 } }));

    expect(screen.getByTestId("kaution-saldo-einbehalt")).toHaveTextContent(
      "Einbehalt: Nebenkostenabrechnung offen (Testdaten), seit 01.03.2026"
    );
  });

  it("zeigt die Zeile Einbehalt ohne die Funktion abrechnung nicht", async () => {
    setzeFunktionen({ abrechnung: false });
    await oeffne(barDetails({ einbehalt: { grund: "Nebenkostenabrechnung offen (Testdaten)", seit: "2026-03-01", liegedauer_tage: 14 } }));

    expect(screen.queryByTestId("kaution-saldo-einbehalt")).not.toBeInTheDocument();
  });
});
