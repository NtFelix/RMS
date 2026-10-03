/** @jest-environment node */

/**
 * Tests for the object scope check of the deposit management.
 * `jest.setup.js` mocks `@/lib/object-scope` (unrestricted, `null`) and `next/navigation` globally,
 * the restricted cases override the mock explicitly. IDs are synthetic.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_rethrow } from "next/navigation";
import { getAccessibleWohnungIds } from "@/lib/object-scope";
import { KautionScopeError, assertKautionScope, checkKautionScope } from "@/lib/kautionen-scope";

const TENANT_ID = "tenant-1";
const WOHNUNG_ERLAUBT = "wohnung-allowed";
const WOHNUNG_FREMD = "wohnung-foreign";

const mockGetAccessibleWohnungIds = getAccessibleWohnungIds as jest.Mock;
const mockUnstableRethrow = unstable_rethrow as unknown as jest.Mock;

function createSupabase(result: { data: unknown; error: unknown } | Error) {
  const single = jest.fn(async () => {
    if (result instanceof Error) throw result;
    return result;
  });
  const eq = jest.fn(() => ({ single }));
  const select = jest.fn(() => ({ eq }));
  const from = jest.fn(() => ({ select }));
  return { client: { from } as unknown as SupabaseClient, from, select, eq, single };
}

describe("kautionen-scope", () => {
  afterEach(() => {
    mockGetAccessibleWohnungIds.mockReset();
    mockGetAccessibleWohnungIds.mockResolvedValue(null);
    mockUnstableRethrow.mockReset();
  });

  describe("assertKautionScope", () => {
    it("allows unrestricted users without querying the tenant", async () => {
      const { client, from } = createSupabase({ data: null, error: null });
      await expect(assertKautionScope(client, TENANT_ID)).resolves.toBeUndefined();
      expect(from).not.toHaveBeenCalled();
    });

    it("allows a restricted user for a tenant in an allowed apartment", async () => {
      mockGetAccessibleWohnungIds.mockResolvedValueOnce([WOHNUNG_ERLAUBT, "wohnung-other"]);
      const { client, from, select, eq } = createSupabase({ data: { wohnung_id: WOHNUNG_ERLAUBT }, error: null });

      await expect(assertKautionScope(client, TENANT_ID)).resolves.toBeUndefined();
      expect(from).toHaveBeenCalledWith("Mieter");
      expect(select).toHaveBeenCalledWith("wohnung_id");
      expect(eq).toHaveBeenCalledWith("id", TENANT_ID);
    });

    it("denies a restricted user for a tenant in a foreign apartment", async () => {
      mockGetAccessibleWohnungIds.mockResolvedValueOnce([WOHNUNG_ERLAUBT]);
      const { client } = createSupabase({ data: { wohnung_id: WOHNUNG_FREMD }, error: null });

      await expect(assertKautionScope(client, TENANT_ID)).rejects.toBeInstanceOf(KautionScopeError);
    });

    it.each([
      ["null", { wohnung_id: null }],
      ["undefined", { wohnung_id: undefined }],
      ["empty string", { wohnung_id: "" }],
      ["missing column", {}],
    ])("denies a restricted user for a tenant without apartment (%s), fail-closed", async (_label, row) => {
      mockGetAccessibleWohnungIds.mockResolvedValueOnce([WOHNUNG_ERLAUBT]);
      const { client } = createSupabase({ data: row, error: null });

      await expect(assertKautionScope(client, TENANT_ID)).rejects.toBeInstanceOf(KautionScopeError);
    });

    it("denies a restricted user who has no accessible apartment at all, without a query", async () => {
      mockGetAccessibleWohnungIds.mockResolvedValueOnce([]);
      const { client, from } = createSupabase({ data: { wohnung_id: WOHNUNG_ERLAUBT }, error: null });

      await expect(assertKautionScope(client, TENANT_ID)).rejects.toBeInstanceOf(KautionScopeError);
      expect(from).not.toHaveBeenCalled();
    });

    it("denies when the tenant is not found or the query fails", async () => {
      for (const result of [
        { data: null, error: { code: "PGRST116", message: "not found" } },
        { data: null, error: null },
        { data: { wohnung_id: WOHNUNG_ERLAUBT }, error: { code: "XX000", message: "boom" } },
      ]) {
        mockGetAccessibleWohnungIds.mockResolvedValueOnce([WOHNUNG_ERLAUBT]);
        const { client } = createSupabase(result);
        await expect(assertKautionScope(client, TENANT_ID)).rejects.toBeInstanceOf(KautionScopeError);
      }
    });

    it("denies when the query throws", async () => {
      mockGetAccessibleWohnungIds.mockResolvedValueOnce([WOHNUNG_ERLAUBT]);
      const { client } = createSupabase(new Error("network down"));

      await expect(assertKautionScope(client, TENANT_ID)).rejects.toBeInstanceOf(KautionScopeError);
      expect(mockUnstableRethrow).toHaveBeenCalledTimes(1);
    });

    it("rethrows Next.js control-flow errors unchanged instead of swallowing them", async () => {
      const controlFlow = new Error("NEXT_REDIRECT");
      mockUnstableRethrow.mockImplementationOnce((error: unknown) => {
        throw error;
      });
      mockGetAccessibleWohnungIds.mockResolvedValueOnce([WOHNUNG_ERLAUBT]);
      const { client } = createSupabase(controlFlow);

      await expect(assertKautionScope(client, TENANT_ID)).rejects.toBe(controlFlow);
    });

    it.each([[""], ["   "], [undefined], [null], [42]])(
      "denies a restricted user without a usable tenant id (%p), without a query",
      async (tenantId) => {
        mockGetAccessibleWohnungIds.mockResolvedValueOnce([WOHNUNG_ERLAUBT]);
        const { client, from } = createSupabase({ data: { wohnung_id: WOHNUNG_ERLAUBT }, error: null });

        await expect(assertKautionScope(client, tenantId as unknown as string)).rejects.toBeInstanceOf(KautionScopeError);
        expect(from).not.toHaveBeenCalled();
      }
    );

    it("denies when the scope helper returns something that is not a list (fail-closed)", async () => {
      for (const broken of [undefined, "wohnung-allowed", {}, 0]) {
        mockGetAccessibleWohnungIds.mockResolvedValueOnce(broken);
        const { client } = createSupabase({ data: { wohnung_id: WOHNUNG_ERLAUBT }, error: null });
        await expect(assertKautionScope(client, TENANT_ID)).rejects.toBeInstanceOf(KautionScopeError);
      }
    });

    it("gives identical errors for every denial reason (no existence leak)", async () => {
      const reasons = [
        { scope: [WOHNUNG_ERLAUBT], result: { data: { wohnung_id: WOHNUNG_FREMD }, error: null } },
        { scope: [WOHNUNG_ERLAUBT], result: { data: { wohnung_id: null }, error: null } },
        { scope: [WOHNUNG_ERLAUBT], result: { data: null, error: { code: "PGRST116", message: "not found" } } },
        { scope: [], result: { data: { wohnung_id: WOHNUNG_ERLAUBT }, error: null } },
      ];
      const errors: KautionScopeError[] = [];
      for (const { scope, result } of reasons) {
        mockGetAccessibleWohnungIds.mockResolvedValueOnce(scope);
        const { client } = createSupabase(result);
        errors.push(await assertKautionScope(client, TENANT_ID).then(
          () => { throw new Error("expected a denial"); },
          (error: KautionScopeError) => error
        ));
      }
      expect(new Set(errors.map((error) => error.message)).size).toBe(1);
      expect(new Set(errors.map((error) => error.code)).size).toBe(1);
    });

    it("carries the KA002 code and the German UI message without the tenant id", async () => {
      mockGetAccessibleWohnungIds.mockResolvedValueOnce([WOHNUNG_ERLAUBT]);
      const { client } = createSupabase({ data: { wohnung_id: WOHNUNG_FREMD }, error: null });

      const error = await assertKautionScope(client, TENANT_ID).then(
        () => null,
        (e: KautionScopeError) => e
      );
      expect(error).toBeInstanceOf(Error);
      expect(error?.name).toBe("KautionScopeError");
      expect(error?.code).toBe("KA002");
      expect(error?.message).toBe("Kein Zugriff auf dieses Objekt.");
      expect(error?.message).not.toContain(TENANT_ID);
    });
  });

  describe("checkKautionScope", () => {
    it("returns ok for unrestricted users", async () => {
      const { client } = createSupabase({ data: null, error: null });
      await expect(checkKautionScope(client, TENANT_ID)).resolves.toEqual({ ok: true });
    });

    it("returns ok for a tenant in an allowed apartment", async () => {
      mockGetAccessibleWohnungIds.mockResolvedValueOnce([WOHNUNG_ERLAUBT]);
      const { client } = createSupabase({ data: { wohnung_id: WOHNUNG_ERLAUBT }, error: null });
      await expect(checkKautionScope(client, TENANT_ID)).resolves.toEqual({ ok: true });
    });

    it("returns the denial instead of throwing it", async () => {
      mockGetAccessibleWohnungIds.mockResolvedValueOnce([WOHNUNG_ERLAUBT]);
      const { client } = createSupabase({ data: { wohnung_id: null }, error: null });
      await expect(checkKautionScope(client, TENANT_ID)).resolves.toEqual({
        ok: false,
        error: { code: "KA002", message: "Kein Zugriff auf dieses Objekt." },
      });
    });

    it("rethrows errors that are not a denial (Next.js control flow)", async () => {
      const controlFlow = new Error("NEXT_NOT_FOUND");
      mockUnstableRethrow.mockImplementationOnce((error: unknown) => {
        throw error;
      });
      mockGetAccessibleWohnungIds.mockResolvedValueOnce([WOHNUNG_ERLAUBT]);
      const { client } = createSupabase(controlFlow);
      await expect(checkKautionScope(client, TENANT_ID)).rejects.toBe(controlFlow);
    });
  });
});
