"use server";

import { createClient } from "@/utils/supabase/server";

export type AcceptEinladungResult =
  | { success: true }
  | { success: false; error: string; code?: "not_authenticated" | "email_mismatch" | "expired" | "not_found" | "already_used" | "unknown" };

/**
 * Server Action: accepts an invitation by token.
 *
 * Requirements:
 * - The calling user must be authenticated.
 * - The authenticated user's email must match the invitation's email.
 * - The invitation must be open and not expired.
 */
export async function acceptEinladungAction(token: string): Promise<AcceptEinladungResult> {
  if (!token || typeof token !== "string" || token.trim().length === 0) {
    return { success: false, error: "Ungültiger Einladungslink.", code: "not_found" };
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Du musst angemeldet sein, um eine Einladung anzunehmen.", code: "not_authenticated" };
  }

  const { error } = await supabase.rpc("accept_einladung", {
    p_token: token.trim(),
  });

  if (error) {
    console.error("[acceptEinladungAction] RPC error:", error);

    // Map well-known Postgres exception messages to structured codes
    const msg = error.message ?? "";
    if (msg.includes("email does not match")) {
      return { success: false, error: "Die Einladung ist nicht für deine E-Mail-Adresse.", code: "email_mismatch" };
    }
    if (msg.includes("expired")) {
      return { success: false, error: "Diese Einladung ist abgelaufen.", code: "expired" };
    }
    if (msg.includes("not open") || msg.includes("not found") || msg.includes("Invitation")) {
      return { success: false, error: "Die Einladung konnte nicht gefunden werden oder wurde bereits verwendet.", code: "not_found" };
    }
    return { success: false, error: "Die Einladung konnte nicht angenommen werden.", code: "unknown" };
  }

  return { success: true };
}
