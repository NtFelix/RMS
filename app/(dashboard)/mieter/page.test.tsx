/** @jest-environment node */

/**
 * Tests für die Mieter-Seite (Server Component), soweit sie das Kautionsmanagement (GH-6) betreffen:
 * - Das Modulrecht `kautionen: ansehen` wird zusätzlich geladen und als Prop `canViewKautionen` weitergereicht.
 * - Der Fallback-Select (RPC-Fehler) liest das Altfeld `kaution` NICHT, sonst würde ein RPC-Fehler das Modulrecht umgehen.
 * - Ohne Modulrecht wird `kaution` auch aus den RPC-Zeilen entfernt (zusätzlich zur Datenbank).
 * Alle Daten sind synthetische Platzhalter.
 */

import React from "react";
import { hasPermission } from "@/lib/permissions";
import { fetchWithRpcFallback } from "@/lib/data-fetching";
import MieterPage from "./page";

const mockFrom = jest.fn();
const mockRpc = jest.fn();

jest.mock("@/lib/server/route-access", () => ({
  requireAuthenticatedUser: jest.fn(async () => ({ supabase: { from: (...args: unknown[]) => mockFrom(...args), rpc: (...args: unknown[]) => mockRpc(...args) } })),
}));

jest.mock("@/lib/data-fetching", () => ({
  fetchWithRpcFallback: jest.fn(),
}));

jest.mock("@/app/mieter-actions", () => ({ handleSubmit: jest.fn() }));
jest.mock("./client-wrapper", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/common/table-skeleton", () => ({ TableSkeleton: () => null }));

const mockHasPermission = hasPermission as jest.Mock;
const mockFetchWithRpcFallback = fetchWithRpcFallback as jest.Mock;

/** Awaitable Supabase query mock (`select` -> `in` -> `await`). */
function queryResult(data: unknown[]) {
  const query: Record<string, unknown> = {
    in: jest.fn(() => query),
    then: (resolve: (value: { data: unknown[]; error: null }) => unknown) => resolve({ data, error: null }),
  };
  return query;
}

/** Renders the async content component of the page and returns the props of the client view. */
async function renderPageProps(): Promise<Record<string, unknown>> {
  const suspense = MieterPage() as React.ReactElement<{ children: React.ReactElement }>;
  const content = suspense.props.children;
  const view = (await (content.type as (props: unknown) => Promise<React.ReactElement>)(content.props)) as React.ReactElement;
  return view.props as Record<string, unknown>;
}

function allow(rights: Record<string, boolean>) {
  mockHasPermission.mockImplementation(async (modul: string, aktion: string) => rights[`${modul}:${aktion}`] ?? false);
}

const MIETER_RECHTE = { "mieter:ansehen": true, "mieter:erstellen": true, "mieter:bearbeiten": true, "mieter:loeschen": true };

beforeEach(() => {
  jest.clearAllMocks();
  mockRpc.mockResolvedValue({ data: null, error: null }); // get_accessible_haeuser_ids: unrestricted
  mockFrom.mockImplementation(() => ({ select: jest.fn(() => queryResult([])) }));
});

describe("MieterPage - Kaution (GH-6)", () => {
  it("loads the module right kautionen:ansehen and passes it on as canViewKautionen", async () => {
    mockFetchWithRpcFallback.mockResolvedValue([]);

    allow({ ...MIETER_RECHTE, "kautionen:ansehen": true });
    expect((await renderPageProps()).canViewKautionen).toBe(true);
    expect(mockHasPermission).toHaveBeenCalledWith("kautionen", "ansehen");

    allow({ ...MIETER_RECHTE });
    expect((await renderPageProps()).canViewKautionen).toBe(false);
  });

  it("does not grant the module right through the tenant rights (kautionen:ansehen decides alone)", async () => {
    mockFetchWithRpcFallback.mockResolvedValue([]);
    allow({ ...MIETER_RECHTE, "mieter:bearbeiten": true });

    expect((await renderPageProps()).canViewKautionen).toBe(false);
  });

  it("selects explicit tenant columns without the legacy field kaution in the fallback", async () => {
    // RPC schlägt fehl -> Fallback wird ausgeführt (die RPC-Wrapper-Funktion ruft ihn mit der Fallback-Funktion auf).
    mockFetchWithRpcFallback.mockImplementation(async (_supabase: unknown, _rpc: string, _args: unknown, fallback: () => Promise<unknown>) => fallback());
    const selectCalls: string[] = [];
    mockFrom.mockImplementation(() => ({
      select: jest.fn((columns: string) => {
        selectCalls.push(columns);
        return queryResult([]);
      }),
    }));
    allow({ ...MIETER_RECHTE, "kautionen:ansehen": true });

    await renderPageProps();

    const mieterSelect = selectCalls.find((columns) => columns.includes("bewerbung_score"));
    expect(mieterSelect).toBeDefined();
    expect(mieterSelect).not.toMatch(/kaution/i);
    expect(mieterSelect).not.toMatch(/\*/);
  });

  it("keeps the deposit of the RPC row with the module right", async () => {
    mockFetchWithRpcFallback.mockImplementation(async (_supabase: unknown, rpc: string) =>
      rpc === "get_mieter_details_overview"
        ? [{ id: "t1", name: "Test Mieter", wohnung_id: null, kaution: { amount: 1500, status: "Erhalten" } }]
        : []
    );
    allow({ ...MIETER_RECHTE, "kautionen:ansehen": true });

    const props = await renderPageProps();
    const tenants = props.initialTenants as Array<{ id: string; kaution?: unknown }>;

    expect(tenants).toHaveLength(1);
    expect(tenants[0].kaution).toEqual({ amount: 1500, status: "Erhalten" });
  });

  it("removes the deposit from the RPC rows without the module right (in addition to the database)", async () => {
    mockFetchWithRpcFallback.mockImplementation(async (_supabase: unknown, rpc: string) =>
      rpc === "get_mieter_details_overview"
        ? [{ id: "t1", name: "Test Mieter", wohnung_id: null, kaution: { amount: 1500, status: "Erhalten" } }]
        : []
    );
    allow({ ...MIETER_RECHTE });

    const props = await renderPageProps();
    const tenants = props.initialTenants as Array<{ id: string; kaution?: unknown }>;

    expect(tenants).toHaveLength(1);
    expect(tenants[0].kaution).toBeNull();
  });
});
