import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Building2, Home, Users, Wallet, FileSpreadsheet, CheckSquare } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex flex-col gap-8 p-8 bg-white dark:bg-[#181818]">
      <div>
        <Skeleton className="h-9 w-48" />
      </div>
      <div className="grid gap-4 grid-cols-1 auto-rows-auto md:grid-cols-6 md:auto-rows-[140px]">
        {/* Row 1: Three summary cards + Tenant Payment List */}
        <Card className="col-span-1 row-span-1 md:col-span-1 md:row-span-1 min-h-[120px] h-full overflow-hidden bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Häuser</CardTitle>
            <div className="p-2 bg-muted rounded-lg">
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-6">
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>

        <Card className="col-span-1 row-span-1 md:col-span-2 md:row-span-1 min-h-[120px] h-full overflow-hidden bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wohnungen</CardTitle>
            <div className="p-2 bg-muted rounded-lg">
              <Home className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-6">
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>

        <Card className="col-span-1 row-span-1 md:col-span-1 md:row-span-1 min-h-[120px] h-full overflow-hidden bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mieter</CardTitle>
            <div className="p-2 bg-muted rounded-lg">
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-6">
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>

        {/* Tenant Payment List Skeleton */}
        <Card className="col-span-1 row-span-1 md:col-span-2 md:row-span-4 h-[300px] md:h-full overflow-hidden bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-40 mb-2" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-background rounded-lg">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Row 2: Occupancy Chart */}
        <Card className="col-span-1 row-span-1 md:col-span-4 md:row-span-3 h-[300px] md:h-full overflow-hidden bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl">
          <CardHeader>
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-full w-full rounded-lg" />
          </CardContent>
        </Card>

        {/* Row 5: Revenue Chart + Stacked Cards */}
        <Card className="col-span-1 row-span-1 md:col-span-4 md:row-span-3 h-[300px] md:h-full overflow-hidden bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl">
          <CardHeader>
            <Skeleton className="h-5 w-40 mb-2" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-full w-full rounded-lg" />
          </CardContent>
        </Card>

        {/* Mobile: Individual cards, Desktop: Stacked container */}
        <Card className="col-span-1 row-span-1 md:hidden min-h-[120px] h-full overflow-hidden bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aufgaben</CardTitle>
            <div className="p-2 bg-muted rounded-lg">
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-6">
            <Skeleton className="h-6 w-12 mb-2" />
            <Skeleton className="h-3 w-28" />
          </CardContent>
        </Card>

        <Card className="col-span-1 row-span-1 md:hidden min-h-[120px] h-full overflow-hidden bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Einnahmen</CardTitle>
            <div className="p-2 bg-muted rounded-lg">
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-6">
            <Skeleton className="h-6 w-24 mb-2" />
            <Skeleton className="h-3 w-36" />
          </CardContent>
        </Card>

        <Card className="col-span-1 row-span-1 md:hidden min-h-[120px] h-full overflow-hidden bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Betriebskosten</CardTitle>
            <div className="p-2 bg-muted rounded-lg">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-6">
            <Skeleton className="h-6 w-24 mb-2" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>

        {/* Desktop: Stacked container */}
        <div className="hidden md:block md:col-span-2 md:row-span-3">
          <div className="h-full flex flex-col gap-4">
            <Card className="flex-1 overflow-hidden bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aufgaben</CardTitle>
                <div className="p-2 bg-muted rounded-lg">
                  <CheckSquare className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-6">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-28" />
              </CardContent>
            </Card>

            <Card className="flex-1 overflow-hidden bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Einnahmen</CardTitle>
                <div className="p-2 bg-muted rounded-lg">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-6">
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-3 w-36" />
              </CardContent>
            </Card>

            <Card className="flex-1 overflow-hidden bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Betriebskosten</CardTitle>
                <div className="p-2 bg-muted rounded-lg">
                  <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-6">
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Row 8: Last Transactions + Maintenance Chart */}
        <Card className="col-span-1 row-span-1 md:col-span-3 md:row-span-3 h-[300px] md:h-full overflow-hidden bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl">
          <CardHeader>
            <Skeleton className="h-5 w-36 mb-2" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-background rounded-lg">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="col-span-1 row-span-1 md:col-span-3 md:row-span-3 h-[300px] md:h-full overflow-hidden bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl">
          <CardHeader>
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <Skeleton className="h-48 w-48 rounded-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
