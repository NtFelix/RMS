/** @jest-environment node */

/**
 * Tests für das Dashboard-Layout (Server Component), soweit sie das Kautionsmanagement (GH-6) betreffen:
 * Das Modulrecht `kautionen: ansehen` wird serverseitig im Layout ermittelt und als Prop `canViewKautionen`
 * an das Client-Layout gegeben. Es hängt damit nicht von der Seite ab, die zuerst geladen wurde (z. B. /mieter),
 * und wird mit dem Layout neu berechnet. Alle Daten sind synthetische Platzhalter.
 */

import React from "react";
import { hasPermission } from "@/lib/permissions";
import { getSidebarUserData } from "@/lib/server/user-data";
import DashboardRootLayout from "./layout";
import DashboardInnerLayout from "./layout-inner";

jest.mock("next/headers", () => ({
  headers: jest.fn(async () => ({ get: () => "nonce-test" })),
}));

jest.mock("@/lib/server/route-access", () => ({
  requireActiveSubscription: jest.fn(async () => ({
    supabase: { marker: "supabase" },
    user: { id: "user-1" },
    profile: { stripe_subscription_status: "active", stripe_price_id: null },
  })),
}));

jest.mock("@/lib/server/user-data", () => ({
  getSidebarUserData: jest.fn(),
}));

jest.mock("@/components/providers/csp-nonce-sync", () => ({ CSPNonceSync: () => null }));
jest.mock("./layout-inner", () => ({ __esModule: true, default: () => null }));

const mockHasPermission = hasPermission as jest.Mock;
const mockGetSidebarUserData = getSidebarUserData as jest.Mock;

const SIDEBAR_DATA = { user: { id: "user-1" }, modulePermissions: null };

/** Rendert das Layout und gibt die Props des Client-Layouts zurück. */
async function layoutProps(): Promise<Record<string, unknown>> {
  const element = (await DashboardRootLayout({ children: null })) as React.ReactElement<{ children: React.ReactElement[] }>;
  const children = React.Children.toArray(element.props.children) as React.ReactElement[];
  const inner = children.find((child) => child.type === DashboardInnerLayout);
  expect(inner).toBeDefined();
  return (inner as React.ReactElement).props as Record<string, unknown>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSidebarUserData.mockResolvedValue(SIDEBAR_DATA);
});

describe("DashboardRootLayout - Modulrecht Kautionen (GH-6)", () => {
  it("ermittelt kautionen:ansehen serverseitig und gibt es als canViewKautionen an das Client-Layout", async () => {
    mockHasPermission.mockResolvedValue(true);

    const props = await layoutProps();

    expect(mockHasPermission).toHaveBeenCalledWith("kautionen", "ansehen");
    expect(props.canViewKautionen).toBe(true);
    expect(props.sidebarData).toBe(SIDEBAR_DATA);
  });

  it("gibt ohne das Modulrecht false weiter (unabhängig von den Rechten für Mieter)", async () => {
    mockHasPermission.mockImplementation(async (modul: string) => modul === "mieter");

    expect((await layoutProps()).canViewKautionen).toBe(false);
  });

  it("berechnet das Recht bei jedem Rendern des Layouts neu (Nutzer- und Organisationswechsel)", async () => {
    mockHasPermission.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    expect((await layoutProps()).canViewKautionen).toBe(true);
    expect((await layoutProps()).canViewKautionen).toBe(false);
  });

  it("nimmt kautionen nicht in die Sidebar-Module auf (getSidebarUserData wird unverändert aufgerufen)", async () => {
    mockHasPermission.mockResolvedValue(true);

    await layoutProps();

    expect(mockGetSidebarUserData).toHaveBeenCalledTimes(1);
    expect(mockGetSidebarUserData).toHaveBeenCalledWith({ marker: "supabase" }, { id: "user-1" }, { stripe_subscription_status: "active", stripe_price_id: null });
  });
});
