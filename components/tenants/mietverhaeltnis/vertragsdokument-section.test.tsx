import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { VertragsdokumentSection } from "@/components/tenants/mietverhaeltnis/vertragsdokument-section";
import {
  getVertragsdokumentAction,
  listeVertragsdokumentKandidatenAction,
  vertragsdokumentOeffnenAction,
  vertragsdokumentSetzenAction,
} from "@/app/mietverhaeltnis-dokument-actions";
import { toast } from "@/hooks/use-toast";

jest.mock("@/app/mietverhaeltnis-dokument-actions", () => ({
  getVertragsdokumentAction: jest.fn(),
  listeVertragsdokumentKandidatenAction: jest.fn(),
  vertragsdokumentSetzenAction: jest.fn(),
  vertragsdokumentOeffnenAction: jest.fn(),
}));
jest.mock("@/hooks/use-toast", () => ({ toast: jest.fn() }));
jest.mock("@/components/ui/custom-combobox", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  return {
    CustomCombobox: ({ options, onChange, id }: { options: { value: string; label: string }[]; onChange: (value: string | null) => void; id?: string }) =>
      createElement("div", { id }, options.map((option) => createElement("button", { key: option.value, type: "button", onClick: () => onChange(option.value) }, option.label))),
  };
});
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

// Synthetic placeholder IDs and names only
const MIETER_ID = "11111111-1111-4111-8111-111111111111";
const DOK_ID = "33333333-3333-4333-8333-333333333333";
const DOK_ANDERS = "44444444-4444-4444-8444-444444444444";

const mockGet = getVertragsdokumentAction as jest.Mock;
const mockListe = listeVertragsdokumentKandidatenAction as jest.Mock;
const mockSetzen = vertragsdokumentSetzenAction as jest.Mock;
const mockOeffnen = vertragsdokumentOeffnenAction as jest.Mock;
const mockToast = toast as unknown as jest.Mock;
const onGeaendert = jest.fn();
const rendere = (vertragDokumentId: string | null = null) =>
  render(<VertragsdokumentSection mieterId={MIETER_ID} vertragDokumentId={vertragDokumentId} onGeaendert={onGeaendert} />);

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue({ success: true, data: null });
  mockListe.mockResolvedValue({ success: true, data: [{ id: DOK_ANDERS, name: "mietvertrag.pdf", ordner: "Vertraege" }] });
  mockSetzen.mockResolvedValue({ success: true, data: undefined });
  mockOeffnen.mockResolvedValue({ success: true, data: { url: "https://example.test/signed" } });
});

describe("VertragsdokumentSection", () => {
  it("shows that no document is linked and offers the selection", async () => {
    rendere();
    expect(await screen.findByText("Kein Vertragsdokument verknüpft")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Dokument auswählen" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Öffnen" })).toBeNull();
  });

  it("links a document chosen from the house folder", async () => {
    rendere();
    fireEvent.click(await screen.findByRole("button", { name: "Dokument auswählen" }));
    fireEvent.click(await screen.findByRole("button", { name: "mietvertrag.pdf (Vertraege)" }));
    fireEvent.click(screen.getByRole("button", { name: "Verknüpfen" }));
    await waitFor(() => expect(mockSetzen).toHaveBeenCalledWith({ mieterId: MIETER_ID, dokumentId: DOK_ANDERS }));
    await waitFor(() => expect(onGeaendert).toHaveBeenCalledTimes(1));
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: "success" }));
  });

  it("points to the upload area when the house has no document", async () => {
    mockListe.mockResolvedValue({ success: true, data: [] });
    rendere();
    fireEvent.click(await screen.findByRole("button", { name: "Dokument auswählen" }));
    expect(await screen.findByText(/Laden Sie die Datei zuerst im Bereich Dateien hoch/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Verknüpfen" }).hasAttribute("disabled")).toBe(true);
  });

  it("shows an error and stays closed when the list cannot be loaded", async () => {
    mockListe.mockResolvedValue({ success: false, error: { code: "42501", message: "Keine Berechtigung" } });
    rendere();
    fireEvent.click(await screen.findByRole("button", { name: "Dokument auswählen" }));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ description: "Keine Berechtigung", variant: "destructive" })));
    expect(screen.queryByRole("button", { name: "Verknüpfen" })).toBeNull();
  });

  it("shows the linked document, opens it in a new window and unlinks it", async () => {
    mockGet.mockResolvedValue({ success: true, data: { id: DOK_ID, name: "vertrag.pdf", ordner: "" } });
    const oeffnen = jest.spyOn(window, "open").mockImplementation(() => null);
    rendere(DOK_ID);
    expect(await screen.findByText("vertrag.pdf")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Öffnen" }));
    await waitFor(() => expect(oeffnen).toHaveBeenCalledWith("https://example.test/signed", "_blank", "noopener,noreferrer"));

    fireEvent.click(screen.getByRole("button", { name: "Verknüpfung lösen" }));
    await waitFor(() => expect(mockSetzen).toHaveBeenCalledWith({ mieterId: MIETER_ID, dokumentId: null }));
    await waitFor(() => expect(onGeaendert).toHaveBeenCalledTimes(1));
    oeffnen.mockRestore();
  });

  it("shows a link whose document is not available instead of hiding it, and allows to unlink it", async () => {
    mockGet.mockResolvedValue({ success: true, data: null });
    rendere(DOK_ID);
    expect(await screen.findByText(/Verknüpft, aber nicht verfügbar/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Verknüpfung lösen" })).toBeTruthy();
  });

  it("reports a failed load without crashing", async () => {
    mockGet.mockResolvedValue({ success: false, error: { code: "42501", message: "x" } });
    rendere();
    expect(await screen.findByText("Das Vertragsdokument konnte nicht geladen werden.")).toBeTruthy();
  });
});
