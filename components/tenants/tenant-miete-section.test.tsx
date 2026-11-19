import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { TenantMieteSection } from "@/components/tenants/tenant-miete-section";
import {
  getMietverhaeltnisUebersichtAction,
  mieteEntfernenAction,
  mietverhaeltnisAnlegenAction,
  mieteSetzenAction,
  mieterUmzugAction,
  vertragsdatenSpeichernAction,
} from "@/app/mietverhaeltnis-actions";
import { toast } from "@/hooks/use-toast";

jest.mock("@/app/mietverhaeltnis-actions", () => ({
  getMietverhaeltnisUebersichtAction: jest.fn(),
  mieteEntfernenAction: jest.fn(),
  mietverhaeltnisAnlegenAction: jest.fn(),
  vertragsdatenSpeichernAction: jest.fn(),
  mieteSetzenAction: jest.fn(),
  mieterUmzugAction: jest.fn(),
  // Phase 6: no other tenants in these tests, the section stays hidden
  getMitmieterUebersichtAction: jest.fn().mockResolvedValue({ success: true, data: { mitmieter: [], kandidaten: [] } }),
  mieterZusammenfuehrenAction: jest.fn(),
  mieterTrennenAction: jest.fn(),
  abrechnungsmodusSetzenAction: jest.fn(),
}));

jest.mock("@/hooks/use-toast", () => ({
  toast: jest.fn(),
}));

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

// jsdom kennt ResizeObserver nicht (Radix)
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

// Synthetic placeholder IDs and values only
const MIETER_ID = "11111111-1111-4111-8111-111111111111";
const MV_ID = "22222222-2222-4222-8222-222222222222";
const MIETE_NEU = "33333333-3333-4333-8333-333333333333";
const MIETE_ALT = "44444444-4444-4444-8444-444444444444";
const WOHNUNG_AKTUELL = "66666666-6666-4666-8666-666666666666";
const WOHNUNG_NEU = "77777777-7777-4777-8777-777777777777";
const WOHNUNG_DRITTE = "99999999-9999-4999-8999-999999999999";
const NEU_MV_ID_UMZUG = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MV013_MELDUNG = "Das Mietverhältnis hat weitere Mieter. Bitte trennen Sie zuerst den Mieter vom gemeinsamen Mietverhältnis.";

/** Apartment options as the tenant dialog passes them; the current apartment of the tenancy is among them. */
const WOHNUNGEN = [
  { value: WOHNUNG_AKTUELL, label: "Erdgeschoss" },
  { value: WOHNUNG_NEU, label: "Dachgeschoss" },
  { value: WOHNUNG_DRITTE, label: "Hinterhaus" },
];

const mockUebersicht = getMietverhaeltnisUebersichtAction as jest.Mock;
const mockEntfernen = mieteEntfernenAction as jest.Mock;
const mockAnlegen = mietverhaeltnisAnlegenAction as jest.Mock;
const mockVertragsdaten = vertragsdatenSpeichernAction as jest.Mock;
const mockSetzen = mieteSetzenAction as jest.Mock;
const mockUmzug = mieterUmzugAction as jest.Mock;
const mockToast = toast as unknown as jest.Mock;
const mockOnUmzug = jest.fn();

const mietverhaeltnis = {
  id: MV_ID,
  wohnung_id: "66666666-6666-4666-8666-666666666666",
  vertragsbeginn: "2020-01-01",
  vertragsende: "2027-12-31",
  befristet_bis: null,
  kuendigung_eingang_am: null,
  kuendigung_zum: null,
  kuendigung_durch: "mieter" as const,
  abrechnungsmodus: "je_mieter" as const,
  vertrag_dokument_id: null,
  notiz: null,
  quelle: "app" as const,
};

const historie = [
  {
    miete_id: MIETE_NEU,
    gueltig_ab: "2024-06-01",
    betrag: 850,
    aenderungsart: "vereinbarung",
    grund: "Indexierung",
    erklaert_am: "2024-05-15",
    quelle: "app" as const,
  },
  { miete_id: MIETE_ALT, gueltig_ab: "2020-01-01", betrag: 700, aenderungsart: "vereinbarung", grund: null, erklaert_am: null, quelle: "migration_bestand" as const },
];

const ohneMietverhaeltnis = { mietverhaeltnis: null, mieten: [], wohnungsmiete: 800, mieterEinzug: "2020-01-01", istBewerber: false };
const mitMietverhaeltnis = { mietverhaeltnis, mieten: historie, wohnungsmiete: 800, mieterEinzug: "2020-01-01", istBewerber: false };

beforeEach(() => {
  jest.clearAllMocks();
  mockUebersicht.mockResolvedValue({ success: true, data: ohneMietverhaeltnis });
  mockAnlegen.mockResolvedValue({ success: true, data: { mietverhaeltnisId: MV_ID } });
  mockVertragsdaten.mockResolvedValue({ success: true, data: undefined });
  mockSetzen.mockResolvedValue({ success: true, data: { mieteId: MIETE_NEU } });
  mockEntfernen.mockResolvedValue({ success: true, data: undefined });
  mockUmzug.mockResolvedValue({ success: true, data: { mietverhaeltnisId: NEU_MV_ID_UMZUG } });
});

/** Field of the section by the end of its id (the ids carry a React `useId` prefix). */
function feld(container: HTMLElement, name: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(`[id$="-${name}"]`);
  if (!element) throw new Error(`Feld ${name} nicht gefunden`);
  return element;
}

const setze = (element: HTMLElement, value: string) => fireEvent.change(element, { target: { value } });

/** Loads the section with a tenancy and waits until the history is shown. */
async function mitVertrag() {
  mockUebersicht.mockResolvedValue({ success: true, data: mitMietverhaeltnis });
  const ergebnis = render(<TenantMieteSection mieterId={MIETER_ID} />);
  await screen.findByRole("list");
  return ergebnis;
}

/** Same, with the form for a rent change opened. */
async function mitOffenerMietaenderung() {
  const ergebnis = await mitVertrag();
  fireEvent.click(screen.getByRole("button", { name: "Mietänderung erfassen" }));
  await screen.findByRole("button", { name: "Mietänderung speichern" });
  return ergebnis;
}

describe("TenantMieteSection without tenancy", () => {
  it("shows a note and the apartment rent, without an error", async () => {
    render(<TenantMieteSection mieterId={MIETER_ID} />);

    expect(await screen.findByText(/noch kein Mietverhältnis angelegt/)).toBeInTheDocument();
    expect(screen.getByText(/Es gilt die Miete der Wohnung/)).toBeInTheDocument();
    expect(screen.getByText("800,00 €")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("Miethistorie")).not.toBeInTheDocument();
    expect(mockUebersicht).toHaveBeenCalledWith(MIETER_ID);
  });

  it("shows the create form pre-filled with move-in date and apartment rent", async () => {
    const { container } = render(<TenantMieteSection mieterId={MIETER_ID} />);
    await screen.findByRole("button", { name: "Mietverhältnis anlegen" });

    expect(feld(container, "beginn")).toHaveValue("01.01.2020");
    expect(feld(container, "miete")).toHaveValue("800");
  });

  it("creates the tenancy with the entered values and reloads", async () => {
    const { container } = render(<TenantMieteSection mieterId={MIETER_ID} />);
    await screen.findByRole("button", { name: "Mietverhältnis anlegen" });

    setze(feld(container, "beginn"), "01.01.2026");
    setze(feld(container, "miete"), "850,50");
    fireEvent.click(screen.getByRole("button", { name: "Mietverhältnis anlegen" }));

    await waitFor(() => expect(mockAnlegen).toHaveBeenCalledWith({ mieterId: MIETER_ID, vertragsbeginn: "2026-01-01", miete: 850.5 }));
    await waitFor(() => expect(mockUebersicht).toHaveBeenCalledTimes(2));
    // Wait until the form has finished saving, so its state updates do not leak into the next test.
    await waitFor(() => expect(screen.getByRole("button", { name: "Mietverhältnis anlegen" })).toBeEnabled());
  });

  it("sends no rent when the rent field is empty", async () => {
    const { container } = render(<TenantMieteSection mieterId={MIETER_ID} />);
    await screen.findByRole("button", { name: "Mietverhältnis anlegen" });

    setze(feld(container, "miete"), "");
    fireEvent.click(screen.getByRole("button", { name: "Mietverhältnis anlegen" }));

    await waitFor(() => expect(mockAnlegen).toHaveBeenCalledWith({ mieterId: MIETER_ID, vertragsbeginn: "2020-01-01", miete: null }));
    // Wait until the form has finished saving, so its state updates do not leak into the next test.
    await waitFor(() => expect(screen.getByRole("button", { name: "Mietverhältnis anlegen" })).toBeEnabled());
  });

  it("marks an invalid rent at the field and does not call the action", async () => {
    const { container } = render(<TenantMieteSection mieterId={MIETER_ID} />);
    await screen.findByRole("button", { name: "Mietverhältnis anlegen" });

    setze(feld(container, "miete"), "8,555");
    fireEvent.click(screen.getByRole("button", { name: "Mietverhältnis anlegen" }));

    expect(await screen.findByText(/höchstens zwei Nachkommastellen/)).toBeInTheDocument();
    expect(feld(container, "miete")).toHaveAttribute("aria-invalid", "true");
    expect(feld(container, "miete")).toHaveAttribute("aria-describedby", expect.stringContaining("-fehler"));
    expect(mockAnlegen).not.toHaveBeenCalled();
  });

  it("requires a contract start and does not call the action without one", async () => {
    mockUebersicht.mockResolvedValue({ success: true, data: { ...ohneMietverhaeltnis, mieterEinzug: null } });
    render(<TenantMieteSection mieterId={MIETER_ID} />);
    fireEvent.click(await screen.findByRole("button", { name: "Mietverhältnis anlegen" }));

    expect(await screen.findByText("Bitte geben Sie ein gültiges Datum an.")).toBeInTheDocument();
    expect(mockAnlegen).not.toHaveBeenCalled();
  });

  it("does not show the create form to applicants, only the note", async () => {
    mockUebersicht.mockResolvedValue({ success: true, data: { ...ohneMietverhaeltnis, mieterEinzug: null, istBewerber: true } });
    render(<TenantMieteSection mieterId={MIETER_ID} />);

    expect(await screen.findByText(/erst angelegt, wenn sie als Mieter geführt werden/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mietverhältnis anlegen" })).not.toBeInTheDocument();
  });
});

describe("TenantMieteSection move to another apartment", () => {
  /** Section with a tenancy and the apartment options. */
  async function mitUmzug(optionen: { value: string; label: string }[] | undefined) {
    mockUebersicht.mockResolvedValue({ success: true, data: mitMietverhaeltnis });
    const ergebnis = render(<TenantMieteSection mieterId={MIETER_ID} wohnungen={optionen} onUmzug={mockOnUmzug} />);
    await screen.findByRole("list");
    return ergebnis;
  }

  /** Same, with the move form opened. */
  async function mitOffenemUmzug(optionen: { value: string; label: string }[] = WOHNUNGEN) {
    const ergebnis = await mitUmzug(optionen);
    fireEvent.click(screen.getByRole("button", { name: "Umzug in eine andere Wohnung" }));
    await screen.findByRole("button", { name: "Umzug speichern" });
    return ergebnis;
  }

  it("shows the move only when apartments are passed", async () => {
    await mitUmzug(undefined);
    expect(screen.queryByText("Wohnungswechsel")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Umzug in eine andere Wohnung" })).not.toBeInTheDocument();
  });

  it("shows nothing for an empty apartment list", async () => {
    await mitUmzug([]);
    expect(screen.queryByText("Wohnungswechsel")).not.toBeInTheDocument();
  });

  it("shows the heading and the button, and opens the form in a card on click", async () => {
    await mitUmzug(WOHNUNGEN);
    expect(screen.getByText("Wohnungswechsel")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Umzug speichern" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Umzug in eine andere Wohnung" }));
    expect(await screen.findByRole("button", { name: "Umzug speichern" })).toBeInTheDocument();
    expect(screen.getByText("Das bisherige Mietverhältnis endet am Vortag. In der neuen Wohnung beginnt ein neues Mietverhältnis.")).toBeInTheDocument();
  });

  it("offers every apartment except the current one of the tenancy", async () => {
    await mitOffenemUmzug();
    expect(screen.getByRole("button", { name: "Dachgeschoss" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hinterhaus" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Erdgeschoss" })).not.toBeInTheDocument();
  });

  it("closes the form on cancel without an action call", async () => {
    await mitOffenemUmzug();
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(screen.queryByRole("button", { name: "Umzug speichern" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Umzug in eine andere Wohnung" })).toBeInTheDocument();
    expect(mockUmzug).not.toHaveBeenCalled();
  });

  it("requires the apartment and the date at the fields, without an action call", async () => {
    const { container } = await mitOffenemUmzug();
    fireEvent.click(screen.getByRole("button", { name: "Umzug speichern" }));

    expect(await screen.findByText("Bitte wählen Sie eine Wohnung aus.")).toBeInTheDocument();
    expect(screen.getByText("Bitte geben Sie ein gültiges Datum an.")).toBeInTheDocument();
    expect(feld(container, "umzugDatum")).toHaveAttribute("aria-invalid", "true");
    expect(mockUmzug).not.toHaveBeenCalled();
  });

  it("rejects an invalid rent at the field, without an action call", async () => {
    const { container } = await mitOffenemUmzug();
    fireEvent.click(screen.getByRole("button", { name: "Dachgeschoss" }));
    setze(feld(container, "umzugDatum"), "01.04.2026");
    setze(feld(container, "umzugMiete"), "8,555");
    fireEvent.click(screen.getByRole("button", { name: "Umzug speichern" }));

    expect(await screen.findByText(/höchstens zwei Nachkommastellen/)).toBeInTheDocument();
    expect(mockUmzug).not.toHaveBeenCalled();
  });

  it("moves with the entered values, closes the form and passes the new apartment on", async () => {
    const { container } = await mitOffenemUmzug();
    fireEvent.click(screen.getByRole("button", { name: "Dachgeschoss" }));
    setze(feld(container, "umzugDatum"), "01.04.2026");
    setze(feld(container, "umzugMiete"), "920,50");
    fireEvent.click(screen.getByRole("button", { name: "Umzug speichern" }));

    await waitFor(() =>
      expect(mockUmzug).toHaveBeenCalledWith({ mieterId: MIETER_ID, wohnungId: WOHNUNG_NEU, datum: "2026-04-01", miete: 920.5 })
    );
    await waitFor(() => expect(mockOnUmzug).toHaveBeenCalledWith(WOHNUNG_NEU));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Umzug speichern" })).not.toBeInTheDocument());
    expect(await screen.findByRole("button", { name: "Umzug in eine andere Wohnung" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Umzug speichern" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Kaution bleibt unverändert bei dieser Person");
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ description: "Der Umzug wurde gespeichert." }));
    await waitFor(() => expect(mockUebersicht).toHaveBeenCalledTimes(2));
  });

  it("sends null for the rent when it is left empty", async () => {
    const { container } = await mitOffenemUmzug();
    fireEvent.click(screen.getByRole("button", { name: "Hinterhaus" }));
    setze(feld(container, "umzugDatum"), "01.05.2026");
    fireEvent.click(screen.getByRole("button", { name: "Umzug speichern" }));

    await waitFor(() =>
      expect(mockUmzug).toHaveBeenCalledWith({ mieterId: MIETER_ID, wohnungId: WOHNUNG_DRITTE, datum: "2026-05-01", miete: null })
    );
  });

  it("shows an error of the action as toast and keeps the form open", async () => {
    mockUmzug.mockResolvedValueOnce({ success: false, error: { code: "MV013", message: MV013_MELDUNG } });
    const { container } = await mitOffenemUmzug();
    fireEvent.click(screen.getByRole("button", { name: "Dachgeschoss" }));
    setze(feld(container, "umzugDatum"), "01.04.2026");
    fireEvent.click(screen.getByRole("button", { name: "Umzug speichern" }));

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ description: MV013_MELDUNG, variant: "destructive" })));
    expect(screen.getByRole("button", { name: "Umzug speichern" })).toBeInTheDocument();
    expect(mockOnUmzug).not.toHaveBeenCalled();
  });
});

describe("TenantMieteSection with tenancy", () => {
  it("shows the history as a list and the current rent for today", async () => {
    const { container } = await mitVertrag();

    const eintraege = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(eintraege).toHaveLength(2);
    expect(eintraege[0]).toHaveTextContent("850,00 € ab 01.06.2024");
    expect(eintraege[0]).toHaveTextContent("Indexierung");
    expect(eintraege[1]).toHaveTextContent("aus Bestand übernommen");
    expect(feld(container, "beginn")).toHaveTextContent("01.01.2020");
    // Latest entry up to today (2024 is in the past for any test run date)
    expect(feld(container, "miete")).toHaveTextContent("850,00 €");
  });

  it("shows the apartment rent as current rent when the history is empty", async () => {
    mockUebersicht.mockResolvedValue({ success: true, data: { ...mitMietverhaeltnis, mieten: [] } });
    const { container } = render(<TenantMieteSection mieterId={MIETER_ID} />);
    await screen.findByText("Noch keine Miete in der Historie erfasst");

    expect(feld(container, "miete")).toHaveTextContent("800,00 € (Miete der Wohnung)");
  });

  it("shows the reason and the declaration date in the history, but not the default type", async () => {
    await mitVertrag();

    const eintraege = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(eintraege[0]).toHaveTextContent("erklärt am 15.05.2024 · Indexierung");
    expect(eintraege[1]).not.toHaveTextContent(/erklärt am/);
  });

  it("pre-fills the contract data and offers saving only after a change", async () => {
    const { container } = await mitVertrag();

    expect(feld(container, "vertragsende")).toHaveValue("31.12.2027");
    expect(screen.getByRole("button", { name: "Mieter" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: "Vertragsdaten speichern" })).not.toBeInTheDocument();

    setze(feld(container, "notiz"), "Nachtrag");
    expect(screen.getByRole("button", { name: "Vertragsdaten speichern" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Verwerfen" }));
    expect(screen.queryByRole("button", { name: "Vertragsdaten speichern" })).not.toBeInTheDocument();
    expect(feld(container, "notiz")).toHaveValue("");
  });

  it("saves all contract fields, with null for empty ones", async () => {
    const { container } = await mitVertrag();

    setze(feld(container, "befristetBis"), "30.06.2028");
    setze(feld(container, "kuendigungEingangAm"), "01.09.2026");
    fireEvent.click(screen.getByRole("button", { name: "Vermieter" }));
    setze(feld(container, "notiz"), "  Haustiere erlaubt  ");
    setze(feld(container, "vertragsende"), "");
    fireEvent.click(screen.getByRole("button", { name: "Vertragsdaten speichern" }));

    await waitFor(() =>
      expect(mockVertragsdaten).toHaveBeenCalledWith({
        mieterId: MIETER_ID,
        vertragsende: null,
        befristetBis: "2028-06-30",
        kuendigungEingangAm: "2026-09-01",
        kuendigungZum: null,
        kuendigungDurch: "vermieter",
        notiz: "Haustiere erlaubt",
      })
    );
    await waitFor(() => expect(mockUebersicht).toHaveBeenCalledTimes(2));
  });

  it("sends null for 'Keine Angabe' in the termination party", async () => {
    await mitVertrag();

    fireEvent.click(screen.getByRole("button", { name: "Keine Angabe" }));
    fireEvent.click(screen.getByRole("button", { name: "Vertragsdaten speichern" }));

    await waitFor(() => expect(mockVertragsdaten).toHaveBeenCalledWith(expect.objectContaining({ kuendigungDurch: null, notiz: null })));
  });

  it("rejects a note that is too long at the field, without an action call", async () => {
    const { container } = await mitVertrag();

    setze(feld(container, "notiz"), "x".repeat(2001));
    fireEvent.click(screen.getByRole("button", { name: "Vertragsdaten speichern" }));

    expect(await screen.findByText("Die Notiz darf höchstens 2000 Zeichen lang sein.")).toBeInTheDocument();
    expect(feld(container, "notiz")).toHaveAttribute("aria-invalid", "true");
    expect(mockVertragsdaten).not.toHaveBeenCalled();
  });

  it("opens the form for a rent change on click and closes it on cancel", async () => {
    await mitVertrag();
    expect(screen.queryByRole("button", { name: "Mietänderung speichern" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mietänderung erfassen" }));
    expect(await screen.findByRole("button", { name: "Mietänderung speichern" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(screen.queryByRole("button", { name: "Mietänderung speichern" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mietänderung erfassen" })).toBeInTheDocument();
  });

  it("requires amount and effective date, without an action call", async () => {
    await mitOffenerMietaenderung();

    fireEvent.click(screen.getByRole("button", { name: "Mietänderung speichern" }));

    expect(await screen.findByText(/höchstens zwei Nachkommastellen/)).toBeInTheDocument();
    expect(screen.getByText("Bitte geben Sie ein gültiges Datum an.")).toBeInTheDocument();
    expect(mockSetzen).not.toHaveBeenCalled();
  });

  it("has only price, date and an optional reason (no type of change, no declaration date)", async () => {
    const { container } = await mitOffenerMietaenderung();

    expect(feld(container, "betrag")).toBeInTheDocument();
    expect(feld(container, "wirksamAb")).toBeInTheDocument();
    expect(feld(container, "grund")).toBeInTheDocument();
    expect(container.querySelector('[id$="-art"]')).toBeNull();
    expect(container.querySelector('[id$="-erklaertAm"]')).toBeNull();
  });

  it("records the new rent with the entered reason, closes the form and reloads", async () => {
    const { container } = await mitOffenerMietaenderung();

    setze(feld(container, "betrag"), "920,50");
    setze(feld(container, "wirksamAb"), "01.04.2026");
    setze(feld(container, "grund"), "  Vereinbart am Vertrag ");
    fireEvent.click(screen.getByRole("button", { name: "Mietänderung speichern" }));

    await waitFor(() =>
      expect(mockSetzen).toHaveBeenCalledWith({ mieterId: MIETER_ID, gueltigAb: "2026-04-01", betrag: 920.5, grund: "Vereinbart am Vertrag" })
    );
    expect(await screen.findByRole("button", { name: "Mietänderung erfassen" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mietänderung speichern" })).not.toBeInTheDocument();
    await waitFor(() => expect(mockUebersicht).toHaveBeenCalledTimes(2));
  });

  it("sends null when the optional reason is empty", async () => {
    const { container } = await mitOffenerMietaenderung();

    setze(feld(container, "betrag"), "900");
    setze(feld(container, "wirksamAb"), "01.05.2026");
    fireEvent.click(screen.getByRole("button", { name: "Mietänderung speichern" }));

    await waitFor(() => expect(mockSetzen).toHaveBeenCalledWith({ mieterId: MIETER_ID, gueltigAb: "2026-05-01", betrag: 900, grund: null }));
  });

  it("rejects a reason that is too long at the field, without an action call", async () => {
    const { container } = await mitOffenerMietaenderung();

    setze(feld(container, "betrag"), "900");
    setze(feld(container, "wirksamAb"), "01.05.2026");
    setze(feld(container, "grund"), "x".repeat(501));
    fireEvent.click(screen.getByRole("button", { name: "Mietänderung speichern" }));

    expect(await screen.findByText(/Die Begründung darf höchstens 500 Zeichen/)).toBeInTheDocument();
    expect(feld(container, "grund")).toHaveAttribute("aria-invalid", "true");
    expect(mockSetzen).not.toHaveBeenCalled();
  });

  it("shows an error state with retry when loading fails", async () => {
    mockUebersicht.mockResolvedValueOnce({ success: false, error: { code: "42501", message: "Für diese Aktion fehlt die Berechtigung (Modul Mieter)." } });
    mockUebersicht.mockResolvedValueOnce({ success: true, data: ohneMietverhaeltnis });
    render(<TenantMieteSection mieterId={MIETER_ID} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Für diese Aktion fehlt die Berechtigung");
    fireEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));
    expect(await screen.findByText(/noch kein Mietverhältnis angelegt/)).toBeInTheDocument();
  });

  it("removes an entry only after confirmation", async () => {
    await mitVertrag();

    fireEvent.click(screen.getByRole("button", { name: "Miete ab 01.06.2024 entfernen" }));
    expect(mockEntfernen).not.toHaveBeenCalled();

    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Entfernen" }));

    await waitFor(() => expect(mockEntfernen).toHaveBeenCalledWith({ mieterId: MIETER_ID, mieteId: MIETE_NEU }));
  });

  it("does not submit the surrounding form on Enter in a field", async () => {
    const onSubmit = jest.fn((event: React.FormEvent) => event.preventDefault());
    mockUebersicht.mockResolvedValue({ success: true, data: mitMietverhaeltnis });
    const { container } = render(
      <form onSubmit={onSubmit}>
        <TenantMieteSection mieterId={MIETER_ID} />
        <button type="submit">Speichern</button>
      </form>
    );
    await screen.findByRole("list");

    const enter = fireEvent.keyDown(feld(container, "vertragsende"), { key: "Enter" });
    expect(enter).toBe(false); // default prevented
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
