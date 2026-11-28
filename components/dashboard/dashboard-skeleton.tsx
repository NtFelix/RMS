import { Skeleton } from "@/components/ui/skeleton"
import { DashboardNestedSummaryCardSkeleton } from "@/components/dashboard/dashboard-nested-summary-card"

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8 p-8 space-y-4">
      <div className="grid gap-4 grid-cols-1 auto-rows-auto md:grid-cols-6 md:auto-rows-[140px]">
        {/* Row 1 Summary Cards Skeleton */}
        <DashboardNestedSummaryCardSkeleton className="col-span-1 min-h-[120px]" />
        <DashboardNestedSummaryCardSkeleton className="col-span-1 md:col-span-2 min-h-[120px]" />
        <DashboardNestedSummaryCardSkeleton className="col-span-1 min-h-[120px]" />

        {/* Tenant Payment Bento Skeleton */}
        <div className="col-span-1 md:col-span-2 md:row-span-4 min-h-[300px]">
          <Skeleton className="w-full h-full rounded-3xl" />
        </div>

        {/* Occupancy Chart Skeleton */}
        <div className="col-span-1 md:col-span-4 md:row-span-3 min-h-[300px]">
          <Skeleton className="w-full h-full rounded-3xl" />
        </div>
      </div>
    </div>
  )
}
