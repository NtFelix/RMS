import type { Metadata } from 'next';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Prevent this private dashboard page from being indexed by search engines
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      noimageindex: true,
    },
  },
};

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Home, Users, Wallet, FileSpreadsheet, CheckSquare } from "lucide-react"
import { TenantPaymentBento } from "@/components/tenants/tenant-payment-bento"
import { getDashboardSummary, getNebenkostenChartData } from "@/lib/data-fetching"
import { LastTransactionsContainer } from "@/components/finance/last-transactions-container"
import {
  RevenueExpensesChart,
  OccupancyChart,
  MaintenanceDonutChart,
  NebenkostenChart
} from "@/components/dashboard/dashboard-charts-wrapper"

const currencyFormatter = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const formatCurrency = (amount: number) => currencyFormatter.format(amount);

export default async function Dashboard() {
  // Fetch real data from database
  const [summary, nebenkostenData] = await Promise.all([
    getDashboardSummary(),
    getNebenkostenChartData()
  ]);

  const { data: nebenkostenChartData, year: nebenkostenYear } = nebenkostenData;

  return (
    <div className="flex flex-col gap-8 p-8 bg-white dark:bg-[#181818]">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Dashboard</h1>
      </div>
      <div className="grid gap-4 grid-cols-1 auto-rows-auto md:grid-cols-6 md:auto-rows-[140px]">
        {/* Row 1: Three wider summary cards (2/3 width - 4 columns total) + Tenant Payment List (1/3 width - 2 columns) */}
        <Link href="/haeuser" className="col-span-1 row-span-1 md:col-span-1 md:row-span-1">
          <Card className="min-h-[120px] h-full overflow-hidden bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl hover:shadow-lg transition-all cursor-pointer flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
              <CardTitle className="text-sm font-medium">Häuser</CardTitle>
              <div className="p-2 bg-muted rounded-lg">
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center pt-0 pb-6">
              <div className="flex items-center gap-2">
                <div className="text-xl font-bold leading-none md:text-2xl">{summary.haeuserCount}</div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Verwaltete Immobilien</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/wohnungen" className="col-span-1 row-span-1 md:col-span-2 md:row-span-1">
          <Card className="min-h-[120px] h-full overflow-hidden bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl hover:shadow-lg transition-all cursor-pointer flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
              <CardTitle className="text-sm font-medium">Wohnungen</CardTitle>
              <div className="p-2 bg-muted rounded-lg">
                <Home className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center pt-0 pb-6">
              <div className="flex items-center gap-2">
                <div className="text-xl font-bold leading-none md:text-2xl">{summary.wohnungenCount}</div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Verwaltete Einheiten</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/mieter" className="col-span-1 row-span-1 md:col-span-1 md:row-span-1">
          <Card className="min-h-[120px] h-full overflow-hidden bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl hover:shadow-lg transition-all cursor-pointer flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
              <CardTitle className="text-sm font-medium">Mieter</CardTitle>
              <div className="p-2 bg-muted rounded-lg">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center pt-0 pb-6">
              <div className="flex items-center gap-2">
                <div className="text-xl font-bold leading-none md:text-2xl">{summary.mieterCount}</div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Aktive Mietverhältnisse</p>
            </CardContent>
          </Card>
        </Link>
        {/* Tenant Payment List (1/3 width - 2 columns) */}
        <div className="col-span-1 row-span-1 md:col-span-2 md:row-span-4">
          <div className="h-[300px] md:h-full overflow-hidden">
            <TenantPaymentBento />
          </div>
        </div>

        {/* Row 2: Belegung Chart (2/3 width - 4 columns) */}
        <div className="col-span-1 row-span-1 md:col-span-4 md:row-span-3">
          <div className="h-[300px] md:h-full overflow-hidden">
            <OccupancyChart />
          </div>
        </div>

        {/* Row 5: Revenue Chart (4 cols, 3 rows) + Vertically stacked summary cards (2 cols, 3 rows) */}
        <div className="col-span-1 row-span-1 md:col-span-4 md:row-span-3">
          <div className="h-[300px] md:h-full overflow-hidden">
            <RevenueExpensesChart />
          </div>
        </div>
        {/* Mobile: Individual cards, Desktop: Stacked container */}
        <Link href="/todos" className="col-span-1 row-span-1 md:hidden">
          <Card className="min-h-[120px] h-full overflow-hidden bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl hover:shadow-lg transition-all cursor-pointer flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
              <CardTitle className="text-sm font-medium">Aufgaben</CardTitle>
              <div className="p-2 bg-muted rounded-lg">
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between pt-0 pb-6">
              <div className="flex items-center gap-2 mt-1">
                <div className="text-xl font-bold leading-none">{summary.offeneAufgabenCount}</div>
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

        <Link href="/finanzen" className="col-span-1 row-span-1 md:hidden">
          <Card className="min-h-[120px] h-full overflow-hidden bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl hover:shadow-lg transition-all cursor-pointer flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
              <CardTitle className="text-sm font-medium">Einnahmen</CardTitle>
              <div className="p-2 bg-muted rounded-lg">
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between pt-0 pb-6">
              <div className="flex items-center gap-2 mt-1">
                <div className="text-lg font-bold leading-none">{formatCurrency(summary.monatlicheEinnahmen)}</div>
                <div className="px-2 py-1 bg-muted text-muted-foreground text-xs font-medium rounded-full">
                  /Monat
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Monatliche Mieteinnahmen</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/betriebskosten" className="col-span-1 row-span-1 md:hidden">
          <Card className="min-h-[120px] h-full overflow-hidden bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl hover:shadow-lg transition-all cursor-pointer flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
              <CardTitle className="text-sm font-medium">Betriebskosten</CardTitle>
              <div className="p-2 bg-muted rounded-lg">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between pt-0 pb-6">
              <div className="flex items-center gap-2 mt-1">
                <div className="text-lg font-bold leading-none">{formatCurrency(summary.jaehrlicheAusgaben)}</div>
                <div className="px-2 py-1 bg-muted text-muted-foreground text-xs font-medium rounded-full">
                  /Jahr
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Jährliche Ausgaben</p>
            </CardContent>
          </Card>
        </Link>

        {/* Desktop: Stacked container (hidden on mobile) */}
        <div className="hidden md:block md:col-span-2 md:row-span-3">
          <div className="h-full flex flex-col gap-4">
            <Link href="/todos" className="flex-1">
              <Card className="h-full overflow-hidden bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl hover:shadow-lg transition-all cursor-pointer flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
                  <CardTitle className="text-sm font-medium">Aufgaben</CardTitle>
                  <div className="p-2 bg-muted rounded-lg">
                    <CheckSquare className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between pt-0 pb-6">
                  <div className="flex items-center gap-2 mt-1">
                    <div className="text-2xl font-bold leading-none">{summary.offeneAufgabenCount}</div>
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

            <Link href="/finanzen" className="flex-1">
              <Card className="h-full overflow-hidden bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl hover:shadow-lg transition-all cursor-pointer flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
                  <CardTitle className="text-sm font-medium">Einnahmen</CardTitle>
                  <div className="p-2 bg-muted rounded-lg">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between pt-0 pb-6">
                  <div className="flex items-center gap-2 mt-1">
                    <div className="text-2xl font-bold leading-none">{formatCurrency(summary.monatlicheEinnahmen)}</div>
                    <div className="px-2 py-1 bg-muted text-muted-foreground text-xs font-medium rounded-full">
                      /Monat
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Monatliche Mieteinnahmen</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/betriebskosten" className="flex-1">
              <Card className="h-full overflow-hidden bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl hover:shadow-lg transition-all cursor-pointer flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
                  <CardTitle className="text-sm font-medium">Betriebskosten</CardTitle>
                  <div className="p-2 bg-muted rounded-lg">
                    <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between pt-0 pb-6">
                  <div className="flex items-center gap-2 mt-1">
                    <div className="text-2xl font-bold leading-none">{formatCurrency(summary.jaehrlicheAusgaben)}</div>
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

        {/* Row 8: Last Transactions (left 50%) + Nebenkosten Chart (right 50%) */}
        <div className="col-span-1 row-span-1 md:col-span-3 md:row-span-3">
          <div className="h-[300px] md:h-full overflow-hidden">
            <LastTransactionsContainer />
          </div>
        </div>
        <div className="col-span-1 row-span-1 md:col-span-3 md:row-span-3">
          <div className="h-[300px] md:h-full overflow-hidden">
            <NebenkostenChart nebenkostenData={nebenkostenChartData} year={nebenkostenYear} />
          </div>
        </div>
      </div>
    </div>
  )
}
