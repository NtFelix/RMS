/** @jest-environment node */

/**
 * Tests für das Einstellungen-Layout: Das Layout ist eine statische Hülle mit Suspense,
 * die serverseitigen Abfragen (Organisation, Rechte) laufen im SettingsLayoutGate.
 * Alle Daten sind synthetische Platzhalter.
 */

import React, { Suspense } from "react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isOrgAdminOrOwner, hasPermission } from "@/lib/permissions";
import { SettingsLayoutClient } from "./settings-layout-client";
import { SettingsLayoutGate } from "./settings-layout-gate";
import EinstellungenLayout from "./layout";

jest.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: jest.fn(),
}));

jest.mock("@/lib/permissions", () => ({
  isOrgAdminOrOwner: jest.fn(),
  hasPermission: jest.fn(),
}));

jest.mock("./settings-layout-client", () => ({
  SettingsLayoutClient: () => null,
}));

const mockCreateClient = createSupabaseServerClient as jest.Mock;
const mockIsOrgAdminOrOwner = isOrgAdminOrOwner as jest.Mock;
const mockHasPermission = hasPermission as jest.Mock;

const mockOrgSingle = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockOrgSingle.mockResolvedValue({ data: { api_zugriff_aktiviert: true }, error: null });
  mockCreateClient.mockResolvedValue({
    from: () => ({
      select: () => ({ single: mockOrgSingle }),
    }),
  });
  mockIsOrgAdminOrOwner.mockResolvedValue(false);
  mockHasPermission.mockResolvedValue(false);
});

/** Führt das Gate aus und gibt die Props des zurückgegebenen SettingsLayoutClient zurück. */
async function gateProps(children: React.ReactNode = null): Promise<Record<string, unknown>> {
  const element = (await SettingsLayoutGate({ children })) as React.ReactElement<Record<string, unknown>>;
  expect(element.type).toBe(SettingsLayoutClient);
  return element.props;
}

describe("EinstellungenLayout - Prerendering-Hülle", () => {
  it("gibt synchron eine Suspense mit SettingsLayoutGate und unveränderten children zurück, ohne Supabase aufzurufen", () => {
    const children = <div />;

    const element = EinstellungenLayout({ children }) as React.ReactElement<{ children: React.ReactElement<{ children: React.ReactNode }> }>;

    expect(element.type).toBe(Suspense);
    const gate = element.props.children;
    expect(gate.type).toBe(SettingsLayoutGate);
    expect(gate.props.children).toBe(children);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});

describe("SettingsLayoutGate", () => {
  it("übergibt apiZugriffAktiviert aus der Organisation-Zeile", async () => {
    mockOrgSingle.mockResolvedValue({ data: { api_zugriff_aktiviert: true }, error: null });

    expect((await gateProps()).apiZugriffAktiviert).toBe(true);
  });

  it("übergibt apiZugriffAktiviert als false, wenn die Zeile fehlt oder null ist", async () => {
    mockOrgSingle.mockResolvedValueOnce({ data: null, error: null });
    expect((await gateProps()).apiZugriffAktiviert).toBe(false);

    mockOrgSingle.mockResolvedValueOnce({ data: { api_zugriff_aktiviert: null }, error: null });
    expect((await gateProps()).apiZugriffAktiviert).toBe(false);
  });

  it.each([
    [false, false, false],
    [true, false, true],
    [false, true, true],
    [true, true, true],
  ])(
    "canManageOrg bei isOrgAdminOrOwner=%s und hasPermission=%s ist %s",
    async (isAdmin, canManage, expected) => {
      mockIsOrgAdminOrOwner.mockResolvedValue(isAdmin);
      mockHasPermission.mockResolvedValue(canManage);

      expect((await gateProps()).canManageOrg).toBe(expected);
      expect(mockHasPermission).toHaveBeenCalledWith("organisation", "verwalten");
    },
  );

  it("reicht children unverändert an SettingsLayoutClient weiter", async () => {
    const children = <span data-testid="content" />;

    expect((await gateProps(children)).children).toBe(children);
  });
});
