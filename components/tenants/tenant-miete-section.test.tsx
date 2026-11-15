import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { TenantMieteSection } from "@/components/tenants/tenant-miete-section";
import {
  getMietverhaeltnisUebersichtAction,
  mieteEntfernenAction,
  mietverhaeltnisAnlegenAction,
  mieterhoehungErfassenAction,
  vertragsdatenSpeichernAction,
} from "@/app/mietverhaeltnis-actions";

jest.mock("@/app/mietverhaeltnis-actions", () => ({
  getMietverhaeltnisUebersichtAction: jest.fn(),
  mieteEntfernenAction: jest.fn(),
  mietverhaeltnisAnlegenAction: jest.fn(),
  vertragsdatenSpeichernAction: jest.fn(),
  mieterhoehungErfassenAction: jest.fn(),
}));

jest.mock("@/hooks/use-toast", () => ({
  toast: jest.fn(),
}));

// jsdom kennt ResizeObserver nicht (Radix)
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

// Synthetic placeholder IDs and values only
const MIETER_ID = "11111111-1111-4111-8111-111111111111";
const MV_ID = "22222222-2222-4222-8222-222222222222";
const MIETE_NEU = "33333333-3333-4333-8333-333333333333";
const MIETE_ALT = "44444444-4444-4444-8444-444444444444";

const mockUebersicht = getMietverhaeltnisUebersichtAction as jest.Mock;
const mockEntfernen = mieteEntfernenAction as jest.Mock;
const mockAnlegen = mietverhaeltnisAnlegenAction as jest.Mock;
const mockVertragsdaten = vertragsdatenSpeichernAction as jest.Mock;
const mockErhoehung = mieterhoehungErfassenAction as jest.Mock;

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
  mockErhoehung.mockResolvedValue({ success: true, data: { mieteId: MIETE_NEU } });
  mockEntfernen.mockResolvedValue({ success: true, data: undefined });
});

/** Loads the section with a tenancy and waits until the forms are shown. */
async function mitVertrag() {
  mockUebersicht.mockResolvedValue({ success: true, data: mitMietverhaeltnis });
  const ergebnis = render(<TenantMieteSection mieterId={MIETER_ID} />);
  await screen.findByRole("list");
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
    render(<TenantMieteSection mieterId={MIETER_ID} />);
    await screen.findByRole("button", { name: "Mietverhältnis anlegen" });

    expect(screen.getByLabelText("Vertragsbeginn")).toHaveValue("2020-01-01");
    expect(screen.getByLabelText("Monatliche Miete (EUR, optional)")).toHaveValue("800,00");
  });

  it("creates the tenancy with the entered values and reloads", async () => {
    render(<TenantMieteSection mieterId={MIETER_ID} />);
    await screen.findByRole("button", { name: "Mietverhältnis anlegen" });

    fireEvent.change(screen.getByLabelText("Vertragsbeginn"), { target: { value: "2026-01-01" } });
    fireEvent.change(screen.getByLabelText("Monatliche Miete (EUR, optional)"), { target: { value: "850,50" } });
    fireEvent.click(screen.getByRole("button", { name: "Mietverhältnis anlegen" }));

    await waitFor(() => expect(mockAnlegen).toHaveBeenCalledWith({ mieterId: MIETER_ID, vertragsbeginn: "2026-01-01", miete: 850.5 }));
    await waitFor(() => expect(mockUebersicht).toHaveBeenCalledTimes(2));
  });

  it("sends no rent when the rent field is empty", async () => {
    render(<TenantMieteSection mieterId={MIETER_ID} />);
    await screen.findByRole("button", { name: "Mietverhältnis anlegen" });

    fireEvent.change(screen.getByLabelText("Monatliche Miete (EUR, optional)"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Mietverhältnis anlegen" }));

    await waitFor(() => expect(mockAnlegen).toHaveBeenCalledWith({ mieterId: MIETER_ID, vertragsbeginn: "2020-01-01", miete: null }));
  });

  it("marks an invalid rent at the field and does not call the action", async () => {
    render(<TenantMieteSection mieterId={MIETER_ID} />);
    await screen.findByRole("button", { name: "Mietverhältnis anlegen" });

    const miete = screen.getByLabelText("Monatliche Miete (EUR, optional)");
    fireEvent.change(miete, { target: { value: "8,555" } });
    fireEvent.click(screen.getByRole("button", { name: "Mietverhältnis anlegen" }));

    expect(await screen.findByText(/höchstens zwei Nachkommastellen/)).toBeInTheDocument();
    expect(miete).toHaveAttribute("aria-invalid", "true");
    expect(miete).toHaveAttribute("aria-describedby", expect.stringContaining("-fehler"));
    expect(mockAnlegen).not.toHaveBeenCalled();
  });

  it("does not show the create form to applicants, only the note", async () => {
    mockUebersicht.mockResolvedValue({ success: true, data: { ...ohneMietverhaeltnis, mieterEinzug: null, istBewerber: true } });
    render(<TenantMieteSection mieterId={MIETER_ID} />);

    expect(await screen.findByText(/erst angelegt, wenn sie als Mieter geführt werden/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mietverhältnis anlegen" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Vertragsbeginn")).not.toBeInTheDocument();
  });
});

describe("TenantMieteSection with tenancy", () => {
  it("shows the history as a list and the current rent for today", async () => {
    await mitVertrag();

    const liste = screen.getByRole("list");
    const eintraege = within(liste).getAllByRole("listitem");
    expect(eintraege).toHaveLength(2);
    expect(within(eintraege[0]).getByText(/ab 01\.06\.2024: 850,00 €/)).toBeInTheDocument();
    expect(within(eintraege[0]).getByText("Indexierung")).toBeInTheDocument();
    expect(within(eintraege[1]).getByText("aus Bestand übernommen")).toBeInTheDocument();
    expect(screen.getByText("01.01.2020")).toBeInTheDocument();
    // Latest entry up to today (2024 is in the past for any test run date)
    expect(screen.getByText("Aktuelle Miete").nextSibling).toHaveTextContent("850,00 €");
  });

  it("shows the type of change and the declaration date in the history", async () => {
    await mitVertrag();

    const eintraege = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(within(eintraege[0]).getByText("Art: Vereinbarung")).toBeInTheDocument();
    expect(within(eintraege[0]).getByText("erklärt am 15.05.2024")).toBeInTheDocument();
    expect(within(eintraege[1]).queryByText(/erklärt am/)).not.toBeInTheDocument();
  });

  it("pre-fills the contract data and saves all fields, with null for empty ones", async () => {
    await mitVertrag();

    expect(screen.getByLabelText("Vertragsende")).toHaveValue("2027-12-31");
    expect(screen.getByLabelText("Durch")).toHaveValue("mieter");

    fireEvent.change(screen.getByLabelText("Befristet bis"), { target: { value: "2028-06-30" } });
    fireEvent.change(screen.getByLabelText("Eingang am"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("Durch"), { target: { value: "vermieter" } });
    fireEvent.change(screen.getByLabelText("Notiz"), { target: { value: "  Haustiere erlaubt  " } });
    fireEvent.change(screen.getByLabelText("Vertragsende"), { target: { value: "" } });
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

  it("sends null for 'keine Angabe' in the termination party", async () => {
    await mitVertrag();

    fireEvent.change(screen.getByLabelText("Durch"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Vertragsdaten speichern" }));

    await waitFor(() => expect(mockVertragsdaten).toHaveBeenCalledWith(expect.objectContaining({ kuendigungDurch: null, notiz: null })));
  });

  it("rejects a note that is too long at the field, without an action call", async () => {
    await mitVertrag();

    const notiz = screen.getByLabelText("Notiz");
    fireEvent.change(notiz, { target: { value: "x".repeat(2001) } });
    fireEvent.click(screen.getByRole("button", { name: "Vertragsdaten speichern" }));

    expect(await screen.findByText("Die Notiz darf höchstens 2000 Zeichen lang sein.")).toBeInTheDocument();
    expect(notiz).toHaveAttribute("aria-invalid", "true");
    expect(mockVertragsdaten).not.toHaveBeenCalled();
  });

  it("shows the notice that the app calculates no deadlines", async () => {
    await mitVertrag();
    expect(screen.getByText("Die App berechnet keine Fristen.")).toBeInTheDocument();
  });

  it("requires the type of change at the field and does not call the action", async () => {
    await mitVertrag();

    fireEvent.change(screen.getByLabelText("Neue Miete (EUR)"), { target: { value: "920,50" } });
    fireEvent.change(screen.getByLabelText("Wirksam ab"), { target: { value: "2026-04-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Mietänderung speichern" }));

    const art = screen.getByLabelText("Art (Pflicht)");
    expect(await screen.findByText("Bitte geben Sie die Art der Mietänderung an.")).toBeInTheDocument();
    expect(art).toHaveAttribute("aria-invalid", "true");
    expect(art).toHaveAttribute("aria-describedby", expect.stringContaining("-fehler"));
    expect(mockErhoehung).not.toHaveBeenCalled();
  });

  it("records a rent change with the entered values and reloads", async () => {
    await mitVertrag();

    fireEvent.change(screen.getByLabelText("Neue Miete (EUR)"), { target: { value: "920,50" } });
    fireEvent.change(screen.getByLabelText("Wirksam ab"), { target: { value: "2026-04-01" } });
    fireEvent.change(screen.getByLabelText("Art (Pflicht)"), { target: { value: "  Staffelmiete " } });
    fireEvent.change(screen.getByLabelText("Datum der Erklärung (optional)"), { target: { value: "2026-03-10" } });
    fireEvent.change(screen.getByLabelText("Grund (optional)"), { target: { value: "  Vereinbart am Vertrag " } });
    fireEvent.click(screen.getByRole("button", { name: "Mietänderung speichern" }));

    await waitFor(() =>
      expect(mockErhoehung).toHaveBeenCalledWith({
        mieterId: MIETER_ID,
        wirksamAb: "2026-04-01",
        betrag: 920.5,
        aenderungsart: "Staffelmiete",
        erklaertAm: "2026-03-10",
        grund: "Vereinbart am Vertrag",
      })
    );
    await waitFor(() => expect(mockUebersicht).toHaveBeenCalledTimes(2));
  });

  it("sends null for the empty optional fields of a rent change", async () => {
    await mitVertrag();

    fireEvent.change(screen.getByLabelText("Neue Miete (EUR)"), { target: { value: "900" } });
    fireEvent.change(screen.getByLabelText("Wirksam ab"), { target: { value: "2026-05-01" } });
    fireEvent.change(screen.getByLabelText("Art (Pflicht)"), { target: { value: "Vereinbarung" } });
    fireEvent.click(screen.getByRole("button", { name: "Mietänderung speichern" }));

    await waitFor(() =>
      expect(mockErhoehung).toHaveBeenCalledWith({
        mieterId: MIETER_ID,
        wirksamAb: "2026-05-01",
        betrag: 900,
        aenderungsart: "Vereinbarung",
        erklaertAm: null,
        grund: null,
      })
    );
  });

  it("offers the suggestions for the type of change in a datalist and keeps free text", async () => {
    const { container } = await mitVertrag();

    const art = screen.getByLabelText("Art (Pflicht)");
    const listId = art.getAttribute("list");
    expect(listId).toBeTruthy();
    const optionen = Array.from(container.querySelectorAll(`datalist#${listId} option`)).map((option) => option.getAttribute("value"));
    expect(optionen).toEqual(["Vereinbarung", "Staffelmiete", "Indexmiete", "Vergleichsmiete", "Modernisierung", "Sonstiges"]);

    fireEvent.change(art, { target: { value: "Eigene Art" } });
    expect(art).toHaveValue("Eigene Art");
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
    render(
      <form onSubmit={onSubmit}>
        <TenantMieteSection mieterId={MIETER_ID} />
        <button type="submit">Speichern</button>
      </form>
    );
    await screen.findByRole("list");

    const betrag = screen.getByLabelText("Neue Miete (EUR)");
    const enter = fireEvent.keyDown(betrag, { key: "Enter" });
    expect(enter).toBe(false); // default prevented
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
