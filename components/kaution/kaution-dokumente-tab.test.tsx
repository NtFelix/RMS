/**
 * Tests of the tab "Dokumente" and of the upload form "Beleg hinzufügen" (GH-6, phase 2b): list, open, remove
 * (with confirmation), upload (client check, server error, double-submit guard), rights and accessibility (jest-axe).
 *
 * All values are synthetic (no real persons, addresses or amounts). The server actions, the toast and `fetch` are mocked.
 */

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import { KautionDokumenteTab } from "@/components/kaution/kaution-dokumente-tab";
import { KautionBelegUpload } from "@/components/kaution/kaution-beleg-upload";
import { entferneKautionBelegAction, getKautionBelegUrlAction } from "@/app/kautionen-actions";
import { toast } from "@/hooks/use-toast";
import type { KautionBeleg, KautionBewegung, KautionDetails, KautionRechte } from "@/types/Kaution";

expect.extend(toHaveNoViolations);

jest.mock("@/app/kautionen-actions", () => ({
  getKautionBelegUrlAction: jest.fn(),
  entferneKautionBelegAction: jest.fn(),
}));
jest.mock("@/hooks/use-toast", () => ({ toast: jest.fn(), useToast: jest.fn() }));

const BEW_EINZAHLUNG = "33333333-3333-4333-8333-333333333331";
const BEW_ABZUG = "33333333-3333-4333-8333-333333333332";
const BEW_STORNIERT = "33333333-3333-4333-8333-333333333333";
const DOK_A = "99999999-9999-4999-8999-999999999991";
const DOK_B = "99999999-9999-4999-8999-999999999992";
const SIGNED_URL = "https://storage.example.invalid/documents/muster?token=muster";

const ALLE_RECHTE: KautionRechte = { ansehen: true, erstellen: true, bearbeiten: true, loeschen: true };
const NUR_ANSEHEN: KautionRechte = { ansehen: true, erstellen: false, bearbeiten: false, loeschen: false };

const getUrlMock = getKautionBelegUrlAction as jest.Mock;
const entferneMock = entferneKautionBelegAction as jest.Mock;
const toastMock = toast as unknown as jest.Mock;

function bewegung(teil: Partial<KautionBewegung> & Pick<KautionBewegung, "id" | "bewegungsart" | "betrag" | "wertstellung">): KautionBewegung {
  return {
    vorzeichen: teil.bewegungsart === "einzahlung" ? 1 : -1,
    kategorie: null,
    grund: null,
    interne_notiz: null,
    empfaenger: null,
    quelle: "app",
    erstellt_am: "2026-01-05T09:00:00Z",
    storniert_am: null,
    storno_grund: null,
    saldo_nach_buchung: null,
    rate_id: null,
    dokument_id: null,
    ...teil,
  };
}

const KONTOAUSZUG: KautionBewegung[] = [
  bewegung({ id: BEW_EINZAHLUNG, bewegungsart: "einzahlung", betrag: 1500, wertstellung: "2026-01-05", saldo_nach_buchung: 1500, dokument_id: DOK_A }),
  bewegung({ id: BEW_ABZUG, bewegungsart: "abzug", betrag: 200, wertstellung: "2026-02-10", kategorie: "schaden", saldo_nach_buchung: 1300 }),
  bewegung({ id: BEW_STORNIERT, bewegungsart: "einzahlung", betrag: 100, wertstellung: "2026-02-12", storniert_am: "2026-02-15T10:00:00Z", dokument_id: DOK_B }),
];

const BELEGE: KautionBeleg[] = [
  { bewegung_id: BEW_EINZAHLUNG, dokument_id: DOK_A, dateiname: "1765000000000_Kontoauszug-Muster.pdf", dateigroesse: 2048, mime_type: "application/pdf" },
  { bewegung_id: BEW_STORNIERT, dokument_id: DOK_B, dateiname: "1765000000001_Scan-Muster.png", dateigroesse: null, mime_type: "image/png" },
];

function baueDetails(belege: KautionBeleg[] = BELEGE): KautionDetails {
  return { kontoauszug: KONTOAUSZUG, belege } as unknown as KautionDetails;
}

function fetchAntwort(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as unknown as Response;
}

const mockFetch = jest.fn();

beforeEach(() => {
  jest.resetAllMocks();
  getUrlMock.mockResolvedValue({ success: true, data: { url: SIGNED_URL } });
  entferneMock.mockResolvedValue({ success: true });
  global.fetch = mockFetch as unknown as typeof fetch;
  mockFetch.mockReset();
  mockFetch.mockResolvedValue(fetchAntwort({ success: true, dokumentId: DOK_A }));
});

afterEach(() => {
  cleanup();
});

describe("Liste der Belege", () => {
  it("zeigt bei fehlenden Belegen einen Leerzustand statt einer leeren Liste", () => {
    render(<KautionDokumenteTab details={baueDetails([])} rechte={ALLE_RECHTE} onGeaendert={jest.fn()} onFehler={jest.fn()} />);

    expect(screen.getByTestId("kaution-belege-leer")).toHaveTextContent("Zu dieser Kaution sind noch keine Belege hinterlegt.");
    expect(screen.queryByTestId("kaution-belege-liste")).not.toBeInTheDocument();
  });

  it("zeigt Name ohne Zeitstempel, Typ, Größe und die zugeordnete Buchung; eine stornierte Buchung ist markiert", () => {
    render(<KautionDokumenteTab details={baueDetails()} rechte={ALLE_RECHTE} onGeaendert={jest.fn()} onFehler={jest.fn()} />);

    const zeilen = screen.getAllByTestId("kaution-beleg-zeile");
    expect(zeilen).toHaveLength(2);

    const erste = zeilen[0];
    expect(within(erste).getByText("Kontoauszug-Muster.pdf")).toBeInTheDocument();
    expect(within(erste).queryByText(/1765000000000/)).not.toBeInTheDocument();
    expect(within(erste).getByText(/PDF · 2,0 KB/)).toBeInTheDocument();
    expect(within(erste).getByText(/Einzahlung vom 05\.01\.2026 über 1\.500,00\s€/)).toBeInTheDocument();
    expect(within(erste).queryByText("storniert")).not.toBeInTheDocument();

    const zweite = zeilen[1];
    expect(within(zweite).getByText("Scan-Muster.png")).toBeInTheDocument();
    expect(within(zweite).getByText(/Bild|PNG/)).toBeInTheDocument();
    expect(within(zweite).getByText("storniert")).toBeInTheDocument();
  });
});

describe("Öffnen", () => {
  it("holt den kurzlebigen Link für den Beleg und öffnet ihn in einem neuen Tab ohne Opener", async () => {
    const user = userEvent.setup();
    const oeffne = jest.spyOn(window, "open").mockImplementation(() => null);
    render(<KautionDokumenteTab details={baueDetails()} rechte={ALLE_RECHTE} onGeaendert={jest.fn()} onFehler={jest.fn()} />);

    const erste = screen.getAllByTestId("kaution-beleg-zeile")[0];
    await user.click(within(erste).getByRole("button", { name: /Öffnen/ }));

    await waitFor(() => expect(oeffne).toHaveBeenCalledWith(SIGNED_URL, "_blank", "noopener"));
    expect(getUrlMock).toHaveBeenCalledWith({ dokumentId: DOK_A });
    oeffne.mockRestore();
  });

  it("zeigt eine Meldung, wenn der Link nicht geholt werden kann und der Dialog den Fehler nicht behandelt", async () => {
    const user = userEvent.setup();
    const oeffne = jest.spyOn(window, "open").mockImplementation(() => null);
    getUrlMock.mockResolvedValueOnce({ success: false, error: { code: "KA003", message: "Der Datensatz wurde nicht gefunden (evtl. bereits geändert oder gelöscht)." } });
    const onFehler = jest.fn(() => false);
    render(<KautionDokumenteTab details={baueDetails()} rechte={ALLE_RECHTE} onGeaendert={jest.fn()} onFehler={onFehler} />);

    await user.click(within(screen.getAllByTestId("kaution-beleg-zeile")[0]).getByRole("button", { name: /Öffnen/ }));

    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Beleg nicht verfügbar", variant: "destructive", description: expect.stringContaining("nicht gefunden") })
      )
    );
    expect(onFehler).toHaveBeenCalledWith(expect.objectContaining({ code: "KA003" }));
    expect(oeffne).not.toHaveBeenCalled();
    oeffne.mockRestore();
  });
});

describe("Beleg lösen", () => {
  it("fragt zuerst nach und löst den Beleg erst nach Bestätigung von der Buchung", async () => {
    const user = userEvent.setup();
    const onGeaendert = jest.fn();
    render(<KautionDokumenteTab details={baueDetails()} rechte={ALLE_RECHTE} onGeaendert={onGeaendert} onFehler={jest.fn()} />);

    await user.click(within(screen.getAllByTestId("kaution-beleg-zeile")[0]).getByRole("button", { name: /Beleg lösen/ }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Beleg von der Buchung lösen?")).toBeInTheDocument();
    expect(within(dialog).getByText(/bleibt in der Dokumentenverwaltung erhalten/)).toBeInTheDocument();
    expect(entferneMock).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Lösen" }));

    await waitFor(() => expect(entferneMock).toHaveBeenCalledWith({ bewegungId: BEW_EINZAHLUNG }));
    await waitFor(() => expect(onGeaendert).toHaveBeenCalled());
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: "Beleg von der Buchung gelöst.", variant: "success" }));
  });

  it("ruft beim Abbrechen keine Action auf", async () => {
    const user = userEvent.setup();
    render(<KautionDokumenteTab details={baueDetails()} rechte={ALLE_RECHTE} onGeaendert={jest.fn()} onFehler={jest.fn()} />);

    await user.click(within(screen.getAllByTestId("kaution-beleg-zeile")[0]).getByRole("button", { name: /Beleg lösen/ }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Abbrechen" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(entferneMock).not.toHaveBeenCalled();
  });
});

describe("Rechte", () => {
  it("zeigt ohne 'bearbeiten' keine Lösen-Knöpfe, kein Upload-Formular, sondern einen Hinweis", () => {
    render(<KautionDokumenteTab details={baueDetails()} rechte={NUR_ANSEHEN} onGeaendert={jest.fn()} onFehler={jest.fn()} />);

    expect(screen.queryByRole("button", { name: /Beleg lösen/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Beleg hochladen/ })).not.toBeInTheDocument();
    expect(screen.getByText("Das Hochladen und Lösen von Belegen ist mit Ihren Rechten nicht möglich.")).toBeInTheDocument();
    // Öffnen bleibt: es ist ein Lesezugriff
    expect(screen.getAllByRole("button", { name: /Öffnen/ })).toHaveLength(2);
  });
});

describe("Beleg hinzufügen (Upload)", () => {
  function datei(name = "Rechnung-Muster.pdf", groesse = 1024, type = "application/pdf"): File {
    return new File([new Uint8Array(groesse)], name, { type });
  }

  async function waehleBuchung(user: ReturnType<typeof userEvent.setup>, label: RegExp) {
    await user.click(screen.getByRole("combobox", { name: /Buchung \(Pflicht\)/ }));
    await user.click(await screen.findByRole("option", { name: label }));
  }

  it("sendet Buchung und Datei als FormData an die Route, lädt danach neu und meldet den Erfolg", async () => {
    const user = userEvent.setup();
    const onGeaendert = jest.fn();
    render(<KautionDokumenteTab details={baueDetails()} rechte={ALLE_RECHTE} onGeaendert={onGeaendert} onFehler={jest.fn()} />);

    await waehleBuchung(user, /Abzug vom 10\.02\.2026/);
    await user.upload(screen.getByLabelText(/Datei \(Pflicht\)/), datei());
    await user.click(screen.getByRole("button", { name: "Beleg hochladen" }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const [url, init] = mockFetch.mock.calls[0] as [string, { method: string; body: FormData }];
    expect(url).toBe("/api/kautionen/belege");
    expect(init.method).toBe("POST");
    expect(init.body.get("bewegungId")).toBe(BEW_ABZUG);
    expect((init.body.get("file") as File).name).toBe("Rechnung-Muster.pdf");
    await waitFor(() => expect(onGeaendert).toHaveBeenCalled());
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: "Beleg hochgeladen.", variant: "success" }));
  });

  it("prüft die Datei im Browser zuerst: eine leere Datei wird nicht gesendet", async () => {
    const user = userEvent.setup();
    render(<KautionDokumenteTab details={baueDetails()} rechte={ALLE_RECHTE} onGeaendert={jest.fn()} onFehler={jest.fn()} />);

    await waehleBuchung(user, /Abzug vom 10\.02\.2026/);
    await user.upload(screen.getByLabelText(/Datei \(Pflicht\)/), datei("leer.pdf", 0));
    await user.click(screen.getByRole("button", { name: "Beleg hochladen" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Die Datei ist leer.");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("zeigt die Meldung der Route am Formular, wenn der Dialog sie nicht behandelt", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce(fetchAntwort({ error: { message: "Dieser Dateityp wird nicht unterstützt." } }, false, 400));
    const onFehler = jest.fn(() => false);
    render(<KautionDokumenteTab details={baueDetails()} rechte={ALLE_RECHTE} onGeaendert={jest.fn()} onFehler={onFehler} />);

    await waehleBuchung(user, /Abzug vom 10\.02\.2026/);
    await user.upload(screen.getByLabelText(/Datei \(Pflicht\)/), datei());
    await user.click(screen.getByRole("button", { name: "Beleg hochladen" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Dieser Dateityp wird nicht unterstützt.");
    expect(onFehler).toHaveBeenCalledWith({ message: "Dieser Dateityp wird nicht unterstützt.", code: undefined });
  });

  it("verhindert ein Doppelabsenden: zwei Absendungen im selben Augenblick lösen nur eine Anfrage aus", async () => {
    const user = userEvent.setup();
    let freigeben: (antwort: Response) => void = () => undefined;
    mockFetch.mockReturnValueOnce(new Promise<Response>((resolve) => (freigeben = resolve)));
    render(
      <KautionBelegUpload
        auswahl={[{ bewegungId: BEW_ABZUG, label: "Abzug vom 10.02.2026 über 200,00 €" }]}
        vorgabeBewegungId={BEW_ABZUG}
        onHochgeladen={jest.fn()}
        onFehler={jest.fn()}
      />
    );

    await user.upload(screen.getByLabelText(/Datei \(Pflicht\)/), datei());
    const formular = screen.getByRole("button", { name: "Beleg hochladen" }).closest("form") as HTMLFormElement;
    fireEvent.submit(formular);
    fireEvent.submit(formular);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent("Der Beleg wird hochgeladen.");
    freigeben(fetchAntwort({ success: true, dokumentId: DOK_A }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(""));
  });
});

describe("Barrierefreiheit (jest-axe)", () => {
  // axe-core is slow: generous time limit (as in the other kaution tests).
  jest.setTimeout(30000);

  // `jest-axe` has no types in this project: only the fields needed here.
  interface AxeErgebnis {
    violations: { id: string; nodes: { html: string }[] }[];
  }

  it("Liste mit Belegen und Upload-Formular ohne Verstöße", async () => {
    const { container } = render(<KautionDokumenteTab details={baueDetails()} rechte={ALLE_RECHTE} onGeaendert={jest.fn()} onFehler={jest.fn()} />);

    const ergebnis = (await axe(container)) as AxeErgebnis;
    (expect(ergebnis) as unknown as { toHaveNoViolations: () => void }).toHaveNoViolations();
  });

  it("Leerzustand ohne Rechte ohne Verstöße", async () => {
    const { container } = render(<KautionDokumenteTab details={baueDetails([])} rechte={NUR_ANSEHEN} onGeaendert={jest.fn()} onFehler={jest.fn()} />);

    const ergebnis = (await axe(container)) as AxeErgebnis;
    (expect(ergebnis) as unknown as { toHaveNoViolations: () => void }).toHaveNoViolations();
  });
});
