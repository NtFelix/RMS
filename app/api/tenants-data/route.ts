import { createClient } from "@/utils/supabase/server"
export const runtime = 'edge'

import { NextResponse } from "next/server"
import { logger } from "@/utils/logger"

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

// Helper function to get latest Nebenkosten amount (ported from client)
const getLatestNebenkostenAmount = (entries?: any[] | null): number => {
  if (!Array.isArray(entries)) return 0

  const parsedEntries = entries
    .map(entry => {
      const amount = typeof entry.amount === 'number' ? entry.amount : Number(entry.amount)
      const dateValue = entry.date ? new Date(entry.date) : null
      return {
        amount: !Number.isNaN(amount) ? amount : 0,
        dateValue,
      }
    })
    .filter(entry => entry.amount > 0)

  if (!parsedEntries.length) return 0

  parsedEntries.sort((a, b) => {
    if (!a.dateValue && !b.dateValue) return 0
    if (!a.dateValue) return 1
    if (!b.dateValue) return -1
    return b.dateValue.getTime() - a.dateValue.getTime()
  })

  return parsedEntries[0]?.amount ?? 0
}

// Helper function to calculate missed payments (ported from client)
const calculateMissedPayments = (tenant: any, finances: any[]) => {
  const mieteRaw = Number(tenant.Wohnungen?.miete) || 0
  const nebenkostenRaw = getLatestNebenkostenAmount(tenant.nebenkosten)

  // Filter finances for this tenant's apartment
  const tenantFinances = finances.filter((finance: any) =>
    finance.wohnung_id === (tenant.wohnung_id || tenant.Wohnungen?.id)
  )

  // Calculate missed payments history
  const moveInDate = new Date(tenant.einzug || new Date().toISOString())
  const currentDate = new Date()

  let missedRentMonths = 0
  let missedNebenkostenMonths = 0
  let totalMissedAmount = 0

  // Check each month from move-in to current
  for (let year = moveInDate.getFullYear(); year <= currentDate.getFullYear(); year++) {
    const startMonth = (year === moveInDate.getFullYear()) ? moveInDate.getMonth() : 0
    const endMonth = (year === currentDate.getFullYear()) ? currentDate.getMonth() : 11

    for (let month = startMonth; month <= endMonth; month++) {
      const monthStart = new Date(year, month, 1).toISOString().split('T')[0]
      const monthEnd = new Date(year, month + 1, 0).toISOString().split('T')[0]

      // Check rent payments for this month
      const rentPaid = tenantFinances
        .filter((f: any) =>
          f.datum >= monthStart &&
          f.datum <= monthEnd &&
          f.name?.toLowerCase().includes('mietzahlung')
        )
        .reduce((sum: number, f: any) => sum + (Number(f.betrag) || 0), 0)

      if (rentPaid < mieteRaw) {
        missedRentMonths++
        totalMissedAmount += (mieteRaw - rentPaid)
      }

      // Check nebenkosten payments if applicable
      if (nebenkostenRaw > 0) {
        const nebenkostenPaid = tenantFinances
          .filter((f: any) =>
            f.datum >= monthStart &&
            f.datum <= monthEnd &&
            f.name?.toLowerCase().includes('nebenkosten')
          )
          .reduce((sum: number, f: any) => sum + (Number(f.betrag) || 0), 0)

        if (nebenkostenPaid < nebenkostenRaw) {
          missedNebenkostenMonths++
          totalMissedAmount += (nebenkostenRaw - nebenkostenPaid)
        }
      }
    }
  }

  return {
    rentMonths: missedRentMonths,
    nebenkostenMonths: missedNebenkostenMonths,
    totalAmount: totalMissedAmount
  }
}

export async function GET(request: Request) {
  const requestStartTime = Date.now()
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()

    if (userError || !user) {
      logger.warn("Tenant data API: unauthorized access attempt", {
        path: request.url,
        error: userError?.message,
        duration: Date.now() - requestStartTime
      })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let tenantsData: any[] = []
    let financesData: any[] = []
    let usedRpc = false

    // Try optimized RPC first
    const rpcStartTime = Date.now()
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "fetch_tenant_payment_dashboard_data",
        { p_user_id: user.id }
      )

      const rpcDuration = Date.now() - rpcStartTime

      if (!rpcError && rpcData) {
        logger.info("✅ [Tenant Data API] Used optimized RPC function", {
          path: request.url,
          userId: user.id,
          rpcDuration,
          tenantCount: rpcData.tenants?.length || 0,
          financeCount: rpcData.finances?.length || 0
        })
        tenantsData = rpcData.tenants || []
        financesData = rpcData.finances || []
        usedRpc = true
      } else {
        logger.warn("⚠️ [Tenant Data API] RPC function failed or returned no data, using fallback", {
          path: request.url,
          userId: user.id,
          rpcDuration,
          rpcError: rpcError?.message
        })
      }
    } catch (rpcException) {
      const rpcDuration = Date.now() - rpcStartTime
      logger.error("❌ [Tenant Data API] RPC call threw exception", rpcException as Error, {
        path: request.url,
        userId: user.id,
        rpcDuration
      })
    }

    // Fallback to legacy queries if RPC failed
    if (!usedRpc) {
      logger.info("🔄 [Tenant Data API] Using fallback method", {
        path: request.url,
        userId: user.id
      })

      const fallbackStartTime = Date.now()
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
        .eq("user_id", user.id)
        .order("name")

      const tenantsDuration = Date.now() - fallbackStartTime

      if (tenantsError) {
        logger.error("❌ [Tenant Data API] Fallback tenant query failed", tenantsError, {
          path: request.url,
          userId: user.id,
          tenantsDuration
        })
        return NextResponse.json(
          { error: "Failed to fetch tenants" },
          { status: 500 }
        )
      }

      const financesStartTime = Date.now()
      const { data: finances, error: financesError } = await supabase
        .from("Finanzen")
        .select("*")
        .eq("user_id", user.id)
        .eq("ist_einnahmen", true)
        .order("datum", { ascending: false })

      const financesDuration = Date.now() - financesStartTime

      if (financesError) {
        logger.error("❌ [Tenant Data API] Fallback finance query failed", financesError, {
          path: request.url,
          userId: user.id,
          financesDuration
        })
        return NextResponse.json(
          { error: "Failed to fetch finances" },
          { status: 500 }
        )
      }

      tenantsData = tenants || []
      financesData = finances || []
    }

    // Process tenants to add missed payments calculation
    // This logic is moved from the client to server to improve performance
    const processingStartTime = Date.now()

    const processedTenants = tenantsData.map(tenant => {
      const missedPayments = calculateMissedPayments(tenant, financesData)

      // Also attach payments for this tenant as the client might expect it or it's useful
      // The original fallback logic did this, so we preserve it
      const tenantFinances = financesData.filter((finance: Finance) =>
        finance.wohnung_id === (tenant.wohnung_id || tenant.Wohnungen?.id)
      )

      return {
        ...tenant,
        payments: tenantFinances,
        missedPayments
      }
    })

    const processingDuration = Date.now() - processingStartTime
    const totalDuration = Date.now() - requestStartTime

    logger.info("✅ [Tenant Data API] Served data with calculated missed payments", {
      path: request.url,
      userId: user.id,
      processingDuration,
      totalDuration,
      tenantCount: processedTenants.length,
      financeCount: financesData.length
    })

    return NextResponse.json({
      tenants: processedTenants,
      finances: financesData
    })
  } catch (error) {
    const totalDuration = Date.now() - requestStartTime
    logger.error("❌ [Tenant Data API] Unexpected error", error as Error, {
      path: request.url,
      totalDuration
    })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
