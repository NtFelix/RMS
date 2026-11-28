import type { Metadata } from 'next';
import { requireAuthenticatedUser } from '@/lib/server/route-access';
import { privateNoindexMetadata } from '@/lib/seo';

// Prevent this private dashboard page from being indexed by search engines
export const metadata: Metadata = privateNoindexMetadata;

import { Building2, Home, Users, Wallet, FileSpreadsheet, CheckSquare } from "lucide-react"
import { TenantPaymentBento } from "@/components/tenants/tenant-payment-bento"
import { getDashboardSummary, getNebenkostenChartData } from "@/lib/data-fetching"
import { LastTransactionsContainer } from "@/components/finance/last-transactions-container"
import {
  RevenueExpensesChart,
  OccupancyChart,
  NebenkostenChart
} from "@/components/dashboard/dashboard-charts-wrapper"
import { DashboardNestedSummaryCard } from "@/components/dashboard/dashboard-nested-summary-card"

const currencyFormatter = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const formatCurrency = (amount: number) => currencyFormatter.format(amount);

import { Suspense } from "react"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"

export default function Dashboard() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}

async function DashboardContent() {
  // Ensure authentication first to avoid database errors during pre-fetching
  const { supabase } = await requireAuthenticatedUser();

  // Fetch real data from database
  const [summary, nebenkostenData] = await Promise.all([
    getDashboardSummary(supabase),
    getNebenkostenChartData(supabase)
  ]);

  const { data: nebenkostenChartData, year: nebenkostenYear } = nebenkostenData ?? { data: [], year: new Date().getFullYear() };

  if (!summary) {
    console.warn('[dashboard] Dashboard summary unavailable (both RPC and fallback failed).');
    return <div role="alert" className="flex flex-col gap-8 p-8 text-center text-muted-foreground">Dashboard-Daten konnten nicht geladen werden.</div>;
  }

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="grid gap-4 grid-cols-1 auto-rows-auto md:grid-cols-6 md:auto-rows-[140px]">
        {/* Row 1: Three wider summary cards (2/3 width - 4 columns total) + Tenant Payment List (1/3 width - 2 columns) */}
        <DashboardNestedSummaryCard
          href="/haeuser"
          title="Häuser"
          value={summary.haeuserCount}
          description="Verwaltete Immobilien"
          icon={<Building2 className="size-4" />}
          className="col-span-1 row-span-1 md:col-span-1 md:row-span-1"
        />

        <DashboardNestedSummaryCard
          href="/wohnungen"
          title="Wohnungen"
          value={summary.wohnungenCount}
          description="Verwaltete Einheiten"
          icon={<Home className="size-4" />}
          className="col-span-1 row-span-1 md:col-span-2 md:row-span-1"
        />

        <DashboardNestedSummaryCard
          href="/mieter"
          title="Mieter"
          value={summary.mieterCount}
          description="Aktive Mietverhältnisse"
          icon={<Users className="size-4" />}
          className="col-span-1 row-span-1 md:col-span-1 md:row-span-1"
        />

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
        <DashboardNestedSummaryCard
          href="/todos"
          title="Aufgaben"
          value={summary.offeneAufgabenCount}
          badge={summary.offeneAufgabenCount > 0 ? "Offen" : undefined}
          description="Offene Aufgaben"
          icon={<CheckSquare className="size-4" />}
          className="col-span-1 row-span-1 md:hidden"
        />

        <DashboardNestedSummaryCard
          href="/finanzen"
          title="Einnahmen"
          value={formatCurrency(summary.monatlicheEinnahmen)}
          badge="/Monat"
          description="Monatliche Mieteinnahmen"
          icon={<Wallet className="size-4" />}
          className="col-span-1 row-span-1 md:hidden"
        />

        <DashboardNestedSummaryCard
          href="/betriebskosten"
          title="Betriebskosten"
          value={formatCurrency(summary.jaehrlicheAusgaben)}
          badge="/Jahr"
          description="Jährliche Ausgaben"
          icon={<FileSpreadsheet className="size-4" />}
          className="col-span-1 row-span-1 md:hidden"
        />

        {/* Desktop: Stacked container (hidden on mobile) */}
        <div className="hidden md:block md:col-span-2 md:row-span-3">
          <div className="h-full flex flex-col gap-4">
            <DashboardNestedSummaryCard
              href="/todos"
              title="Aufgaben"
              value={summary.offeneAufgabenCount}
              badge={summary.offeneAufgabenCount > 0 ? "Offen" : undefined}
              description="Offene Aufgaben"
              icon={<CheckSquare className="size-4" />}
              className="flex-1"
            />

            <DashboardNestedSummaryCard
              href="/finanzen"
              title="Einnahmen"
              value={formatCurrency(summary.monatlicheEinnahmen)}
              badge="/Monat"
              description="Monatliche Mieteinnahmen"
              icon={<Wallet className="size-4" />}
              className="flex-1"
            />

            <DashboardNestedSummaryCard
              href="/betriebskosten"
              title="Betriebskosten"
              value={formatCurrency(summary.jaehrlicheAusgaben)}
              badge="/Jahr"
              description="Jährliche Ausgaben"
              icon={<FileSpreadsheet className="size-4" />}
              className="flex-1"
            />
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
