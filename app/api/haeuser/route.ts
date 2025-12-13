export const runtime = 'edge';
import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { formatNumber } from "@/utils/format"

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { name, strasse, ort } = await request.json()
    if (!name || !strasse || !ort) {
      return NextResponse.json({ error: "Alle Felder (Name, Straße, Ort) sind erforderlich." }, { status: 400 })
    }
    const { data, error } = await supabase.from('Haeuser').insert({ name, strasse, ort })
    if (error) {
      console.error("Supabase Insert Error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    console.error("POST /api/haeuser error:", e)
    return NextResponse.json({ error: "Serverfehler beim Speichern des Hauses." }, { status: 500 })
  }
}

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: houses, error: housesError } = await supabase.from('Haeuser').select("*")
  
  if (housesError) {
    return NextResponse.json({ error: housesError.message }, { status: 500 })
  }
  
  // Get apartments with their related houses
  const { data: apartments, error: aptsError } = await supabase
    .from('Wohnungen')
    .select('id, name, groesse, miete, haus_id')
  
  if (aptsError) {
    return NextResponse.json({ error: aptsError.message }, { status: 500 })
  }
  
  // Get tenants to check apartment occupancy
  const { data: tenants, error: tenantsError } = await supabase
    .from('Mieter')
    .select('id, wohnung_id, auszug')
  
  if (tenantsError) {
    return NextResponse.json({ error: tenantsError.message }, { status: 500 })
  }

  // Calculate statistics for each house
  const enrichedHouses = houses.map(house => {
    // Filter apartments for this house
    const houseApartments = apartments.filter(apt => apt.haus_id === house.id)
    
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
        const tenant = tenants.find(t => t.wohnung_id === apt.id)
        
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
  
  return NextResponse.json(enrichedHouses, { status: 200 })
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Haus-ID ist erforderlich." }, { status: 400 })
    }

    const { error } = await supabase.from('Haeuser').delete().match({ id })

    if (error) {
      console.error("Supabase Delete Error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: "Haus erfolgreich gelöscht." }, { status: 200 })
  } catch (e) {
    console.error("DELETE /api/haeuser error:", e)
    return NextResponse.json({ error: "Serverfehler beim Löschen des Hauses." }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const { name, strasse, ort } = await request.json()

    if (!id) {
      return NextResponse.json({ error: "Haus-ID ist erforderlich." }, { status: 400 })
    }
    if (!name || !strasse || !ort) {
      return NextResponse.json({ error: "Alle Felder (Name, Straße, Ort) sind erforderlich." }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('Haeuser')
      .update({ name, strasse, ort })
      .match({ id })
      .select() // Select the updated row to return it

    if (error) {
      console.error("Supabase Update Error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
        return NextResponse.json({ error: "Haus nicht gefunden oder Update fehlgeschlagen." }, { status: 404 })
    }

    return NextResponse.json(data[0], { status: 200 })
  } catch (e) {
    console.error("PUT /api/haeuser error:", e)
    return NextResponse.json({ error: "Serverfehler beim Aktualisieren des Hauses." }, { status: 500 })
  }
}
