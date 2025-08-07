export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Home, Users, Wallet, FileSpreadsheet, CheckSquare } from "lucide-react"
import { TenantPaymentBento } from "@/components/tenant-payment-bento"
import { getDashboardSummary } from "@/lib/data-fetching"
import { RevenueExpensesChart } from "@/components/charts/revenue-expenses-chart"
import { OccupancyChart } from "@/components/charts/occupancy-chart"
import { MaintenanceDonutChart } from "@/components/charts/maintenance-donut-chart"
import { LastTransactionsContainer } from "@/components/last-transactions-container"

export default async function Dashboard() {
  // Fetch real data from database
  const summary = await getDashboardSummary();
  
  return (
    <div className="flex flex-col gap-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>
      <div className="grid gap-4 grid-cols-6 auto-rows-[140px] h-[calc(100vh-200px)]">
        {/* Row 1: Three wider summary cards (2/3 width - 4 columns total) + Tenant Payment List (1/3 width - 2 columns) */}
        <Link href="/haeuser" className="col-span-1 row-span-1">
          <Card className="h-full overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer border border-black/80">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Häuser</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.haeuserCount}</div>
              <p className="text-xs text-muted-foreground">Verwaltete Immobilien</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/wohnungen" className="col-span-2 row-span-1">
          <Card className="h-full overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer border border-black/80">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Wohnungen</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.wohnungenCount}</div>
              <p className="text-xs text-muted-foreground">Verwaltete Einheiten</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/mieter" className="col-span-1 row-span-1">
          <Card className="h-full overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer border border-black/80">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mieter</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.mieterCount}</div>
              <p className="text-xs text-muted-foreground">Aktive Mietverhältnisse</p>
            </CardContent>
          </Card>
        </Link>
        {/* Tenant Payment List (1/3 width - 2 columns) */}
        <div className="col-span-2 row-span-4">
          <TenantPaymentBento />
        </div>

        {/* Row 2: Belegung Chart (2/3 width - 4 columns) */}
        <div className="col-span-4 row-span-3">
          <OccupancyChart />
        </div>

        {/* Row 5: Revenue Chart (4 cols, 3 rows) + Vertically stacked summary cards (2 cols, 3 rows) */}
        <div className="col-span-4 row-span-3">
          <RevenueExpensesChart />
        </div>
        <div className="col-span-2 row-span-3">
          {/* Container for vertically stacked summary cards - 1/3 of page width */}
          <div className="h-full flex flex-col gap-4">
            <Link href="/todos" className="flex-1">
              <Card className="h-full overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer border border-black/80">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Aufgaben</CardTitle>
                  <CheckSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary.offeneAufgabenCount}</div>
                  <p className="text-xs text-muted-foreground">Offene Aufgaben</p>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/finanzen" className="flex-1">
              <Card className="h-full overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer border border-black/80">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Einnahmen</CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(summary.monatlicheEinnahmen)}</div>
                  <p className="text-xs text-muted-foreground">Monatliche Mieteinnahmen</p>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/betriebskosten" className="flex-1">
              <Card className="h-full overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer border border-black/80">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Betriebskosten</CardTitle>
                  <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(summary.jaehrlicheAusgaben)}</div>
                  <p className="text-xs text-muted-foreground">Jährliche Ausgaben</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Row 8: Last Transactions (left 50%) + Instandhaltung Chart (right 50%) */}
        <div className="col-span-3 row-span-3">
          <LastTransactionsContainer />
        </div>
        <div className="col-span-3 row-span-3">
          <MaintenanceDonutChart />
        </div>
      </div>
    </div>
  )
}
