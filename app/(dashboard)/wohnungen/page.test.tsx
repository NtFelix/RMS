/** @jest-environment node */

/**
 * Tests für die Wohnungen-Seite (Server Component): Mieterdaten (`tenant`) nur mit `mieter:ansehen`.
 * Ohne das Recht werden Name/id gar nicht erst gelesen, der Status (frei/vermietet) bleibt aus Ein-/Auszug berechnet.
 * Faellt die Pruefung von mieter:ansehen aus, wird sie einmal wiederholt; schlaegt auch der Retry fehl, laedt die Seite
 * trotzdem, die Mieter bleiben ausgeblendet (fail-closed) und `permissionCheckFailed` markiert den Fall.
 * Alle Daten sind synthetische Platzhalter.
 */

import React from "react";
import { checkPermission, hasPermission } from "@/lib/permissions";
import WohnungenPage from "./page";

const mockFrom = jest.fn();
const mockRpc = jest.fn();

jest.mock("@/lib/server/route-access", () => ({
  requireAuthenticatedUser: jest.fn(async () => ({
    supabase: { from: (...args: unknown[]) => mockFrom(...args), rpc: (...args: unknown[]) => mockRpc(...args) },
    user: { id: "user-1" },
  })),
}));
jest.mock("@/lib/data-fetching", () => ({ fetchUserProfile: jest.fn(async () => null) }));
jest.mock("@/lib/stripe-server", () => ({ getPlanDetails: jest.fn() }));
jest.mock("./client", () => ({ __esModule: true, default: () => null }));
jest.mock("./skeleton", () => ({ WohnungenSkeleton: () => null }));

const mockCheckPermission = checkPermission as jest.Mock;
const mockHasPermission = hasPermission as jest.Mock;

const WOHNUNGEN = [
  { id: "w1", name: "Wohnung 1", groesse: 50, miete: 500, haus_id: "h1", Haeuser: { name: "Musterhaus" } },
  { id: "w2", name: "Wohnung 2", groesse: 60, miete: 600, haus_id: "h1", Haeuser: { name: "Musterhaus" } },
  { id: "w3", name: "Wohnung 3", groesse: 70, miete: 700, haus_id: "h1", Haeuser: { name: "Musterhaus" } },
];
const MIETER = [
  { id: "m1", wohnung_id: "w1", name: "Erika Beispiel", einzug: "2020-01-01", auszug: null },
  { id: "m2", wohnung_id: "w2", name: "Max Muster", einzug: "2015-01-01", auszug: "2016-01-01" },
];

/** Awaitable Supabase query mock; `select(spalten)` begrenzt die Mieterspalten wie PostgREST. */
function table(name: string, selects: Record<string, string[]>) {
  let data: unknown[] = [];
  const query: Record<string, unknown> = {};
  query.select = jest.fn((columns: string, opts?: { head?: boolean }) => {
    (selects[name] ??= []).push(columns);
    if (opts?.head) {
      data = [];
    } else if (name === "Wohnungen") {
      data = WOHNUNGEN;
    } else if (name === "Mieter") {
      const wanted = columns.split(",").map((c) => c.trim());
      data = MIETER.map((m) => Object.fromEntries(Object.entries(m).filter(([k]) => wanted.includes(k))));
    } else {
      data = [{ id: "h1", name: "Musterhaus" }];
    }
    return query;
  });
  query.in = jest.fn(() => query);
  query.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data, error: null, count: WOHNUNGEN.length }).then(resolve);
  return query;
}

function setup(mieterAnsehen: "allowed" | "denied" | "error") {
  const selects: Record<string, string[]> = {};
  mockFrom.mockImplementation((name: string) => table(name, selects));
  mockHasPermission.mockResolvedValue(true);
  mockCheckPermission.mockImplementation(async (modul: string) => (modul === "mieter" ? mieterAnsehen : "allowed"));
  return selects;
}

/** Renders the async content component of the page and returns its element. */
async function renderPage(): Promise<React.ReactElement> {
  const suspense = WohnungenPage() as React.ReactElement<{ children: React.ReactElement }>;
  const content = suspense.props.children;
  return (await (content.type as (props: unknown) => Promise<React.ReactElement>)(content.props)) as React.ReactElement;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation();
  mockRpc.mockResolvedValue({ data: null, error: null }); // get_accessible_haeuser_ids: unrestricted
});

describe("WohnungenPage - mieter:ansehen", () => {
  it("liefert mit mieter:ansehen tenant (id, name, einzug, auszug) wie bisher", async () => {
    const selects = setup("allowed");

    const { initialWohnungenData } = (await renderPage()).props as { initialWohnungenData: any[] };

    expect(selects.Mieter).toEqual(["id,wohnung_id,einzug,auszug,name"]);
    expect(initialWohnungenData[0]).toEqual(
      expect.objectContaining({
        status: "vermietet",
        tenant: { id: "m1", name: "Erika Beispiel", einzug: "2020-01-01", auszug: null },
      })
    );
    expect(initialWohnungenData[1].status).toBe("frei");
    expect(initialWohnungenData[1].tenant).toEqual(expect.objectContaining({ name: "Max Muster" }));
    expect(initialWohnungenData[2]).toEqual(expect.objectContaining({ status: "frei", tenant: undefined }));
    expect(initialWohnungenData.every((w) => !("tenantAccess" in w))).toBe(true);
  });

  it("liefert ohne mieter:ansehen keine Mieterfelder (weder gelesen noch uebergeben), aber den Status", async () => {
    const selects = setup("denied");

    const { initialWohnungenData } = (await renderPage()).props as { initialWohnungenData: any[] };
    const text = JSON.stringify(initialWohnungenData);

    // serverseitig nicht selektiert: keine id, kein Name
    expect(selects.Mieter).toEqual(["wohnung_id,einzug,auszug"]);
    expect(initialWohnungenData.map((w) => w.status)).toEqual(["vermietet", "frei", "frei"]);
    for (const w of initialWohnungenData) {
      expect(w).not.toHaveProperty("tenant");
      expect(w.tenantAccess).toBe(false);
    }
    for (const forbidden of ["Erika Beispiel", "Max Muster", "m1", "2020-01-01"]) {
      expect(text).not.toContain(forbidden);
    }
  });

  it("laedt mieter:ansehen in derselben Runde wie die uebrigen Rechte (parallel)", async () => {
    setup("allowed");
    const order: string[] = [];
    mockCheckPermission.mockImplementation(async (modul: string) => {
      order.push(`check:${modul}`);
      return "allowed";
    });
    mockFrom.mockImplementation((name: string) => {
      order.push(`from:${name}`);
      return table(name, {});
    });

    await renderPage();

    expect(order.indexOf("check:mieter")).toBeGreaterThanOrEqual(0);
    expect(order.indexOf("check:mieter")).toBeLessThan(order.indexOf("from:Wohnungen"));
  });

  describe("fehlgeschlagene mieter:ansehen-Pruefung", () => {
    /** mieter:ansehen antwortet nacheinander mit den Ergebnissen (erste Pruefung, Retry); das letzte wiederholt sich. */
    function setupSequence(...results: Array<"allowed" | "denied" | "error">) {
      const selects = setup("denied");
      let call = 0;
      mockCheckPermission.mockImplementation(async (modul: string) =>
        modul === "mieter" ? results[Math.min(call++, results.length - 1)] : "allowed"
      );
      return selects;
    }
    const mieterChecks = () => mockCheckPermission.mock.calls.filter(([modul]) => modul === "mieter");

    it("Retry klappt: Mieterdaten wie bisher, kein Signal", async () => {
      const selects = setupSequence("error", "allowed");

      const { initialWohnungenData } = (await renderPage()).props as { initialWohnungenData: any[] };

      expect(mieterChecks()).toHaveLength(2);
      expect(selects.Mieter).toEqual(["id,wohnung_id,einzug,auszug,name"]);
      expect(initialWohnungenData[0].tenant).toEqual(expect.objectContaining({ name: "Erika Beispiel" }));
      for (const w of initialWohnungenData) {
        expect(w).not.toHaveProperty("tenantAccess");
        expect(w).not.toHaveProperty("permissionCheckFailed");
      }
    });

    it("Retry schlaegt fehl: Seite laedt mit Wohnungsdaten, Mieter fail-closed ausgeblendet, permissionCheckFailed gesetzt", async () => {
      const selects = setupSequence("error");

      const element = await renderPage();
      const { initialWohnungenData, role } = element.props as { initialWohnungenData: any[]; role?: string };
      const text = JSON.stringify(initialWohnungenData);

      expect(role).toBeUndefined(); // kein Fehlerzustand mehr: die Seite laedt
      expect(mieterChecks()).toHaveLength(2); // genau ein Retry
      expect(selects.Mieter).toEqual(["wohnung_id,einzug,auszug"]); // weder id noch Name gelesen
      expect(initialWohnungenData.map((w) => w.name)).toEqual(["Wohnung 1", "Wohnung 2", "Wohnung 3"]);
      expect(initialWohnungenData.map((w) => w.status)).toEqual(["vermietet", "frei", "frei"]);
      for (const w of initialWohnungenData) {
        expect(w).not.toHaveProperty("tenant");
        expect(w.tenantAccess).toBe(false);
        expect(w.permissionCheckFailed).toBe(true);
      }
      for (const forbidden of ["Erika Beispiel", "Max Muster", "m1", "2020-01-01"]) {
        expect(text).not.toContain(forbidden);
      }
    });

    it("echtes denied: kein Retry und kein Signal", async () => {
      setupSequence("denied");

      const { initialWohnungenData } = (await renderPage()).props as { initialWohnungenData: any[] };

      expect(mieterChecks()).toHaveLength(1);
      for (const w of initialWohnungenData) {
        expect(w.tenantAccess).toBe(false);
        expect(w).not.toHaveProperty("permissionCheckFailed");
      }
    });

    it("wohnungen:ansehen fehlt: weiter Weiterleitung auf /unauthorized, auch wenn mieter:ansehen gewaehrt ist", async () => {
      setup("allowed");
      mockHasPermission.mockImplementation(async (modul: string, aktion: string) => !(modul === "wohnungen" && aktion === "ansehen"));
      const { redirect } = jest.requireMock("next/navigation") as { redirect: jest.Mock };

      await renderPage();

      expect(redirect).toHaveBeenCalledWith("/unauthorized");
    });
  });
});
