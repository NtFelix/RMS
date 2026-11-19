/**
 * Selection of one deposit when a tenant has several (GH-6). Uses the REAL modal store; the dialog only shows the
 * list and hands the choice to the store. All values are synthetic placeholders.
 */
import React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KautionAuswahlDialog } from "@/components/kaution/kaution-auswahl-dialog";
import type { KautionListenEintrag } from "@/types/Kaution";

// `jest.setup.js` ersetzt den Store global durch einen Mock: hier läuft der echte Store.
const { useModalStore } = jest.requireActual<typeof import("@/hooks/use-modal-store")>("@/hooks/use-modal-store");
jest.mock("@/hooks/use-modal-store", () => jest.requireActual("@/hooks/use-modal-store"));

const tenant = { id: "tenant-1", name: "Erika Mustermann", wohnung_id: "wohnung-1" };

const altEintrag: KautionListenEintrag = {
  kautionId: "kaution-alt",
  mietverhaeltnisId: "mv-alt",
  kautionsart: "barkaution",
  sollBetrag: 1500,
  kontostand: 0,
  istAktuell: false,
  vertragsbeginn: "2020-01-01",
  vertragsende: "2021-12-31",
};

const aktuellerEintrag: KautionListenEintrag = {
  kautionId: "kaution-neu",
  mietverhaeltnisId: "mv-neu",
  kautionsart: "sparbuch",
  sollBetrag: 2000,
  kontostand: 1200,
  istAktuell: true,
  vertragsbeginn: "2022-03-01",
  vertragsende: null,
};

function oeffneAuswahl(eintraege: KautionListenEintrag[]) {
  useModalStore.getState().openKautionAuswahl(tenant, eintraege);
}

describe("KautionAuswahlDialog", () => {
  beforeEach(() => {
    cleanup();
    useModalStore.setState({
      kautionAuswahl: null,
      isKautionModalOpen: false,
      kautionInitialData: undefined,
      isKautionModalDirty: false,
    });
  });

  it("renders nothing while no selection is open", () => {
    render(<KautionAuswahlDialog />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows title, description and one row per deposit with its details", () => {
    oeffneAuswahl([altEintrag, aktuellerEintrag]);
    render(<KautionAuswahlDialog />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Kaution von Erika Mustermann")).toBeInTheDocument();
    expect(screen.getByText("Dieser Mieter hat mehrere Kautionen. Bitte wählen Sie eine aus.")).toBeInTheDocument();

    const alt = screen.getByRole("button", { name: /Barkaution/ });
    expect(within(alt).getByText(/Soll 1.500,00 €/)).toBeInTheDocument();
    expect(within(alt).getByText(/Kontostand 0,00 €/)).toBeInTheDocument();
    expect(within(alt).getByText(/01\.01\.2020 – 31\.12\.2021/)).toBeInTheDocument();
    expect(within(alt).queryByText("Aktuelles Mietverhältnis")).not.toBeInTheDocument();

    const aktuell = screen.getByRole("button", { name: /Sparbuch/ });
    expect(within(aktuell).getByText("Aktuelles Mietverhältnis")).toBeInTheDocument();
    expect(within(aktuell).getByText(/Soll 2.000,00 €/)).toBeInTheDocument();
    expect(within(aktuell).getByText(/Kontostand 1.200,00 €/)).toBeInTheDocument();
    expect(within(aktuell).getByText(/01\.03\.2022 – laufend/)).toBeInTheDocument();
  });

  it("opens the chosen deposit by its id and closes the selection", async () => {
    const user = userEvent.setup();
    oeffneAuswahl([altEintrag, aktuellerEintrag]);
    render(<KautionAuswahlDialog />);

    await user.click(screen.getByRole("button", { name: /Barkaution/ }));

    const state = useModalStore.getState();
    expect(state.kautionAuswahl).toBeNull();
    expect(state.isKautionModalOpen).toBe(true);
    expect(state.kautionInitialData).toMatchObject({ tenant, kautionId: "kaution-alt" });
  });

  it("offers a new deposit when no entry belongs to the current tenancy, and opens the dialog without id", async () => {
    const user = userEvent.setup();
    oeffneAuswahl([altEintrag]);
    render(<KautionAuswahlDialog />);

    await user.click(screen.getByRole("button", { name: /Neue Kaution für das aktuelle Mietverhältnis/ }));

    const state = useModalStore.getState();
    expect(state.kautionAuswahl).toBeNull();
    expect(state.isKautionModalOpen).toBe(true);
    expect(state.kautionInitialData?.tenant).toEqual(tenant);
    expect(state.kautionInitialData?.kautionId).toBeUndefined();
  });

  it("does not offer a new deposit when a current entry exists", () => {
    oeffneAuswahl([altEintrag, aktuellerEintrag]);
    render(<KautionAuswahlDialog />);

    expect(screen.queryByRole("button", { name: /Neue Kaution/ })).not.toBeInTheDocument();
  });

  it("closes without opening the deposit dialog on cancel", async () => {
    const user = userEvent.setup();
    oeffneAuswahl([altEintrag, aktuellerEintrag]);
    render(<KautionAuswahlDialog />);

    await user.click(screen.getByRole("button", { name: "Abbrechen" }));

    expect(useModalStore.getState().kautionAuswahl).toBeNull();
    expect(useModalStore.getState().isKautionModalOpen).toBe(false);
  });
});
