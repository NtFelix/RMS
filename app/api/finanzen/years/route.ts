import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { fetchAvailableFinanceYears } from "../../../../utils/financeCalculations";
import { NO_CACHE_HEADERS } from "@/lib/constants/http";
import { apiPermissionErrorResponse } from "@/lib/api-permission-response";

export async function GET() {
  try {
    // Delivers Finanzen, so it needs finanzen:ansehen: 403 PERMISSION_DENIED if the right is missing, 503
    // PERMISSION_CHECK_FAILED if the check itself failed (see the catch). Checked before anything is read.
    const { requireApiPermission } = await import("@/lib/api-permissions");
    await requireApiPermission('finanzen', 'ansehen');

    const { getAccessibleWohnungIds } = await import("@/lib/object-scope");
    const wohnungIds = await getAccessibleWohnungIds();

    if (wohnungIds !== null && wohnungIds.length === 0) {
      return NextResponse.json([], { status: 200, headers: NO_CACHE_HEADERS });
    }

    const supabase = await createSupabaseServerClient();

    if (wohnungIds !== null) {
      const { data, error } = await supabase
        .from('Finanzen')
        .select('datum')
        .in('wohnung_id', wohnungIds);
        
      if (error) {
        throw error;
      }
      
      const years = Array.from(new Set(data.map((item: any) => {
        return item.datum ? new Date(item.datum).getFullYear() : new Date().getFullYear();
      }))).sort((a, b) => b - a);
      return NextResponse.json(years, { status: 200, headers: NO_CACHE_HEADERS });
    }

    const years = await fetchAvailableFinanceYears(supabase);
    return NextResponse.json(years, { status: 200, headers: NO_CACHE_HEADERS });
  } catch (e) {
    unstable_rethrow(e);
    // 403 PERMISSION_DENIED (right missing) or 503 PERMISSION_CHECK_FAILED (the check itself failed)
    const permissionResponse = apiPermissionErrorResponse(e);
    if (permissionResponse) return permissionResponse;
    console.error('Server error GET /api/finanzen/years:', e);
    return NextResponse.json({ error: 'Serverfehler bei Jahren-Abfrage.' }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}