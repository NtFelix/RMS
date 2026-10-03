/**
 * Object scope check for the deposit management ("Kautionsmanagement", GH-6).
 *
 * Employees can be restricted to certain houses (`objekte.haeuser`). A deposit belongs to a tenant
 * row (`Mieter`), the tenant to an apartment (`Wohnung`), the apartment to a house. This check runs in
 * the server actions BEFORE any RPC call and is fail-closed:
 * - unrestricted access (`getAccessibleWohnungIds() === null`): allowed, nothing to check here;
 * - restricted access: the tenant must exist AND have an apartment AND that apartment must be in the
 *   allowed list. A tenant without apartment is never in the scope of a restricted user.
 * - every error (RPC failure, query error, exception) denies access.
 * The reason for a denial is deliberately not distinguishable (foreign object, unknown ID and tenant
 * without apartment give the same error), so the check does not reveal whether an object exists.
 *
 * The database checks the object scope again inside the RPCs (`KA002`), this is the fast first stage.
 * Security-relevant code: not production ready until it has been reviewed by the maintainer.
 *
 * `assertKautionScope` throws (a caller that forgets to handle the result cannot continue by accident).
 * `checkKautionScope` is the non-throwing variant for actions that return `{ success: false, error }`.
 * Not a "use server" file.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_rethrow } from "next/navigation";
import { mapKautionError } from "@/lib/kautionen-errors";
import { getAccessibleWohnungIds } from "@/lib/object-scope";

/** Thrown by `assertKautionScope` when the current user may not access the tenant's deposit. */
export class KautionScopeError extends Error {
  /** SQLSTATE of the matching database error (`KAUT_OBJEKTZUGRIFF`). */
  readonly code = "KA002";

  constructor(message: string = mapKautionError({ code: "KA002" }).message) {
    super(message);
    this.name = "KautionScopeError";
  }
}

export type KautionScopeResult =
  | { ok: true }
  | { ok: false; error: { code: "KA002"; message: string } };

/**
 * Throws `KautionScopeError` unless the current user may access the deposit of this tenant.
 * Next.js control-flow errors (redirect, notFound, ...) are rethrown unchanged.
 */
export async function assertKautionScope(supabase: SupabaseClient, tenantId: string): Promise<void> {
  const wohnungIds = await getAccessibleWohnungIds();

  // Unrestricted (all houses): nothing to restrict, the database still validates the tenant.
  if (wohnungIds === null) return;

  // Fail-closed: anything that is not a list of apartment IDs, an empty list, or a missing tenant ID denies.
  if (!Array.isArray(wohnungIds) || wohnungIds.length === 0) throw new KautionScopeError();
  if (typeof tenantId !== "string" || tenantId.trim() === "") throw new KautionScopeError();

  try {
    const { data, error } = await supabase
      .from("Mieter")
      .select("wohnung_id")
      .eq("id", tenantId)
      .single();

    // No apartment (applicant, unassigned tenant) is outside the scope of a restricted user.
    if (error || !data || !data.wohnung_id || !wohnungIds.includes(data.wohnung_id)) {
      throw new KautionScopeError();
    }
  } catch (error) {
    if (error instanceof KautionScopeError) throw error;
    unstable_rethrow(error);
    throw new KautionScopeError();
  }
}

/** Same check as `assertKautionScope`, but returns the denial instead of throwing it. */
export async function checkKautionScope(supabase: SupabaseClient, tenantId: string): Promise<KautionScopeResult> {
  try {
    await assertKautionScope(supabase, tenantId);
    return { ok: true };
  } catch (error) {
    if (error instanceof KautionScopeError) {
      return { ok: false, error: { code: error.code, message: error.message } };
    }
    throw error;
  }
}
