import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { NO_CACHE_HEADERS } from "@/lib/constants/http"

export const runtime = 'edge';

interface CleanupResult {
  tenants: number
  apartments: number
  houses: number
}

export async function POST() {
  try {
    const supabase = await createClient()

    const result: CleanupResult = { tenants: 0, apartments: 0, houses: 0 }

    const deleteByPrefix = async (table: string, prefix: string): Promise<number> => {
      const { data, error } = await supabase
        .from(table)
        .delete()
        .ilike('name', `${prefix}%`)
        .select()

      if (error) {
        console.error(`[E2E Cleanup] Error deleting from ${table}:`, error)
        return 0
      }

      return data?.length || 0
    }

    // Delete in order: tenants → apartments → houses (respect FK constraints)
    result.tenants = await deleteByPrefix('Mieter', 'E2E')
    result.apartments = await deleteByPrefix('Wohnungen', 'E2E')
    result.houses = await deleteByPrefix('Haeuser', 'E2E')

    return NextResponse.json(result, { status: 200, headers: NO_CACHE_HEADERS })
  } catch (e) {
    console.error("[E2E Cleanup] Error:", e)
    return NextResponse.json(
      { error: "Serverfehler beim Bereinigen der E2E-Testdaten." },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}
