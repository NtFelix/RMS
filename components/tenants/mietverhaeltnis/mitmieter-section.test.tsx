import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MitmieterSection } from "@/components/tenants/mietverhaeltnis/mitmieter-section";
import {
  abrechnungsmodusSetzenAction,
  getMitmieterUebersichtAction,
  mieterTrennenAction,
  mieterZusammenfuehrenAction,
} from "@/app/mietverhaeltnis-actions";
import { toast } from "@/hooks/use-toast";
import type { Mietverhaeltnis } from "@/types/Mietverhaeltnis";

jest.mock("@/app/mietverhaeltnis-actions", () => ({
  getMitmieterUebersichtAction: jest.fn(),
  mieterZusammenfuehrenAction: jest.fn(),
  mieterTrennenAction: jest.fn(),
  abrechnungsmodusSetzenAction: jest.fn(),
}));
jest.mock("@/hooks/use-toast", () => ({ toast: jest.fn() }));

// Test double for the combobox: every option is a button that selects it.
jest.mock("@/components/ui/custom-combobox", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  return {
    CustomCombobox: ({ options, onChange, id }: { options: { value: string; label: string }[]; onChange: (value: string | null) => void; id?: string }) =>
      createElement(
        "div",
        { id },
        options.map((option) => createElement("button", { key: option.value, type: "button", onClick: () => onChange(option.value) }, option.label))
      ),
  };
});
// Test double for the date picker: a plain text input that reports an ISO date.
jest.mock("@/components/ui/date-picker", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  return {
    DatePicker: ({ id, onChange, value }: { id?: string; value?: string; onChange: (date: Date | undefined) => void }) =>
      createElement("input", {
        id,
        "aria-label": "Datum",
        defaultValue: value,
        onChange: (event: { target: { value: string } }) => {
          const [j, m, t] = event.target.value.split("-").map(Number);
          onChange(j ? new Date(j, m - 1, t) : undefined);
        },
      }),
  };
});
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

// Synthetic placeholder IDs and names only
const MIETER_ID = "11111111-1111-4111-8111-111111111111";
const MV_ID = "22222222-2222-4222-8222-222222222222";
const ZIEL_MV_ID = "33333333-3333-4333-8333-333333333333";
const MITMIETER_ID = "55555555-5555-4555-8555-555555555555";

const mietverhaeltnis: Mietverhaeltnis = {
  id: MV_ID,
  wohnung_id: "66666666-6666-4666-8666-666666666666",
  vertragsbeginn: "2020-01-01",
  vertragsende: null,
  befristet_bis: null,
  kuendigung_eingang_am: null,
  kuendigung_zum: null,
  kuendigung_durch: null,
  abrechnungsmodus: "je_mieter",
  vertrag_dokument_id: null,
  notiz: null,
  quelle: "app",
};

const mockUebersicht = getMitmieterUebersichtAction as jest.Mock;
const mockZusammen = mieterZusammenfuehrenAction as jest.Mock;
const mockTrennen = mieterTrennenAction as jest.Mock;
const mockModus = abrechnungsmodusSetzenAction as jest.Mock;
const mockToast = toast as unknown as jest.Mock;
const onGeaendert = jest.fn();

const rendere = (mv = mietverhaeltnis) => render(<MitmieterSection mieterId={MIETER_ID} mietverhaeltnis={mv} onGeaendert={onGeaendert} />);
const datumEingeben = (wert: string) => fireEvent.change(screen.getByLabelText("Datum"), { target: { value: wert } });

beforeEach(() => {
  jest.clearAllMocks();
  mockUebersicht.mockResolvedValue({ success: true, data: { mitmieter: [], kandidaten: [] } });
  mockZusammen.mockResolvedValue({ success: true, data: { mietverhaeltnisId: ZIEL_MV_ID } });
  mockTrennen.mockResolvedValue({ success: true, data: { mietverhaeltnisId: MV_ID } });
  mockModus.mockResolvedValue({ success: true, data: undefined });
});

describe("MitmieterSection", () => {
  it("renders nothing when nobody shares the apartment", async () => {
    rendere();
    await waitFor(() => expect(mockUebersicht).toHaveBeenCalledWith(MIETER_ID));
    expect(screen.queryByTestId("mitmieter-section")).toBeNull();
  });

  it("renders nothing when the read fails", async () => {
    mockUebersicht.mockResolvedValue({ success: false, error: { code: "42501", message: "x" } });
    rendere();
    await waitFor(() => expect(mockUebersicht).toHaveBeenCalled());
    expect(screen.queryByTestId("mitmieter-section")).toBeNull();
  });

  it("lists fellow tenants with their role and offers to leave", async () => {
    mockUebersicht.mockResolvedValue({
      success: true,
      data: { mitmieter: [{ mieterId: MITMIETER_ID, name: "Test Zwei", rolle: "mitmieter" }], kandidaten: [] },
    });
    rendere();
    expect(await screen.findByText("Test Zwei (Mitmieter)")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Aus dem gemeinsamen Mietverhältnis lösen" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /hinzufügen/i })).toBeNull();
  });

  it("joins another tenancy: validates first, then calls the action and reports the change", async () => {
    mockUebersicht.mockResolvedValue({
      success: true,
      data: { mitmieter: [], kandidaten: [{ mietverhaeltnisId: ZIEL_MV_ID, mieterNamen: ["Test Drei", "Test Vier"] }] },
    });
    rendere();
    fireEvent.click(await screen.findByRole("button", { name: "Zu einem anderen Mietverhältnis der Wohnung hinzufügen" }));

    fireEvent.click(screen.getByRole("button", { name: "Hinzufügen" }));
    expect(screen.getByText("Bitte wählen Sie ein Mietverhältnis aus.")).toBeTruthy();
    expect(mockZusammen).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Test Drei, Test Vier" }));
    datumEingeben("2026-07-01");
    fireEvent.click(screen.getByRole("button", { name: "Mitmieter" }));
    fireEvent.click(screen.getByRole("button", { name: "Hinzufügen" }));

    await waitFor(() =>
      expect(mockZusammen).toHaveBeenCalledWith({ mieterId: MIETER_ID, zielMietverhaeltnisId: ZIEL_MV_ID, datum: "2026-07-01", rolle: "mitmieter" })
    );
    await waitFor(() => expect(onGeaendert).toHaveBeenCalledTimes(1));
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: "success" }));
  });

  it("shows the error of a rejected join and keeps the form open", async () => {
    mockZusammen.mockResolvedValue({ success: false, error: { code: "MV013", message: "Fehlertext der Datenbank" } });
    mockUebersicht.mockResolvedValue({
      success: true,
      data: { mitmieter: [], kandidaten: [{ mietverhaeltnisId: ZIEL_MV_ID, mieterNamen: ["Test Drei"] }] },
    });
    rendere();
    fireEvent.click(await screen.findByRole("button", { name: "Zu einem anderen Mietverhältnis der Wohnung hinzufügen" }));
    fireEvent.click(screen.getByRole("button", { name: "Test Drei" }));
    datumEingeben("2026-07-01");
    fireEvent.click(screen.getByRole("button", { name: "Hinzufügen" }));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ description: "Fehlertext der Datenbank", variant: "destructive" })));
    expect(onGeaendert).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Hinzufügen" })).toBeTruthy();
  });

  it("leaves the shared tenancy with an optional rent", async () => {
    mockUebersicht.mockResolvedValue({
      success: true,
      data: { mitmieter: [{ mieterId: MITMIETER_ID, name: "Test Zwei", rolle: null }], kandidaten: [] },
    });
    rendere();
    fireEvent.click(await screen.findByRole("button", { name: "Aus dem gemeinsamen Mietverhältnis lösen" }));
    fireEvent.click(screen.getByRole("button", { name: "Lösen" }));
    expect(mockTrennen).not.toHaveBeenCalled();

    datumEingeben("2026-09-01");
    fireEvent.change(screen.getByPlaceholderText("Optional (€)"), { target: { value: "450,50" } });
    fireEvent.click(screen.getByRole("button", { name: "Lösen" }));
    await waitFor(() => expect(mockTrennen).toHaveBeenCalledWith({ mieterId: MIETER_ID, datum: "2026-09-01", miete: 450.5 }));
    await waitFor(() => expect(onGeaendert).toHaveBeenCalledTimes(1));
  });

  it("switches the settlement mode and tells the parent", async () => {
    mockUebersicht.mockResolvedValue({
      success: true,
      data: { mitmieter: [{ mieterId: MITMIETER_ID, name: "Test Zwei", rolle: null }], kandidaten: [] },
    });
    rendere();
    const schalter = await screen.findByRole("switch", { name: /Eine Abrechnung für das ganze Mietverhältnis/ });
    expect(schalter.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(schalter);
    await waitFor(() => expect(mockModus).toHaveBeenCalledWith({ mieterId: MIETER_ID, modus: "gemeinsam" }));
    await waitFor(() => expect(onGeaendert).toHaveBeenCalledTimes(1));
  });

  it("keeps the saved mode on the switch even if the parent does not reload", async () => {
    mockUebersicht.mockResolvedValue({
      success: true,
      data: { mitmieter: [{ mieterId: MITMIETER_ID, name: "Test Zwei", rolle: null }], kandidaten: [] },
    });
    rendere();
    const schalter = await screen.findByRole("switch");
    fireEvent.click(schalter);
    await waitFor(() => expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("true"));
  });

  it("does not switch when saving fails", async () => {
    mockModus.mockResolvedValue({ success: false, error: { code: "42501", message: "Keine Berechtigung" } });
    mockUebersicht.mockResolvedValue({
      success: true,
      data: { mitmieter: [{ mieterId: MITMIETER_ID, name: "Test Zwei", rolle: null }], kandidaten: [] },
    });
    rendere();
    fireEvent.click(await screen.findByRole("switch"));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" })));
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("false");
  });

  it("shows the shared mode as switched on", async () => {
    mockUebersicht.mockResolvedValue({
      success: true,
      data: { mitmieter: [{ mieterId: MITMIETER_ID, name: "Test Zwei", rolle: null }], kandidaten: [] },
    });
    rendere({ ...mietverhaeltnis, abrechnungsmodus: "gemeinsam" });
    const schalter = await screen.findByRole("switch");
    expect(schalter.getAttribute("aria-checked")).toBe("true");
  });
});
