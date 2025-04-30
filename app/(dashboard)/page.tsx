export const dynamic = 'force-dynamic';

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Home, Users, Wallet, FileSpreadsheet, CheckSquare } from "lucide-react"
import { DashboardCharts } from "@/components/dashboard-charts"
import { TenantDataTable } from "@/components/tenant-data-table"
import { getDashboardSummary } from "@/lib/data-fetching"

export default async function Dashboard() {
  // Fetch real data from database
  const summary = await getDashboardSummary();
  
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Willkommen in Ihrem Immobilienverwaltungs-Dashboard</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/haeuser">
          <Card className="overflow-hidden rounded-xl border-none shadow-md hover:shadow-lg transition-all cursor-pointer">
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
        <Link href="/wohnungen">
          <Card className="overflow-hidden rounded-xl border-none shadow-md hover:shadow-lg transition-all cursor-pointer">
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
        <Link href="/mieter">
          <Card className="overflow-hidden rounded-xl border-none shadow-md hover:shadow-lg transition-all cursor-pointer">
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
        <Link href="/finanzen">
          <Card className="overflow-hidden rounded-xl border-none shadow-md hover:shadow-lg transition-all cursor-pointer">
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
        <Link href="/betriebskosten">
          <Card className="overflow-hidden rounded-xl border-none shadow-md hover:shadow-lg transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Betriebskosten</CardTitle>
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(summary.monatlicheAusgaben)}</div>
              <p className="text-xs text-muted-foreground">Monatliche Ausgaben</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/todos">
          <Card className="overflow-hidden rounded-xl border-none shadow-md hover:shadow-lg transition-all cursor-pointer">
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
      </div>

      <DashboardCharts />

      <TenantDataTable />
    </div>
  )
}
