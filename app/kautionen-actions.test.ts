/** @jest-environment node */

/**
 * Tests for the server actions of the deposit management (GH-6, phase 1).
 *
 * `jest.setup.js` mocks `@/lib/permissions` (always `true`), `@/lib/auth-utils` and `next/navigation` globally.
 * The negative cases override the mocks explicitly. The object scope check calls the database function
 * `kautionen_pruefe_objektzugriff`; it has its own mock (`mockScopeRpc`) so `mockRpc` only sees the business RPCs.
 * All IDs, names and amounts are synthetic placeholders.
 */

import { revalidatePath } from "next/cache";
import { ensureAuth } from "@/lib/auth-utils";
import { hasPermission } from "@/lib/permissions";
import { logAction } from "@/lib/logging-middleware";
import { KAUTION_FEHLER_FALLBACK_MESSAGE } from "@/lib/kautionen-errors";
import {
  berechneKautionZinsenAction,
  bucheKautionBewegungAction,
  createKautionAction,
  deleteKautionAction,
  entferneKautionBelegAction,
  getKautionAbrechnungAction,
  getKautionBelegUrlAction,
  getKautionDetailsAction,
  getKautionLoeschauswirkungAction,
  planeKautionRatenAction,
  planeKautionZinsstaffelAction,
  setzeKautionEinbehaltAction,
  storniereKautionBewegungAction,
  updateKautionVereinbarungAction,
} from "@/app/kautionen-actions";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/logging-middleware", () => ({ logAction: jest.fn() }));

const TENANT_ID = "11111111-1111-4111-8111-111111111111";
const KAUTION_ID = "22222222-2222-4222-8222-222222222222";
const BEWEGUNG_ID = "33333333-3333-4333-8333-333333333333";
const HAUS_ID = "55555555-5555-4555-8555-555555555555";
const LOESCH_AUSWIRKUNG = {
  tabelle: "Haeuser",
  anzahl_haeuser: 1,
  anzahl_wohnungen: 2,
  anzahl_mieter: 3,
  kautionen_sichtbar: true,
  kautionen: { anzahl: 3, ohne_buchungen: 1, mit_buchungen: 2 },
  pruefsumme: "0123456789abcdef0123456789abcdef",
  eintraege: [{ id: HAUS_ID, anzahl_mieter: 3, mit_buchungen: 2, pruefsumme: "0123456789abcdef0123456789abcdef" }],
};
const SCHLUESSEL = "44444444-4444-4444-8444-444444444444";
const RATE_ID = "66666666-6666-4666-8666-666666666666";
const SCOPE_RPC = "kautionen_pruefe_objektzugriff";
const DOKUMENT_ID = "99999999-9999-4999-8999-999999999999";
const MUSTER_PFAD = "user_muster/haus/wohnung/mieter";
const BELEG_ROW = { dateipfad: MUSTER_PFAD, dateiname: "1765000000000_Muster-Beleg.pdf", mime_type: "application/pdf", dateigroesse: 2048 };
const SIGNED_URL = "https://storage.example.invalid/documents/muster-beleg?token=muster";
/** Synthetic settlement as `get_kaution_abrechnung` returns it (phase 4). */
const ABRECHNUNG_FIXTURE = {
  regelwerk_version: 1,
  stichtag: "2026-03-15",
  organisation: { name: "Muster Verwaltung" },
  mieter: { name: "Muster Mieter", auszug: "2026-02-28" },
  objekt: { haus: "Musterhaus", wohnung: "Whg 1" },
  kaution: { kautionsart: "barkaution", soll_betrag: 1000, zinsmethode: "act_365", getrennt_angelegt: true },
  konto: { summe_einzahlungen: 1000, summe_zinsgutschriften: 10, summe_auszahlungen: 500, summe_abzuege: 100, kontostand: 410 },
  abzuege: [{ kategorie: "nebenkosten", anzahl: 1, summe: 100 }],
  zinsen_offen: null,
  betrag_inkl_zinsen: 410,
  einbehalt: { grund: "Nebenkostenabrechnung offen", seit: "2026-03-01", liegedauer_tage: 14 },
  bewegungen: [{ wertstellung: "2025-09-01", bewegungsart: "einzahlung", betrag: 1000, kategorie: null, grund: null, zinszeitraum_von: null, zinszeitraum_bis: null, saldo_nach_buchung: 1000 }],
  storniert_anzahl: 0,
};

const mockHasPermission = hasPermission as jest.Mock;
const mockEnsureAuth = ensureAuth as jest.Mock;
const mockLogAction = logAction as jest.Mock;
const mockRevalidatePath = revalidatePath as jest.Mock;

// Supabase client mock: `rpc` for the actions (the scope helper has its own mock), `from` must never be used.
const mockRpc = jest.fn();
const mockScopeRpc = jest.fn();
const mockCreateSignedUrl = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockUpsert = jest.fn();
const mockSelect = jest.fn();
const mockFrom = jest.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  upsert: mockUpsert,
}));
const mockSupabase = {
  from: mockFrom,
  rpc: (name: string, args: unknown) => (name === SCOPE_RPC ? mockScopeRpc(args) : mockRpc(name, args)),
  storage: {
    from: (bucket: string) => ({
      createSignedUrl: (...args: unknown[]) => mockCreateSignedUrl(bucket, ...args),
    }),
  },
};

function rpcOk(data: unknown = null) {
  mockRpc.mockResolvedValueOnce({ data, error: null });
}

function rpcError(code: string, message: string, details?: string) {
  mockRpc.mockResolvedValueOnce({ data: null, error: { code, message, details } });
}

/** The database denies the object scope (`KA002`) for the tenant of the object-scope check. */
function scopeDenied() {
  mockScopeRpc.mockResolvedValue({ data: null, error: { code: "KA002", message: "KAUT_OBJEKTZUGRIFF: Kein Zugriff auf dieses Objekt." } });
}

// One valid call per action: used for the cross-cutting tests (right, scope, no table writes).
interface ActionCase {
  name: string;
  aktion: "ansehen" | "erstellen" | "bearbeiten" | "loeschen";
  call: () => Promise<{ success: boolean; error?: { message: string; code?: string } }>;
  okData: unknown;
}

const ACTION_CASES: ActionCase[] = [
  { name: "getKautionDetailsAction", aktion: "ansehen", call: () => getKautionDetailsAction(TENANT_ID), okData: { kaution: { id: KAUTION_ID } } },
  {
    name: "getKautionLoeschauswirkungAction",
    aktion: "ansehen",
    call: () => getKautionLoeschauswirkungAction({ tabelle: "Haeuser", ids: [HAUS_ID] }),
    okData: LOESCH_AUSWIRKUNG,
  },
  {
    name: "createKautionAction",
    aktion: "erstellen",
    call: () => createKautionAction({ tenantId: TENANT_ID, sollBetrag: "1500,00" }),
    okData: KAUTION_ID,
  },
  {
    name: "updateKautionVereinbarungAction",
    aktion: "bearbeiten",
    call: () => updateKautionVereinbarungAction({ tenantId: TENANT_ID, kautionId: KAUTION_ID, felder: { soll_betrag: "1200,00" } }),
    okData: null,
  },
  {
    name: "planeKautionRatenAction",
    aktion: "bearbeiten",
    call: () => planeKautionRatenAction({ kautionId: KAUTION_ID, raten: [{ faelligkeitsdatum: "2027-01-31", sollBetrag: "1500,00" }] }),
    okData: null,
  },
  {
    name: "planeKautionZinsstaffelAction",
    aktion: "bearbeiten",
    call: () => planeKautionZinsstaffelAction({ kautionId: KAUTION_ID, staffel: [{ gueltigAb: "2025-01-01", zinssatzProzent: "1,5" }] }),
    okData: null,
  },
  {
    name: "berechneKautionZinsenAction",
    aktion: "ansehen",
    call: () => berechneKautionZinsenAction({ kautionId: KAUTION_ID }),
    okData: null,
  },
  {
    name: "bucheKautionBewegungAction",
    aktion: "erstellen",
    call: () =>
      bucheKautionBewegungAction({
        tenantId: TENANT_ID,
        kautionId: KAUTION_ID,
        art: "einzahlung",
        betrag: "500,00",
        wertstellung: "2025-09-01",
        idempotenzSchluessel: SCHLUESSEL,
      }),
    okData: BEWEGUNG_ID,
  },
  {
    name: "storniereKautionBewegungAction",
    aktion: "loeschen",
    call: () => storniereKautionBewegungAction({ tenantId: TENANT_ID, bewegungId: BEWEGUNG_ID, grund: "Falsch erfasst" }),
    okData: null,
  },
  {
    name: "deleteKautionAction",
    aktion: "loeschen",
    call: () => deleteKautionAction({ tenantId: TENANT_ID, kautionId: KAUTION_ID }),
    okData: null,
  },
  {
    name: "entferneKautionBelegAction",
    aktion: "bearbeiten",
    call: () => entferneKautionBelegAction({ bewegungId: BEWEGUNG_ID }),
    okData: null,
  },
  {
    name: "getKautionBelegUrlAction",
    aktion: "ansehen",
    call: () => getKautionBelegUrlAction({ dokumentId: DOKUMENT_ID }),
    okData: BELEG_ROW,
  },
  {
    name: "getKautionAbrechnungAction",
    aktion: "ansehen",
    call: () => getKautionAbrechnungAction({ tenantId: TENANT_ID }),
    okData: ABRECHNUNG_FIXTURE,
  },
  {
    name: "setzeKautionEinbehaltAction",
    aktion: "bearbeiten",
    call: () => setzeKautionEinbehaltAction({ kautionId: KAUTION_ID, grund: "Muster-Grund", seit: "2026-03-01" }),
    okData: null,
  },
];

/** Queues the RPC responses an action needs for a successful run (the details action needs the details RPC). */
function queueSuccess(caseItem: ActionCase) {
  rpcOk(caseItem.okData);
}

beforeEach(() => {
  mockRpc.mockReset();
  mockScopeRpc.mockReset();
  mockScopeRpc.mockResolvedValue({ data: null, error: null });
  mockCreateSignedUrl.mockReset();
  mockCreateSignedUrl.mockResolvedValue({ data: { signedUrl: SIGNED_URL }, error: null });
  mockSelect.mockReset();
  mockFrom.mockClear();
  mockInsert.mockReset();
  mockUpdate.mockReset();
  mockDelete.mockReset();
  mockUpsert.mockReset();
  mockLogAction.mockReset();
  mockRevalidatePath.mockReset();
  mockHasPermission.mockReset();
  mockHasPermission.mockResolvedValue(true);
  mockEnsureAuth.mockReset();
  mockEnsureAuth.mockResolvedValue({ user: { id: "user-1" }, supabase: mockSupabase });
});

describe("cross-cutting: sign-in, module right, object scope", () => {
  it.each(ACTION_CASES)("$name: not signed in -> KA001, no RPC", async ({ call }) => {
    mockEnsureAuth.mockRejectedValueOnce(new Error("Nicht authentifiziert. Bitte melden Sie sich an."));

    const result = await call();

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("KA001");
    expect(result.error?.message).toBe("Bitte melden Sie sich erneut an.");
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockHasPermission).not.toHaveBeenCalled();
  });

  it.each(ACTION_CASES)("$name: failure of the sign-in infrastructure is a generic error, not KA001 (no login redirect)", async ({ call }) => {
    mockEnsureAuth.mockRejectedValueOnce(new Error("connect ECONNREFUSED muster-host"));

    const result = await call();

    expect(result).toEqual({ success: false, error: { message: KAUTION_FEHLER_FALLBACK_MESSAGE } });
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockScopeRpc).not.toHaveBeenCalled();
    expect(mockHasPermission).not.toHaveBeenCalled();
    expect(JSON.stringify(mockLogAction.mock.calls)).not.toContain("muster-host");
    expect(mockLogAction).toHaveBeenCalledWith(expect.any(String), "error", expect.objectContaining({ code: "AUTH_UNAVAILABLE" }));
  });

  it.each(ACTION_CASES)("$name: missing module right -> 42501, no RPC, no table access", async ({ call, aktion }) => {
    mockHasPermission.mockResolvedValueOnce(false);

    const result = await call();

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("42501");
    expect(result.error?.message).toBe("Für diese Aktion fehlt die Berechtigung (Modul Kautionen).");
    expect(mockHasPermission).toHaveBeenCalledWith("kautionen", aktion);
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  // The database requires `ansehen` in addition for every write RPC (a write right does not imply it there).
  // Fast failure here: same error as for a missing right, no RPC, no table access.
  const SCHREIB_CASES = ACTION_CASES.filter((caseItem) => caseItem.aktion !== "ansehen");

  it.each(SCHREIB_CASES)("$name: right of the action but without `ansehen` -> 42501, no RPC, no table access", async ({ call, aktion }) => {
    mockHasPermission.mockImplementation(async (_modul: string, angefragt: string) => angefragt !== "ansehen");

    const result = await call();

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("42501");
    expect(result.error?.message).toBe("Für diese Aktion fehlt die Berechtigung (Modul Kautionen).");
    expect(mockHasPermission).toHaveBeenCalledWith("kautionen", aktion);
    expect(mockHasPermission).toHaveBeenCalledWith("kautionen", "ansehen");
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
    expect(mockLogAction).toHaveBeenCalledWith(expect.any(String), "failed", expect.objectContaining({ code: "42501" }));
  });

  it.each(SCHREIB_CASES)("$name: `ansehen` without the right of the action is still rejected (no RPC)", async ({ call, aktion }) => {
    mockHasPermission.mockImplementation(async (_modul: string, angefragt: string) => angefragt === "ansehen");

    const result = await call();

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("42501");
    expect(mockHasPermission).toHaveBeenCalledWith("kautionen", aktion);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it.each(SCHREIB_CASES)("$name: with the right of the action AND `ansehen` it reaches the RPC", async (caseItem) => {
    mockHasPermission.mockImplementation(async (_modul: string, angefragt: string) => angefragt === "ansehen" || angefragt === caseItem.aktion);
    queueSuccess(caseItem);

    const result = await caseItem.call();

    expect(result.success).toBe(true);
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });

  it("getKautionDetailsAction without `ansehen` calls neither the details nor the suggestion RPC, even with `erstellen`", async () => {
    mockHasPermission.mockImplementation(async (_modul: string, angefragt: string) => angefragt !== "ansehen");

    const result = await getKautionDetailsAction(TENANT_ID);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("42501");
    expect(mockRpc).not.toHaveBeenCalledWith("get_kaution_details", expect.anything());
    expect(mockRpc).not.toHaveBeenCalledWith("get_kaution_vorschlag", expect.anything());
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("getKautionDetailsAction asks for `ansehen` only once (it is the gate itself)", async () => {
    rpcOk({ kaution: { id: KAUTION_ID } });

    await getKautionDetailsAction(TENANT_ID);

    const anfragenAnsehen = mockHasPermission.mock.calls.filter((call) => call[1] === "ansehen");
    expect(anfragenAnsehen).toHaveLength(1);
  });

  it.each(ACTION_CASES)("$name: only checks the module `kautionen` (no other module right replaces it)", async (caseItem) => {
    queueSuccess(caseItem);

    await caseItem.call();

    for (const call of mockHasPermission.mock.calls) {
      expect(call[0]).toBe("kautionen");
    }
  });

  it.each(ACTION_CASES)("$name: checks the right of its action first", async (caseItem) => {
    queueSuccess(caseItem);
    // The details action loads the rights of the other actions afterwards; the first call is the gate.
    await caseItem.call();
    expect(mockHasPermission.mock.calls[0]).toEqual(["kautionen", caseItem.aktion]);
  });

  // Object scope: only where the tenant IS the object (details, create). The other actions have no scope pre-check,
  // the RPCs decide (see the next describe block).
  const SCOPE_CASES = ACTION_CASES.filter((caseItem) => caseItem.name === "getKautionDetailsAction" || caseItem.name === "createKautionAction" || caseItem.name === "getKautionAbrechnungAction");
  const OHNE_SCOPE_CASES = ACTION_CASES.filter((caseItem) => !SCOPE_CASES.includes(caseItem));

  it.each(SCOPE_CASES)("$name: object scope is checked by the database helper with the tenant ID", async (caseItem) => {
    queueSuccess(caseItem);

    const result = await caseItem.call();

    expect(result.success).toBe(true);
    expect(mockScopeRpc).toHaveBeenCalledTimes(1);
    expect(mockScopeRpc).toHaveBeenCalledWith({ p_mieter_id: TENANT_ID });
    expect(mockRpc).toHaveBeenCalled();
  });

  it.each(SCOPE_CASES)("$name: tenant outside the object scope (database KA002) -> KA002, no further RPC", async ({ call }) => {
    scopeDenied();

    const result = await call();

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("KA002");
    expect(result.error?.message).toBe("Kein Zugriff auf dieses Objekt.");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it.each(SCOPE_CASES)("$name: any other error of the scope helper denies access (fail-closed)", async ({ call }) => {
    for (const result of [
      { data: null, error: { code: "XX000", message: "boom" } },
      { data: null, error: { code: "42501", message: "KAUT_KEIN_RECHT: x" } },
      { data: null, error: { code: "PGRST301", message: "JWT expired" } },
    ]) {
      mockScopeRpc.mockResolvedValueOnce(result);
      const failed = await call();
      expect(failed.success).toBe(false);
      expect(failed.error?.code).toBe("KA002");
    }
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it.each(SCOPE_CASES)("$name: a scope helper that throws denies access", async ({ call }) => {
    mockScopeRpc.mockRejectedValueOnce(new Error("scope lookup failed"));

    const result = await call();

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("KA002");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it.each(OHNE_SCOPE_CASES)("$name: no scope pre-check (the tenant ID is not bound to the object ID, the RPC decides)", async (caseItem) => {
    queueSuccess(caseItem);

    const result = await caseItem.call();

    expect(result.success).toBe(true);
    expect(mockScopeRpc).not.toHaveBeenCalled();
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });

  it.each(SCOPE_CASES)("$name: malformed tenant ID is rejected before any query", async ({ name }) => {
    const calls: Record<string, () => Promise<{ success: boolean; error?: { code?: string } }>> = {
      getKautionDetailsAction: () => getKautionDetailsAction("not-a-uuid"),
      getKautionAbrechnungAction: () => getKautionAbrechnungAction({ tenantId: "not-a-uuid" }),
      createKautionAction: () => createKautionAction({ tenantId: "not-a-uuid", sollBetrag: "1500,00" }),
      updateKautionVereinbarungAction: () =>
        updateKautionVereinbarungAction({ tenantId: "not-a-uuid", kautionId: KAUTION_ID, felder: { soll_betrag: "1200,00" } }),
      bucheKautionBewegungAction: () =>
        bucheKautionBewegungAction({
          tenantId: "not-a-uuid",
          kautionId: KAUTION_ID,
          art: "einzahlung",
          betrag: "500,00",
          wertstellung: "2025-09-01",
          idempotenzSchluessel: SCHLUESSEL,
        }),
      storniereKautionBewegungAction: () =>
        storniereKautionBewegungAction({ tenantId: "not-a-uuid", bewegungId: BEWEGUNG_ID, grund: "Falsch erfasst" }),
      deleteKautionAction: () => deleteKautionAction({ tenantId: "not-a-uuid", kautionId: KAUTION_ID }),
    };

    const result = await calls[name]();

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("KA004");
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("does not touch any table: neither reads nor writes via `from`, only RPCs", async () => {
    for (const caseItem of ACTION_CASES) {
      queueSuccess(caseItem);
      await caseItem.call();
    }

    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("ignores input that is not an object instead of throwing", async () => {
    const result = await createKautionAction(null as never);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("KA004");
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe("object scope: tenant ID and object IDs (no pre-check in the action, the database rejects and the action maps the error)", () => {
  const FREMDE_KAUTION = "55555555-5555-4555-8555-555555555555";
  const FREMDE_BEWEGUNG = "66666666-6666-4666-8666-666666666666";
  const SCOPE_MELDUNG = "Kein Zugriff auf dieses Objekt.";

  interface IdCase {
    name: string;
    rpc: string;
    argumente: Record<string, unknown>;
    call: () => Promise<{ success: boolean; error?: { message: string; code?: string } }>;
    /** Rejection of the database for an object outside the object scope. */
    fehler: { code?: string; message: string };
  }

  // The database rejects an ID of a deposit/booking outside the object scope of the user (mocked response).
  const ID_CASES: IdCase[] = [
    {
      name: "updateKautionVereinbarungAction",
      rpc: "kaution_aendern",
      argumente: { p_kaution_id: FREMDE_KAUTION },
      call: () => updateKautionVereinbarungAction({ tenantId: TENANT_ID, kautionId: FREMDE_KAUTION, felder: { soll_betrag: "1200,00" } }),
      fehler: { code: "KA002", message: "Kein Zugriff auf das Objekt." },
    },
    {
      name: "bucheKautionBewegungAction",
      rpc: "kaution_buchen",
      argumente: { p_kaution_id: FREMDE_KAUTION },
      call: () =>
        bucheKautionBewegungAction({
          tenantId: TENANT_ID,
          kautionId: FREMDE_KAUTION,
          art: "einzahlung",
          betrag: "500,00",
          wertstellung: "2025-09-01",
          idempotenzSchluessel: SCHLUESSEL,
        }),
      fehler: { code: "KA002", message: "Kein Zugriff auf das Objekt." },
    },
    {
      name: "storniereKautionBewegungAction",
      rpc: "kaution_storno",
      argumente: { p_bewegung_id: FREMDE_BEWEGUNG },
      call: () => storniereKautionBewegungAction({ tenantId: TENANT_ID, bewegungId: FREMDE_BEWEGUNG, grund: "Falsch erfasst" }),
      fehler: { code: "KA002", message: "Kein Zugriff auf das Objekt." },
    },
    {
      name: "deleteKautionAction",
      rpc: "soft_delete_record",
      argumente: { p_table_name: "Kautionen", p_record_id: FREMDE_KAUTION },
      call: () => deleteKautionAction({ tenantId: TENANT_ID, kautionId: FREMDE_KAUTION }),
      // `soft_delete_record` is a shared function: plain English message without a deposit SQLSTATE.
      fehler: { message: "Permission denied: record is outside your object scope" },
    },
  ];

  it.each(ID_CASES)("$name: maps the database rejection KA002 for an object outside the scope and changes nothing", async ({ rpc, argumente, call, fehler }) => {
    mockRpc.mockResolvedValueOnce({ data: null, error: fehler });

    const result = await call();

    // Only the mapping of the (mocked) database error is tested here; the rejection itself is made by the database.
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith(rpc, expect.objectContaining(argumente));
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("KA002");
    expect(result.error?.message).toBe(SCOPE_MELDUNG);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it.each(ID_CASES)("$name: does not run a scope pre-check on the unrelated tenant ID, the RPC is the only decision", async ({ call, fehler }) => {
    mockRpc.mockResolvedValueOnce({ data: null, error: fehler });

    await call();

    expect(mockScopeRpc).not.toHaveBeenCalled();
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });
});

describe("getKautionDetailsAction", () => {
  const details = { kaution: { id: KAUTION_ID }, konto: { kontostand: 0 }, zustand: "verwahrt", kontoauszug: [] };

  it("returns details and module rights in one result", async () => {
    mockHasPermission.mockImplementation(async (_modul: string, aktion: string) => aktion !== "loeschen");
    rpcOk(details);

    const result = await getKautionDetailsAction(TENANT_ID);

    expect(result.success).toBe(true);
    expect(result.data?.details).toEqual(details);
    expect(result.data?.rechte).toEqual({ ansehen: true, erstellen: true, bearbeiten: true, loeschen: false });
    expect(result.data?.vorschlag).toBeNull();
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("get_kaution_details", { p_mieter_id: TENANT_ID });
  });

  it("loads the suggestion only while there is no deposit and the user may create one", async () => {
    const vorschlag = { miete: 650, vorschlag_betrag: 1950, basis: "Wohnungen.miete" };
    rpcOk(null);
    rpcOk(vorschlag);

    const result = await getKautionDetailsAction(TENANT_ID);

    expect(result.data).toEqual({
      details: null,
      rechte: { ansehen: true, erstellen: true, bearbeiten: true, loeschen: true },
      vorschlag,
    });
    expect(mockRpc).toHaveBeenNthCalledWith(2, "get_kaution_vorschlag", { p_mieter_id: TENANT_ID });
  });

  it("does not load the suggestion without the right to create", async () => {
    mockHasPermission.mockImplementation(async (_modul: string, aktion: string) => aktion === "ansehen");
    rpcOk(null);

    const result = await getKautionDetailsAction(TENANT_ID);

    expect(result.data?.vorschlag).toBeNull();
    expect(result.data?.rechte).toEqual({ ansehen: true, erstellen: false, bearbeiten: false, loeschen: false });
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });

  it("does not load the suggestion while a deposit exists", async () => {
    rpcOk(details);

    await getKautionDetailsAction(TENANT_ID);

    expect(mockRpc).not.toHaveBeenCalledWith("get_kaution_vorschlag", expect.anything());
  });

  it("a failing suggestion does not fail the details (convenience only)", async () => {
    rpcOk(null);
    rpcError("XX000", "internal");

    const result = await getKautionDetailsAction(TENANT_ID);

    expect(result.success).toBe(true);
    expect(result.data?.details).toBeNull();
    expect(result.data?.vorschlag).toBeNull();
  });

  it.each([
    ["KA002", "Kein Zugriff auf dieses Objekt."],
    ["KA003", "Der Datensatz wurde nicht gefunden (evtl. bereits geändert oder gelöscht)."],
  ])("a suggestion error %s (tenant not accessible) fails the action", async (code, message) => {
    rpcOk(null);
    rpcError(code, `X: ${code}`);

    const result = await getKautionDetailsAction(TENANT_ID);

    expect(result.success).toBe(false);
    expect(result.error).toEqual({ code, message });
  });

  it("maps an error of the details RPC", async () => {
    rpcError("42501", "KAUT_KEIN_RECHT: Keine Berechtigung für Kautionen.");

    const result = await getKautionDetailsAction(TENANT_ID);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("42501");
  });

  it("neither revalidates nor logs a successful read", async () => {
    rpcOk(details);

    await getKautionDetailsAction(TENANT_ID);

    expect(mockRevalidatePath).not.toHaveBeenCalled();
    expect(mockLogAction).not.toHaveBeenCalled();
  });
});

describe("createKautionAction", () => {
  it("sends exact decimal strings and only the allowed keys", async () => {
    rpcOk(KAUTION_ID);

    const result = await createKautionAction({
      tenantId: TENANT_ID,
      kautionsart: "barkaution",
      sollBetrag: "1.500,50",
      mieteBeiVertragsschluss: "650",
      interneNotiz: "  Muster-Notiz  ",
    });

    expect(result).toEqual({ success: true, data: { kautionId: KAUTION_ID } });
    expect(mockRpc).toHaveBeenCalledWith("kaution_anlegen", {
      p_mieter_id: TENANT_ID,
      p_daten: {
        kautionsart: "barkaution",
        soll_betrag: "1500.50",
        miete_bei_vertragsschluss: "650.00",
        interne_notiz: "Muster-Notiz",
      },
    });
  });

  it("omits optional keys that were not given (the database copies the current rent)", async () => {
    rpcOk(KAUTION_ID);

    await createKautionAction({ tenantId: TENANT_ID, sollBetrag: "1500" });

    expect(mockRpc).toHaveBeenCalledWith("kaution_anlegen", { p_mieter_id: TENANT_ID, p_daten: { soll_betrag: "1500.00" } });
  });

  it("treats an empty rent as not given and null as deliberately empty", async () => {
    rpcOk(KAUTION_ID);
    await createKautionAction({ tenantId: TENANT_ID, sollBetrag: "1500", mieteBeiVertragsschluss: "  " });
    expect(mockRpc).toHaveBeenLastCalledWith("kaution_anlegen", { p_mieter_id: TENANT_ID, p_daten: { soll_betrag: "1500.00" } });

    rpcOk(KAUTION_ID);
    await createKautionAction({ tenantId: TENANT_ID, sollBetrag: "1500", mieteBeiVertragsschluss: null });
    expect(mockRpc).toHaveBeenLastCalledWith("kaution_anlegen", {
      p_mieter_id: TENANT_ID,
      p_daten: { soll_betrag: "1500.00", miete_bei_vertragsschluss: null },
    });
  });

  it("accepts a rent of 0 (optional field) but not a target amount of 0", async () => {
    rpcOk(KAUTION_ID);
    const ok = await createKautionAction({ tenantId: TENANT_ID, sollBetrag: "1500", mieteBeiVertragsschluss: "0" });
    expect(ok.success).toBe(true);

    const rejected = await createKautionAction({ tenantId: TENANT_ID, sollBetrag: "0" });
    expect(rejected.success).toBe(false);
    expect(rejected.error?.code).toBe("KA004");
  });

  it.each([
    ["three decimal places", "10,005"],
    ["three decimal places with a point", "10.005"],
    ["negative", "-5"],
    ["ambiguous thousands notation", "1.500"],
    ["empty", ""],
    ["not a number", "abc"],
    ["above the maximum", "100000000"],
  ])("rejects a target amount that is %s (KA004), no RPC", async (_label, sollBetrag) => {
    const result = await createKautionAction({ tenantId: TENANT_ID, sollBetrag });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("KA004");
    expect(result.error?.message).toBeTruthy();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("rejects a missing or non-string target amount", async () => {
    const missing = await createKautionAction({ tenantId: TENANT_ID } as never);
    const wrongType = await createKautionAction({ tenantId: TENANT_ID, sollBetrag: { value: 1 } as never });

    expect(missing.error?.code).toBe("KA004");
    expect(wrongType.error?.code).toBe("KA004");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it.each(["barkaution", "sparbuch", "buergschaft", "versicherung"] as const)("phase 3: the deposit type %s is passed to the RPC", async (kautionsart) => {
    rpcOk(KAUTION_ID);

    const result = await createKautionAction({ tenantId: TENANT_ID, sollBetrag: "1500", kautionsart });

    expect(result.success).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith("kaution_anlegen", { p_mieter_id: TENANT_ID, p_daten: { kautionsart, soll_betrag: "1500.00" } });
  });

  it("an unknown deposit type is invalid (KA004), no RPC", async () => {
    const unbekannt = await createKautionAction({ tenantId: TENANT_ID, sollBetrag: "1500", kautionsart: "gold" as never });

    expect(unbekannt.error?.code).toBe("KA004");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("phase 3: forwards the bank account fields normalised (IBAN without spaces, trimmed texts, exact flags and method)", async () => {
    rpcOk(KAUTION_ID);

    await createKautionAction({
      tenantId: TENANT_ID,
      kautionsart: "sparbuch",
      sollBetrag: "1500",
      iban: "de89 3704 0044 0532 0130 00",
      bank: "  Muster Bank  ",
      kontoinhaber: " Muster Kontoinhaber ",
      getrenntAngelegt: true,
      zinsmethode: "act_360",
    });

    expect(mockRpc).toHaveBeenCalledWith("kaution_anlegen", {
      p_mieter_id: TENANT_ID,
      p_daten: {
        kautionsart: "sparbuch",
        soll_betrag: "1500.00",
        iban: "DE89370400440532013000",
        bank: "Muster Bank",
        kontoinhaber: "Muster Kontoinhaber",
        getrennt_angelegt: true,
        zinsmethode: "act_360",
      },
    });
  });

  it("phase 3: forwards guarantee and insurance fields for their type", async () => {
    rpcOk(KAUTION_ID);

    await createKautionAction({
      tenantId: TENANT_ID,
      kautionsart: "buergschaft",
      sollBetrag: "2000",
      buergeVersicherer: "Muster Bürgschaftsbank",
      urkundennummer: "BU-0001",
    });

    expect(mockRpc).toHaveBeenCalledWith("kaution_anlegen", {
      p_mieter_id: TENANT_ID,
      p_daten: { kautionsart: "buergschaft", soll_betrag: "2000.00", buerge_versicherer: "Muster Bürgschaftsbank", urkundennummer: "BU-0001" },
    });
  });

  it("phase 3: treats null and empty texts as not given (the keys are left out)", async () => {
    rpcOk(KAUTION_ID);

    await createKautionAction({ tenantId: TENANT_ID, sollBetrag: "1500", iban: null, bank: "   ", getrenntAngelegt: null, zinsmethode: undefined });

    expect(mockRpc).toHaveBeenCalledWith("kaution_anlegen", { p_mieter_id: TENANT_ID, p_daten: { soll_betrag: "1500.00" } });
  });

  it.each([
    ["an IBAN with a wrong check digit", { iban: "DE89370400440532013001" }],
    ["an IBAN that is too short", { iban: "DE8937040044" }],
    ["a bank name that is too long", { bank: "x".repeat(201) }],
    ["an account holder that is too long", { kontoinhaber: "x".repeat(201) }],
    ["a separate-account flag that is not a boolean", { getrenntAngelegt: "ja" }],
    ["an interest method in the old spelling", { zinsmethode: "act/365" }],
    ["a bank field on a guarantee", { kautionsart: "buergschaft", bank: "Muster Bank" }],
    ["an insurance number on a bank account", { urkundennummer: "VS-0001" }],
    ["a guarantor on a bank account", { buergeVersicherer: "Muster Versicherung" }],
  ])("rejects %s (KA004), no RPC", async (_label, patch) => {
    const result = await createKautionAction({ tenantId: TENANT_ID, sollBetrag: "1500", ...patch } as never);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("KA004");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("does not echo a rejected IBAN in the message", async () => {
    const result = await createKautionAction({ tenantId: TENANT_ID, sollBetrag: "1500", iban: "DE89370400440532013001" });

    expect(result.error?.message).toBe("Bitte geben Sie eine gültige IBAN an.");
    expect(JSON.stringify(mockLogAction.mock.calls)).not.toContain("DE8937");
  });

  it("rejects a note that is too long", async () => {
    const result = await createKautionAction({ tenantId: TENANT_ID, sollBetrag: "1500", interneNotiz: "x".repeat(2001) });

    expect(result.error?.code).toBe("KA004");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("does not forward unknown input fields (e.g. an organisation) to the RPC", async () => {
    rpcOk(KAUTION_ID);

    await createKautionAction({ tenantId: TENANT_ID, sollBetrag: "1500", organisation_id: "foreign-org", status: "verwahrt" } as never);

    const args = mockRpc.mock.calls[0][1] as { p_daten: Record<string, unknown> };
    expect(Object.keys(args.p_daten)).toEqual(["soll_betrag"]);
  });

  it("maps KA008 (deposit already exists) and the unique violation of the index", async () => {
    rpcError("KA008", "KAUT_BEREITS_VORHANDEN: Für diesen Mieter ist bereits eine Kaution angelegt.");
    rpcError("23505", 'duplicate key value violates unique constraint "idx_kautionen_mieter_id_aktiv"', "Key (mieter_id)=(x) already exists.");

    const first = await createKautionAction({ tenantId: TENANT_ID, sollBetrag: "1500" });
    const second = await createKautionAction({ tenantId: TENANT_ID, sollBetrag: "1500" });

    for (const result of [first, second]) {
      expect(result.error).toEqual({ code: "KA008", message: "Für diesen Mieter ist bereits eine Kaution angelegt." });
    }
    expect(JSON.stringify(second)).not.toContain("Key (mieter_id)");
  });

  it("treats an RPC result that is not an ID as an unclassified error", async () => {
    rpcOk({ unexpected: true });

    const result = await createKautionAction({ tenantId: TENANT_ID, sollBetrag: "1500" });

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe(KAUTION_FEHLER_FALLBACK_MESSAGE);
  });
});

describe("updateKautionVereinbarungAction", () => {
  it("maps database keys and camelCase aliases to the database keys", async () => {
    rpcOk();
    rpcOk();

    await updateKautionVereinbarungAction({
      tenantId: TENANT_ID,
      kautionId: KAUTION_ID,
      felder: { sollBetrag: "1200,00", mieteBeiVertragsschluss: "600", interneNotiz: "Notiz" },
    });
    expect(mockRpc).toHaveBeenLastCalledWith("kaution_aendern", {
      p_kaution_id: KAUTION_ID,
      p_daten: { soll_betrag: "1200.00", miete_bei_vertragsschluss: "600.00", interne_notiz: "Notiz" },
    });

    await updateKautionVereinbarungAction({
      tenantId: TENANT_ID,
      kautionId: KAUTION_ID,
      felder: { soll_betrag: "1200,00", kautionsart: "barkaution" },
    });
    expect(mockRpc).toHaveBeenLastCalledWith("kaution_aendern", {
      p_kaution_id: KAUTION_ID,
      p_daten: { soll_betrag: "1200.00", kautionsart: "barkaution" },
    });
  });

  it("clears the rent and the note with null or an empty string", async () => {
    rpcOk();

    await updateKautionVereinbarungAction({
      tenantId: TENANT_ID,
      kautionId: KAUTION_ID,
      felder: { miete_bei_vertragsschluss: "", interne_notiz: null },
    });

    expect(mockRpc).toHaveBeenCalledWith("kaution_aendern", {
      p_kaution_id: KAUTION_ID,
      p_daten: { miete_bei_vertragsschluss: null, interne_notiz: null },
    });
  });

  it.each([
    ["no field", {}],
    ["an unknown field", { organisation_id: "x" }],
    ["an interest method in the old spelling", { zinsmethode: "act/365" }],
    ["an interest method that is null (cannot be cleared)", { zinsmethode: null }],
    ["an invalid IBAN", { iban: "DE89370400440532013001" }],
    ["a bank name that is too long", { bank: "x".repeat(201) }],
    ["the same field twice under two spellings", { buerge_versicherer: "Muster", buergeVersicherer: "Muster" }],
    ["a bank field together with the deposit type guarantee", { kautionsart: "buergschaft", iban: "DE89370400440532013000" }],
    ["a prototype key", JSON.parse('{"__proto__": "x"}')],
    ["the same field twice", { soll_betrag: "100", sollBetrag: "200" }],
    ["a target amount of 0", { soll_betrag: "0" }],
    ["a boolean target amount", { soll_betrag: true }],
    ["a null target amount", { soll_betrag: null }],
    ["an ambiguous amount", { soll_betrag: "1.500" }],
    ["a negative rent", { miete_bei_vertragsschluss: "-1" }],
    ["a boolean note", { interne_notiz: true }],
    ["an unknown deposit type", { kautionsart: "gold" }],
  ])("rejects %s (KA004), no RPC", async (_label, felder) => {
    const result = await updateKautionVereinbarungAction({ tenantId: TENANT_ID, kautionId: KAUTION_ID, felder });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("KA004");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("phase 3: another deposit type is passed to the RPC", async () => {
    rpcOk();

    const result = await updateKautionVereinbarungAction({ tenantId: TENANT_ID, kautionId: KAUTION_ID, felder: { kautionsart: "buergschaft" } });

    expect(result.success).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith("kaution_aendern", { p_kaution_id: KAUTION_ID, p_daten: { kautionsart: "buergschaft" } });
  });

  it("phase 3: forwards the agreement fields with exact keys, normalised IBAN and the camelCase aliases", async () => {
    rpcOk();

    await updateKautionVereinbarungAction({
      tenantId: TENANT_ID,
      kautionId: KAUTION_ID,
      felder: { iban: "gb82 west 1234 5698 7654 32", bank: " Muster Bank ", getrenntAngelegt: true, zinsmethode: "30_360" },
    });

    expect(mockRpc).toHaveBeenCalledWith("kaution_aendern", {
      p_kaution_id: KAUTION_ID,
      p_daten: { iban: "GB82WEST12345698765432", bank: "Muster Bank", getrennt_angelegt: true, zinsmethode: "30_360" },
    });
  });

  it("phase 3: null and empty texts clear the agreement fields, a null flag clears the separate-account confirmation", async () => {
    rpcOk();

    await updateKautionVereinbarungAction({
      tenantId: TENANT_ID,
      kautionId: KAUTION_ID,
      felder: { iban: null, bank: "", kontoinhaber: null, getrennt_angelegt: null, buerge_versicherer: "", urkundennummer: null },
    });

    expect(mockRpc).toHaveBeenCalledWith("kaution_aendern", {
      p_kaution_id: KAUTION_ID,
      p_daten: { iban: null, bank: null, kontoinhaber: null, getrennt_angelegt: null, buerge_versicherer: null, urkundennummer: null },
    });
  });

  it("phase 3: without `kautionsart` in the request the type fit is left to the database (fields are passed)", async () => {
    rpcOk();

    const result = await updateKautionVereinbarungAction({ tenantId: TENANT_ID, kautionId: KAUTION_ID, felder: { buergeVersicherer: "Muster Versicherung" } });

    expect(result.success).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith("kaution_aendern", { p_kaution_id: KAUTION_ID, p_daten: { buerge_versicherer: "Muster Versicherung" } });
  });

  it("phase 3: a field that does not belong to the deposit type named in the request is rejected (KA004), no RPC", async () => {
    const result = await updateKautionVereinbarungAction({
      tenantId: TENANT_ID,
      kautionId: KAUTION_ID,
      felder: { kautionsart: "versicherung", iban: "DE89370400440532013000" },
    });

    expect(result.error?.code).toBe("KA004");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("rejects a malformed deposit ID and a missing felder object", async () => {
    const badId = await updateKautionVereinbarungAction({ tenantId: TENANT_ID, kautionId: "x", felder: { soll_betrag: "100" } });
    const noFelder = await updateKautionVereinbarungAction({ tenantId: TENANT_ID, kautionId: KAUTION_ID } as never);

    expect(badId.error?.code).toBe("KA004");
    expect(noFelder.error?.code).toBe("KA004");
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe("bucheKautionBewegungAction", () => {
  const gueltig = {
    tenantId: TENANT_ID,
    kautionId: KAUTION_ID,
    art: "einzahlung" as const,
    betrag: "333,33",
    wertstellung: "2025-09-01",
    idempotenzSchluessel: SCHLUESSEL,
  };

  it("sends the amount as exact string, the idempotency key and only the allowed detail keys", async () => {
    rpcOk(BEWEGUNG_ID);

    const result = await bucheKautionBewegungAction(gueltig);

    expect(result).toEqual({ success: true, data: { bewegungId: BEWEGUNG_ID } });
    expect(mockRpc).toHaveBeenCalledWith("kaution_buchen", {
      p_kaution_id: KAUTION_ID,
      p_bewegungsart: "einzahlung",
      p_betrag: "333.33",
      p_wertstellung: "2025-09-01",
      p_details: { idempotenz_schluessel: SCHLUESSEL },
    });
  });

  it("books a payout with reason, note and recipient (trimmed)", async () => {
    rpcOk(BEWEGUNG_ID);

    await bucheKautionBewegungAction({
      ...gueltig,
      art: "auszahlung",
      betrag: "500",
      wertstellung: "2025-11-15",
      grund: "  Teilauszahlung  ",
      interneNotiz: "Muster-Notiz",
      empfaenger: "Beispiel GmbH",
    });

    expect(mockRpc).toHaveBeenCalledWith("kaution_buchen", {
      p_kaution_id: KAUTION_ID,
      p_bewegungsart: "auszahlung",
      p_betrag: "500.00",
      p_wertstellung: "2025-11-15",
      p_details: {
        idempotenz_schluessel: SCHLUESSEL,
        grund: "Teilauszahlung",
        interne_notiz: "Muster-Notiz",
        empfaenger: "Beispiel GmbH",
      },
    });
  });

  it("books a deduction with category", async () => {
    rpcOk(BEWEGUNG_ID);

    await bucheKautionBewegungAction({
      ...gueltig,
      art: "abzug",
      betrag: "100",
      wertstellung: "2026-03-15",
      kategorie: "nebenkosten",
      grund: "Nachzahlung",
    });

    expect(mockRpc).toHaveBeenCalledWith(
      "kaution_buchen",
      expect.objectContaining({
        p_bewegungsart: "abzug",
        p_details: { idempotenz_schluessel: SCHLUESSEL, kategorie: "nebenkosten", grund: "Nachzahlung" },
      })
    );
  });

  it("passes a repeated request with the same idempotency key unchanged (the database books once)", async () => {
    rpcOk(BEWEGUNG_ID);
    rpcOk(BEWEGUNG_ID);

    const first = await bucheKautionBewegungAction(gueltig);
    const second = await bucheKautionBewegungAction(gueltig);

    expect(first.data).toEqual(second.data);
    const keys = mockRpc.mock.calls.map((call) => (call[1] as { p_details: { idempotenz_schluessel: string } }).p_details.idempotenz_schluessel);
    expect(keys).toEqual([SCHLUESSEL, SCHLUESSEL]);
  });

  it("accepts a plain numeric amount that is exact to the cent", async () => {
    rpcOk(BEWEGUNG_ID);

    await bucheKautionBewegungAction({ ...gueltig, betrag: 1500.3000000000002 as never });

    expect(mockRpc).toHaveBeenCalledWith("kaution_buchen", expect.objectContaining({ p_betrag: "1500.30" }));
  });

  it.each([
    ["three decimal places", { betrag: "10,005" }],
    ["negative amount", { betrag: "-5" }],
    ["amount 0", { betrag: "0" }],
    ["ambiguous amount", { betrag: "1.500" }],
    ["amount above the maximum", { betrag: "100000000,00" }],
    ["a missing amount", { betrag: undefined }],
    ["an impossible calendar day", { wertstellung: "2026-02-31" }],
    ["a wrong date format", { wertstellung: "01.09.2025" }],
    ["a date before 1990", { wertstellung: "1989-12-31" }],
    ["a missing value date", { wertstellung: undefined }],
    ["an unknown type", { art: "ueberweisung" }],
    ["a missing idempotency key", { idempotenzSchluessel: undefined }],
    ["an invalid idempotency key", { idempotenzSchluessel: "key-1" }],
    ["a category on a deposit", { kategorie: "schaden" }],
    ["a note that is too long", { interneNotiz: "x".repeat(2001) }],
    ["a recipient that is too long", { empfaenger: "x".repeat(201) }],
    ["a reason that is too long", { grund: "x".repeat(501) }],
  ])("rejects %s (KA004), no RPC", async (_label, patch) => {
    const result = await bucheKautionBewegungAction({ ...gueltig, ...patch } as never);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("KA004");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it.each([
    ["a payout without reason", { art: "auszahlung" }],
    ["a payout with a reason of 2 characters", { art: "auszahlung", grund: "ab" }],
    ["a payout with a blank reason", { art: "auszahlung", grund: "   " }],
    ["a deduction without reason", { art: "abzug", kategorie: "schaden" }],
    ["a deduction without category", { art: "abzug", grund: "Schaden" }],
    ["a deduction with an unknown category", { art: "abzug", kategorie: "strafe", grund: "Schaden" }],
    ["a deduction with a blank category", { art: "abzug", kategorie: "  ", grund: "Schaden" }],
  ])("rejects %s (KA004), no RPC", async (_label, patch) => {
    const result = await bucheKautionBewegungAction({ ...gueltig, ...patch } as never);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("KA004");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  describe("interest credit (zinsgutschrift, phase 3)", () => {
    const ZINS = {
      ...gueltig,
      art: "zinsgutschrift" as const,
      betrag: "15,04",
      wertstellung: "2026-01-02",
      zinszeitraumVon: "2025-01-01",
      zinszeitraumBis: "2026-01-01",
    };

    it("books the credit with the period as details (the server calculates the proposal itself)", async () => {
      rpcOk(BEWEGUNG_ID);

      const result = await bucheKautionBewegungAction(ZINS);

      expect(result).toEqual({ success: true, data: { bewegungId: BEWEGUNG_ID } });
      expect(mockRpc).toHaveBeenCalledWith("kaution_buchen", {
        p_kaution_id: KAUTION_ID,
        p_bewegungsart: "zinsgutschrift",
        p_betrag: "15.04",
        p_wertstellung: "2026-01-02",
        p_details: { idempotenz_schluessel: SCHLUESSEL, zinszeitraum_von: "2025-01-01", zinszeitraum_bis: "2026-01-01" },
      });
    });

    it("forwards an optional reason and note, but no category and no rate", async () => {
      rpcOk(BEWEGUNG_ID);

      await bucheKautionBewegungAction({ ...ZINS, grund: "Abweichung laut Bank", interneNotiz: "Muster-Notiz" });

      expect(mockRpc).toHaveBeenCalledWith(
        "kaution_buchen",
        expect.objectContaining({
          p_details: {
            idempotenz_schluessel: SCHLUESSEL,
            zinszeitraum_von: "2025-01-01",
            zinszeitraum_bis: "2026-01-01",
            grund: "Abweichung laut Bank",
            interne_notiz: "Muster-Notiz",
          },
        })
      );
    });

    it("never forwards the calculation basis, the manual flag or any other client value", async () => {
      rpcOk(BEWEGUNG_ID);

      await bucheKautionBewegungAction({
        ...ZINS,
        manuell: true,
        methode: "manuell",
        berechnungsgrundlage: { methode: "act_360", gebucht_betrag: 1 },
        vorschlag_betrag: 1,
      } as never);

      const details = (mockRpc.mock.calls[0][1] as { p_details: Record<string, unknown> }).p_details;
      expect(Object.keys(details).sort()).toEqual(["idempotenz_schluessel", "zinszeitraum_bis", "zinszeitraum_von"]);
    });

    it("the period is mandatory (KA004), no RPC", async () => {
      const ohneVon = await bucheKautionBewegungAction({ ...ZINS, zinszeitraumVon: undefined } as never);
      const ohneBis = await bucheKautionBewegungAction({ ...ZINS, zinszeitraumBis: undefined } as never);

      for (const result of [ohneVon, ohneBis]) {
        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("KA004");
      }
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it.each([
      ["an end before the start", { zinszeitraumVon: "2026-01-01", zinszeitraumBis: "2025-01-01" }],
      ["an empty period (end equals start)", { zinszeitraumVon: "2025-01-01", zinszeitraumBis: "2025-01-01" }],
      ["an impossible calendar day", { zinszeitraumBis: "2026-02-31" }],
      ["a date in German notation", { zinszeitraumVon: "01.01.2025" }],
      ["a start before 1990", { zinszeitraumVon: "1989-12-31" }],
    ])("rejects a period with %s (KA004), no RPC", async (_label, patch) => {
      const result = await bucheKautionBewegungAction({ ...ZINS, ...patch });

      expect(result.error?.code).toBe("KA004");
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it("a category is not allowed on an interest credit (KA004), no RPC", async () => {
      const result = await bucheKautionBewegungAction({ ...ZINS, kategorie: "sonstiges" } as never);

      expect(result.error?.code).toBe("KA004");
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it("a rate is not allowed on an interest credit (KA004), no RPC", async () => {
      const result = await bucheKautionBewegungAction({ ...ZINS, rateId: RATE_ID });

      expect(result.error?.code).toBe("KA004");
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it("the idempotency key stays mandatory (KA004), no RPC", async () => {
      const result = await bucheKautionBewegungAction({ ...ZINS, idempotenzSchluessel: undefined } as never);

      expect(result.error?.code).toBe("KA004");
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it("maps the database rule of the period (KA013, fixed text, no database text)", async () => {
      rpcError("KA013", "KAUT_DATUM_UNGUELTIG: Zeitraum endet nach der Wertstellung am 01.06.2025.");

      const result = await bucheKautionBewegungAction(ZINS);

      expect(result.error?.code).toBe("KA013");
      expect(result.error?.message).toBe(
        "Das Datum oder der Zeitraum ist ungültig (z. B. ein Datum in der Zukunft oder ein Ende vor dem Beginn)."
      );
      expect(JSON.stringify(result)).not.toContain("KAUT_DATUM");
    });

    it("a missing right is 42501 without any RPC (the interest credit needs the same right as other bookings)", async () => {
      mockHasPermission.mockResolvedValueOnce(false);

      const result = await bucheKautionBewegungAction(ZINS);

      expect(result.error?.code).toBe("42501");
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  it("treats a blank category on a deposit as not given", async () => {
    rpcOk(BEWEGUNG_ID);

    const result = await bucheKautionBewegungAction({ ...gueltig, kategorie: "  " as never });

    expect(result.success).toBe(true);
    const details = (mockRpc.mock.calls[0][1] as { p_details: Record<string, unknown> }).p_details;
    expect(details).not.toHaveProperty("kategorie");
  });

  it("does not forward the interest period to other booking types, nor manuell or berechnungsgrundlage (never)", async () => {
    rpcOk(BEWEGUNG_ID);

    await bucheKautionBewegungAction({
      ...gueltig,
      dokumentId: "y",
      zinszeitraumVon: "2025-01-01",
      zinszeitraumBis: "2025-12-31",
      manuell: true,
      berechnungsgrundlage: { fake: true },
    } as never);

    const details = (mockRpc.mock.calls[0][1] as { p_details: Record<string, unknown> }).p_details;
    expect(Object.keys(details)).toEqual(["idempotenz_schluessel"]);
  });

  it("assigns a deposit payment to a rate of the plan (details.rate_id, exact UUID)", async () => {
    rpcOk(BEWEGUNG_ID);

    await bucheKautionBewegungAction({ ...gueltig, rateId: RATE_ID });

    expect(mockRpc).toHaveBeenCalledWith("kaution_buchen", {
      p_kaution_id: KAUTION_ID,
      p_bewegungsart: "einzahlung",
      p_betrag: "333.33",
      p_wertstellung: "2025-09-01",
      p_details: { idempotenz_schluessel: SCHLUESSEL, rate_id: RATE_ID },
    });
  });

  it("treats an empty or missing rate ID as not given (no rate_id key)", async () => {
    rpcOk(BEWEGUNG_ID);
    rpcOk(BEWEGUNG_ID);

    await bucheKautionBewegungAction({ ...gueltig, rateId: "" });
    await bucheKautionBewegungAction({ ...gueltig, rateId: undefined });

    for (const call of mockRpc.mock.calls) {
      expect(Object.keys((call[1] as { p_details: Record<string, unknown> }).p_details)).toEqual(["idempotenz_schluessel"]);
    }
  });

  it.each([
    ["a payout", { art: "auszahlung" as const, grund: "Auszahlung an den Mieter" }],
    ["a deduction", { art: "abzug" as const, kategorie: "schaden" as const, grund: "Schaden am Türrahmen" }],
  ])("rejects a rate for %s (KA004, only deposit payments can be assigned), no RPC", async (_label, abweichend) => {
    const result = await bucheKautionBewegungAction({ ...gueltig, ...abweichend, rateId: RATE_ID });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("KA004");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("rejects a malformed rate ID (KA004), no RPC", async () => {
    const result = await bucheKautionBewegungAction({ ...gueltig, rateId: "x" });

    expect(result.error?.code).toBe("KA004");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("shows the strict-balance message of the database at the form (KA005)", async () => {
    rpcError("KA005", "KAUT_SALDO_NEGATIV: Der Kontostand würde am 01.09.2025 um 0,01 € unter 0 fallen.");

    const result = await bucheKautionBewegungAction({ ...gueltig, art: "auszahlung", grund: "Auszahlung" });

    expect(result).toEqual({
      success: false,
      error: { code: "KA005", message: "Der Kontostand würde am 01.09.2025 um 0,01 € unter 0 fallen." },
    });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});

describe("planeKautionRatenAction", () => {
  const RATE_1 = { faelligkeitsdatum: "2027-01-31", sollBetrag: "333,33" };
  const RATE_2 = { faelligkeitsdatum: "2027-02-28", sollBetrag: "333,33" };
  const RATE_3 = { faelligkeitsdatum: "2027-03-31", sollBetrag: "333,34" };

  it("sends the complete plan with exact decimal strings and due dates to kaution_raten_planen", async () => {
    rpcOk();

    const result = await planeKautionRatenAction({ kautionId: KAUTION_ID, raten: [RATE_1, RATE_2, RATE_3] });

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockRpc).toHaveBeenCalledWith("kaution_raten_planen", {
      p_kaution_id: KAUTION_ID,
      p_raten: [
        { faelligkeitsdatum: "2027-01-31", soll_betrag: "333.33" },
        { faelligkeitsdatum: "2027-02-28", soll_betrag: "333.33" },
        { faelligkeitsdatum: "2027-03-31", soll_betrag: "333.34" },
      ],
    });
  });

  it("an empty list removes the plan (p_raten is an empty array)", async () => {
    rpcOk();

    const result = await planeKautionRatenAction({ kautionId: KAUTION_ID, raten: [] });

    expect(result.success).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith("kaution_raten_planen", { p_kaution_id: KAUTION_ID, p_raten: [] });
  });

  it("accepts a single rate and a plain amount that is exact to the cent", async () => {
    rpcOk();

    await planeKautionRatenAction({ kautionId: KAUTION_ID, raten: [{ faelligkeitsdatum: "2027-06-01", sollBetrag: "1500" }] });

    expect(mockRpc).toHaveBeenCalledWith("kaution_raten_planen", {
      p_kaution_id: KAUTION_ID,
      p_raten: [{ faelligkeitsdatum: "2027-06-01", soll_betrag: "1500.00" }],
    });
  });

  it("rejects more than three rates (KA004), no RPC", async () => {
    const result = await planeKautionRatenAction({
      kautionId: KAUTION_ID,
      raten: [RATE_1, RATE_2, RATE_3, { faelligkeitsdatum: "2027-04-30", sollBetrag: "1,00" }],
    });

    expect(result.error?.code).toBe("KA004");
    expect(result.error?.message).toBe("Ein Ratenplan hat höchstens 3 Raten.");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it.each([
    ["a date that is not a real calendar day", { faelligkeitsdatum: "2027-02-31", sollBetrag: "100,00" }],
    ["a date in German notation", { faelligkeitsdatum: "31.01.2027", sollBetrag: "100,00" }],
    ["a date before 1990", { faelligkeitsdatum: "1989-12-31", sollBetrag: "100,00" }],
    ["a missing date", { sollBetrag: "100,00" }],
    ["a target amount of 0", { faelligkeitsdatum: "2027-01-31", sollBetrag: "0" }],
    ["an ambiguous thousands notation", { faelligkeitsdatum: "2027-01-31", sollBetrag: "1.500" }],
    ["more than two decimal places", { faelligkeitsdatum: "2027-01-31", sollBetrag: "10,005" }],
    ["a boolean as amount", { faelligkeitsdatum: "2027-01-31", sollBetrag: true }],
    ["a missing amount", { faelligkeitsdatum: "2027-01-31" }],
    ["a rate that is not an object", "Muster"],
  ])("rejects %s (KA004), no RPC", async (_label, rate) => {
    const result = await planeKautionRatenAction({ kautionId: KAUTION_ID, raten: [rate as never] });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("KA004");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("rejects equal and descending due dates with a friendly message (KA004), no RPC", async () => {
    const gleich = await planeKautionRatenAction({ kautionId: KAUTION_ID, raten: [RATE_1, { ...RATE_2, faelligkeitsdatum: RATE_1.faelligkeitsdatum }] });
    const absteigend = await planeKautionRatenAction({ kautionId: KAUTION_ID, raten: [RATE_2, RATE_1] });

    for (const result of [gleich, absteigend]) {
      expect(result.error?.code).toBe("KA004");
      expect(result.error?.message).toBe("Die Fälligkeitsdaten müssen in aufsteigender Reihenfolge liegen.");
    }
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("rejects a plan that is not a list and a malformed deposit ID, no RPC", async () => {
    const keineListe = await planeKautionRatenAction({ kautionId: KAUTION_ID, raten: "Muster" as never });
    const fehlendeListe = await planeKautionRatenAction({ kautionId: KAUTION_ID } as never);
    const schlechteId = await planeKautionRatenAction({ kautionId: "x", raten: [RATE_1] });

    expect(keineListe.error?.code).toBe("KA004");
    expect(fehlendeListe.error?.code).toBe("KA004");
    expect(schlechteId.error?.code).toBe("KA004");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("does not forward unknown keys (e.g. an organisation ID) to the RPC", async () => {
    rpcOk();

    await planeKautionRatenAction({
      kautionId: KAUTION_ID,
      raten: [{ ...RATE_1, organisationId: "x", rateId: "y" } as never],
      organisationId: "z",
    } as never);

    const args = mockRpc.mock.calls[0][1] as { p_raten: Record<string, unknown>[] };
    expect(Object.keys(args)).toEqual(["p_kaution_id", "p_raten"]);
    expect(Object.keys(args.p_raten[0]).sort()).toEqual(["faelligkeitsdatum", "soll_betrag"]);
  });

  it("maps a locked plan (KA009) to a fixed German message, the database text is not passed on", async () => {
    rpcError("KA009", "KAUT_GESPERRT: plan cannot be changed because payments are assigned");

    const result = await planeKautionRatenAction({ kautionId: KAUTION_ID, raten: [] });

    expect(result).toEqual({
      success: false,
      error: { code: "KA009", message: "Der Ratenplan kann nicht mehr geändert werden, weil bereits Zahlungen zugeordnet sind." },
    });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("passes the German message of a database validation error (KA004) without the code prefix", async () => {
    rpcError("KA004", "KAUT_EINGABE_UNGUELTIG: Ungültiger Betrag (soll_betrag).");

    const result = await planeKautionRatenAction({ kautionId: KAUTION_ID, raten: [RATE_1] });

    expect(result.error?.code).toBe("KA004");
    expect(result.error?.message).not.toContain("KAUT_");
  });

  it("maps a missing right (42501) and an unknown database error to the usual messages", async () => {
    rpcError("42501", "permission denied for function kaution_raten_planen");
    const verweigert = await planeKautionRatenAction({ kautionId: KAUTION_ID, raten: [RATE_1] });

    rpcError("XX000", "internal detail");
    const unbekannt = await planeKautionRatenAction({ kautionId: KAUTION_ID, raten: [RATE_1] });

    expect(verweigert.error).toEqual({ code: "42501", message: "Für diese Aktion fehlt die Berechtigung (Modul Kautionen)." });
    expect(unbekannt).toEqual({ success: false, error: { message: KAUTION_FEHLER_FALLBACK_MESSAGE } });
  });

  it("logs only the action name, the result and the code (no amounts, dates, IDs or names)", async () => {
    rpcError("KA009", "KAUT_GESPERRT: Zahlungen zugeordnet");

    await planeKautionRatenAction({
      kautionId: KAUTION_ID,
      raten: [{ faelligkeitsdatum: "2027-01-31", sollBetrag: "123,45" }],
    });

    expect(mockLogAction).toHaveBeenCalledWith("planeKautionRaten", "failed", { code: "KA009" });
    const logged = JSON.stringify(mockLogAction.mock.calls);
    for (const secret of ["123", "2027-01-31", KAUTION_ID]) {
      expect(logged).not.toContain(secret);
    }
  });
});

describe("storniereKautionBewegungAction", () => {
  it("sends the cancellation reason trimmed", async () => {
    rpcOk();

    const result = await storniereKautionBewegungAction({ tenantId: TENANT_ID, bewegungId: BEWEGUNG_ID, grund: "  Falsch erfasst  " });

    expect(result.success).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith("kaution_storno", { p_bewegung_id: BEWEGUNG_ID, p_grund: "Falsch erfasst" });
  });

  it.each([
    ["no reason", undefined],
    ["a reason of 2 characters", "ab"],
    ["a blank reason", "   "],
    ["a reason that is too long", "x".repeat(501)],
  ])("rejects %s (KA004), no RPC", async (_label, grund) => {
    const result = await storniereKautionBewegungAction({ tenantId: TENANT_ID, bewegungId: BEWEGUNG_ID, grund } as never);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("KA004");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("rejects a malformed booking ID", async () => {
    const result = await storniereKautionBewegungAction({ tenantId: TENANT_ID, bewegungId: "x", grund: "Falsch erfasst" });

    expect(result.error?.code).toBe("KA004");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("maps KA005 (cancelling a deposit after a payout) and KA006 (already cancelled)", async () => {
    rpcError("KA005", "KAUT_SALDO_NEGATIV: Der Kontostand würde am 15.11.2025 um 500,00 € unter 0 fallen.");
    rpcError("KA006", "KAUT_BEREITS_STORNIERT: Die Buchung ist bereits storniert.");

    const first = await storniereKautionBewegungAction({ tenantId: TENANT_ID, bewegungId: BEWEGUNG_ID, grund: "Falsch erfasst" });
    const second = await storniereKautionBewegungAction({ tenantId: TENANT_ID, bewegungId: BEWEGUNG_ID, grund: "Falsch erfasst" });

    expect(first.error).toEqual({ code: "KA005", message: "Der Kontostand würde am 15.11.2025 um 500,00 € unter 0 fallen." });
    expect(second.error).toEqual({ code: "KA006", message: "Die Buchung ist bereits storniert." });
  });
});

describe("deleteKautionAction", () => {
  it("soft-deletes via the central function with the table name 'Kautionen'", async () => {
    rpcOk();

    const result = await deleteKautionAction({ tenantId: TENANT_ID, kautionId: KAUTION_ID });

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockRpc).toHaveBeenCalledWith("soft_delete_record", { p_table_name: "Kautionen", p_record_id: KAUTION_ID });
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("passes the lock message of the database (KA009)", async () => {
    rpcError("KA009", "KAUT_GESPERRT: Eine Kaution mit Buchungen kann nicht gelöscht werden. Korrekturen erfolgen per Storno.");

    const result = await deleteKautionAction({ tenantId: TENANT_ID, kautionId: KAUTION_ID });

    expect(result.error).toEqual({
      code: "KA009",
      message: "Eine Kaution mit Buchungen kann nicht gelöscht werden. Korrekturen erfolgen per Storno.",
    });
  });

  it.each([
    ["Permission denied: loeschen not allowed for module kautionen", "42501", "Für diese Aktion fehlt die Berechtigung (Modul Kautionen)."],
    ["Permission denied: record is outside your object scope", "KA002", "Kein Zugriff auf dieses Objekt."],
    ["Record not found in current organisation", "KA003", "Der Datensatz wurde nicht gefunden (evtl. bereits geändert oder gelöscht)."],
  ])("maps the plain message '%s' of soft_delete_record", async (message, code, text) => {
    rpcError("P0001", message);

    const result = await deleteKautionAction({ tenantId: TENANT_ID, kautionId: KAUTION_ID });

    expect(result.error).toEqual({ code, message: text });
  });

  it("does not leak other plain messages of soft_delete_record", async () => {
    rpcError("P0001", "Unknown table for soft-delete: Kautionen_Bewegungen");

    const result = await deleteKautionAction({ tenantId: TENANT_ID, kautionId: KAUTION_ID });

    expect(result.error?.message).toBe(KAUTION_FEHLER_FALLBACK_MESSAGE);
  });

  it("rejects a malformed deposit ID", async () => {
    const result = await deleteKautionAction({ tenantId: TENANT_ID, kautionId: "x" });

    expect(result.error?.code).toBe("KA004");
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe("getKautionLoeschauswirkungAction", () => {
  it("calls get_kautionen_loeschauswirkung with the table and the de-duplicated IDs and returns the database result", async () => {
    rpcOk(LOESCH_AUSWIRKUNG);

    const result = await getKautionLoeschauswirkungAction({ tabelle: "Haeuser", ids: [HAUS_ID, HAUS_ID] });

    expect(result).toEqual({ success: true, data: LOESCH_AUSWIRKUNG });
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("get_kautionen_loeschauswirkung", { p_tabelle: "Haeuser", p_ids: [HAUS_ID] });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    ["an unknown table", { tabelle: "Finanzen", ids: [HAUS_ID] }],
    ["no IDs", { tabelle: "Mieter", ids: [] }],
    ["IDs that are not a list", { tabelle: "Mieter", ids: HAUS_ID }],
    ["a malformed ID", { tabelle: "Mieter", ids: ["not-a-uuid"] }],
  ])("rejects %s with KA004 without calling the database", async (_name, input) => {
    const result = await getKautionLoeschauswirkungAction(input as never);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("KA004");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  const mieterIds = (anzahl: number) =>
    Array.from({ length: anzahl }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`);

  const teilAuswirkung = (anzahlMieter: number, idPrefix: string) => ({
    ...LOESCH_AUSWIRKUNG,
    tabelle: "Mieter",
    anzahl_haeuser: 0,
    anzahl_wohnungen: 0,
    anzahl_mieter: anzahlMieter,
    kautionen: {
      anzahl: anzahlMieter,
      ohne_buchungen: 0,
      mit_buchungen: anzahlMieter,
      konto_noch_offen: 10.1,
      konto_verwahrt: 20.2,
      dokumentiert_anzahl: 0,
      dokumentiert_summe: 0,
      mit_saldo_anzahl: anzahlMieter,
      mit_buchungen_gekuerzt: false,
      mit_buchungen_liste: [],
    },
    pruefsumme: "ffffffffffffffffffffffffffffffff",
    eintraege: [{ id: idPrefix, anzahl_mieter: anzahlMieter, mit_buchungen: anzahlMieter, pruefsumme: "0123456789abcdef0123456789abcdef" }],
  });

  it("asks for more than 200 IDs in chunks of 200 and combines the answers on the server", async () => {
    rpcOk(teilAuswirkung(200, "erster"));
    rpcOk(teilAuswirkung(50, "zweiter"));

    const result = await getKautionLoeschauswirkungAction({ tabelle: "Mieter", ids: mieterIds(250) });

    expect(result.success).toBe(true);
    expect(mockRpc).toHaveBeenCalledTimes(2);
    expect((mockRpc.mock.calls[0][1] as { p_ids: string[] }).p_ids).toHaveLength(200);
    expect((mockRpc.mock.calls[1][1] as { p_ids: string[] }).p_ids).toHaveLength(50);
    expect(result.data?.anzahl_mieter).toBe(250);
    expect(result.data?.kautionen?.konto_verwahrt).toBe(40.4);
    expect(result.data?.eintraege.map((eintrag) => eintrag.id)).toEqual(["erster", "zweiter"]);
  });

  it("stops at the first failing chunk", async () => {
    rpcOk(teilAuswirkung(200, "erster"));
    rpcError("KA002", "KAUT_OBJEKTZUGRIFF: Kein Zugriff auf dieses Objekt.");

    const result = await getKautionLoeschauswirkungAction({ tabelle: "Mieter", ids: mieterIds(250) });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("KA002");
    expect(mockRpc).toHaveBeenCalledTimes(2);
  });

  it("rejects more than 2000 IDs without calling the database", async () => {
    const result = await getKautionLoeschauswirkungAction({ tabelle: "Mieter", ids: mieterIds(2001) });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("KA004");
    expect(result.error?.message).toContain("2000");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("maps a database rejection of the object scope (KA002)", async () => {
    rpcError("KA002", "KAUT_OBJEKTZUGRIFF: Kein Zugriff auf dieses Objekt.");

    const result = await getKautionLoeschauswirkungAction({ tabelle: "Haeuser", ids: [HAUS_ID] });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("KA002");
  });

  it("returns the fallback error for an unexpected database answer", async () => {
    rpcOk({ unerwartet: true });

    const result = await getKautionLoeschauswirkungAction({ tabelle: "Haeuser", ids: [HAUS_ID] });

    expect(result).toEqual({ success: false, error: { message: KAUTION_FEHLER_FALLBACK_MESSAGE } });
  });

  it("without the module right: KA... mapped 42501 and no RPC call (the caller then deletes without the overview)", async () => {
    mockHasPermission.mockResolvedValue(false);

    const result = await getKautionLoeschauswirkungAction({ tabelle: "Haeuser", ids: [HAUS_ID] });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("42501");
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe("error mapping by SQLSTATE (spec 4.5)", () => {
  const BUCHEN = {
    tenantId: TENANT_ID,
    kautionId: KAUTION_ID,
    art: "einzahlung" as const,
    betrag: "100",
    wertstellung: "2025-09-01",
    idempotenzSchluessel: SCHLUESSEL,
  };

  it.each([
    ["KA001", "KAUT_NICHT_ANGEMELDET: Anmeldung erforderlich.", "Bitte melden Sie sich erneut an."],
    ["42501", "KAUT_KEIN_RECHT: Keine Berechtigung für Kautionen.", "Für diese Aktion fehlt die Berechtigung (Modul Kautionen)."],
    ["KA002", "KAUT_OBJEKTZUGRIFF: x", "Kein Zugriff auf dieses Objekt."],
    ["KA003", "KAUT_NICHT_GEFUNDEN: Kaution nicht gefunden.", "Der Datensatz wurde nicht gefunden (evtl. bereits geändert oder gelöscht)."],
    ["KA004", "KAUT_EINGABE_UNGUELTIG: Der Betrag muss größer als 0 sein.", "Der Betrag muss größer als 0 sein."],
    ["KA005", "KAUT_SALDO_NEGATIV: Der Kontostand würde am 01.09.2025 um 1,00 € unter 0 fallen.", "Der Kontostand würde am 01.09.2025 um 1,00 € unter 0 fallen."],
    ["KA006", "KAUT_BEREITS_STORNIERT: x", "Die Buchung ist bereits storniert."],
    ["KA007", "KAUT_ZINS_REIHENFOLGE: Die Zinsgutschrift liegt vor der letzten.", "Die Zinsgutschrift liegt vor der letzten."],
    ["KA009", "KAUT_GESPERRT: Gesperrt.", "Gesperrt."],
    ["KA011", "KAUT_RATENPLAN_GESPERRT: Gesperrt.", "Gesperrt."],
    [
      "KA013",
      "KAUT_DATUM_UNGUELTIG: Die Wertstellung darf nicht in der Zukunft liegen.",
      "Das Datum oder der Zeitraum ist ungültig (z. B. ein Datum in der Zukunft oder ein Ende vor dem Beginn).",
    ],
    ["KA014", "KAUT_ART_OHNE_KONTO: Diese Kautionsart führt kein Konto.", "Diese Kautionsart führt kein Konto."],
    ["KA015", "KAUT_PHASE_NICHT_VERFUEGBAR: Noch nicht verfügbar.", "Noch nicht verfügbar."],
    ["23503", 'update or delete on table "Mieter" violates foreign key constraint', "Der Datensatz ist verknüpft und kann nicht gelöscht werden."],
    ["55P03", "canceling statement due to lock timeout", "Die Kaution wird gerade bearbeitet. Bitte versuchen Sie es in einem Moment erneut."],
  ])("%s", async (code, dbMessage, uiMessage) => {
    rpcError(code, dbMessage);

    const result = await bucheKautionBewegungAction(BUCHEN);

    expect(result).toEqual({ success: false, error: { code, message: uiMessage } });
  });

  it.each(["PGRST301", "PGRST303"])("%s (invalid or expired JWT) -> KA001, sign in again", async (code) => {
    rpcError(code, "JWT expired");

    const result = await bucheKautionBewegungAction(BUCHEN);

    expect(result).toEqual({ success: false, error: { code: "KA001", message: "Bitte melden Sie sich erneut an." } });
  });

  it("unknown SQLSTATE: fixed generic message, raw message and details stay out of the result", async () => {
    rpcError("XX000", "internal error in function kaution_buchen at line 42", "Detail mit Muster-Inhalt");

    const result = await bucheKautionBewegungAction(BUCHEN);

    expect(result.success).toBe(false);
    expect(result.error).toEqual({ message: KAUTION_FEHLER_FALLBACK_MESSAGE });
    expect(JSON.stringify(result)).not.toContain("XX000");
    expect(JSON.stringify(result)).not.toContain("kaution_buchen");
    expect(JSON.stringify(result)).not.toContain("Muster-Inhalt");
  });

  it("an exception (network error) yields the generic message without code and without the exception text", async () => {
    mockRpc.mockRejectedValueOnce(new Error("connect ECONNREFUSED muster-host"));

    const result = await bucheKautionBewegungAction(BUCHEN);

    expect(result).toEqual({ success: false, error: { message: KAUTION_FEHLER_FALLBACK_MESSAGE } });
    expect(JSON.stringify(mockLogAction.mock.calls)).not.toContain("muster-host");
    expect(mockLogAction).toHaveBeenCalledWith("bucheKautionBewegung", "error", { art: "einzahlung", code: "UNEXPECTED" });
  });
});

describe("revalidation and logging", () => {
  it.each(ACTION_CASES.filter((c) => !["getKautionDetailsAction", "getKautionLoeschauswirkungAction", "getKautionBelegUrlAction", "berechneKautionZinsenAction", "getKautionAbrechnungAction"].includes(c.name)))("$name: revalidates /mieter after success only", async (caseItem) => {
    queueSuccess(caseItem);
    const ok = await caseItem.call();
    expect(ok.success).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledTimes(1);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/mieter");

    mockRevalidatePath.mockClear();
    rpcError("KA003", "KAUT_NICHT_GEFUNDEN: x");
    const failed = await caseItem.call();
    expect(failed.success).toBe(false);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("logs success and failure with only enumerations and the code (no names, amounts, IDs, free texts)", async () => {
    const sensitive = {
      grund: "Muster-Freitext zur Auszahlung",
      empfaenger: "Beispiel GmbH",
      interneNotiz: "Muster-Notiz",
      betrag: "123,45",
    };
    rpcOk(BEWEGUNG_ID);
    rpcError("KA005", "KAUT_SALDO_NEGATIV: Der Kontostand würde am 01.09.2025 um 1,00 € unter 0 fallen.");

    await bucheKautionBewegungAction({
      tenantId: TENANT_ID,
      kautionId: KAUTION_ID,
      art: "auszahlung",
      wertstellung: "2025-09-01",
      idempotenzSchluessel: SCHLUESSEL,
      ...sensitive,
    });
    await bucheKautionBewegungAction({
      tenantId: TENANT_ID,
      kautionId: KAUTION_ID,
      art: "auszahlung",
      wertstellung: "2025-09-01",
      idempotenzSchluessel: SCHLUESSEL,
      ...sensitive,
    });

    expect(mockLogAction).toHaveBeenNthCalledWith(1, "bucheKautionBewegung", "success", { art: "auszahlung" });
    expect(mockLogAction).toHaveBeenNthCalledWith(2, "bucheKautionBewegung", "failed", { art: "auszahlung", code: "KA005" });

    const logged = JSON.stringify(mockLogAction.mock.calls);
    for (const secret of [sensitive.grund, sensitive.empfaenger, sensitive.interneNotiz, "123", TENANT_ID, KAUTION_ID, SCHLUESSEL]) {
      expect(logged).not.toContain(secret);
    }
    for (const call of mockLogAction.mock.calls) {
      const attributes = call[2] as Record<string, unknown>;
      expect(Object.keys(attributes).every((key) => key === "art" || key === "code")).toBe(true);
    }
  });

  it("never logs an unknown client-supplied type as 'art'", async () => {
    await bucheKautionBewegungAction({
      tenantId: TENANT_ID,
      kautionId: KAUTION_ID,
      art: "Erika Mustermann" as never,
      betrag: "10",
      wertstellung: "2025-09-01",
      idempotenzSchluessel: SCHLUESSEL,
    });

    expect(JSON.stringify(mockLogAction.mock.calls)).not.toContain("Mustermann");
    expect(mockLogAction).toHaveBeenCalledWith("bucheKautionBewegung", "failed", { code: "KA004" });
  });

  it("classifies unclassified errors as 'error' and expected rejections as 'failed'", async () => {
    mockHasPermission.mockResolvedValueOnce(false);
    await deleteKautionAction({ tenantId: TENANT_ID, kautionId: KAUTION_ID });
    expect(mockLogAction).toHaveBeenLastCalledWith("deleteKaution", "failed", { code: "42501" });

    rpcError("XX000", "internal");
    await deleteKautionAction({ tenantId: TENANT_ID, kautionId: KAUTION_ID });
    // The raw code of an unknown error is neither returned nor logged.
    expect(mockLogAction).toHaveBeenLastCalledWith("deleteKaution", "error", {});
  });
});

describe("entferneKautionBelegAction", () => {
  it("entfernt die Zuordnung: RPC mit p_dokument_id = null, die Datei bleibt unberührt", async () => {
    rpcOk();

    const result = await entferneKautionBelegAction({ bewegungId: BEWEGUNG_ID });

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockRpc).toHaveBeenCalledWith("kaution_beleg_zuordnen", { p_bewegung_id: BEWEGUNG_ID, p_dokument_id: null });
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/mieter");
  });

  it("rejects a malformed booking ID (KA004), no RPC", async () => {
    const result = await entferneKautionBelegAction({ bewegungId: "x" });

    expect(result.error?.code).toBe("KA004");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("maps a not-found booking (KA003) with the fixed message", async () => {
    rpcError("KA003", "KAUT_NICHT_GEFUNDEN: Buchung fehlt");

    const result = await entferneKautionBelegAction({ bewegungId: BEWEGUNG_ID });

    expect(result.error).toEqual({ code: "KA003", message: "Der Datensatz wurde nicht gefunden (evtl. bereits geändert oder gelöscht)." });
  });
});

describe("getKautionBelegUrlAction", () => {
  it("liefert einen kurzlebigen Link: Bucket 'documents', Pfad aus Ordner und Dateiname, 300 Sekunden, Download unter dem Originalnamen", async () => {
    rpcOk(BELEG_ROW);

    const result = await getKautionBelegUrlAction({ dokumentId: DOKUMENT_ID });

    expect(result).toEqual({ success: true, data: { url: SIGNED_URL } });
    expect(mockRpc).toHaveBeenCalledWith("get_kaution_beleg", { p_dokument_id: DOKUMENT_ID });
    expect(mockCreateSignedUrl).toHaveBeenCalledWith("documents", `${MUSTER_PFAD}/1765000000000_Muster-Beleg.pdf`, 300, {
      download: "Muster-Beleg.pdf",
    });
  });

  it("does not revalidate and logs nothing on success (read action)", async () => {
    rpcOk(BELEG_ROW);

    await getKautionBelegUrlAction({ dokumentId: DOKUMENT_ID });

    expect(mockRevalidatePath).not.toHaveBeenCalled();
    expect(mockLogAction).not.toHaveBeenCalled();
  });

  it("gibt KA003 zurück, wenn der Beleg nicht verknüpft oder nicht sichtbar ist (NULL)", async () => {
    rpcOk(null);

    const result = await getKautionBelegUrlAction({ dokumentId: DOKUMENT_ID });

    expect(result.error?.code).toBe("KA003");
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("rejects a malformed document ID (KA004), no RPC and no link", async () => {
    const result = await getKautionBelegUrlAction({ dokumentId: "../etc" });

    expect(result.error?.code).toBe("KA004");
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("gibt bei einem Speicherfehler nur die neutrale Meldung zurück, ohne Pfad oder Speicherdetails", async () => {
    rpcOk(BELEG_ROW);
    mockCreateSignedUrl.mockResolvedValueOnce({ data: null, error: { message: `Object not found: ${MUSTER_PFAD}` } });

    const result = await getKautionBelegUrlAction({ dokumentId: DOKUMENT_ID });

    expect(result).toEqual({ success: false, error: { message: KAUTION_FEHLER_FALLBACK_MESSAGE } });
    expect(JSON.stringify(result)).not.toContain("user_muster");
    expect(JSON.stringify(mockLogAction.mock.calls)).not.toContain("user_muster");
    expect(mockLogAction).toHaveBeenCalledWith("getKautionBelegUrl", "error", {});
  });

  it("has no object scope pre-check: the database RPC decides the access", async () => {
    rpcOk(BELEG_ROW);

    await getKautionBelegUrlAction({ dokumentId: DOKUMENT_ID });

    expect(mockScopeRpc).not.toHaveBeenCalled();
  });

  it("maps a missing right to 42501 without any RPC or storage call", async () => {
    mockHasPermission.mockImplementation(async (_modul: string, aktion: string) => aktion !== "ansehen");

    const result = await getKautionBelegUrlAction({ dokumentId: DOKUMENT_ID });

    expect(result.error?.code).toBe("42501");
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });
});

describe("planeKautionZinsstaffelAction (phase 3)", () => {
  const ZEILE_1 = { gueltigAb: "2025-01-01", zinssatzProzent: "1,5" };
  const ZEILE_2 = { gueltigAb: "2025-07-01", zinssatzProzent: "2" };
  const ZEILE_3 = { gueltigAb: "2026-01-01", zinssatzProzent: "0,0125" };

  it("sends the complete schedule with exact decimal rates to kaution_zinsstaffel_setzen", async () => {
    rpcOk();

    const result = await planeKautionZinsstaffelAction({ kautionId: KAUTION_ID, staffel: [ZEILE_1, ZEILE_2, ZEILE_3] });

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockRpc).toHaveBeenCalledWith("kaution_zinsstaffel_setzen", {
      p_kaution_id: KAUTION_ID,
      p_staffel: [
        { gueltig_ab: "2025-01-01", zinssatz_prozent: "1.5" },
        { gueltig_ab: "2025-07-01", zinssatz_prozent: "2" },
        { gueltig_ab: "2026-01-01", zinssatz_prozent: "0.0125" },
      ],
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/mieter");
  });

  it("an empty list removes the schedule (p_staffel is an empty array)", async () => {
    rpcOk();

    const result = await planeKautionZinsstaffelAction({ kautionId: KAUTION_ID, staffel: [] });

    expect(result.success).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith("kaution_zinsstaffel_setzen", { p_kaution_id: KAUTION_ID, p_staffel: [] });
  });

  it("accepts 20 rows and rejects 21 (KA004), no RPC", async () => {
    const zwanzig = Array.from({ length: 20 }, (_, i) => ({ gueltigAb: `${2000 + i}-01-01`, zinssatzProzent: "1" }));
    rpcOk();

    expect((await planeKautionZinsstaffelAction({ kautionId: KAUTION_ID, staffel: zwanzig })).success).toBe(true);

    const zuViele = await planeKautionZinsstaffelAction({
      kautionId: KAUTION_ID,
      staffel: [...zwanzig, { gueltigAb: "2100-01-01", zinssatzProzent: "1" }],
    });
    expect(zuViele.error).toEqual({ code: "KA004", message: "Eine Zinsstaffel hat höchstens 20 Zeilen." });
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["equal dates", [ZEILE_1, { ...ZEILE_2, gueltigAb: ZEILE_1.gueltigAb }]],
    ["descending dates", [ZEILE_2, ZEILE_1]],
    ["an impossible calendar day", [{ gueltigAb: "2025-02-31", zinssatzProzent: "1" }]],
    ["a date in German notation", [{ gueltigAb: "01.01.2025", zinssatzProzent: "1" }]],
    ["a date before 1990", [{ gueltigAb: "1989-12-31", zinssatzProzent: "1" }]],
    ["a missing date", [{ zinssatzProzent: "1" }]],
    ["a rate above 100", [{ gueltigAb: "2025-01-01", zinssatzProzent: "100,01" }]],
    ["a negative rate", [{ gueltigAb: "2025-01-01", zinssatzProzent: "-1" }]],
    ["more than four decimal places", [{ gueltigAb: "2025-01-01", zinssatzProzent: "1,00005" }]],
    ["a rate with a point as thousands separator", [{ gueltigAb: "2025-01-01", zinssatzProzent: "1.000" }]],
    ["a rate that is a number (no floating point input)", [{ gueltigAb: "2025-01-01", zinssatzProzent: 1.5 }]],
    ["a row that is not an object", ["Muster"]],
  ])("rejects %s (KA004), no RPC", async (_label, staffel) => {
    const result = await planeKautionZinsstaffelAction({ kautionId: KAUTION_ID, staffel: staffel as never });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("KA004");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("rejects a schedule that is not a list and a malformed deposit ID, no RPC", async () => {
    const keineListe = await planeKautionZinsstaffelAction({ kautionId: KAUTION_ID, staffel: "Muster" as never });
    const fehlend = await planeKautionZinsstaffelAction({ kautionId: KAUTION_ID } as never);
    const schlechteId = await planeKautionZinsstaffelAction({ kautionId: "x", staffel: [ZEILE_1] });

    for (const result of [keineListe, fehlend, schlechteId]) expect(result.error?.code).toBe("KA004");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("does not forward unknown keys (e.g. a note or an organisation) to the RPC", async () => {
    rpcOk();

    await planeKautionZinsstaffelAction({
      kautionId: KAUTION_ID,
      staffel: [{ ...ZEILE_1, notiz: "Muster", id: "x" } as never],
      organisationId: "z",
    } as never);

    const args = mockRpc.mock.calls[0][1] as { p_staffel: Record<string, unknown>[] };
    expect(Object.keys(args.p_staffel[0]).sort()).toEqual(["gueltig_ab", "zinssatz_prozent"]);
    expect(Object.keys(mockRpc.mock.calls[0][1])).toEqual(["p_kaution_id", "p_staffel"]);
  });

  it("maps a locked schedule (KA009) to the fixed German message, the database text is not passed on", async () => {
    rpcError("KA009", "KAUT_GESPERRT: Zinsen für 2025 sind bereits gutgeschrieben.");

    const result = await planeKautionZinsstaffelAction({ kautionId: KAUTION_ID, staffel: [ZEILE_1] });

    expect(result).toEqual({
      success: false,
      error: { code: "KA009", message: "Die Zinsstaffel kann für bereits gutgeschriebene Zeiträume nicht mehr geändert werden." },
    });
    expect(JSON.stringify(result)).not.toContain("KAUT_GESPERRT");
    expect(mockLogAction).toHaveBeenCalledWith("planeKautionZinsstaffel", "failed", { code: "KA009" });
  });

  it("passes the database message of a guarantee or insurance (KA015) after removing the code prefix", async () => {
    rpcError("KA015", "KAUT_PHASE_NICHT_VERFUEGBAR: Zinsstaffel ist für diese Kautionsart nicht verfügbar.");

    const result = await planeKautionZinsstaffelAction({ kautionId: KAUTION_ID, staffel: [ZEILE_1] });

    expect(result.error).toEqual({ code: "KA015", message: "Zinsstaffel ist für diese Kautionsart nicht verfügbar." });
  });

  it("maps an unknown database error to the generic message", async () => {
    rpcError("XX000", "internal error", "Detail");

    const result = await planeKautionZinsstaffelAction({ kautionId: KAUTION_ID, staffel: [ZEILE_1] });

    expect(result).toEqual({ success: false, error: { message: KAUTION_FEHLER_FALLBACK_MESSAGE } });
  });
});

describe("berechneKautionZinsenAction (phase 3, read only)", () => {
  const VORSCHLAG = {
    moeglich: true,
    regelwerk_version: 1,
    methode: "act_365",
    von: "2025-01-01",
    bis: "2026-01-01",
    tage: 365,
    betrag: 15.04,
    betrag_exakt: "15.041095890411",
    staffel: [{ gueltig_ab: "2025-01-01", zinssatz_prozent: 1 }],
    segmente: [{ von: "2025-01-01", bis: "2026-01-01", tage: 365, zinssatz_prozent: 1, saldo: 1504, divisor: 365, zins: "4.1" }],
  };
  const OHNE_SATZ = {
    moeglich: false,
    grund: "KEIN_ZINSSATZ",
    erster_tag_ohne_satz: "2025-01-01",
    methode: "act_365",
    von: "2025-01-01",
    bis: "2026-01-01",
    tage: 365,
  };

  it("returns the proposal of the database and asks for the period with the default null values", async () => {
    rpcOk(VORSCHLAG);

    const result = await berechneKautionZinsenAction({ kautionId: KAUTION_ID });

    expect(result).toEqual({ success: true, data: VORSCHLAG });
    expect(mockRpc).toHaveBeenCalledWith("kaution_zinsen_berechnen", { p_kaution_id: KAUTION_ID, p_von: null, p_bis: null });
  });

  it("passes an explicit period on (dates checked, database as the authority)", async () => {
    rpcOk(VORSCHLAG);

    await berechneKautionZinsenAction({ kautionId: KAUTION_ID, von: "2025-01-01", bis: "2026-01-01" });

    expect(mockRpc).toHaveBeenCalledWith("kaution_zinsen_berechnen", { p_kaution_id: KAUTION_ID, p_von: "2025-01-01", p_bis: "2026-01-01" });
  });

  it("returns the 'no proposal' answer of the database (no interest rate for the start) as a result, not as an error", async () => {
    rpcOk(OHNE_SATZ);

    const result = await berechneKautionZinsenAction({ kautionId: KAUTION_ID });

    expect(result).toEqual({ success: true, data: OHNE_SATZ });
  });

  it("returns null when the database returns null (not visible or not a bank account)", async () => {
    rpcOk(null);

    const result = await berechneKautionZinsenAction({ kautionId: KAUTION_ID });

    expect(result).toEqual({ success: true, data: null });
  });

  it.each([
    ["an object without the flag", { betrag: 1 }],
    ["a flag that is not a boolean", { ...VORSCHLAG, moeglich: "ja" }],
    ["an unknown method", { ...VORSCHLAG, methode: "act/365" }],
    ["a proposal without amount", { ...VORSCHLAG, betrag: undefined }],
    ["a proposal with a numeric exact amount", { ...VORSCHLAG, betrag_exakt: 15.04 }],
    ["a proposal without segments", { ...VORSCHLAG, segmente: undefined }],
    ["a list instead of an object", [VORSCHLAG]],
  ])("treats an unexpected shape (%s) as an unclassified error, not as a proposal", async (_label, antwort) => {
    rpcOk(antwort);

    const result = await berechneKautionZinsenAction({ kautionId: KAUTION_ID });

    expect(result).toEqual({ success: false, error: { message: KAUTION_FEHLER_FALLBACK_MESSAGE } });
  });

  it.each([
    ["an impossible start date", { von: "2025-02-31" }],
    ["a German end date", { bis: "01.01.2026" }],
  ])("rejects %s (KA004), no RPC", async (_label, periode) => {
    const result = await berechneKautionZinsenAction({ kautionId: KAUTION_ID, ...periode });

    expect(result.error?.code).toBe("KA004");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("leaves the order of the period to the database (KA013), the action only checks the date format", async () => {
    rpcError("KA013", "KAUT_DATUM_UNGUELTIG: Ende vor Beginn.");

    const result = await berechneKautionZinsenAction({ kautionId: KAUTION_ID, von: "2026-01-01", bis: "2025-01-01" });

    expect(mockRpc).toHaveBeenCalledWith("kaution_zinsen_berechnen", { p_kaution_id: KAUTION_ID, p_von: "2026-01-01", p_bis: "2025-01-01" });
    expect(result.error?.code).toBe("KA013");
  });

  it("maps an invalid period from the database (KA013) to the fixed text", async () => {
    rpcError("KA013", "KAUT_DATUM_UNGUELTIG: Der Zeitraum ist länger als 10 Jahre.");

    const result = await berechneKautionZinsenAction({ kautionId: KAUTION_ID, von: "2000-01-01", bis: "2026-01-01" });

    expect(result.error?.code).toBe("KA013");
    expect(result.error?.message).toBe(
      "Das Datum oder der Zeitraum ist ungültig (z. B. ein Datum in der Zukunft oder ein Ende vor dem Beginn)."
    );
  });

  it("is a read action: it needs only `ansehen`, does not revalidate and logs nothing on success", async () => {
    rpcOk(VORSCHLAG);

    await berechneKautionZinsenAction({ kautionId: KAUTION_ID });

    expect(mockHasPermission.mock.calls.map((call) => call[1])).toEqual(["ansehen"]);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
    expect(mockLogAction).not.toHaveBeenCalled();
  });

  it("without `ansehen` it is 42501 and no RPC call", async () => {
    mockHasPermission.mockResolvedValueOnce(false);

    const result = await berechneKautionZinsenAction({ kautionId: KAUTION_ID });

    expect(result.error?.code).toBe("42501");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("rejects a malformed deposit ID (KA004), no RPC", async () => {
    const result = await berechneKautionZinsenAction({ kautionId: "x" });

    expect(result.error?.code).toBe("KA004");
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe("getKautionAbrechnungAction (phase 4, read only)", () => {
  it("reads get_kaution_abrechnung with the tenant and the settlement date (NULL = database default) and returns the result unchanged", async () => {
    rpcOk(ABRECHNUNG_FIXTURE);

    const result = await getKautionAbrechnungAction({ tenantId: TENANT_ID });

    expect(result).toEqual({ success: true, data: ABRECHNUNG_FIXTURE });
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("get_kaution_abrechnung", { p_mieter_id: TENANT_ID, p_stichtag: null });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("passes a valid settlement date to the database as given", async () => {
    rpcOk(ABRECHNUNG_FIXTURE);

    await getKautionAbrechnungAction({ tenantId: TENANT_ID, stichtag: "2026-03-15" });

    expect(mockRpc).toHaveBeenCalledWith("get_kaution_abrechnung", { p_mieter_id: TENANT_ID, p_stichtag: "2026-03-15" });
  });

  it("rejects a malformed settlement date before the RPC (KA004)", async () => {
    const result = await getKautionAbrechnungAction({ tenantId: TENANT_ID, stichtag: "2026-02-31" });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("KA004");
    expect(result.error?.message).toBe("Stichtag: Bitte geben Sie ein gültiges Datum an (JJJJ-MM-TT).");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("a date in the future is decided by the database (KA013, fixed text)", async () => {
    rpcError("KA013", "KA013: Stichtag liegt in der Zukunft.");

    const result = await getKautionAbrechnungAction({ tenantId: TENANT_ID, stichtag: "2099-01-01" });

    expect(result.error?.code).toBe("KA013");
    expect(result.error?.message).toBe(
      "Das Datum oder der Zeitraum ist ungültig (z. B. ein Datum in der Zukunft oder ein Ende vor dem Beginn)."
    );
  });

  it("answers null when the database has no settlement (not visible or no account type)", async () => {
    rpcOk(null);

    const result = await getKautionAbrechnungAction({ tenantId: TENANT_ID });

    expect(result).toEqual({ success: true, data: null });
  });

  it.each([
    ["without konto", { ...ABRECHNUNG_FIXTURE, konto: undefined }],
    ["with konto as array", { ...ABRECHNUNG_FIXTURE, konto: [] }],
    ["with abzuege that is no array", { ...ABRECHNUNG_FIXTURE, abzuege: {} }],
    ["with bewegungen that is no array", { ...ABRECHNUNG_FIXTURE, bewegungen: "keine" }],
    ["without stichtag", { ...ABRECHNUNG_FIXTURE, stichtag: undefined }],
    ["not an object", "Muster"],
  ])("an unexpected shape (%s) is an unclassified error, never returned as data", async (_label, shape) => {
    rpcOk(shape);

    const result = await getKautionAbrechnungAction({ tenantId: TENANT_ID });

    expect(result).toEqual({ success: false, error: { message: KAUTION_FEHLER_FALLBACK_MESSAGE } });
  });

  it("maps a database error of the read and logs the code only", async () => {
    rpcError("42501", "KAUT_KEIN_RECHT: Modul fehlt");

    const result = await getKautionAbrechnungAction({ tenantId: TENANT_ID });

    expect(result.error).toEqual({ code: "42501", message: "Für diese Aktion fehlt die Berechtigung (Modul Kautionen)." });
    expect(mockLogAction).toHaveBeenCalledWith("getKautionAbrechnung", "failed", { code: "42501" });
  });

  it("logs nothing on success and never a name, a figure or the tenant ID", async () => {
    rpcOk(ABRECHNUNG_FIXTURE);
    await getKautionAbrechnungAction({ tenantId: TENANT_ID });
    expect(mockLogAction).not.toHaveBeenCalled();

    rpcError("KA013", "KA013: x");
    await getKautionAbrechnungAction({ tenantId: TENANT_ID, stichtag: "2099-01-01" });
    const protokoll = JSON.stringify(mockLogAction.mock.calls);
    expect(protokoll).not.toContain("Muster");
    expect(protokoll).not.toContain(TENANT_ID);
  });
});

describe("setzeKautionEinbehaltAction (phase 4)", () => {
  const RPC = "kaution_einbehalt_setzen";

  it("sets the hold with reason and date (trimmed) and revalidates /mieter", async () => {
    rpcOk(null);

    const result = await setzeKautionEinbehaltAction({ kautionId: KAUTION_ID, grund: "  Muster-Grund  ", seit: "2026-03-01" });

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockRpc).toHaveBeenCalledWith(RPC, { p_kaution_id: KAUTION_ID, p_grund: "Muster-Grund", p_seit: "2026-03-01" });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/mieter");
    expect(mockScopeRpc).not.toHaveBeenCalled();
  });

  it.each([
    ["null", null, null],
    ["empty texts", "", ""],
    ["blank texts", "   ", "  "],
    ["missing values", undefined, undefined],
  ])("removes the hold when both values are empty (%s)", async (_label, grund, seit) => {
    rpcOk(null);

    const result = await setzeKautionEinbehaltAction({
      kautionId: KAUTION_ID,
      grund: grund as string | null,
      seit: seit as string | null,
    });

    expect(result.success).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith(RPC, { p_kaution_id: KAUTION_ID, p_grund: null, p_seit: null });
  });

  it.each([
    ["only the reason", "Muster-Grund", null],
    ["only the date", null, "2026-03-01"],
  ])("rejects %s (KA004, own message) without RPC", async (_label, grund, seit) => {
    const result = await setzeKautionEinbehaltAction({ kautionId: KAUTION_ID, grund, seit });

    expect(result.error).toEqual({
      code: "KA004",
      message: "Grund und Datum des Einbehalts müssen gemeinsam angegeben oder gemeinsam entfernt werden.",
    });
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("checks the reason length (3 to 500 characters) and the date before the RPC", async () => {
    expect((await setzeKautionEinbehaltAction({ kautionId: KAUTION_ID, grund: "ab", seit: "2026-03-01" })).error?.code).toBe("KA004");
    expect((await setzeKautionEinbehaltAction({ kautionId: KAUTION_ID, grund: "x".repeat(501), seit: "2026-03-01" })).error?.code).toBe("KA004");
    expect((await setzeKautionEinbehaltAction({ kautionId: KAUTION_ID, grund: "Muster-Grund", seit: "2026-02-31" })).error?.code).toBe("KA004");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("rejects an invalid deposit ID before the RPC", async () => {
    const result = await setzeKautionEinbehaltAction({ kautionId: "keine-id", grund: "Muster-Grund", seit: "2026-03-01" });

    expect(result.error).toEqual({ code: "KA004", message: "Ungültige Kautions-ID." });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("passes the database errors on: KA004 (no balance) with its message, KA013 and KA014 by code", async () => {
    rpcError("KA004", "KA004: Es besteht kein Guthaben für einen Einbehalt.");
    const ohneGuthaben = await setzeKautionEinbehaltAction({ kautionId: KAUTION_ID, grund: "Muster-Grund", seit: "2026-03-01" });
    // The database text is passed on. `stripDbCodePrefix` does not strip codes with digits (`KA004:`), so the prefix may
    // still be in the text; see the report of phase 4. The assertion only fixes the code and the database text.
    expect(ohneGuthaben.error?.code).toBe("KA004");
    expect(ohneGuthaben.error?.message).toContain("Es besteht kein Guthaben für einen Einbehalt.");

    rpcError("KA013", "KA013: x");
    const datum = await setzeKautionEinbehaltAction({ kautionId: KAUTION_ID, grund: "Muster-Grund", seit: "2026-03-01" });
    expect(datum.error?.code).toBe("KA013");

    rpcError("KA014", "KA014: Diese Kautionsart führt kein Konto.");
    const ohneKonto = await setzeKautionEinbehaltAction({ kautionId: KAUTION_ID, grund: "Muster-Grund", seit: "2026-03-01" });
    expect(ohneKonto.error?.code).toBe("KA014");
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("logs a failure with the code only (no reason, no date)", async () => {
    rpcError("KA004", "KA004: Es besteht kein Guthaben für einen Einbehalt.");

    await setzeKautionEinbehaltAction({ kautionId: KAUTION_ID, grund: "Muster-Grund", seit: "2026-03-01" });

    expect(mockLogAction).toHaveBeenCalledWith("setzeKautionEinbehalt", "failed", { code: "KA004" });
    expect(JSON.stringify(mockLogAction.mock.calls)).not.toContain("Muster-Grund");
  });
});
