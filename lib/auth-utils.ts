import { createClient } from "@/utils/supabase/server";
import { type User, type SupabaseClient } from "@supabase/supabase-js";

export type AuthResult = {
  user: User;
  supabase: SupabaseClient;
};

/**
 * Ensures the user is authenticated in a server action.
 * Throws an error if not authenticated.
 */
export async function ensureAuth(): Promise<AuthResult> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error("Nicht authentifiziert. Bitte melden Sie sich an.");
  }
  
  return { user, supabase };
}

/**
 * Safer version that returns null instead of throwing.
 */
export async function getAuth() {
  try {
    return await ensureAuth();
  } catch (error) {
    return null;
  }
}
