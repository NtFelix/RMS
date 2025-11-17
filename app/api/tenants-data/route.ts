import { createClient } from "@/utils/supabase/server"
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

    // Try optimized RPC first
    const rpcStartTime = Date.now()
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "fetch_tenant_payment_dashboard_data",
        { p_user_id: user.id }
      )

      const rpcDuration = Date.now() - rpcStartTime
      const totalDuration = Date.now() - requestStartTime

      if (!rpcError && rpcData) {
        logger.info("✅ [Tenant Data API] Used optimized RPC function", {
          path: request.url,
          userId: user.id,
          rpcDuration,
          totalDuration,
          tenantCount: rpcData.tenants?.length || 0,
          financeCount: rpcData.finances?.length || 0
        })
        return NextResponse.json(rpcData)
      }

      logger.warn("⚠️ [Tenant Data API] RPC function failed or returned no data, using fallback", {
        path: request.url,
        userId: user.id,
        rpcDuration,
        rpcError: rpcError?.message
      })
    } catch (rpcException) {
      const rpcDuration = Date.now() - rpcStartTime
      logger.error("❌ [Tenant Data API] RPC call threw exception", rpcException as Error, {
        path: request.url,
        userId: user.id,
        rpcDuration
      })
    }

    // Fallback to legacy queries
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

    const processingStartTime = Date.now()
    const tenantsWithPayments = tenants?.map((tenant: Tenant) => {
      const tenantFinances = finances?.filter((finance: Finance) =>
        finance.wohnung_id === tenant.wohnung_id
      ) || []

      return {
        ...tenant,
        payments: tenantFinances
      }
    }) || []
    const processingDuration = Date.now() - processingStartTime
    const totalDuration = Date.now() - requestStartTime

    logger.info("✅ [Tenant Data API] Served fallback data", {
      path: request.url,
      userId: user.id,
      tenantsDuration,
      financesDuration,
      processingDuration,
      totalDuration,
      tenantCount: tenantsWithPayments.length,
      financeCount: finances?.length || 0
    })

    return NextResponse.json({
      tenants: tenantsWithPayments,
      finances: finances || []
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
