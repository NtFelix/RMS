import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8 p-8 space-y-4">
      <div className="grid gap-4 grid-cols-1 auto-rows-auto md:grid-cols-6 md:auto-rows-[140px]">
        {/* Row 1 Summary Cards Skeleton */}
        <Card className="col-span-1 min-h-[120px] bg-muted/40 border border-border/50 rounded-3xl p-4">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-20" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-3 w-28 mt-2" />
          </CardContent>
        </Card>
        <Card className="col-span-1 md:col-span-2 min-h-[120px] bg-muted/40 border border-border/50 rounded-3xl p-4">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32 mt-2" />
          </CardContent>
        </Card>
        <Card className="col-span-1 min-h-[120px] bg-muted/40 border border-border/50 rounded-3xl p-4">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-16" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-3 w-28 mt-2" />
          </CardContent>
        </Card>

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
