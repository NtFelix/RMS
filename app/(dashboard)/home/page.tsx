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

export default async function Dashboard() {
  // Fetch real data from database
  const summary = await getDashboardSummary();
  
  return (
    <div className="flex flex-col gap-8 p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>
      <div className="grid gap-4 grid-cols-3 auto-rows-[minmax(140px,auto)] grid-flow-dense">
        <Link href="/haeuser" className="col-span-1 row-span-1">
          <Card className="overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer border border-black/80">
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
        <Link href="/wohnungen" className="col-span-1 row-span-1">
          <Card className="overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer border border-black/80">
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
        <div className="col-span-1 row-span-2">
          <TenantPaymentBento />
        </div>

        <div className="col-span-2 row-span-2">
          <OccupancyChart />
        </div>
        <Link href="/mieter" className="col-span-1 row-span-1">
          <Card className="overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer border border-black/80">
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

        <div className="col-span-2 row-span-4">
          <RevenueExpensesChart />
        </div>
        <Link href="/todos" className="col-span-1 row-span-1">
          <Card className="overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer border border-black/80">
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
        <div className="col-span-1 row-span-2">
          <MaintenanceDonutChart />
        </div>
        <Link href="/finanzen" className="col-span-1 row-span-1">
          <Card className="overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer border border-black/80">
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
        <Link href="/betriebskosten" className="col-span-1 row-span-1">
          <Card className="overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer border border-black/80">
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
  )
}
