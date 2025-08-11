import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex flex-col gap-8 p-8">
      <div>
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid gap-4 grid-cols-6 auto-rows-[140px] h-[calc(100vh-200px)]">
        {/* Row 1: Three summary cards (1+2+1 columns) + Tenant Payment List (2 columns) */}
        <Card className="col-span-1 row-span-1 h-full overflow-hidden rounded-xl shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </CardHeader>
          <CardContent className="pt-0">
            <Skeleton className="h-8 w-8 mb-2" />
            <Skeleton className="h-3 w-24" />
          </CardContent>
        </Card>
        
        <Card className="col-span-2 row-span-1 h-full overflow-hidden rounded-xl shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </CardHeader>
          <CardContent className="pt-0">
            <Skeleton className="h-8 w-8 mb-2" />
            <Skeleton className="h-3 w-28" />
          </CardContent>
        </Card>
        
        <Card className="col-span-1 row-span-1 h-full overflow-hidden rounded-xl shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </CardHeader>
          <CardContent className="pt-0">
            <Skeleton className="h-8 w-8 mb-2" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
        
        {/* Tenant Payment List */}
        <Card className="col-span-2 row-span-4 h-full overflow-hidden rounded-xl shadow-md">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Row 2: Occupancy Chart (4 columns, 3 rows) */}
        <Card className="col-span-4 row-span-3 h-full overflow-hidden rounded-xl shadow-md">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3 w-40" />
          </CardHeader>
          <CardContent className="h-full">
            <Skeleton className="h-full w-full rounded" />
          </CardContent>
        </Card>

        {/* Row 5: Revenue Chart (4 columns, 3 rows) + Stacked summary cards (2 columns, 3 rows) */}
        <Card className="col-span-4 row-span-3 h-full overflow-hidden rounded-xl shadow-md">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48" />
          </CardHeader>
          <CardContent className="h-full">
            <Skeleton className="h-full w-full rounded" />
          </CardContent>
        </Card>
        
        {/* Vertically stacked summary cards */}
        <div className="col-span-2 row-span-3 h-full flex flex-col gap-4">
          <Card className="flex-1 overflow-hidden rounded-xl shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
          
          <Card className="flex-1 overflow-hidden rounded-xl shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
          
          <Card className="flex-1 overflow-hidden rounded-xl shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              <Skeleton className="h-3 w-28" />
            </CardContent>
          </Card>
        </div>

        {/* Row 8: Last Transactions (3 columns) + Maintenance Chart (3 columns) */}
        <Card className="col-span-3 row-span-3 h-full overflow-hidden rounded-xl shadow-md">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded" />
                  <div>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>
        
        <Card className="col-span-3 row-span-3 h-full overflow-hidden rounded-xl shadow-md">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-36" />
          </CardHeader>
          <CardContent className="h-full flex items-center justify-center">
            <Skeleton className="h-48 w-48 rounded-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
