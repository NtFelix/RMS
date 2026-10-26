import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PillToggleSkeleton } from "@/components/skeletons/pill-toggle-skeleton"
import { SummaryCardPlaceholder } from "@/components/common/summary-card"
import { FILTERED_SUMMARY_CARDS, YEARLY_SUMMARY_CARDS } from "./summary-cards"

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
      <PillToggleSkeleton count={2} tabWidth="w-28" />

      {/* Summary Cards for the current year */}
      <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 md:grid-cols-4 sm:gap-4">
        {YEARLY_SUMMARY_CARDS.map((card) => (
          <SummaryCardPlaceholder key={card.title} {...card} />
        ))}
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
        {FILTERED_SUMMARY_CARDS.map((card) => (
          <SummaryCardPlaceholder key={card.title} {...card} />
        ))}
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
