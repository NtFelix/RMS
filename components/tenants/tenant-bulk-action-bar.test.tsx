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
import type { Tenant } from "@/types/Tenant";

jest.mock("@/hooks/use-toast", () => ({ toast: jest.fn(), useToast: jest.fn() }));
jest.mock("@/app/mieter-actions", () => ({ updateTenantApartment: jest.fn() }));

jest.mock("@/lib/kautionen-loeschen", () => ({ starteLoeschenMitKautionen: jest.fn() }));

const startMock = starteLoeschenMitKautionen as jest.MockedFunction<typeof starteLoeschenMitKautionen>;
const toastMock = toast as unknown as jest.Mock;
const fetchMock = jest.fn();

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
  await waitFor(() => expect(screen.queryAllByText("Wird gelöscht...")).toHaveLength(0));
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
    expect(JSON.parse(options.body)).toEqual({ ids: ["t-1", "t-2", "t-3"], pruefsummen: {} });
    expect(startMock).toHaveBeenCalledWith("Mieter", ["t-1", "t-2", "t-3"], expect.any(Object));
  });

  it("mit gebuchter Kaution: keine zweite Frage, die bestätigte Übersicht sendet ihre Prüfsummen mit", async () => {
    startMock.mockImplementation(async (_tabelle, _ids, handlers) => handlers.loeschen({ "t-1": "abc", "t-3": "def" }));
    antwortet({ status: 200, body: { successCount: 3, errorCount: 0, reasons: [] } });
    renderBar();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    await user.click(screen.getByRole("button", { name: /^Löschen \(\d+\)$/ }));

    await waitFor(() => expect(toastMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryAllByText("Wird gelöscht...")).toHaveLength(0));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      ids: ["t-1", "t-2", "t-3"],
      pruefsummen: { "t-1": "abc", "t-3": "def" },
    });
  });

  it("löscht nichts und zeigt keine Frage, wenn die Übersicht abgebrochen wird", async () => {
    startMock.mockImplementation(async () => undefined);
    const { onClearSelection, onUpdate } = renderBar();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    await user.click(screen.getByRole("button", { name: /^Löschen \(\d+\)$/ }));

    await waitFor(() => expect(startMock).toHaveBeenCalledWith("Mieter", ["t-1", "t-2", "t-3"], expect.any(Object)));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryAllByText("Wird gelöscht...")).toHaveLength(0);
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
