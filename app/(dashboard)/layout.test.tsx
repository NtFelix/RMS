/** @jest-environment node */

/**
 * Tests für das Dashboard-Layout: `layout.tsx` ist eine statische Shell (Suspense um `DashboardGate`), die
 * Request-Arbeit liegt in `DashboardGate`. Der erste Block betrifft das Kautionsmanagement (GH-6):
 * Das Modulrecht `kautionen: ansehen` wird serverseitig im Gate ermittelt und als Prop `canViewKautionen`
 * an `KautionenRechtSync` gegeben (neben dem Client-Layout). Es hängt damit nicht von der Seite ab, die zuerst geladen wurde (z. B. /mieter),
 * und wird mit dem Layout neu berechnet. Alle Daten sind synthetische Platzhalter.
 */

import React, { Suspense } from "react";
import { hasPermission } from "@/lib/permissions";
import { getSidebarUserData } from "@/lib/server/user-data";
import { requireActiveSubscription } from "@/lib/server/route-access";
import { headers } from "next/headers";
import DashboardRootLayout from "./layout";
import { DashboardGate } from "./dashboard-gate";
import { DashboardShellFallback } from "./dashboard-shell-fallback";
import { KautionenRechtSync } from "@/components/kaution/kautionen-recht-sync";
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
jest.mock("@/components/kaution/kautionen-recht-sync", () => ({ KautionenRechtSync: () => null }));

const mockHasPermission = hasPermission as jest.Mock;
const mockGetSidebarUserData = getSidebarUserData as jest.Mock;

const SIDEBAR_DATA = { user: { id: "user-1" }, modulePermissions: null };

/** Rendert den Gate (dort laufen Auth, Sidebar-Daten und Rechte) und gibt die Props einer Kindkomponente zurück. */
async function childProps(type: unknown): Promise<Record<string, unknown>> {
  const element = (await DashboardGate({ children: null })) as React.ReactElement<{ children: React.ReactElement[] }>;
  const children = React.Children.toArray(element.props.children) as React.ReactElement[];
  const child = children.find((candidate) => candidate.type === type);
  expect(child).toBeDefined();
  return (child as React.ReactElement).props as Record<string, unknown>;
}

/** Props von `KautionenRechtSync`. */
const layoutProps = () => childProps(KautionenRechtSync);

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSidebarUserData.mockResolvedValue(SIDEBAR_DATA);
});

describe("DashboardGate - Modulrecht Kautionen (GH-6)", () => {
  it("ermittelt kautionen:ansehen serverseitig und gibt es als canViewKautionen an KautionenRechtSync", async () => {
    mockHasPermission.mockResolvedValue(true);

    const props = await layoutProps();

    expect(mockHasPermission).toHaveBeenCalledWith("kautionen", "ansehen");
    expect(props.canViewKautionen).toBe(true);
    expect(props.userId).toBe("user-1");
    expect((await childProps(DashboardInnerLayout)).sidebarData).toBe(SIDEBAR_DATA);
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

describe("DashboardRootLayout (static shell)", () => {
  it("rendert nur eine Suspense-Grenze um DashboardGate und reicht children unverändert weiter, ohne Request-Arbeit", () => {
    const child = <div />;

    const element = DashboardRootLayout({ children: child }) as React.ReactElement<{
      fallback: React.ReactElement;
      children: React.ReactElement<{ children: React.ReactNode }>;
    }>;

    expect(element.type).toBe(Suspense);
    // The fallback is part of the prerendered shell of every dashboard route: it must be the neutral one
    expect(element.props.fallback.type).toBe(DashboardShellFallback);
    const gate = element.props.children;
    expect(gate.type).toBe(DashboardGate);
    expect(gate.props.children).toBe(child);
    expect(requireActiveSubscription).not.toHaveBeenCalled();
  });

  it("bricht ab, wenn das Gate umleitet: nachgelagerte Arbeit und Kinder laufen nicht", async () => {
    (requireActiveSubscription as jest.Mock).mockRejectedValueOnce(new Error("NEXT_REDIRECT: /login"));

    await expect(DashboardGate({ children: null })).rejects.toThrow();

    expect(requireActiveSubscription).toHaveBeenCalledTimes(1);
    expect(mockGetSidebarUserData).not.toHaveBeenCalled();
    expect(mockHasPermission).not.toHaveBeenCalled();
    expect(headers).not.toHaveBeenCalled();
  });

  it("reicht children unverändert an DashboardInnerLayout weiter", async () => {
    const child = <span data-testid="page" />;

    const element = (await DashboardGate({ children: child })) as React.ReactElement<{ children: React.ReactElement[] }>;
    const children = React.Children.toArray(element.props.children) as React.ReactElement[];
    const inner = children.find((candidate) => candidate.type === DashboardInnerLayout) as React.ReactElement<{ children: unknown }>;

    expect(inner).toBeDefined();
    expect(inner.props.children).toBe(child);
  });
});
