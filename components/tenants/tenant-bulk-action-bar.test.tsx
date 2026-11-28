/**
 * Tests der Massen-Aktionsleiste der Mieterliste, soweit sie das Löschen betreffen (GH-6, Kautionsmanagement).
 *
 * Die Datenbank kann einzelne Löschungen ablehnen (Löschsperre bei hinterlegter Kaution). Die Leiste ist der
 * tatsächlich genutzte Löschweg der Mieterliste: Sie zeigt die Gründe ohne technisches Präfix an, behandelt
 * Teilerfolge und Fehler getrennt und lädt die Liste neu, sobald sich etwas geändert haben kann.
 * Alle Daten sind synthetische Platzhalter.
 */

import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TenantBulkActionBar } from "@/components/tenants/tenant-bulk-action-bar";
import { toast } from "@/hooks/use-toast";
import { starteLoeschenMitKautionen } from "@/lib/kautionen-loeschen";
import { bewerberLoeschenAction } from "@/app/bewerber-actions";
import type { Tenant } from "@/types/Tenant";

jest.mock("@/hooks/use-toast", () => ({ toast: jest.fn(), useToast: jest.fn() }));
jest.mock("@/app/mieter-actions", () => ({ updateTenantApartment: jest.fn() }));

jest.mock("@/lib/kautionen-loeschen", () => ({ starteLoeschenMitKautionen: jest.fn() }));

jest.mock("@/app/bewerber-actions", () => ({ bewerberLoeschenAction: jest.fn() }));

const startMock = starteLoeschenMitKautionen as jest.MockedFunction<typeof starteLoeschenMitKautionen>;
const toastMock = toast as unknown as jest.Mock;
const fetchMock = jest.fn();
// Laufender Löschvorgang: Beschriftung der Pillen-Aktion bzw. des Bestätigen-Knopfs im Dialog
const LAEUFT = /^(Löschen…|Wird gelöscht\.\.\.)$/;

const KAUTION_GRUND = "Der Mieter hat eine hinterlegte Kaution und kann nicht gelöscht werden.";
const KAUTION_GRUND_ROH = `KAUT_GESPERRT: ${KAUTION_GRUND}`;

const TENANTS = [
  { id: "t-1", name: "Mieter Eins" },
  { id: "t-2", name: "Mieter Zwei" },
  { id: "t-3", name: "Mieter Drei" },
] as Tenant[];

interface Antwort {
  status: number;
  body: unknown;
}

function antwortet({ status, body }: Antwort) {
  fetchMock.mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body });
}

function renderBar(props: Partial<React.ComponentProps<typeof TenantBulkActionBar>> = {}) {
  const onClearSelection = jest.fn();
  const onUpdate = jest.fn();
  render(
    <TenantBulkActionBar
      selectedTenants={new Set(["t-1", "t-2", "t-3"])}
      tenants={TENANTS}
      wohnungsMap={{}}
      onClearSelection={onClearSelection}
      onExport={jest.fn()}
      onUpdate={onUpdate}
      {...props}
    />
  );
  return { onClearSelection, onUpdate };
}

/**
 * Klickt "Löschen (n)", bestätigt im Dialog und wartet, bis der Vorgang abgeschlossen ist (jeder Ausgang meldet
 * per Toast). Ein Test, der mit laufender Anfrage endet, würde Zustandsänderungen in den nächsten Test tragen.
 */
async function loescheUndBestaetige() {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await user.click(screen.getByRole("button", { name: /^Löschen \(\d+\)$/ }));
  await screen.findByRole("dialog");
  await user.click(await screen.findByRole("button", { name: "Löschen bestätigen" }));
  await waitFor(() => expect(toastMock).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.queryAllByText(LAEUFT)).toHaveLength(0));
  return { user };
}

beforeEach(() => {
  jest.resetAllMocks();
  // Standard: keine Kaution mit Buchungen betroffen, es erscheint die übliche Frage.
  startMock.mockImplementation(async (_tabelle, _ids, handlers) => handlers.einfach());
  global.fetch = fetchMock as unknown as typeof fetch;
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});

describe("TenantBulkActionBar: Löschen", () => {
  it("sendet die ausgewählten IDs an die Massenlösch-Route", async () => {
    antwortet({ status: 200, body: { successCount: 3, errorCount: 0, reasons: [] } });
    renderBar();

    await loescheUndBestaetige();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/mieter/bulk-delete");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ ids: ["t-1", "t-2", "t-3"] });
    expect(startMock).toHaveBeenCalledWith("Mieter", ["t-1", "t-2", "t-3"], expect.any(Object));
  });

  it("mit gebuchter Kaution: keine zweite Frage, die bestätigte Übersicht sendet die IDs", async () => {
    startMock.mockImplementation(async (_tabelle, _ids, handlers) => handlers.loeschen());
    antwortet({ status: 200, body: { successCount: 3, errorCount: 0, reasons: [] } });
    renderBar();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    await user.click(screen.getByRole("button", { name: /^Löschen \(\d+\)$/ }));

    await waitFor(() => expect(toastMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryAllByText(LAEUFT)).toHaveLength(0));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ ids: ["t-1", "t-2", "t-3"] });
  });

  it("löscht nichts und zeigt keine Frage, wenn die Übersicht abgebrochen wird", async () => {
    startMock.mockImplementation(async () => undefined);
    const { onClearSelection, onUpdate } = renderBar();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    await user.click(screen.getByRole("button", { name: /^Löschen \(\d+\)$/ }));

    await waitFor(() => expect(startMock).toHaveBeenCalledWith("Mieter", ["t-1", "t-2", "t-3"], expect.any(Object)));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryAllByText(LAEUFT)).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onClearSelection).not.toHaveBeenCalled();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("meldet vollständigen Erfolg, leert die Auswahl, schließt den Dialog und lädt die Liste neu", async () => {
    antwortet({ status: 200, body: { successCount: 3, errorCount: 0, reasons: [] } });
    const { onClearSelection, onUpdate } = renderBar();

    await loescheUndBestaetige();

    expect(toastMock).toHaveBeenCalledWith({ title: "Erfolg", description: "3 Mieter erfolgreich gelöscht.", variant: "success" });
    expect(onClearSelection).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("meldet einen Teilerfolg mit dem Grund ohne technisches Präfix und lädt die Liste neu", async () => {
    // Ein Mieter hat eine Kaution: die beiden anderen sind bereits gelöscht und müssen aus der Liste verschwinden.
    antwortet({ status: 200, body: { successCount: 2, errorCount: 1, reasons: [KAUTION_GRUND] } });
    const { onClearSelection, onUpdate } = renderBar();

    await loescheUndBestaetige();

    const meldung = toastMock.mock.calls[0][0];
    expect(meldung.variant).toBe("success");
    expect(meldung.description).toBe(`2 Mieter erfolgreich gelöscht, 1 fehlgeschlagen. Grund: ${KAUTION_GRUND}`);
    expect(meldung.description).not.toContain("KAUT_GESPERRT");
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onClearSelection).toHaveBeenCalledTimes(1);
  });

  it("entfernt ein Präfix aus den Gründen auch dann, wenn es die Route noch mitliefert", async () => {
    antwortet({ status: 200, body: { successCount: 1, errorCount: 1, reasons: [KAUTION_GRUND_ROH] } });
    renderBar();

    await loescheUndBestaetige();

    expect(toastMock.mock.calls[0][0].description).toContain(`Grund: ${KAUTION_GRUND}`);
    expect(toastMock.mock.calls[0][0].description).not.toContain("KAUT_GESPERRT");
  });

  it("zeigt bei vollständiger Ablehnung (409) den Grund ohne Präfix, behält die Auswahl und lädt nicht neu", async () => {
    antwortet({
      status: 409,
      body: { successCount: 0, errorCount: 3, reasons: [KAUTION_GRUND], error: KAUTION_GRUND },
    });
    const { onClearSelection, onUpdate } = renderBar();

    await loescheUndBestaetige();

    expect(toastMock).toHaveBeenCalledWith({
      title: "Fehler",
      description: `Keine Mieter konnten gelöscht werden. Grund: ${KAUTION_GRUND}`,
      variant: "destructive",
    });
    // Nichts wurde gelöscht: Die Auswahl bleibt, damit der abgelehnte Mieter abgewählt werden kann.
    expect(onClearSelection).not.toHaveBeenCalled();
    expect(onUpdate).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("zeigt die Meldung einer Antwort im alten Format ohne technisches Präfix und lädt neu (Stand unbekannt)", async () => {
    antwortet({ status: 500, body: { error: KAUTION_GRUND_ROH } });
    const { onUpdate } = renderBar();

    await loescheUndBestaetige();

    expect(toastMock).toHaveBeenCalledWith({ title: "Fehler", description: KAUTION_GRUND, variant: "destructive" });
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it("zeigt einen Serverfehler ohne Gründe mit dem Text der Route", async () => {
    antwortet({ status: 500, body: { successCount: 0, errorCount: 1, reasons: [], error: "Die Mieter konnten nicht gelöscht werden." } });
    renderBar();

    await loescheUndBestaetige();

    expect(toastMock.mock.calls[0][0].description).toBe("Die Mieter konnten nicht gelöscht werden.");
  });

  it("meldet einen Verbindungsfehler allgemein, behält die Auswahl und lädt die Liste neu (Ergebnis unbekannt)", async () => {
    fetchMock.mockRejectedValue(new Error("Netzwerk"));
    const { onClearSelection, onUpdate } = renderBar();

    await loescheUndBestaetige();

    expect(toastMock).toHaveBeenCalledWith({ title: "Fehler", description: "Fehler beim Löschen der Mieter", variant: "destructive" });
    expect(onClearSelection).not.toHaveBeenCalled();
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it("sperrt Löschen ohne das Recht und ruft die Route nicht auf", async () => {
    renderBar({ canDelete: false });

    expect(screen.getByRole("button", { name: /^Löschen \(3\)$/ })).toBeDisabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("hat keinen toten Löschweg mehr: Die Leiste verlangt keinen onDelete-Callback", () => {
    // Die Leiste führt das Löschen selbst aus; ein Callback `onDelete` würde nie aufgerufen (frühere Fehlerquelle).
    const props = {
      selectedTenants: new Set(["t-1"]),
      tenants: TENANTS,
      wohnungsMap: {},
      onClearSelection: jest.fn(),
      onExport: jest.fn(),
    };
    expect(() => render(<TenantBulkActionBar {...props} />)).not.toThrow();
    expect(screen.getByRole("button", { name: /^Löschen \(1\)$/ })).toBeInTheDocument();
  });
});

describe("TenantBulkActionBar: Bewerber-Modus (Tab Bewerber)", () => {
  const loeschMock = bewerberLoeschenAction as jest.MockedFunction<typeof bewerberLoeschenAction>;

  it("zeigt keine Aktion 'Wohnung zuweisen', aber den Export", () => {
    renderBar({ modus: "bewerber" });

    expect(screen.queryByRole("button", { name: /Wohnung zuweisen/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Exportieren/ })).toBeInTheDocument();
  });

  it("löscht die Bewerber je ID über bewerberLoeschenAction und nicht über die Mieter-Routen", async () => {
    loeschMock.mockResolvedValue({ success: true });
    const { onClearSelection } = renderBar({ modus: "bewerber" });

    await loescheUndBestaetige();

    expect(loeschMock.mock.calls.map((aufruf) => aufruf[0]).sort()).toEqual(["t-1", "t-2", "t-3"]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(startMock).not.toHaveBeenCalled();
    expect(onClearSelection).toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ title: "Erfolg", description: expect.stringContaining("Bewerber") }));
  });

  it("meldet die Gründe ohne technisches Präfix, wenn einzelne Bewerber nicht gelöscht werden", async () => {
    loeschMock.mockImplementation(async (id: string) =>
      id === "t-2"
        ? { success: false, error: { message: "Zugriff auf diesen Bewerber verweigert." } }
        : { success: true }
    );
    const { onUpdate } = renderBar({ modus: "bewerber" });

    await loescheUndBestaetige();

    expect(onUpdate).toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: "Erfolg",
      description: expect.stringContaining("Zugriff auf diesen Bewerber verweigert."),
    }));
  });

  it("meldet einen Fehler, wenn kein Bewerber gelöscht werden konnte", async () => {
    loeschMock.mockResolvedValue({ success: false, error: { message: "Keine Berechtigung" } });
    renderBar({ modus: "bewerber" });

    await loescheUndBestaetige();

    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
      title: "Fehler",
      description: expect.stringMatching(/^Keine Bewerber konnten gelöscht werden\. .*Keine Berechtigung/),
    }));
  });
});

describe("TenantBulkActionBar: Auswahl-Pille", () => {
  it("zeigt die Anzahl mit dem Nomen und die Aktionen für Mieter", () => {
    renderBar({ selectedTenants: new Set(["t-1"]) });

    const pille = screen.getByRole("toolbar", { name: "Aktionen für die Auswahl" });
    expect(pille).toHaveTextContent("1 Mieter ausgewählt");
    expect(screen.getByRole("button", { name: "Wohnung zuweisen" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Exportieren" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Löschen (1)" })).toHaveTextContent("Löschen");
  });

  it("nennt im Bewerber-Modus Bewerber", () => {
    renderBar({ modus: "bewerber" });

    expect(screen.getByRole("toolbar", { name: "Aktionen für die Auswahl" })).toHaveTextContent("3 Bewerber ausgewählt");
  });

  it("rendert nichts ohne Auswahl", () => {
    renderBar({ selectedTenants: new Set() });

    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
  });

  it("hebt die Auswahl über das X auf und löst den Export aus", async () => {
    const onExport = jest.fn();
    const { onClearSelection } = renderBar({ onExport });
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    await user.click(screen.getByRole("button", { name: "Exportieren" }));
    expect(onExport).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Auswahl aufheben" }));
    expect(onClearSelection).toHaveBeenCalledTimes(1);
  });

  it("öffnet 'Wohnung zuweisen' als Dialog mit der Zahl der Mieter und sperrt die Aktion ohne Bearbeitungsrecht", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderBar({ wohnungsMap: { w1: "Wohnung 1" } });

    await user.click(screen.getByRole("button", { name: "Wohnung zuweisen" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Weisen Sie 3 ausgewählten Mietern eine Wohnung zu.");
    cleanup();

    renderBar({ canEdit: false });
    expect(screen.getByRole("button", { name: "Wohnung zuweisen" })).toBeDisabled();
  });

  it("zeigt während des Löschens einen Spinner und sperrt die Aktion", async () => {
    let beende: (wert: unknown) => void = () => {};
    fetchMock.mockImplementation(() => new Promise((resolve) => { beende = resolve; }));
    renderBar();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    await user.click(screen.getByRole("button", { name: "Löschen (3)" }));
    await user.click(await screen.findByRole("button", { name: "Löschen bestätigen" }));

    // Der Dialog ist modal und blendet die Pille für die Barrierefreiheits-Abfrage aus
    const aktion = await screen.findByRole("button", { name: "Löschen (3)", hidden: true });
    await waitFor(() => expect(aktion).toBeDisabled());
    expect(aktion).toHaveTextContent("Löschen…");
    expect(aktion).toHaveClass("[&_svg]:animate-spin");

    beende({ ok: true, status: 200, json: async () => ({ successCount: 3, errorCount: 0, reasons: [] }) });
    await waitFor(() => expect(toastMock).toHaveBeenCalledTimes(1));
  });
});
