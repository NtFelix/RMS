import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { TenantMieteSection } from "@/components/tenants/tenant-miete-section";
import {
  getMietverhaeltnisUebersichtAction,
  mieteEntfernenAction,
  mieteSetzenAction,
} from "@/app/mietverhaeltnis-actions";

jest.mock("@/app/mietverhaeltnis-actions", () => ({
  getMietverhaeltnisUebersichtAction: jest.fn(),
  mieteSetzenAction: jest.fn(),
  mieteEntfernenAction: jest.fn(),
}));

jest.mock("@/hooks/use-toast", () => ({
  toast: jest.fn(),
}));

// jsdom kennt ResizeObserver nicht (Radix)
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const MIETER_ID = "11111111-1111-4111-8111-111111111111";
const MV_ID = "22222222-2222-4222-8222-222222222222";
const MIETE_NEU = "33333333-3333-4333-8333-333333333333";
const MIETE_ALT = "44444444-4444-4444-8444-444444444444";

const mockUebersicht = getMietverhaeltnisUebersichtAction as jest.Mock;
const mockSetzen = mieteSetzenAction as jest.Mock;
const mockEntfernen = mieteEntfernenAction as jest.Mock;

const mietverhaeltnis = {
  id: MV_ID,
  wohnung_id: "66666666-6666-4666-8666-666666666666",
  vertragsbeginn: "2020-01-01",
  vertragsende: null,
  befristet_bis: null,
  kuendigung_eingang_am: null,
  kuendigung_zum: null,
  kuendigung_durch: null,
  abrechnungsmodus: "je_mieter" as const,
  vertrag_dokument_id: null,
  notiz: null,
  quelle: "app" as const,
};

const historie = [
  { miete_id: MIETE_NEU, gueltig_ab: "2024-06-01", betrag: 850, aenderungsart: "vereinbarung", grund: "Indexierung", quelle: "app" as const },
  { miete_id: MIETE_ALT, gueltig_ab: "2020-01-01", betrag: 700, aenderungsart: "vereinbarung", grund: null, quelle: "migration_bestand" as const },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockUebersicht.mockResolvedValue({ success: true, data: { mietverhaeltnis: null, mieten: [], wohnungsmiete: 800 } });
  mockSetzen.mockResolvedValue({ success: true, data: { mieteId: MIETE_NEU } });
  mockEntfernen.mockResolvedValue({ success: true, data: undefined });
});

describe("TenantMieteSection", () => {
  it("shows a note and the apartment rent without tenancy, without an error", async () => {
    render(<TenantMieteSection mieterId={MIETER_ID} />);

    expect(await screen.findByText(/noch kein Mietverhältnis angelegt/)).toBeInTheDocument();
    expect(screen.getByText(/Es gilt die Miete der Wohnung/)).toBeInTheDocument();
    expect(screen.getByText("800,00 €")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("Miethistorie")).not.toBeInTheDocument();
    expect(mockUebersicht).toHaveBeenCalledWith(MIETER_ID);
  });

  it("shows the history as a list and the current rent for today", async () => {
    mockUebersicht.mockResolvedValue({ success: true, data: { mietverhaeltnis, mieten: historie, wohnungsmiete: 800 } });
    render(<TenantMieteSection mieterId={MIETER_ID} />);

    const liste = await screen.findByRole("list");
    const eintraege = within(liste).getAllByRole("listitem");
    expect(eintraege).toHaveLength(2);
    expect(within(eintraege[0]).getByText(/ab 01\.06\.2024: 850,00 €/)).toBeInTheDocument();
    expect(within(eintraege[0]).getByText("Indexierung")).toBeInTheDocument();
    expect(within(eintraege[1]).getByText("aus Bestand übernommen")).toBeInTheDocument();
    expect(screen.getByText("01.01.2020")).toBeInTheDocument();
    // Latest entry up to today (2024 is in the past for any test run date)
    expect(screen.getByText("Aktuelle Miete").nextSibling).toHaveTextContent("850,00 €");
  });

  it("submits a new rent with the entered values", async () => {
    mockUebersicht.mockResolvedValue({ success: true, data: { mietverhaeltnis, mieten: historie, wohnungsmiete: 800 } });
    render(<TenantMieteSection mieterId={MIETER_ID} />);
    await screen.findByRole("list");

    fireEvent.change(screen.getByLabelText("Gültig ab"), { target: { value: "2026-04-01" } });
    fireEvent.change(screen.getByLabelText("Monatliche Miete (EUR)"), { target: { value: "850,50" } });
    fireEvent.change(screen.getByLabelText("Grund (optional)"), { target: { value: "  Erhöhung " } });
    fireEvent.click(screen.getByRole("button", { name: "Miete speichern" }));

    await waitFor(() =>
      expect(mockSetzen).toHaveBeenCalledWith({ mieterId: MIETER_ID, gueltigAb: "2026-04-01", betrag: 850.5, grund: "Erhöhung" })
    );
    // reload after success
    await waitFor(() => expect(mockUebersicht).toHaveBeenCalledTimes(2));
  });

  it("does not call the action for an invalid amount", async () => {
    mockUebersicht.mockResolvedValue({ success: true, data: { mietverhaeltnis, mieten: historie, wohnungsmiete: 800 } });
    render(<TenantMieteSection mieterId={MIETER_ID} />);
    await screen.findByRole("list");

    fireEvent.change(screen.getByLabelText("Gültig ab"), { target: { value: "2026-04-01" } });
    fireEvent.change(screen.getByLabelText("Monatliche Miete (EUR)"), { target: { value: "8,555" } });
    fireEvent.click(screen.getByRole("button", { name: "Miete speichern" }));

    expect(await screen.findByText(/höchstens zwei Nachkommastellen/)).toBeInTheDocument();
    expect(mockSetzen).not.toHaveBeenCalled();
  });

  it("removes an entry only after confirmation", async () => {
    mockUebersicht.mockResolvedValue({ success: true, data: { mietverhaeltnis, mieten: historie, wohnungsmiete: 800 } });
    render(<TenantMieteSection mieterId={MIETER_ID} />);
    await screen.findByRole("list");

    fireEvent.click(screen.getByRole("button", { name: "Miete ab 01.06.2024 entfernen" }));
    expect(mockEntfernen).not.toHaveBeenCalled();

    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Entfernen" }));

    await waitFor(() => expect(mockEntfernen).toHaveBeenCalledWith({ mieterId: MIETER_ID, mieteId: MIETE_NEU }));
  });

  it("shows an error state with retry when loading fails", async () => {
    mockUebersicht.mockResolvedValueOnce({ success: false, error: { code: "42501", message: "Für diese Aktion fehlt die Berechtigung (Modul Mieter)." } });
    mockUebersicht.mockResolvedValueOnce({ success: true, data: { mietverhaeltnis: null, mieten: [], wohnungsmiete: null } });
    render(<TenantMieteSection mieterId={MIETER_ID} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Für diese Aktion fehlt die Berechtigung");
    fireEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));
    expect(await screen.findByText(/noch kein Mietverhältnis angelegt/)).toBeInTheDocument();
  });

  it("does not submit the surrounding form on Enter in a field", async () => {
    mockUebersicht.mockResolvedValue({ success: true, data: { mietverhaeltnis, mieten: historie, wohnungsmiete: 800 } });
    const onSubmit = jest.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <TenantMieteSection mieterId={MIETER_ID} />
        <button type="submit">Speichern</button>
      </form>
    );
    await screen.findByRole("list");
    const betrag = screen.getByLabelText("Monatliche Miete (EUR)");
    const enter = fireEvent.keyDown(betrag, { key: "Enter" });
    expect(enter).toBe(false); // default prevented
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
