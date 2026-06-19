import { ensureAuth } from "@/lib/auth-utils";

/**
 * Returns the list of accessible house IDs for the current user.
 * - null: unrestricted access (no filtering should be applied)
 * - empty array []: no access to any houses
 * - filled array [uuid, ...]: access restricted to these specific houses
 */
export async function getAccessibleHaeuserIds(): Promise<string[] | null> {
  try {
    const { supabase } = await ensureAuth();
    const { data, error } = await supabase.rpc('get_accessible_haeuser_ids');
    if (error) {
      console.error("Error calling get_accessible_haeuser_ids RPC:", error);
      return []; // Fail-closed: deny access
    }
    return data;
  } catch (error) {
    console.error("Exception in getAccessibleHaeuserIds:", error);
    return []; // Fail-closed: deny access
  }
}

/**
 * Returns the list of accessible apartment (Wohnung) IDs for the current user.
 * - null: unrestricted access (no filtering should be applied)
 * - empty array []: no access to any apartments
 * - filled array [uuid, ...]: access restricted to these specific apartments
 */
export async function getAccessibleWohnungIds(): Promise<string[] | null> {
  const haeuserIds = await getAccessibleHaeuserIds();
  if (haeuserIds === null) {
    return null;
  }
  if (haeuserIds.length === 0) {
    return [];
  }
  
  try {
    const { supabase } = await ensureAuth();
    const { data, error } = await supabase
      .from('Wohnungen')
      .select('id')
      .in('haus_id', haeuserIds);
      
    if (error) {
      console.error("Error fetching scoped apartment IDs:", error);
      return []; // Fail-closed
    }
    
    return data ? data.map((w: { id: string }) => w.id) : [];
  } catch (error) {
    console.error("Exception in getAccessibleWohnungIds:", error);
    return []; // Fail-closed
  }
}

/**
 * Applies the house filter to a Supabase PostgREST query.
 * If ids is null (unrestricted), the query is returned unmodified.
 * Otherwise, filters the specified column to match only the provided ids.
 */
export function applyHaeuserScope<T>(query: T, column: string, ids: string[] | null): T {
  if (ids === null || ids.length === 0) return query;
  return (query as any).in(column, ids);
}
