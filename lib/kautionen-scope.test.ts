/** @jest-environment node */

/**
 * Tests for the object scope check of the deposit management.
 * The check delegates to the database function `kautionen_pruefe_objektzugriff` (mocked here as `rpc`).
 * `jest.setup.js` mocks `next/navigation` globally. IDs are synthetic.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_rethrow } from "next/navigation";
import { KautionScopeError, assertKautionScope, checkKautionScope } from "@/lib/kautionen-scope";

const TENANT_ID = "tenant-1";

const mockUnstableRethrow = unstable_rethrow as unknown as jest.Mock;

function createSupabase(result: { data?: unknown; error: unknown } | Error) {
  const rpc = jest.fn(async () => {
    if (result instanceof Error) throw result;
    return { data: null, ...result };
  });
  return { client: { rpc } as unknown as SupabaseClient, rpc };
}

describe("kautionen-scope", () => {
  afterEach(() => {
    mockUnstableRethrow.mockReset();
  });

  describe("assertKautionScope", () => {
    it("allows access when the database function returns without an error", async () => {
      const { client, rpc } = createSupabase({ error: null });

      await expect(assertKautionScope(client, TENANT_ID)).resolves.toBeUndefined();
      expect(rpc).toHaveBeenCalledTimes(1);
      expect(rpc).toHaveBeenCalledWith("kautionen_pruefe_objektzugriff", { p_mieter_id: TENANT_ID });
    });

    it("denies when the database raises KA002 (outside the object scope)", async () => {
      const { client } = createSupabase({ error: { code: "KA002", message: "KAUT_OBJEKTZUGRIFF: Kein Zugriff auf dieses Objekt." } });

      await expect(assertKautionScope(client, TENANT_ID)).rejects.toBeInstanceOf(KautionScopeError);
    });

    it("denies when the database raises 42501 (no module right), same error as for KA002", async () => {
      const { client } = createSupabase({ error: { code: "42501", message: "KAUT_KEIN_RECHT: Keine Berechtigung für Kautionen." } });

      const error = await assertKautionScope(client, TENANT_ID).then(
        () => null,
        (e: KautionScopeError) => e
      );
      expect(error).toBeInstanceOf(KautionScopeError);
      expect(error?.code).toBe("KA002");
    });

    it("denies on any other database error (fail-closed)", async () => {
      for (const error of [{ code: "XX000", message: "boom" }, { message: "no code" }, { code: "PGRST301", message: "JWT expired" }, {}]) {
        const { client } = createSupabase({ error });
        await expect(assertKautionScope(client, TENANT_ID)).rejects.toBeInstanceOf(KautionScopeError);
      }
    });

    it("denies on a network error (the call throws)", async () => {
      const { client } = createSupabase(new Error("network down"));

      await expect(assertKautionScope(client, TENANT_ID)).rejects.toBeInstanceOf(KautionScopeError);
      expect(mockUnstableRethrow).toHaveBeenCalledTimes(1);
    });

    it("rethrows Next.js control-flow errors unchanged instead of swallowing them", async () => {
      const controlFlow = new Error("NEXT_REDIRECT");
      mockUnstableRethrow.mockImplementationOnce((error: unknown) => {
        throw error;
      });
      const { client } = createSupabase(controlFlow);

      await expect(assertKautionScope(client, TENANT_ID)).rejects.toBe(controlFlow);
    });

    it.each([[""], ["   "], [undefined], [null], [42]])("denies without a usable tenant id (%p), without calling the database", async (tenantId) => {
      const { client, rpc } = createSupabase({ error: null });

      await expect(assertKautionScope(client, tenantId as unknown as string)).rejects.toBeInstanceOf(KautionScopeError);
      expect(rpc).not.toHaveBeenCalled();
    });

    it("gives identical errors for every denial reason (no existence leak)", async () => {
      const reasons = [
        { error: { code: "KA002", message: "KAUT_OBJEKTZUGRIFF: x" } },
        { error: { code: "42501", message: "KAUT_KEIN_RECHT: x" } },
        { error: { code: "XX000", message: "boom" } },
        new Error("network down"),
      ];
      const errors: KautionScopeError[] = [];
      for (const reason of reasons) {
        const { client } = createSupabase(reason);
        errors.push(
          await assertKautionScope(client, TENANT_ID).then(
            () => {
              throw new Error("expected a denial");
            },
            (error: KautionScopeError) => error
          )
        );
      }
      expect(new Set(errors.map((error) => error.message)).size).toBe(1);
      expect(new Set(errors.map((error) => error.code)).size).toBe(1);
    });

    it("carries the KA002 code and the German UI message without the tenant id", async () => {
      const { client } = createSupabase({ error: { code: "KA002", message: "KAUT_OBJEKTZUGRIFF: x" } });

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
    it("returns ok when access is allowed", async () => {
      const { client } = createSupabase({ error: null });
      await expect(checkKautionScope(client, TENANT_ID)).resolves.toEqual({ ok: true });
    });

    it("returns the denial instead of throwing it", async () => {
      const { client } = createSupabase({ error: { code: "KA002", message: "KAUT_OBJEKTZUGRIFF: x" } });
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
      const { client } = createSupabase(controlFlow);
      await expect(checkKautionScope(client, TENANT_ID)).rejects.toBe(controlFlow);
    });
  });
});
