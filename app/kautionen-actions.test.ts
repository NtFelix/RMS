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
  bucheKautionBewegungAction,
  createKautionAction,
  deleteKautionAction,
  getKautionDetailsAction,
  getKautionLoeschauswirkungAction,
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
const SCOPE_RPC = "kautionen_pruefe_objektzugriff";

const mockHasPermission = hasPermission as jest.Mock;
const mockEnsureAuth = ensureAuth as jest.Mock;
const mockLogAction = logAction as jest.Mock;
const mockRevalidatePath = revalidatePath as jest.Mock;

// Supabase client mock: `rpc` for the actions (the scope helper has its own mock), `from` must never be used.
const mockRpc = jest.fn();
const mockScopeRpc = jest.fn();
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
];

/** Queues the RPC responses an action needs for a successful run (the details action needs the details RPC). */
function queueSuccess(caseItem: ActionCase) {
  rpcOk(caseItem.okData);
}

beforeEach(() => {
  mockRpc.mockReset();
  mockScopeRpc.mockReset();
  mockScopeRpc.mockResolvedValue({ data: null, error: null });
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
  const SCOPE_CASES = ACTION_CASES.filter((caseItem) => caseItem.name === "getKautionDetailsAction" || caseItem.name === "createKautionAction");
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

  it("phase 1: a deposit type other than barkaution is not available (KA015), an unknown one is invalid (KA004)", async () => {
    const sparbuch = await createKautionAction({ tenantId: TENANT_ID, sollBetrag: "1500", kautionsart: "sparbuch" });
    const unbekannt = await createKautionAction({ tenantId: TENANT_ID, sollBetrag: "1500", kautionsart: "gold" as never });

    expect(sparbuch.error?.code).toBe("KA015");
    expect(unbekannt.error?.code).toBe("KA004");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("rejects a note that is too long", async () => {
    const result = await createKautionAction({ tenantId: TENANT_ID, sollBetrag: "1500", interneNotiz: "x".repeat(2001) });

    expect(result.error?.code).toBe("KA004");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("does not forward unknown input fields (e.g. an organisation) to the RPC", async () => {
    rpcOk(KAUTION_ID);

    await createKautionAction({ tenantId: TENANT_ID, sollBetrag: "1500", organisation_id: "foreign-org", iban: "x" } as never);

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
    ["an unknown field", { iban: "x" }],
    ["a field of a later phase", { zinsmethode: "act/365" }],
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

  it("phase 1: another deposit type is not available (KA015)", async () => {
    const result = await updateKautionVereinbarungAction({ tenantId: TENANT_ID, kautionId: KAUTION_ID, felder: { kautionsart: "buergschaft" } });

    expect(result.error?.code).toBe("KA015");
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

  it("phase 1: an interest credit is not available (KA015), no RPC", async () => {
    const result = await bucheKautionBewegungAction({ ...gueltig, art: "zinsgutschrift" });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("KA015");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("treats a blank category on a deposit as not given", async () => {
    rpcOk(BEWEGUNG_ID);

    const result = await bucheKautionBewegungAction({ ...gueltig, kategorie: "  " as never });

    expect(result.success).toBe(true);
    const details = (mockRpc.mock.calls[0][1] as { p_details: Record<string, unknown> }).p_details;
    expect(details).not.toHaveProperty("kategorie");
  });

  it("does not forward fields of later phases (installment, document, interest period) to the RPC", async () => {
    rpcOk(BEWEGUNG_ID);

    await bucheKautionBewegungAction({
      ...gueltig,
      rateId: "x",
      dokumentId: "y",
      zinszeitraumVon: "2025-01-01",
      zinszeitraumBis: "2025-12-31",
      manuell: true,
      berechnungsgrundlage: { fake: true },
    } as never);

    const details = (mockRpc.mock.calls[0][1] as { p_details: Record<string, unknown> }).p_details;
    expect(Object.keys(details)).toEqual(["idempotenz_schluessel"]);
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

  it("rejects more than 200 IDs", async () => {
    const ids = Array.from({ length: 201 }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`);

    const result = await getKautionLoeschauswirkungAction({ tabelle: "Mieter", ids });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("KA004");
    expect(result.error?.message).toContain("200");
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
    ["KA013", "KAUT_DATUM_UNGUELTIG: Die Wertstellung darf nicht in der Zukunft liegen.", "Die Wertstellung darf nicht in der Zukunft liegen."],
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
  it.each(ACTION_CASES.filter((c) => c.name !== "getKautionDetailsAction" && c.name !== "getKautionLoeschauswirkungAction"))("$name: revalidates /mieter after success only", async (caseItem) => {
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
