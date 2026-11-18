/** @jest-environment node */

/**
 * Tests for the tenancy actions (GH-17, phases 3B, 4 and 5).
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
  mietverhaeltnisAnlegenAction,
  mieteEntfernenAction,
  mieteSetzenAction,
  mieterUmzugAction,
  vertragsdatenSpeichernAction,
} from "@/app/mietverhaeltnis-actions";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/logging-middleware", () => ({ logAction: jest.fn() }));

const MIETER_ID = "11111111-1111-4111-8111-111111111111";
const MV_ID = "22222222-2222-4222-8222-222222222222";
const MIETE_ID = "33333333-3333-4333-8333-333333333333";
const MIETE_ALT_ID = "44444444-4444-4444-8444-444444444444";
const FREMDE_MIETE_ID = "55555555-5555-4555-8555-555555555555";
const WOHNUNG_ID = "66666666-6666-4666-8666-666666666666";
const NEU_MV_ID = "77777777-7777-4777-8777-777777777777";
const NEU_MIETE_ID = "88888888-8888-4888-8888-888888888888";
const NEU_WOHNUNG_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const mockHasPermission = hasPermission as jest.Mock;
const mockWohnungIds = getAccessibleWohnungIds as jest.Mock;
const mockEnsureAuth = ensureAuth as jest.Mock;
const mockLogAction = logAction as jest.Mock;
const mockRevalidatePath = revalidatePath as jest.Mock;

type Antwort = { data: unknown; error: unknown };

/** Per-table result of `.from(table).select().eq().maybeSingle()`, set by each test. */
let tableResults: Record<string, Antwort> = {};
/** Result of the declaration-date query (`Mieter_Mietverhaeltnisse_Mieten`, awaited directly after `.eq()`). */
let erklaertErgebnis: Antwort = { data: [], error: null };
let erklaertWirft = false;
/** Result of `.update().eq().select()` on `Mieter_Mietverhaeltnisse`. */
let updateErgebnis: Antwort = { data: [{ id: MV_ID }], error: null };
/** Results of RPCs by name; `get_mietverhaeltnis_mieten` uses `historieDaten`. */
let rpcErgebnisse: Record<string, Antwort> = {};
let historieDaten: unknown[] = [];

const mockFrom = jest.fn();
const mockRpc = jest.fn();
const mockUpdate = jest.fn();
const mockUpdateFilter = jest.fn();
const mockSupabase = {
  from: mockFrom,
  rpc: (name: string, args: unknown) => mockRpc(name, args),
};

const MIETER_ZEILE = {
  id: MIETER_ID,
  mietverhaeltnis_id: MV_ID,
  wohnung_id: WOHNUNG_ID,
  einzug: "2020-01-01",
  status: "aktiv",
  Wohnungen: { miete: 800 },
};

function mieterMitMietverhaeltnis() {
  tableResults.Mieter = { data: MIETER_ZEILE, error: null };
}

function mieterOhneMietverhaeltnis(overrides: Record<string, unknown> = {}) {
  tableResults.Mieter = { data: { ...MIETER_ZEILE, mietverhaeltnis_id: null, ...overrides }, error: null };
}

const HISTORIE = [
  { miete_id: MIETE_ID, gueltig_ab: "2026-03-01", betrag: 850, aenderungsart: "vereinbarung", grund: "Indexierung", quelle: "app" },
  { miete_id: MIETE_ALT_ID, gueltig_ab: "2020-01-01", betrag: 700, aenderungsart: "vereinbarung", grund: null, quelle: "migration_bestand" },
];

beforeEach(() => {
  jest.clearAllMocks();
  tableResults = {};
  erklaertErgebnis = { data: [], error: null };
  erklaertWirft = false;
  updateErgebnis = { data: [{ id: MV_ID }], error: null };
  historieDaten = HISTORIE;
  rpcErgebnisse = {
    mietverhaeltnis_miete_setzen: { data: FREMDE_MIETE_ID, error: null },
    mietverhaeltnis_anlegen: { data: NEU_MV_ID, error: null },
    mietverhaeltnis_miete_entfernen: { data: null, error: null },
    mietverhaeltnis_umzug: { data: NEU_MV_ID, error: null },
  };

  mockRpc.mockImplementation(async (name: string) => {
    if (name === "get_mietverhaeltnis_mieten") return { data: historieDaten, error: null };
    return rpcErgebnisse[name] ?? { data: null, error: null };
  });

  mockFrom.mockImplementation((table: string) => ({
    select: () => ({
      eq: () => {
        const ergebnis: Promise<Antwort> =
          table === "Mieter_Mietverhaeltnisse_Mieten" && erklaertWirft
            ? Promise.reject(new Error("Netzwerkfehler"))
            : Promise.resolve(table === "Mieter_Mietverhaeltnisse_Mieten" ? erklaertErgebnis : { data: [], error: null });
        return Object.assign(ergebnis, {
          maybeSingle: async () => tableResults[table] ?? { data: null, error: null },
        });
      },
    }),
    update: (werte: unknown) => {
      mockUpdate(table, werte);
      return {
        eq: (spalte: string, wert: unknown) => {
          mockUpdateFilter(spalte, wert);
          return { select: async () => updateErgebnis };
        },
      };
    },
  }));

  mockEnsureAuth.mockResolvedValue({ user: { id: "user-1" }, supabase: mockSupabase });
  mockHasPermission.mockResolvedValue(true);
  mockWohnungIds.mockResolvedValue(null);
  mieterMitMietverhaeltnis();
  tableResults.Mieter_Mietverhaeltnisse = {
    data: { id: MV_ID, wohnung_id: WOHNUNG_ID, vertragsbeginn: "2020-01-01", vertragsende: null, quelle: "app" },
    error: null,
  };
});

const setzenEingabe = (overrides: Record<string, unknown> = {}) => ({
  mieterId: MIETER_ID,
  gueltigAb: "2026-03-01",
  betrag: 850,
  grund: "  Indexierung  ",
  ...overrides,
});

const vertragsdatenEingabe = (overrides: Record<string, unknown> = {}) => ({
  mieterId: MIETER_ID,
  vertragsende: "2027-12-31",
  befristetBis: "2027-12-31",
  kuendigungEingangAm: "2026-09-01",
  kuendigungZum: "2026-11-30",
  kuendigungDurch: "mieter" as const,
  notiz: "  Haustiere erlaubt  ",
  ...overrides,
});

const anlegenEingabe = (overrides: Record<string, unknown> = {}) => ({
  mieterId: MIETER_ID,
  vertragsbeginn: "2026-01-01",
  miete: 800,
  ...overrides,
});

/** Code of a failed result, `undefined` for a success. */
const fehlercode = (result: { success: boolean; error?: { code: string } }) => (result.success ? undefined : result.error?.code);

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
    expect(fehlercode(result)).toBe("MV001");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns MV001 for anlegen and vertragsdaten when not signed in, without writes", async () => {
    mockEnsureAuth.mockRejectedValue(new Error("Nicht authentifiziert"));
    expect(fehlercode(await mietverhaeltnisAnlegenAction(anlegenEingabe()))).toBe("MV001");
    expect(fehlercode(await vertragsdatenSpeichernAction(vertragsdatenEingabe()))).toBe("MV001");
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns 42501 for reading without the right, no database call", async () => {
    mockHasPermission.mockResolvedValueOnce(false);
    const result = await getMietverhaeltnisUebersichtAction(MIETER_ID);
    expect(fehlercode(result)).toBe("42501");
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("requires bearbeiten AND ansehen for setzen: missing ansehen gives 42501 and no RPC call", async () => {
    mockHasPermission.mockImplementation(async (_modul: string, aktion: string) => aktion !== "ansehen");
    const result = await mieteSetzenAction(setzenEingabe());
    expect(fehlercode(result)).toBe("42501");
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockHasPermission).toHaveBeenCalledWith("mieter", "bearbeiten");
    expect(mockHasPermission).toHaveBeenCalledWith("mieter", "ansehen");
  });

  it("returns 42501 for entfernen without the write right, no RPC call", async () => {
    mockHasPermission.mockImplementation(async (_modul: string, aktion: string) => aktion === "ansehen");
    const result = await mieteEntfernenAction({ mieterId: MIETER_ID, mieteId: MIETE_ID });
    expect(fehlercode(result)).toBe("42501");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("requires erstellen AND ansehen for anlegen: missing erstellen gives 42501 and no RPC call", async () => {
    mockHasPermission.mockImplementation(async (_modul: string, aktion: string) => aktion !== "erstellen");
    const result = await mietverhaeltnisAnlegenAction(anlegenEingabe());
    expect(fehlercode(result)).toBe("42501");
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns 42501 for vertragsdaten without bearbeiten, no write and no RPC", async () => {
    mockHasPermission.mockImplementation(async (_modul: string, aktion: string) => aktion !== "bearbeiten");
    expect(fehlercode(await vertragsdatenSpeichernAction(vertragsdatenEingabe()))).toBe("42501");
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe("input validation (no RPC or update call)", () => {
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
  ])("setzen rejects %s with MV004 and does not call the database", async (_label, overrides) => {
    const result = await mieteSetzenAction(setzenEingabe(overrides));
    expect(fehlercode(result)).toBe("MV004");
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("rejects an invalid history entry ID for entfernen with MV004", async () => {
    const result = await mieteEntfernenAction({ mieterId: MIETER_ID, mieteId: "abc" });
    expect(fehlercode(result)).toBe("MV004");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it.each([
    ["ungueltiges Vertragsbeginn", { vertragsbeginn: "2026-13-01" }],
    ["Vertragsbeginn im falschen Format", { vertragsbeginn: "01.01.2026" }],
    ["Miete mit drei Nachkommastellen", { miete: 800.123 }],
    ["Miete negativ", { miete: -5 }],
    ["Miete als Text", { miete: "800" }],
    ["ungueltige Mieter-ID", { mieterId: "nicht-gueltig" }],
  ])("anlegen rejects %s with MV004, no RPC call", async (_label, overrides) => {
    const result = await mietverhaeltnisAnlegenAction(anlegenEingabe(overrides));
    expect(fehlercode(result)).toBe("MV004");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it.each([
    ["Vertragsende als Datum im falschen Format", { vertragsende: "31.12.2027" }],
    ["Vertragsende als leerer Text", { vertragsende: "" }],
    ["Befristet bis ungueltig", { befristetBis: "2027-02-30" }],
    ["Kuendigung Eingang ungueltig", { kuendigungEingangAm: "2026-00-10" }],
    ["Kuendigung wirksam zum fehlt", { kuendigungZum: undefined }],
    ["Kuendigung durch unbekannt", { kuendigungDurch: "andere" }],
    ["Notiz zu lang", { notiz: "x".repeat(2001) }],
    ["Notiz fehlt", { notiz: undefined }],
    ["ungueltige Mieter-ID", { mieterId: "123" }],
  ])("vertragsdaten rejects %s with MV004, no update", async (_label, overrides) => {
    const result = await vertragsdatenSpeichernAction(vertragsdatenEingabe(overrides) as Parameters<typeof vertragsdatenSpeichernAction>[0]);
    expect(fehlercode(result)).toBe("MV004");
    expect(mockUpdate).not.toHaveBeenCalled();
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
    expect(fehlercode(result)).toBe("MV003");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns MV003 for an unknown tenant", async () => {
    tableResults.Mieter = { data: null, error: null };
    const result = await mieteSetzenAction(setzenEingabe());
    expect(fehlercode(result)).toBe("MV003");
  });

  it.each([
    ["MV004", "Die Eingabe ist ungültig."],
    ["42501", "Für diese Aktion fehlt die Berechtigung (Modul Mieter)."],
  ])("maps database error %s to a fixed message and drops the database text", async (code, message) => {
    rpcErgebnisse.mietverhaeltnis_miete_setzen = {
      data: null,
      error: { code, message: "Wert 850.00 fuer Max Muster verletzt Regel", details: "key=abc" },
    };
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
  it("returns tenancy, history with numeric amounts, declaration dates, apartment rent and tenant flags", async () => {
    erklaertErgebnis = {
      data: [
        { id: MIETE_ID, erklaert_am: "2026-02-15" },
        { id: MIETE_ALT_ID, erklaert_am: null },
      ],
      error: null,
    };
    const result = await getMietverhaeltnisUebersichtAction(MIETER_ID);
    expect(result).toEqual({
      success: true,
      data: {
        mietverhaeltnis: expect.objectContaining({ id: MV_ID }),
        mieten: [
          { miete_id: MIETE_ID, gueltig_ab: "2026-03-01", betrag: 850, aenderungsart: "vereinbarung", grund: "Indexierung", erklaert_am: "2026-02-15", quelle: "app" },
          { miete_id: MIETE_ALT_ID, gueltig_ab: "2020-01-01", betrag: 700, aenderungsart: "vereinbarung", grund: null, erklaert_am: null, quelle: "migration_bestand" },
        ],
        wohnungsmiete: 800,
        mieterEinzug: "2020-01-01",
        istBewerber: false,
      },
    });
    expect(mockRpc).toHaveBeenCalledWith("get_mietverhaeltnis_mieten", { p_mietverhaeltnis_id: MV_ID });
  });

  it("keeps the history and leaves erklaert_am empty when the declaration-date query fails (fail-soft)", async () => {
    erklaertErgebnis = { data: null, error: { code: "42703", message: "column erklaert_am does not exist" } };
    const result = await getMietverhaeltnisUebersichtAction(MIETER_ID);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.mieten).toHaveLength(2);
    expect(result.data.mieten.every((eintrag) => eintrag.erklaert_am === null)).toBe(true);
    expect(mockLogAction).toHaveBeenCalledWith("getMietverhaeltnisUebersicht", "failed", { code: "ERKLAERT_AM_NICHT_GELADEN" });
  });

  it("keeps the history when the declaration-date query throws (fail-soft)", async () => {
    erklaertWirft = true;
    const result = await getMietverhaeltnisUebersichtAction(MIETER_ID);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.mieten.map((eintrag) => eintrag.miete_id)).toEqual([MIETE_ID, MIETE_ALT_ID]);
    expect(result.data.mieten.every((eintrag) => eintrag.erklaert_am === null)).toBe(true);
  });

  it("returns no tenancy and an empty history for a tenant without tenancy (no error)", async () => {
    mieterOhneMietverhaeltnis();
    const result = await getMietverhaeltnisUebersichtAction(MIETER_ID);
    expect(result).toEqual({
      success: true,
      data: { mietverhaeltnis: null, mieten: [], wohnungsmiete: 800, mieterEinzug: "2020-01-01", istBewerber: false },
    });
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalledWith("Mieter_Mietverhaeltnisse");
  });

  it("reports an applicant and a missing move-in date", async () => {
    mieterOhneMietverhaeltnis({ status: "bewerber", einzug: null });
    const result = await getMietverhaeltnisUebersichtAction(MIETER_ID);
    expect(result).toEqual({
      success: true,
      data: { mietverhaeltnis: null, mieten: [], wohnungsmiete: 800, mieterEinzug: null, istBewerber: true },
    });
  });

  it("rejects an invalid tenant ID without database access", async () => {
    const result = await getMietverhaeltnisUebersichtAction("nicht-gueltig");
    expect(fehlercode(result)).toBe("MV004");
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
    expect(benutzteTabellen).toEqual(["Mieter", "Mieter_Mietverhaeltnisse", "Mieter_Mietverhaeltnisse_Mieten"]);
    expect(mockUpdate).not.toHaveBeenCalled();
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
    expect(fehlercode(result)).toBe("MV003");
    expect(mockRpc).not.toHaveBeenCalledWith("mietverhaeltnis_miete_entfernen", expect.anything());
  });

  it("maps MV005 from the database to its fixed message", async () => {
    rpcErgebnisse.mietverhaeltnis_miete_entfernen = { data: null, error: { code: "MV005", message: "MV005: Historie darf nicht leer werden" } };
    const result = await mieteEntfernenAction({ mieterId: MIETER_ID, mieteId: MIETE_ID });
    expect(result).toEqual({
      success: false,
      error: { code: "MV005", message: "Die Miethistorie kann nicht vollständig entfernt werden." },
    });
  });

  it("returns MV003 for a tenant without tenancy", async () => {
    mieterOhneMietverhaeltnis();
    const result = await mieteEntfernenAction({ mieterId: MIETER_ID, mieteId: MIETE_ID });
    expect(fehlercode(result)).toBe("MV003");
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe("mietverhaeltnisAnlegenAction", () => {
  it("creates the tenancy with exactly the given keys and revalidates", async () => {
    const result = await mietverhaeltnisAnlegenAction(anlegenEingabe());
    expect(result).toEqual({ success: true, data: { mietverhaeltnisId: NEU_MV_ID } });
    expect(mockRpc).toHaveBeenCalledWith("mietverhaeltnis_anlegen", {
      p_mieter_id: MIETER_ID,
      p_daten: { vertragsbeginn: "2026-01-01", miete: 800 },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/mieter");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/finanzen");
  });

  it("sends only the keys that are set (omitted and null are left out)", async () => {
    await mietverhaeltnisAnlegenAction({ mieterId: MIETER_ID });
    expect(mockRpc).toHaveBeenLastCalledWith("mietverhaeltnis_anlegen", { p_mieter_id: MIETER_ID, p_daten: {} });

    await mietverhaeltnisAnlegenAction({ mieterId: MIETER_ID, vertragsbeginn: null, miete: null });
    expect(mockRpc).toHaveBeenLastCalledWith("mietverhaeltnis_anlegen", { p_mieter_id: MIETER_ID, p_daten: {} });
  });

  it("sends the rent as number with at most two decimal places", async () => {
    await mietverhaeltnisAnlegenAction(anlegenEingabe({ miete: 850.5 }));
    expect(mockRpc).toHaveBeenLastCalledWith("mietverhaeltnis_anlegen", expect.objectContaining({ p_daten: { vertragsbeginn: "2026-01-01", miete: 850.5 } }));
  });

  it("returns MV003 for an unknown tenant and does not call the RPC", async () => {
    tableResults.Mieter = { data: null, error: null };
    const result = await mietverhaeltnisAnlegenAction(anlegenEingabe());
    expect(fehlercode(result)).toBe("MV003");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns 42501 for a tenant outside the object scope, no RPC call", async () => {
    mockWohnungIds.mockResolvedValue(["99999999-9999-4999-8999-999999999999"]);
    const result = await mietverhaeltnisAnlegenAction(anlegenEingabe());
    expect(fehlercode(result)).toBe("42501");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it.each([
    ["MV012", "Der Mieter gehört bereits zu einem Mietverhältnis."],
    ["MV007", "Die Wohnung fehlt oder befindet sich im Papierkorb."],
    ["42501", "Für diese Aktion fehlt die Berechtigung (Modul Mieter)."],
  ])("maps database error %s to its fixed message and drops the database text", async (code, message) => {
    rpcErgebnisse.mietverhaeltnis_anlegen = { data: null, error: { code, message: "Mieter Max Muster hat Wohnung 12", details: "id=abc" } };
    const result = await mietverhaeltnisAnlegenAction(anlegenEingabe());
    expect(result).toEqual({ success: false, error: { code, message } });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("maps a violated CHECK constraint (23514) to MV004 with the check message", async () => {
    rpcErgebnisse.mietverhaeltnis_anlegen = { data: null, error: { code: "23514", message: "check constraint chk_vertragsende" } };
    const result = await mietverhaeltnisAnlegenAction(anlegenEingabe());
    expect(result).toEqual({
      success: false,
      error: { code: "MV004", message: "Die Angaben sind nicht zulässig. Bitte prüfen Sie die Daten." },
    });
  });

  it("returns UNBEKANNT when the RPC returns no ID", async () => {
    rpcErgebnisse.mietverhaeltnis_anlegen = { data: null, error: null };
    const result = await mietverhaeltnisAnlegenAction(anlegenEingabe());
    expect(fehlercode(result)).toBe("UNBEKANNT");
  });

  it("logs only the action name, the event and the code", async () => {
    await mietverhaeltnisAnlegenAction(anlegenEingabe());
    expect(mockLogAction).toHaveBeenCalledWith("mietverhaeltnisAnlegen", "success", {});
    const alleAttribute = JSON.stringify(mockLogAction.mock.calls);
    expect(alleAttribute).not.toContain("800");
    expect(alleAttribute).not.toContain(MIETER_ID);
  });
});

describe("vertragsdatenSpeichernAction", () => {
  const UPDATE_SPALTEN = ["vertragsende", "befristet_bis", "kuendigung_eingang_am", "kuendigung_zum", "kuendigung_durch", "notiz"];

  it("updates exactly the six contract columns of the tenancy of this tenant", async () => {
    const result = await vertragsdatenSpeichernAction(vertragsdatenEingabe());
    expect(result).toEqual({ success: true, data: undefined });
    expect(mockUpdate).toHaveBeenCalledWith("Mieter_Mietverhaeltnisse", {
      vertragsende: "2027-12-31",
      befristet_bis: "2027-12-31",
      kuendigung_eingang_am: "2026-09-01",
      kuendigung_zum: "2026-11-30",
      kuendigung_durch: "mieter",
      notiz: "Haustiere erlaubt",
    });
    expect(Object.keys(mockUpdate.mock.calls[0][1]).sort()).toEqual([...UPDATE_SPALTEN].sort());
    expect(mockUpdateFilter).toHaveBeenCalledWith("id", MV_ID);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/mieter");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("writes null for every empty field and never touches other columns", async () => {
    const result = await vertragsdatenSpeichernAction({
      mieterId: MIETER_ID,
      vertragsende: null,
      befristetBis: null,
      kuendigungEingangAm: null,
      kuendigungZum: null,
      kuendigungDurch: null,
      notiz: "   ",
    });
    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith("Mieter_Mietverhaeltnisse", {
      vertragsende: null,
      befristet_bis: null,
      kuendigung_eingang_am: null,
      kuendigung_zum: null,
      kuendigung_durch: null,
      notiz: null,
    });
  });

  it("accepts the termination party 'vermieter'", async () => {
    await vertragsdatenSpeichernAction(vertragsdatenEingabe({ kuendigungDurch: "vermieter" }));
    expect(mockUpdate).toHaveBeenCalledWith("Mieter_Mietverhaeltnisse", expect.objectContaining({ kuendigung_durch: "vermieter" }));
  });

  it("returns 42501 when the update returns no row (RLS refused the write)", async () => {
    updateErgebnis = { data: [], error: null };
    const result = await vertragsdatenSpeichernAction(vertragsdatenEingabe());
    expect(result).toEqual({ success: false, error: { code: "42501", message: "Für diese Aktion fehlt die Berechtigung (Modul Mieter)." } });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("returns MV003 for a tenant without tenancy and does not update", async () => {
    mieterOhneMietverhaeltnis();
    const result = await vertragsdatenSpeichernAction(vertragsdatenEingabe());
    expect(fehlercode(result)).toBe("MV003");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 42501 for a tenant outside the object scope and does not update", async () => {
    mockWohnungIds.mockResolvedValue(["99999999-9999-4999-8999-999999999999"]);
    const result = await vertragsdatenSpeichernAction(vertragsdatenEingabe());
    expect(fehlercode(result)).toBe("42501");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("maps a violated CHECK constraint (23514, e.g. end before start) to MV004 with the check message", async () => {
    updateErgebnis = { data: null, error: { code: "23514", message: 'new row violates check constraint "chk_vertragsende"' } };
    const result = await vertragsdatenSpeichernAction(vertragsdatenEingabe());
    expect(result).toEqual({
      success: false,
      error: { code: "MV004", message: "Die Angaben sind nicht zulässig. Bitte prüfen Sie die Daten." },
    });
  });

  it("maps a database error 42501 of the update", async () => {
    updateErgebnis = { data: null, error: { code: "42501", message: "permission denied" } };
    const result = await vertragsdatenSpeichernAction(vertragsdatenEingabe());
    expect(fehlercode(result)).toBe("42501");
  });

  it("logs no contract data or notes", async () => {
    await vertragsdatenSpeichernAction(vertragsdatenEingabe());
    const alleAttribute = JSON.stringify(mockLogAction.mock.calls);
    expect(alleAttribute).not.toContain("Haustiere");
    expect(alleAttribute).not.toContain("2027-12-31");
    expect(alleAttribute).not.toContain(MV_ID);
  });
});

describe("object scope (user restricted to certain houses)", () => {
  const ANDERE_WOHNUNG_ID = "99999999-9999-4999-8999-999999999999";

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
    expect(fehlercode(setzen)).toBe("42501");
    expect(fehlercode(entfernen)).toBe("42501");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns 42501 for vertragsdaten outside the scope, no update", async () => {
    mockWohnungIds.mockResolvedValue([ANDERE_WOHNUNG_ID]);
    const result = await vertragsdatenSpeichernAction(vertragsdatenEingabe());
    expect(fehlercode(result)).toBe("42501");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("allows a tenant inside the scope", async () => {
    mockWohnungIds.mockResolvedValue([WOHNUNG_ID]);
    const result = await getMietverhaeltnisUebersichtAction(MIETER_ID);
    expect(result.success).toBe(true);
  });
});

describe("mieterUmzugAction", () => {
  const umzugEingabe = (overrides: Record<string, unknown> = {}) => ({
    mieterId: MIETER_ID,
    wohnungId: NEU_WOHNUNG_ID,
    datum: "2026-04-01",
    miete: 920.5,
    ...overrides,
  });

  it("returns MV001 without database access when not signed in", async () => {
    mockEnsureAuth.mockRejectedValueOnce(new Error("Nicht authentifiziert"));
    const result = await mieterUmzugAction(umzugEingabe());
    expect(result).toEqual({ success: false, error: { code: "MV001", message: "Bitte melden Sie sich erneut an." } });
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it.each(["ansehen", "bearbeiten", "erstellen"])("returns 42501 without the right %s, no database call", async (fehlendeAktion) => {
    mockHasPermission.mockImplementation(async (_modul: string, aktion: string) => aktion !== fehlendeAktion);
    const result = await mieterUmzugAction(umzugEingabe());
    expect(fehlercode(result)).toBe("42501");
    expect(mockHasPermission).toHaveBeenCalledWith("mieter", "ansehen");
    expect(mockHasPermission).toHaveBeenCalledWith("mieter", "bearbeiten");
    expect(mockHasPermission).toHaveBeenCalledWith("mieter", "erstellen");
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it.each([
    ["ungueltige Mieter-ID", { mieterId: "keine-uuid" }],
    ["ungueltige Wohnungs-ID", { wohnungId: "keine-uuid" }],
    ["Wohnungs-ID fehlt", { wohnungId: undefined }],
    ["ungueltiges Datum", { datum: "2026-02-31" }],
    ["Datum ohne Format", { datum: "01.04.2026" }],
    ["Datum vor 1900", { datum: "1899-12-31" }],
    ["Miete mit drei Nachkommastellen", { miete: 10.005 }],
    ["negative Miete", { miete: -1 }],
    ["Miete als Text", { miete: "920" }],
    ["Miete NaN", { miete: Number.NaN }],
  ])("rejects %s with MV004 and does not call the database", async (_label, overrides) => {
    const result = await mieterUmzugAction(umzugEingabe(overrides));
    expect(fehlercode(result)).toBe("MV004");
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns 42501 for a new apartment outside the object scope, no RPC call", async () => {
    mockWohnungIds.mockResolvedValue([WOHNUNG_ID]);
    const result = await mieterUmzugAction(umzugEingabe());
    expect(fehlercode(result)).toBe("42501");
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns 42501 for a tenant outside the object scope, no RPC call", async () => {
    mockWohnungIds.mockResolvedValue([NEU_WOHNUNG_ID]);
    const result = await mieterUmzugAction(umzugEingabe());
    expect(fehlercode(result)).toBe("42501");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns MV003 for an unknown tenant and does not call the RPC", async () => {
    tableResults.Mieter = { data: null, error: null };
    const result = await mieterUmzugAction(umzugEingabe());
    expect(fehlercode(result)).toBe("MV003");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("calls the RPC with exactly the given arguments, including the rent, and revalidates", async () => {
    const result = await mieterUmzugAction(umzugEingabe());
    expect(result).toEqual({ success: true, data: { mietverhaeltnisId: NEU_MV_ID } });
    expect(mockRpc).toHaveBeenCalledWith("mietverhaeltnis_umzug", {
      p_mieter_id: MIETER_ID,
      p_wohnung_id: NEU_WOHNUNG_ID,
      p_datum: "2026-04-01",
      p_miete: 920.5,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/mieter");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/finanzen");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/wohnungen");
  });

  it("sends p_miete as null when no rent is given", async () => {
    const result = await mieterUmzugAction(umzugEingabe({ miete: undefined }));
    expect(result.success).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith("mietverhaeltnis_umzug", {
      p_mieter_id: MIETER_ID,
      p_wohnung_id: NEU_WOHNUNG_ID,
      p_datum: "2026-04-01",
      p_miete: null,
    });

    await mieterUmzugAction(umzugEingabe({ miete: null }));
    expect(mockRpc).toHaveBeenLastCalledWith("mietverhaeltnis_umzug", expect.objectContaining({ p_miete: null }));
  });

  it.each([
    ["MV013", "Das Mietverhältnis hat weitere Mieter. Ein Umzug ist dafür noch nicht möglich."],
    ["MV004", "Die Eingabe ist ungültig."],
    ["MV007", "Die Wohnung fehlt oder befindet sich im Papierkorb."],
    ["42501", "Für diese Aktion fehlt die Berechtigung (Modul Mieter)."],
  ])("maps database error %s to its fixed message and drops the database text", async (code, message) => {
    rpcErgebnisse.mietverhaeltnis_umzug = { data: null, error: { code, message: "Mieter Max Muster, Miete 920,50", details: "id=abc" } };
    const result = await mieterUmzugAction(umzugEingabe());
    expect(result).toEqual({ success: false, error: { code, message } });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNBEKANNT when the RPC returns no ID", async () => {
    rpcErgebnisse.mietverhaeltnis_umzug = { data: null, error: null };
    const result = await mieterUmzugAction(umzugEingabe());
    expect(fehlercode(result)).toBe("UNBEKANNT");
  });

  it("logs only the action name, the event and the code, never amounts, dates or IDs", async () => {
    await mieterUmzugAction(umzugEingabe());
    expect(mockLogAction).toHaveBeenCalledWith("mieterUmzug", "success", {});
    const alleAttribute = JSON.stringify(mockLogAction.mock.calls);
    expect(alleAttribute).not.toContain("920");
    expect(alleAttribute).not.toContain("2026-04-01");
    expect(alleAttribute).not.toContain(MIETER_ID);
    expect(alleAttribute).not.toContain(NEU_WOHNUNG_ID);
  });
});
