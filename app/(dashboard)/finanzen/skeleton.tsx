import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { SummaryCardPlaceholder } from "@/components/common/summary-card"
import { ArrowUpCircle, ArrowDownCircle, BarChart3, Wallet } from "lucide-react"

const CARD_CLASS = "bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem]"

// Used as the Suspense fallback of page.tsx and as loading.tsx. It mirrors the "Finanzen" tab of
// client-wrapper.tsx (the default one): tab toggle, the yearly and the filtered summary cards, the chart
// card and the transaction table. Titles, icons and descriptions of the summary cards are static, so they are
// shown as they are and only the numbers are held back; they count up once the data is there.
export function FinanzenSkeleton() {
  return (
    <div
      className="flex flex-col gap-6 sm:gap-8 p-4 sm:p-8"
      role="status"
      aria-busy="true"
      aria-label="Finanzen werden geladen"
    >
      {/* Tab Toggle Skeleton */}
      <div className="flex items-center gap-1 bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200/30 dark:border-zinc-800/30 p-1 rounded-full relative w-full sm:w-fit max-w-[400px]">
        <Skeleton className="h-9 w-28 rounded-full" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>

      {/* Summary Cards for the current year */}
      <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 md:grid-cols-4 sm:gap-4">
        <SummaryCardPlaceholder
          title="Ø Monatliche Einnahmen"
          description="Durchschnittliche monatliche Einnahmen"
          icon={<ArrowUpCircle className="size-4 text-green-500" />}
        />
        <SummaryCardPlaceholder
          title="Ø Monatliche Ausgaben"
          description="Durchschnittliche monatliche Ausgaben"
          icon={<ArrowDownCircle className="size-4 text-red-500" />}
        />
        <SummaryCardPlaceholder
          title="Ø Monatlicher Cashflow"
          description="Durchschnittlicher monatlicher Überschuss"
          icon={<Wallet className="size-4 text-muted-foreground" />}
        />
        <SummaryCardPlaceholder
          title="Jahresprognose"
          description="Geschätzter Jahresgewinn"
          icon={<BarChart3 className="size-4 text-muted-foreground" />}
        />
      </div>

      {/* Chart Skeleton */}
      <Card className={`${CARD_CLASS} p-6`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          {/* Chart type selector skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Skeleton className="h-9 w-20 rounded-full" />
            <Skeleton className="h-9 w-20 rounded-full" />
            <Skeleton className="h-9 w-20 rounded-full" />
            <Skeleton className="h-9 w-20 rounded-full" />
          </div>
          {/* Year selector skeleton */}
          <div className="mt-4 md:mt-0 flex items-center gap-2">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-9 w-16 rounded-lg" />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </Card>

      {/* Summary Cards for the active filters */}
      <div className="flex flex-col gap-3 sm:grid sm:grid-cols-3 sm:gap-4">
        <SummaryCardPlaceholder
          title="Gefilterte Einnahmen"
          description="Einnahmen basierend auf aktuellen Filtern"
          icon={<ArrowUpCircle className="size-4 text-green-500" />}
        />
        <SummaryCardPlaceholder
          title="Gefilterte Ausgaben"
          description="Ausgaben basierend auf aktuellen Filtern"
          icon={<ArrowDownCircle className="size-4 text-red-500" />}
        />
        <SummaryCardPlaceholder
          title="Aktueller Saldo"
          description="Gesamtsaldo aller Transaktionen"
          icon={<Wallet className="size-4 text-muted-foreground" />}
        />
      </div>

      {/* Transactions Table Skeleton */}
      <Card className={CARD_CLASS}>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Finanzverwaltung</CardTitle>
              <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
                Verwalten Sie hier alle Ihre Einnahmen und Ausgaben
              </p>
            </div>
            <div className="mt-0 sm:mt-1">
              <Skeleton className="h-10 w-full sm:w-52 rounded-full" />
            </div>
          </div>
        </CardHeader>
        <div className="px-4 sm:px-6">
          <div className="h-px bg-gray-200 dark:bg-gray-700 w-full"></div>
        </div>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 mt-4 sm:mt-6">
            {/* Filter controls */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 w-full">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-full" />
              ))}
            </div>
          </div>

          {/* Table rows */}
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
