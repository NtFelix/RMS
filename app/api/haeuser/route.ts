export const runtime = 'edge';
import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { formatNumber } from "@/utils/format"
import { NO_CACHE_HEADERS } from "@/lib/constants/http"

export async function POST(request: Request) {
  try {
    const { requireApiPermission } = await import("@/lib/api-permissions")
    await requireApiPermission('haeuser', 'erstellen')

    const supabase = await createClient()
    const { name, strasse, ort } = await request.json()
    if (!name || !strasse || !ort) {
      return NextResponse.json({ error: "Alle Felder (Name, Straße, Ort) sind erforderlich." }, { 
        status: 400,
        headers: NO_CACHE_HEADERS
      })
    }
    const { data, error } = await supabase.from('Haeuser').insert({ name, strasse, ort })
    if (error) {
      console.error("Supabase Insert Error:", error)
      return NextResponse.json({ error: error.message }, { 
        status: 500,
        headers: NO_CACHE_HEADERS
      })
    }
    return NextResponse.json(data, { 
      status: 201,
      headers: NO_CACHE_HEADERS
    })
  } catch (e) {
    console.error("POST /api/haeuser error:", e)
    const status = (e as Error).message === 'Permission denied' ? 403 : 500
    return NextResponse.json({ error: (e as Error).message || "Serverfehler beim Speichern des Hauses." }, { 
      status,
      headers: NO_CACHE_HEADERS
    })
  }
}

export async function GET() {
  const supabase = await createClient()
  const { getAccessibleHaeuserIds } = await import("@/lib/object-scope")

  // Apply object scope filtering
  const accessibleIds = await getAccessibleHaeuserIds()
  let q = supabase.from('Haeuser').select("*")
  if (accessibleIds !== null) {
    q = q.in('id', accessibleIds)
  }
  const { data: houses, error: housesError } = await q
  
  if (housesError) {
    return NextResponse.json({ error: housesError.message }, { 
      status: 500,
      headers: NO_CACHE_HEADERS
    })
  }
  
  // Get apartments with their related houses
  let aptsQuery = supabase
    .from('Wohnungen')
    .select('id, name, groesse, miete, haus_id')
  if (accessibleIds !== null) {
    aptsQuery = aptsQuery.in('haus_id', accessibleIds)
  }
  const { data: apartments, error: aptsError } = await aptsQuery
  
  if (aptsError) {
    return NextResponse.json({ error: aptsError.message }, { 
      status: 500,
      headers: NO_CACHE_HEADERS
    })
  }
  
  // Get tenants to check apartment occupancy
  let tenantsQuery = supabase
    .from('Mieter')
    .select('id, wohnung_id, auszug')
  if (accessibleIds !== null && apartments) {
    const accessibleWohnungIds = apartments.map((a: any) => a.id)
    tenantsQuery = tenantsQuery.in('wohnung_id', accessibleWohnungIds)
  }
  const { data: tenants, error: tenantsError } = await tenantsQuery
  
  if (tenantsError) {
    return NextResponse.json({ error: tenantsError.message }, { 
      status: 500,
      headers: NO_CACHE_HEADERS
    })
  }

  // Calculate statistics for each house
  const enrichedHouses = houses.map(house => {
    // Filter apartments for this house
    const houseApartments = (apartments || []).filter(apt => apt.haus_id === house.id)
    
    // Calculate stats if there are apartments
    if (houseApartments.length > 0) {
      // Calculate total rent and size
      const totalRent = houseApartments.reduce((sum, apt) => sum + (apt.miete || 0), 0)
      const totalSize = houseApartments.reduce((sum, apt) => sum + (apt.groesse || 0), 0)
      
      // Calculate price per sqm (average across all apartments)
      const pricePerSqm = totalSize > 0 ? (totalRent / totalSize) : 0
      
      // Count free apartments (those without a tenant or with a tenant who has moved out)
      const today = new Date()
      const freeApartments = houseApartments.filter(apt => {
        // Find tenant for this apartment
        const tenant = (tenants || []).find(t => t.wohnung_id === apt.id)
        
        // Apartment is free if:
        // 1. No tenant is assigned, or
        // 2. Tenant has a move-out date in the past
        return !tenant || (tenant.auszug && new Date(tenant.auszug) <= today)
      }).length
      
      return {
        ...house,
        rent: formatNumber(totalRent),
        size: formatNumber(totalSize),
        pricePerSqm: formatNumber(pricePerSqm),
        totalApartments: houseApartments.length,
        freeApartments: freeApartments
      }
    }
    
    // Return house without stats if no apartments
    return house
  })
  
  return NextResponse.json(enrichedHouses, { 
    status: 200,
    headers: NO_CACHE_HEADERS
  })
}

export async function DELETE(request: Request) {
  try {
    const { requireApiPermission, verifyEntityInScope } = await import("@/lib/api-permissions")
    await requireApiPermission('haeuser', 'loeschen')

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Haus-ID ist erforderlich." }, { 
        status: 400,
        headers: NO_CACHE_HEADERS
      })
    }

    if (!(await verifyEntityInScope(id))) {
      return NextResponse.json({ error: "Permission denied" }, { 
        status: 403,
        headers: NO_CACHE_HEADERS
      })
    }

    const { error } = await supabase.rpc('soft_delete_record', {
      p_table_name: 'Haeuser',
      p_record_id: id,
    })

    if (error) {
      console.error("Supabase Delete Error:", error)
      return NextResponse.json({ error: error.message }, { 
        status: 500,
        headers: NO_CACHE_HEADERS
      })
    }

    return NextResponse.json({ message: "Haus erfolgreich gelöscht." }, { 
      status: 200,
      headers: NO_CACHE_HEADERS
    })
  } catch (e) {
    console.error("DELETE /api/haeuser error:", e)
    const status = (e as Error).message === 'Permission denied' ? 403 : 500
    return NextResponse.json({ error: (e as Error).message || "Serverfehler beim Löschen des Hauses." }, { 
      status,
      headers: NO_CACHE_HEADERS
    })
  }
}

export async function PUT(request: Request) {
  try {
    const { requireApiPermission, verifyEntityInScope } = await import("@/lib/api-permissions")
    await requireApiPermission('haeuser', 'bearbeiten')

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const { name, strasse, ort } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "Haus-ID ist erforderlich." }, { 
        status: 400,
        headers: NO_CACHE_HEADERS
      })
    }
    if (!name || !strasse || !ort) {
      return NextResponse.json({ error: "Alle Felder (Name, Straße, Ort) sind erforderlich." }, { 
        status: 400,
        headers: NO_CACHE_HEADERS
      })
    }

    if (!(await verifyEntityInScope(id))) {
      return NextResponse.json({ error: "Permission denied" }, { 
        status: 403,
        headers: NO_CACHE_HEADERS
      })
    }

    const { data, error } = await supabase
      .from('Haeuser')
      .update({ name, strasse, ort })
      .match({ id })
      .select() // Select the updated row to return it

    if (error) {
      console.error("Supabase Update Error:", error)
      return NextResponse.json({ error: error.message }, { 
        status: 500,
        headers: NO_CACHE_HEADERS
      })
    }

    if (!data || data.length === 0) {
        return NextResponse.json({ error: "Haus nicht gefunden oder Update fehlgeschlagen." }, { 
          status: 404,
          headers: NO_CACHE_HEADERS
        })
    }

    return NextResponse.json(data[0], { 
      status: 200,
      headers: NO_CACHE_HEADERS
    })
  } catch (e) {
    console.error("PUT /api/haeuser error:", e)
    const status = (e as Error).message === 'Permission denied' ? 403 : 500
    return NextResponse.json({ error: (e as Error).message || "Serverfehler beim Aktualisieren des Hauses." }, { 
      status,
      headers: NO_CACHE_HEADERS
    })
  }
}
