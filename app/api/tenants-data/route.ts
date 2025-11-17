import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

interface Tenant {
  id: string
  wohnung_id: string | null
  name: string
  einzug: string | null
  auszug: string | null
  email: string | null
  telefonnummer: string | null
  notiz: string | null
  nebenkosten: any[] | null
  user_id: string
  Wohnungen?: {
    id: string
    name: string
    miete: number
    groesse: number
    haus_id: string | null
    Haeuser?: {
      id: string
      name: string
    }
  }
}

interface Finance {
  id: string
  wohnung_id: string | null
  name: string
  datum: string | null
  betrag: number
  ist_einnahmen: boolean
  notiz: string | null
  user_id: string
}

export async function GET() {
  try {
    const supabase = await createClient()

    // Fetch all tenants with their apartment and rent information
    const { data: tenants, error: tenantsError } = await supabase
      .from("Mieter")
      .select(`
        *,
        Wohnungen (
          id,
          name,
          miete,
          groesse,
          haus_id,
          Haeuser (
            id,
            name
          )
        )
      `)
      .order("name")

    if (tenantsError) {
      console.error("Error fetching tenants:", tenantsError)
      return NextResponse.json(
        { error: "Failed to fetch tenants" },
        { status: 500 }
      )
    }

    // Fetch all finance entries to get payment history
    const { data: finances, error: financesError } = await supabase
      .from("Finanzen")
      .select("*")
      .eq("ist_einnahmen", true)
      .order("datum", { ascending: false })

    if (financesError) {
      console.error("Error fetching finances:", financesError)
      return NextResponse.json(
        { error: "Failed to fetch finances" },
        { status: 500 }
      )
    }

    // Combine the data
    const tenantsWithPayments = tenants?.map((tenant: Tenant) => {
      const tenantFinances = finances?.filter((finance: Finance) => 
        finance.wohnung_id === tenant.wohnung_id
      ) || []

      return {
        ...tenant,
        payments: tenantFinances
      }
    }) || []

    return NextResponse.json({
      tenants: tenantsWithPayments,
      finances: finances || []
    })

  } catch (error) {
    console.error("Error in tenants-data API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
