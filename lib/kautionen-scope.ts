/**
 * Object scope check for the deposit management ("Kautionsmanagement", GH-6).
 *
 * Employees can be restricted to certain houses (`objekte.haeuser`). A deposit belongs to a tenant
 * row (`Mieter`), the tenant to an apartment (`Wohnung`), the apartment to a house. The decision is made by
 * the database function `kautionen_pruefe_objektzugriff(p_mieter_id)` (the same helper the deposit RPCs use),
 * so there is one source of truth and no list of apartment IDs has to be loaded (PostgREST truncates lists at
 * `max_rows`, which would wrongly deny users with a large scope).
 *
 * The check is fail-closed: it passes only if the RPC returns without an error. A missing/invalid tenant ID, a
 * denial (`KA002`), a missing module right (`42501`), a network error or any other failure all deny access.
 * The reason for a denial is deliberately not distinguishable, so the check does not reveal whether an object exists.
 *
 * This is an early rejection for actions where the tenant IS the object (create, details). Actions that only
 * get a deposit or booking ID rely on the RPCs themselves, which check the scope the same way.
 * Security-relevant code: not production ready until it has been reviewed by the maintainer.
 *
 * `assertKautionScope` throws (a caller that forgets to handle the result cannot continue by accident).
 * `checkKautionScope` is the non-throwing variant for actions that return `{ success: false, error }`.
 * Not a "use server" file.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_rethrow } from "next/navigation";
import { mapKautionError } from "@/lib/kautionen-errors";

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
 * Throws `KautionScopeError` unless the current user may access the deposit of this tenant
 * (`kautionen_pruefe_objektzugriff`). Next.js control-flow errors (redirect, notFound, ...) are rethrown unchanged.
 */
export async function assertKautionScope(supabase: SupabaseClient, tenantId: string): Promise<void> {
  if (typeof tenantId !== "string" || tenantId.trim() === "") throw new KautionScopeError();

  try {
    const { error } = await supabase.rpc("kautionen_pruefe_objektzugriff", { p_mieter_id: tenantId });
    // Allowed or unrestricted: the function returns without an error. Everything else denies (fail-closed).
    if (error) throw new KautionScopeError();
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
