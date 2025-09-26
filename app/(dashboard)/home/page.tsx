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
    <div className="flex flex-col gap-4 md:gap-8 p-4 md:p-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>
      <div className="dashboard-grid-mobile grid gap-4 grid-cols-1 md:grid-cols-6 md:auto-rows-[140px] md:h-[calc(100vh-200px)]">
        {/* Row 1: Summary cards - mobile: stacked, desktop: grid layout */}
        <Link href="/haeuser" className="col-span-1 md:col-span-1 md:row-span-1 touch-target">
          <Card className="dashboard-card-mobile h-full overflow-hidden rounded-2xl shadow-md hover-desktop transition-all cursor-pointer summary-card flex flex-col touch-feedback focus-mobile">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 flex-shrink-0">
              <CardTitle className="text-sm font-medium">Häuser</CardTitle>
              <div className="p-2 bg-muted rounded-lg">
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center pt-0">
              <div className="text-xl md:text-2xl font-bold leading-none">{summary.haeuserCount}</div>
              <p className="text-xs text-muted-foreground mt-2">Verwaltete Immobilien</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/wohnungen" className="col-span-1 md:col-span-2 md:row-span-1 touch-target">
          <Card className="dashboard-card-mobile h-full overflow-hidden rounded-2xl shadow-md hover-desktop transition-all cursor-pointer summary-card flex flex-col touch-feedback focus-mobile">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 flex-shrink-0">
              <CardTitle className="text-sm font-medium">Wohnungen</CardTitle>
              <div className="p-2 bg-muted rounded-lg">
                <Home className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center pt-0">
              <div className="text-xl md:text-2xl font-bold leading-none">{summary.wohnungenCount}</div>
              <p className="text-xs text-muted-foreground mt-2">Verwaltete Einheiten</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/mieter" className="col-span-1 md:col-span-1 md:row-span-1 touch-target">
          <Card className="dashboard-card-mobile h-full overflow-hidden rounded-2xl shadow-md hover-desktop transition-all cursor-pointer summary-card flex flex-col touch-feedback focus-mobile">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 flex-shrink-0">
              <CardTitle className="text-sm font-medium">Mieter</CardTitle>
              <div className="p-2 bg-muted rounded-lg">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center pt-0">
              <div className="text-xl md:text-2xl font-bold leading-none">{summary.mieterCount}</div>
              <p className="text-xs text-muted-foreground mt-2">Aktive Mietverhältnisse</p>
            </CardContent>
          </Card>
        </Link>
        {/* Tenant Payment List - mobile: full width, desktop: 2 columns */}
        <div className="col-span-1 md:col-span-2 md:row-span-4">
          <div className="chart-container-mobile">
            <TenantPaymentBento />
          </div>
        </div>

        {/* Occupancy Chart - mobile: full width, desktop: 4 columns */}
        <div className="col-span-1 md:col-span-4 md:row-span-3">
          <div className="chart-container-mobile">
            <OccupancyChart />
          </div>
        </div>

        {/* Revenue Chart - mobile: full width, desktop: 4 columns */}
        <div className="col-span-1 md:col-span-4 md:row-span-3">
          <div className="chart-container-mobile">
            <RevenueExpensesChart />
          </div>
        </div>
        {/* Summary cards container - mobile: individual cards, desktop: stacked */}
        <div className="col-span-1 md:col-span-2 md:row-span-3">
          {/* Container for vertically stacked summary cards - mobile: individual, desktop: stacked */}
          <div className="h-full flex flex-col gap-4">
            <Link href="/todos" className="flex-1 touch-target">
              <Card className="dashboard-card-mobile h-full overflow-hidden rounded-2xl shadow-md hover-desktop transition-all cursor-pointer summary-card flex flex-col touch-feedback focus-mobile">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
                  <CardTitle className="text-sm font-medium">Aufgaben</CardTitle>
                  <div className="p-2 bg-muted rounded-lg">
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between pt-0 pb-6">
                  <div className="flex items-center gap-2 mt-1">
                    <div className="text-xl md:text-2xl font-bold leading-none">{summary.offeneAufgabenCount}</div>
                    {summary.offeneAufgabenCount > 0 && (
                      <div className="px-2 py-1 bg-muted text-muted-foreground text-xs font-medium rounded-full">
                        Offen
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Offene Aufgaben</p>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/finanzen" className="flex-1 touch-target">
              <Card className="dashboard-card-mobile h-full overflow-hidden rounded-2xl shadow-md hover-desktop transition-all cursor-pointer summary-card flex flex-col touch-feedback focus-mobile">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
                  <CardTitle className="text-sm font-medium">Einnahmen</CardTitle>
                  <div className="p-2 bg-muted rounded-lg">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between pt-0 pb-6">
                  <div className="flex items-center gap-2 mt-1">
                    <div className="text-lg md:text-2xl font-bold leading-none">{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(summary.monatlicheEinnahmen)}</div>
                    <div className="px-2 py-1 bg-muted text-muted-foreground text-xs font-medium rounded-full">
                      /Monat
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Monatliche Mieteinnahmen</p>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/betriebskosten" className="flex-1 touch-target">
              <Card className="dashboard-card-mobile h-full overflow-hidden rounded-2xl shadow-md hover-desktop transition-all cursor-pointer summary-card flex flex-col touch-feedback focus-mobile">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
                  <CardTitle className="text-sm font-medium">Betriebskosten</CardTitle>
                  <div className="p-2 bg-muted rounded-lg">
                    <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between pt-0 pb-6">
                  <div className="flex items-center gap-2 mt-1">
                    <div className="text-lg md:text-2xl font-bold leading-none">{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(summary.jaehrlicheAusgaben)}</div>
                    <div className="px-2 py-1 bg-muted text-muted-foreground text-xs font-medium rounded-full">
                      /Jahr
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Jährliche Ausgaben</p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Bottom row: Last Transactions and Maintenance Chart - mobile: stacked, desktop: side by side */}
        <div className="col-span-1 md:col-span-3 md:row-span-3">
          <div className="chart-container-mobile">
            <LastTransactionsContainer />
          </div>
        </div>
        <div className="col-span-1 md:col-span-3 md:row-span-3">
          <div className="chart-container-mobile">
            <MaintenanceDonutChart />
          </div>
        </div>
      </div>
    </div>
  )
}
