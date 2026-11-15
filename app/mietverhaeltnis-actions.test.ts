/** @jest-environment node */

/**
 * Tests for the tenancy and rent history actions (GH-17, phase 3B).
 *
 * `jest.setup.js` mocks `@/lib/permissions` (always `true`) and `@/lib/auth-utils` globally; the negative cases
 * override them. All IDs, names and amounts are synthetic placeholders.
 */

import { revalidatePath } from "next/cache";
import { ensureAuth } from "@/lib/auth-utils";
import { hasPermission } from "@/lib/permissions";
import { getAccessibleWohnungIds } from "@/lib/object-scope";
import { logAction } from "@/lib/logging-middleware";
import {
  getMietverhaeltnisUebersichtAction,
  mieteEntfernenAction,
  mieteSetzenAction,
} from "@/app/mietverhaeltnis-actions";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/logging-middleware", () => ({ logAction: jest.fn() }));

const MIETER_ID = "11111111-1111-4111-8111-111111111111";
const MV_ID = "22222222-2222-4222-8222-222222222222";
const MIETE_ID = "33333333-3333-4333-8333-333333333333";
const MIETE_ALT_ID = "44444444-4444-4444-8444-444444444444";
const FREMDE_MIETE_ID = "55555555-5555-4555-8555-555555555555";
const WOHNUNG_ID = "66666666-6666-4666-8666-666666666666";

const mockHasPermission = hasPermission as jest.Mock;
const mockWohnungIds = getAccessibleWohnungIds as jest.Mock;
const mockEnsureAuth = ensureAuth as jest.Mock;
const mockLogAction = logAction as jest.Mock;
const mockRevalidatePath = revalidatePath as jest.Mock;

/** Per-table result of `.from(table).select().eq().maybeSingle()`, set by each test. */
let tableResults: Record<string, { data: unknown; error: unknown }> = {};
const mockFrom = jest.fn();
const mockRpc = jest.fn();
const mockSupabase = {
  from: mockFrom,
  rpc: (name: string, args: unknown) => mockRpc(name, args),
};

function mieterMitMietverhaeltnis() {
  tableResults.Mieter = {
    data: { id: MIETER_ID, mietverhaeltnis_id: MV_ID, wohnung_id: WOHNUNG_ID, Wohnungen: { miete: 800 } },
    error: null,
  };
}

function mieterOhneMietverhaeltnis() {
  tableResults.Mieter = {
    data: { id: MIETER_ID, mietverhaeltnis_id: null, wohnung_id: WOHNUNG_ID, Wohnungen: { miete: 800 } },
    error: null,
  };
}

const HISTORIE = [
  { miete_id: MIETE_ID, gueltig_ab: "2026-03-01", betrag: 850, aenderungsart: "vereinbarung", grund: "Indexierung", quelle: "app" },
  { miete_id: MIETE_ALT_ID, gueltig_ab: "2020-01-01", betrag: 700, aenderungsart: "vereinbarung", grund: null, quelle: "migration_bestand" },
];

function rpcAntworten(historie: unknown[] = HISTORIE, setzenErgebnis: { data: unknown; error: unknown } = { data: FREMDE_MIETE_ID, error: null }) {
  mockRpc.mockImplementation(async (name: string) => {
    if (name === "get_mietverhaeltnis_mieten") return { data: historie, error: null };
    if (name === "mietverhaeltnis_miete_setzen") return setzenErgebnis;
    return { data: null, error: null };
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  tableResults = {};
  mockFrom.mockImplementation((table: string) => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => tableResults[table] ?? { data: null, error: null },
      }),
    }),
  }));
  mockEnsureAuth.mockResolvedValue({ user: { id: "user-1" }, supabase: mockSupabase });
  mockHasPermission.mockResolvedValue(true);
  mockWohnungIds.mockResolvedValue(null);
  mieterMitMietverhaeltnis();
  tableResults.Mieter_Mietverhaeltnisse = {
    data: { id: MV_ID, wohnung_id: WOHNUNG_ID, vertragsbeginn: "2020-01-01", vertragsende: null, quelle: "app" },
    error: null,
  };
  rpcAntworten();
});

const setzenEingabe = (overrides: Record<string, unknown> = {}) => ({
  mieterId: MIETER_ID,
  gueltigAb: "2026-03-01",
  betrag: 850,
  grund: "  Indexierung  ",
  ...overrides,
});

describe("sign-in and module right", () => {
  it("returns MV001 without database access when not signed in", async () => {
    mockEnsureAuth.mockRejectedValueOnce(new Error("Nicht authentifiziert"));
    const result = await getMietverhaeltnisUebersichtAction(MIETER_ID);
    expect(result).toEqual({ success: false, error: { code: "MV001", message: "Bitte melden Sie sich erneut an." } });
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns MV001 for setzen when not signed in", async () => {
    mockEnsureAuth.mockRejectedValueOnce(new Error("Nicht authentifiziert"));
    const result = await mieteSetzenAction(setzenEingabe());
    expect(result.success).toBe(false);
    expect(result.success === false && result.error.code).toBe("MV001");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns 42501 for reading without the right, no database call", async () => {
    mockHasPermission.mockResolvedValueOnce(false);
    const result = await getMietverhaeltnisUebersichtAction(MIETER_ID);
    expect(result.success === false && result.error.code).toBe("42501");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("requires bearbeiten AND ansehen for setzen: missing ansehen gives 42501 and no RPC call", async () => {
    mockHasPermission.mockImplementation(async (_modul: string, aktion: string) => aktion !== "ansehen");
    const result = await mieteSetzenAction(setzenEingabe());
    expect(result.success === false && result.error.code).toBe("42501");
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockHasPermission).toHaveBeenCalledWith("mieter", "bearbeiten");
    expect(mockHasPermission).toHaveBeenCalledWith("mieter", "ansehen");
  });

  it("returns 42501 for entfernen without the write right, no RPC call", async () => {
    mockHasPermission.mockImplementation(async (_modul: string, aktion: string) => aktion === "ansehen");
    const result = await mieteEntfernenAction({ mieterId: MIETER_ID, mieteId: MIETE_ID });
    expect(result.success === false && result.error.code).toBe("42501");
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe("input validation (no RPC call)", () => {
  it.each([
    ["Betrag mit drei Nachkommastellen", { betrag: 10.005 }],
    ["negativer Betrag", { betrag: -1 }],
    ["Betrag ueber dem Limit", { betrag: 100000000 }],
    ["Betrag als Text", { betrag: "850" }],
    ["Betrag NaN", { betrag: Number.NaN }],
    ["Betrag unendlich", { betrag: Number.POSITIVE_INFINITY }],
    ["ungueltiges Datum", { gueltigAb: "2026-02-31" }],
    ["Datum vor 1900", { gueltigAb: "1899-12-31" }],
    ["Datum ohne Format", { gueltigAb: "01.03.2026" }],
    ["Grund zu lang", { grund: "x".repeat(501) }],
    ["ungueltige Mieter-ID", { mieterId: "keine-uuid" }],
  ])("rejects %s with MV004 and does not call the database", async (_label, overrides) => {
    const result = await mieteSetzenAction(setzenEingabe(overrides));
    expect(result.success === false && result.error.code).toBe("MV004");
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("rejects an invalid history entry ID for entfernen with MV004", async () => {
    const result = await mieteEntfernenAction({ mieterId: MIETER_ID, mieteId: "abc" });
    expect(result.success === false && result.error.code).toBe("MV004");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("accepts 0 and two decimal places and sends them as exact decimal string", async () => {
    const nullBetrag = await mieteSetzenAction(setzenEingabe({ betrag: 0, grund: "   " }));
    expect(nullBetrag.success).toBe(true);
    expect(mockRpc).toHaveBeenLastCalledWith("mietverhaeltnis_miete_setzen", expect.objectContaining({ p_betrag: "0.00", p_grund: null }));

    await mieteSetzenAction(setzenEingabe({ betrag: 1234.5 }));
    expect(mockRpc).toHaveBeenLastCalledWith("mietverhaeltnis_miete_setzen", expect.objectContaining({ p_betrag: "1234.50" }));
  });
});

describe("mieteSetzenAction", () => {
  it("calls the RPC with the server-side tenancy ID and revalidates", async () => {
    const result = await mieteSetzenAction(setzenEingabe());
    expect(result).toEqual({ success: true, data: { mieteId: FREMDE_MIETE_ID } });
    expect(mockRpc).toHaveBeenCalledWith("mietverhaeltnis_miete_setzen", {
      p_mietverhaeltnis_id: MV_ID,
      p_gueltig_ab: "2026-03-01",
      p_betrag: "850.00",
      p_aenderungsart: "vereinbarung",
      p_grund: "Indexierung",
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/mieter");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/finanzen");
  });

  it("ignores a tenancy ID sent by the client", async () => {
    const eingabe = { ...setzenEingabe(), mietverhaeltnisId: FREMDE_MIETE_ID, p_mietverhaeltnis_id: FREMDE_MIETE_ID };
    await mieteSetzenAction(eingabe as unknown as Parameters<typeof mieteSetzenAction>[0]);
    expect(mockRpc).toHaveBeenCalledWith("mietverhaeltnis_miete_setzen", expect.objectContaining({ p_mietverhaeltnis_id: MV_ID }));
  });

  it("returns MV003 for a tenant without tenancy and does not call the RPC", async () => {
    mieterOhneMietverhaeltnis();
    const result = await mieteSetzenAction(setzenEingabe());
    expect(result.success === false && result.error.code).toBe("MV003");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns MV003 for an unknown tenant", async () => {
    tableResults.Mieter = { data: null, error: null };
    const result = await mieteSetzenAction(setzenEingabe());
    expect(result.success === false && result.error.code).toBe("MV003");
  });

  it.each([
    ["MV004", "Die Eingabe ist ungültig."],
    ["42501", "Für diese Aktion fehlt die Berechtigung (Modul Mieter)."],
  ])("maps database error %s to a fixed message and drops the database text", async (code, message) => {
    rpcAntworten(HISTORIE, { data: null, error: { code, message: "Wert 850.00 fuer Max Muster verletzt Regel", details: "key=abc" } });
    const result = await mieteSetzenAction(setzenEingabe());
    expect(result).toEqual({ success: false, error: { code, message } });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("logs only the action name, the event and the code", async () => {
    await mieteSetzenAction(setzenEingabe());
    expect(mockLogAction).toHaveBeenCalledWith("mieteSetzen", "success", {});
    const alleAttribute = JSON.stringify(mockLogAction.mock.calls);
    expect(alleAttribute).not.toContain("850");
    expect(alleAttribute).not.toContain("Indexierung");
    expect(alleAttribute).not.toContain(MIETER_ID);
  });
});

describe("getMietverhaeltnisUebersichtAction", () => {
  it("returns tenancy, history with numeric amounts and apartment rent", async () => {
    const result = await getMietverhaeltnisUebersichtAction(MIETER_ID);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.mietverhaeltnis?.id).toBe(MV_ID);
    expect(result.data.mieten).toEqual([
      { miete_id: MIETE_ID, gueltig_ab: "2026-03-01", betrag: 850, aenderungsart: "vereinbarung", grund: "Indexierung", quelle: "app" },
      { miete_id: MIETE_ALT_ID, gueltig_ab: "2020-01-01", betrag: 700, aenderungsart: "vereinbarung", grund: null, quelle: "migration_bestand" },
    ]);
    expect(result.data.wohnungsmiete).toBe(800);
    expect(mockRpc).toHaveBeenCalledWith("get_mietverhaeltnis_mieten", { p_mietverhaeltnis_id: MV_ID });
  });

  it("returns no tenancy and an empty history for a tenant without tenancy (no error)", async () => {
    mieterOhneMietverhaeltnis();
    const result = await getMietverhaeltnisUebersichtAction(MIETER_ID);
    expect(result).toEqual({ success: true, data: { mietverhaeltnis: null, mieten: [], wohnungsmiete: 800 } });
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalledWith("Mieter_Mietverhaeltnisse");
  });

  it("rejects an invalid tenant ID without database access", async () => {
    const result = await getMietverhaeltnisUebersichtAction("nicht-gueltig");
    expect(result.success === false && result.error.code).toBe("MV004");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("maps a database error of the tenant query", async () => {
    tableResults.Mieter = { data: null, error: { code: "42501", message: "permission denied for table Mieter" } };
    const result = await getMietverhaeltnisUebersichtAction(MIETER_ID);
    expect(result).toEqual({ success: false, error: { code: "42501", message: "Für diese Aktion fehlt die Berechtigung (Modul Mieter)." } });
  });

  it("reads only, never writes the tenancy tables", async () => {
    await getMietverhaeltnisUebersichtAction(MIETER_ID);
    const benutzteTabellen = mockFrom.mock.calls.map((call) => call[0]);
    expect(benutzteTabellen).toEqual(["Mieter", "Mieter_Mietverhaeltnisse"]);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});

describe("mieteEntfernenAction", () => {
  it("removes an entry of the tenancy history", async () => {
    const result = await mieteEntfernenAction({ mieterId: MIETER_ID, mieteId: MIETE_ID });
    expect(result).toEqual({ success: true, data: undefined });
    expect(mockRpc).toHaveBeenCalledWith("mietverhaeltnis_miete_entfernen", { p_miete_id: MIETE_ID });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/mieter");
  });

  it("returns MV003 for an entry of another tenancy and does not remove it", async () => {
    const result = await mieteEntfernenAction({ mieterId: MIETER_ID, mieteId: FREMDE_MIETE_ID });
    expect(result.success === false && result.error.code).toBe("MV003");
    expect(mockRpc).not.toHaveBeenCalledWith("mietverhaeltnis_miete_entfernen", expect.anything());
  });

  it("maps MV005 from the database to its fixed message", async () => {
    mockRpc.mockImplementation(async (name: string) => {
      if (name === "get_mietverhaeltnis_mieten") return { data: HISTORIE, error: null };
      return { data: null, error: { code: "MV005", message: "MV005: Historie darf nicht leer werden" } };
    });
    const result = await mieteEntfernenAction({ mieterId: MIETER_ID, mieteId: MIETE_ID });
    expect(result).toEqual({
      success: false,
      error: { code: "MV005", message: "Die Miethistorie kann nicht vollständig entfernt werden." },
    });
  });

  it("returns MV003 for a tenant without tenancy", async () => {
    mieterOhneMietverhaeltnis();
    const result = await mieteEntfernenAction({ mieterId: MIETER_ID, mieteId: MIETE_ID });
    expect(result.success === false && result.error.code).toBe("MV003");
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe("object scope (user restricted to certain houses)", () => {
  const ANDERE_WOHNUNG_ID = "77777777-7777-4777-8777-777777777777";

  it("returns 42501 for reading a tenant outside the scope and does not expose the apartment rent", async () => {
    mockWohnungIds.mockResolvedValue([ANDERE_WOHNUNG_ID]);
    const result = await getMietverhaeltnisUebersichtAction(MIETER_ID);
    expect(result).toEqual({ success: false, error: expect.objectContaining({ code: "42501" }) });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns 42501 for setzen and entfernen outside the scope, no RPC call", async () => {
    mockWohnungIds.mockResolvedValue([ANDERE_WOHNUNG_ID]);
    const setzen = await mieteSetzenAction(setzenEingabe());
    const entfernen = await mieteEntfernenAction({ mieterId: MIETER_ID, mieteId: MIETE_ID });
    expect(setzen.success === false && setzen.error.code).toBe("42501");
    expect(entfernen.success === false && entfernen.error.code).toBe("42501");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("allows a tenant inside the scope", async () => {
    mockWohnungIds.mockResolvedValue([WOHNUNG_ID]);
    const result = await getMietverhaeltnisUebersichtAction(MIETER_ID);
    expect(result.success).toBe(true);
  });
});
