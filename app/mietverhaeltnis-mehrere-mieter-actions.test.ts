/** @jest-environment node */

/**
 * Tests for the actions of phase 6 (several tenants per tenancy, GH-17): `getMitmieterUebersichtAction`,
 * `mieterZusammenfuehrenAction`, `mieterTrennenAction`.
 *
 * `jest.setup.js` mocks `@/lib/permissions` (always `true`) and `@/lib/auth-utils` globally; the negative cases
 * override them. All IDs, names and amounts are synthetic placeholders.
 */

import { revalidatePath } from "next/cache";
import { ensureAuth } from "@/lib/auth-utils";
import { hasPermission } from "@/lib/permissions";
import { getAccessibleWohnungIds } from "@/lib/object-scope";
import {
  getMitmieterUebersichtAction,
  mieterTrennenAction,
  mieterZusammenfuehrenAction,
} from "@/app/mietverhaeltnis-actions";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/logging-middleware", () => ({ logAction: jest.fn() }));

const MIETER_ID = "11111111-1111-4111-8111-111111111111";
const MV_ID = "22222222-2222-4222-8222-222222222222";
const ZIEL_MV_ID = "33333333-3333-4333-8333-333333333333";
const WOHNUNG_ID = "66666666-6666-4666-8666-666666666666";
const ANDERER_ID = "44444444-4444-4444-8444-444444444444";
const MITMIETER_ID = "55555555-5555-4555-8555-555555555555";
const NEU_MV_ID = "77777777-7777-4777-8777-777777777777";

const mockHasPermission = hasPermission as jest.Mock;
const mockWohnungIds = getAccessibleWohnungIds as jest.Mock;
const mockEnsureAuth = ensureAuth as jest.Mock;
const mockRevalidatePath = revalidatePath as jest.Mock;

type Antwort = { data: unknown; error: unknown };

let mieterZeile: Antwort;
let mieterListe: Antwort;
let mvListe: Antwort;
let rpcErgebnis: Antwort;

const mockRpc = jest.fn();
const mockFrom = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mieterZeile = {
    data: { id: MIETER_ID, mietverhaeltnis_id: MV_ID, wohnung_id: WOHNUNG_ID, einzug: "2020-01-01", Wohnungen: { miete: 800 } },
    error: null,
  };
  mieterListe = { data: [], error: null };
  mvListe = { data: [], error: null };
  rpcErgebnis = { data: NEU_MV_ID, error: null };

  mockRpc.mockImplementation(async () => rpcErgebnis);
  mockFrom.mockImplementation((table: string) => ({
    select: () => ({
      in: async () => (table === "Mieter_Mietverhaeltnisse" ? mvListe : { data: [], error: null }),
      eq: () =>
        Object.assign(Promise.resolve(table === "Mieter" ? mieterListe : { data: [], error: null }), {
          maybeSingle: async () => (table === "Mieter" ? mieterZeile : { data: null, error: null }),
        }),
    }),
  }));
  mockEnsureAuth.mockResolvedValue({ user: { id: "user-1" }, supabase: { from: mockFrom, rpc: mockRpc } });
  mockHasPermission.mockResolvedValue(true);
  mockWohnungIds.mockResolvedValue(null);
});

describe("getMitmieterUebersichtAction", () => {
  it("separates fellow tenants of the same tenancy from tenancies the tenant could join", async () => {
    mieterListe = {
      data: [
        { id: MIETER_ID, person: { vorname: "Test Eins", nachname: null }, rolle: null, mietverhaeltnis_id: MV_ID, geloescht_am: null },
        { id: MITMIETER_ID, person: { vorname: "Test Zwei", nachname: null }, rolle: "mitmieter", mietverhaeltnis_id: MV_ID, geloescht_am: null },
        { id: ANDERER_ID, person: { vorname: "Test Drei", nachname: null }, rolle: null, mietverhaeltnis_id: ZIEL_MV_ID, geloescht_am: null },
      ],
      error: null,
    };
    mvListe = { data: [{ id: ZIEL_MV_ID, vertragsende: null }], error: null };
    const result = await getMitmieterUebersichtAction(MIETER_ID);
    expect(result).toEqual({
      success: true,
      data: {
        mitmieter: [{ mieterId: MITMIETER_ID, name: "Test Zwei", rolle: "mitmieter" }],
        kandidaten: [{ mietverhaeltnisId: ZIEL_MV_ID, mieterNamen: ["Test Drei"] }],
      },
    });
  });

  it("leaves out tenants who have moved out and tenancies that have already ended", async () => {
    mieterListe = {
      data: [
        { id: MITMIETER_ID, person: { vorname: "Ausgezogen", nachname: null }, rolle: null, mietverhaeltnis_id: MV_ID, geloescht_am: null, auszug: "2020-01-31" },
        { id: ANDERER_ID, person: { vorname: "Test Drei", nachname: null }, rolle: null, mietverhaeltnis_id: ZIEL_MV_ID, geloescht_am: null, auszug: null },
        { id: "99999999-9999-4999-8999-999999999999", person: { vorname: "Test Vier", nachname: null }, rolle: null, mietverhaeltnis_id: NEU_MV_ID, geloescht_am: null, auszug: null },
      ],
      error: null,
    };
    mvListe = { data: [{ id: ZIEL_MV_ID, vertragsende: null }, { id: NEU_MV_ID, vertragsende: "2020-12-31" }], error: null };
    const result = await getMitmieterUebersichtAction(MIETER_ID);
    expect(result).toEqual({
      success: true,
      data: { mitmieter: [], kandidaten: [{ mietverhaeltnisId: ZIEL_MV_ID, mieterNamen: ["Test Drei"] }] },
    });
  });

  it("maps a database error of the tenancy query", async () => {
    mieterListe = {
      data: [{ id: ANDERER_ID, person: { vorname: "Test Drei", nachname: null }, rolle: null, mietverhaeltnis_id: ZIEL_MV_ID, geloescht_am: null, auszug: null }],
      error: null,
    };
    mvListe = { data: null, error: { code: "42501", message: "x" } };
    expect(await getMitmieterUebersichtAction(MIETER_ID)).toMatchObject({ success: false, error: { code: "42501" } });
  });

  it("ignores deleted tenants and tenants without a tenancy", async () => {
    mieterListe = {
      data: [
        { id: MITMIETER_ID, person: { vorname: "Gelöscht", nachname: null }, rolle: null, mietverhaeltnis_id: MV_ID, geloescht_am: "2026-01-01T00:00:00Z" },
        { id: "99999999-9999-4999-8999-999999999999", person: { vorname: "Ohne", nachname: null }, rolle: null, mietverhaeltnis_id: null, geloescht_am: null },
      ],
      error: null,
    };
    const result = await getMitmieterUebersichtAction(MIETER_ID);
    expect(result).toEqual({ success: true, data: { mitmieter: [], kandidaten: [] } });
  });

  it("returns empty lists for a tenant without tenancy (no query for the apartment)", async () => {
    mieterZeile = { data: { ...(mieterZeile.data as object), mietverhaeltnis_id: null }, error: null };
    const result = await getMitmieterUebersichtAction(MIETER_ID);
    expect(result).toEqual({ success: true, data: { mitmieter: [], kandidaten: [] } });
  });

  it("rejects an invalid ID with MV004", async () => {
    const result = await getMitmieterUebersichtAction("kein-uuid");
    expect(result).toMatchObject({ success: false, error: { code: "MV004" } });
  });

  it("maps a database error", async () => {
    mieterListe = { data: null, error: { code: "42501", message: "x" } };
    const result = await getMitmieterUebersichtAction(MIETER_ID);
    expect(result).toMatchObject({ success: false, error: { code: "42501" } });
  });
});

describe("mieterZusammenfuehrenAction", () => {
  const eingabe = (overrides: Record<string, unknown> = {}) => ({
    mieterId: MIETER_ID,
    zielMietverhaeltnisId: ZIEL_MV_ID,
    datum: "2026-07-01",
    rolle: "mitmieter",
    ...overrides,
  });

  it("calls the RPC with the checked values and revalidates", async () => {
    rpcErgebnis = { data: ZIEL_MV_ID, error: null };
    const result = await mieterZusammenfuehrenAction(eingabe() as never);
    expect(result).toEqual({ success: true, data: { mietverhaeltnisId: ZIEL_MV_ID } });
    expect(mockRpc).toHaveBeenCalledWith("mietverhaeltnis_mieter_zusammenfuehren", {
      p_mieter_id: MIETER_ID,
      p_ziel_mietverhaeltnis_id: ZIEL_MV_ID,
      p_datum: "2026-07-01",
      p_rolle: "mitmieter",
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/mieter");
  });

  it("passes no role as null", async () => {
    await mieterZusammenfuehrenAction(eingabe({ rolle: undefined }) as never);
    expect(mockRpc).toHaveBeenCalledWith("mietverhaeltnis_mieter_zusammenfuehren", expect.objectContaining({ p_rolle: null }));
  });

  it.each([
    ["invalid tenant ID", { mieterId: "x" }],
    ["invalid target ID", { zielMietverhaeltnisId: "x" }],
    ["impossible date", { datum: "2026-02-30" }],
    ["missing date", { datum: undefined }],
    ["unknown role", { rolle: "chef" }],
  ])("rejects %s with MV004 before any database call", async (_name, overrides) => {
    const result = await mieterZusammenfuehrenAction(eingabe(overrides) as never);
    expect(result).toMatchObject({ success: false, error: { code: "MV004" } });
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("needs the rights view and edit", async () => {
    mockHasPermission.mockImplementation(async (_modul: string, aktion: string) => aktion !== "bearbeiten");
    const result = await mieterZusammenfuehrenAction(eingabe() as never);
    expect(result).toMatchObject({ success: false, error: { code: "42501" } });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("rejects a tenant outside the object scope without an RPC call", async () => {
    mockWohnungIds.mockResolvedValue(["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]);
    const result = await mieterZusammenfuehrenAction(eingabe() as never);
    expect(result).toMatchObject({ success: false, error: { code: "42501" } });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("maps MV013 from the database and does not revalidate", async () => {
    rpcErgebnis = { data: null, error: { code: "MV013", message: "x" } };
    const result = await mieterZusammenfuehrenAction(eingabe() as never);
    expect(result).toMatchObject({ success: false, error: { code: "MV013" } });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("treats a non-ID answer as unknown error", async () => {
    rpcErgebnis = { data: "kaputt", error: null };
    const result = await mieterZusammenfuehrenAction(eingabe() as never);
    expect(result).toMatchObject({ success: false, error: { code: "UNBEKANNT" } });
  });
});

describe("mieterTrennenAction", () => {
  it("calls the RPC with an optional rent", async () => {
    const result = await mieterTrennenAction({ mieterId: MIETER_ID, datum: "2026-09-01", miete: 450.5 });
    expect(result).toEqual({ success: true, data: { mietverhaeltnisId: NEU_MV_ID } });
    expect(mockRpc).toHaveBeenCalledWith("mietverhaeltnis_mieter_trennen", { p_mieter_id: MIETER_ID, p_datum: "2026-09-01", p_miete: 450.5 });
  });

  it("passes no rent as null", async () => {
    await mieterTrennenAction({ mieterId: MIETER_ID, datum: "2026-09-01" });
    expect(mockRpc).toHaveBeenCalledWith("mietverhaeltnis_mieter_trennen", { p_mieter_id: MIETER_ID, p_datum: "2026-09-01", p_miete: null });
  });

  it("sends the areas of the new and the shared tenancy only when given", async () => {
    await mieterTrennenAction({ mieterId: MIETER_ID, datum: "2026-09-01", flaecheNeu: 20, flaecheBisher: 50.25 });
    expect(mockRpc).toHaveBeenCalledWith("mietverhaeltnis_mieter_trennen", {
      p_mieter_id: MIETER_ID, p_datum: "2026-09-01", p_miete: null, p_flaeche_neu: 20, p_flaeche_bisher: 50.25,
    });
    mockRpc.mockClear();
    await mieterTrennenAction({ mieterId: MIETER_ID, datum: "2026-09-01", flaecheNeu: 20, flaecheBisher: null });
    expect(mockRpc).toHaveBeenCalledWith("mietverhaeltnis_mieter_trennen", { p_mieter_id: MIETER_ID, p_datum: "2026-09-01", p_miete: null, p_flaeche_neu: 20 });
  });

  it.each([
    ["invalid ID", { mieterId: "x", datum: "2026-09-01" }],
    ["new area 0", { mieterId: MIETER_ID, datum: "2026-09-01", flaecheNeu: 0 }],
    ["shared area with three decimals", { mieterId: MIETER_ID, datum: "2026-09-01", flaecheBisher: 20.001 }],
    ["new area above 100000", { mieterId: MIETER_ID, datum: "2026-09-01", flaecheNeu: 100000.01 }],
    ["area as text", { mieterId: MIETER_ID, datum: "2026-09-01", flaecheBisher: "50" }],
    ["invalid date", { mieterId: MIETER_ID, datum: "01.09.2026" }],
    ["negative rent", { mieterId: MIETER_ID, datum: "2026-09-01", miete: -1 }],
    ["rent with three decimals", { mieterId: MIETER_ID, datum: "2026-09-01", miete: 10.999 }],
    ["NaN rent", { mieterId: MIETER_ID, datum: "2026-09-01", miete: Number.NaN }],
  ])("rejects %s with MV004 before any database call", async (_name, eingabe) => {
    const result = await mieterTrennenAction(eingabe as never);
    expect(result).toMatchObject({ success: false, error: { code: "MV004" } });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("needs view, edit and create rights", async () => {
    mockHasPermission.mockImplementation(async (_modul: string, aktion: string) => aktion !== "erstellen");
    const result = await mieterTrennenAction({ mieterId: MIETER_ID, datum: "2026-09-01" });
    expect(result).toMatchObject({ success: false, error: { code: "42501" } });
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
