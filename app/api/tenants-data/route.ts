import { createClient } from "@/utils/supabase/server"
export const runtime = 'edge'

import { NextResponse } from "next/server"
import { logger } from "@/utils/logger"
import { calculateMissedPayments } from "@/utils/tenant-payment-calculations"
import { PAYMENT_KEYWORDS } from "@/utils/constants"

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

    // Group finances by wohnung_id for O(1) lookup
    const financesByWohnungId = new Map<string, Finance[]>();
    for (const finance of financesData) {
      if (finance.wohnung_id) {
        const group = financesByWohnungId.get(finance.wohnung_id) || [];
        group.push(finance);
        financesByWohnungId.set(finance.wohnung_id, group);
      }
    }

    // Calculate current month range for payment status
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth() + 1
    const currentYear = currentDate.getFullYear()
    const currentMonthStart = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0]
    const currentMonthEnd = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]

    const processedTenants = tenantsData.map(tenant => {
      const tenantId = tenant.wohnung_id || tenant.Wohnungen?.id;
      const tenantFinances = tenantId ? (financesByWohnungId.get(tenantId) || []) : [];

      // Pass the specific tenant finances to the calculation function
      const missedPayments = calculateMissedPayments(tenant, tenantFinances)

      // Calculate current month payments
      const currentMonthFinances = tenantFinances.filter((f: Finance) =>
        f.datum && f.datum >= currentMonthStart && f.datum <= currentMonthEnd
      )

      const actualRent = currentMonthFinances
        .filter((f: Finance) => f.name?.toLowerCase().includes(PAYMENT_KEYWORDS.RENT))
        .reduce((sum: number, f: Finance) => sum + (f.betrag || 0), 0)

      const actualNebenkosten = currentMonthFinances
        .filter((f: Finance) => f.name?.toLowerCase().includes(PAYMENT_KEYWORDS.NEBENKOSTEN))
        .reduce((sum: number, f: Finance) => sum + (f.betrag || 0), 0)

      // Determine paid status (if any rent or nebenkosten paid this month)
      const paid = actualRent > 0 || actualNebenkosten > 0

      return {
        ...tenant,
        // We don't send the full payments history to client anymore to save bandwidth
        missedPayments,
        actualRent,
        actualNebenkosten,
        paid
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
      // financeCount: financesData.length // financeData is not sent anymore
    })

    return NextResponse.json({
      tenants: processedTenants,
      // finances: financesData // Removed to reduce payload size
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
