import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowUpCircle, ArrowDownCircle, BarChart3, Wallet } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex flex-col gap-8 p-8 bg-white dark:bg-[#181818]">
      <div
        className="absolute inset-0 z-[-1] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at top left, rgba(121, 68, 255, 0.05), transparent 20%), radial-gradient(circle at bottom right, rgba(255, 121, 68, 0.05), transparent 20%)`,
        }}
      />
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl animate-pulse" style={{ animationDelay: '0ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ø Monatliche Einnahmen</CardTitle>
            <div className="p-2 bg-muted rounded-lg">
              <ArrowUpCircle className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-24 mb-2" />
          </CardContent>
        </Card>
        <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl animate-pulse" style={{ animationDelay: '100ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ø Monatliche Ausgaben</CardTitle>
            <div className="p-2 bg-muted rounded-lg">
              <ArrowDownCircle className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-24 mb-2" />
          </CardContent>
        </Card>
        <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl animate-pulse" style={{ animationDelay: '200ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ø Monatlicher Cashflow</CardTitle>
            <div className="p-2 bg-muted rounded-lg">
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-24 mb-2" />
          </CardContent>
        </Card>
        <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl animate-pulse" style={{ animationDelay: '300ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jahresprognose</CardTitle>
            <div className="p-2 bg-muted rounded-lg">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-24 mb-2" />
          </CardContent>
        </Card>
      </div>

      {/* Chart Skeleton */}
      <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-[2rem] p-6">
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

      {/* Transactions Table Skeleton */}
      <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-[2rem]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-32 rounded-full" />
            </div>
          </div>
        </CardHeader>
        <div className="px-6">
          <div className="h-px bg-gray-200 dark:bg-gray-700 w-full"></div>
        </div>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search and filter bar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-24 rounded-full" />
                ))}
              </div>
              <Skeleton className="h-10 w-full sm:w-[300px] rounded-full" />
            </div>
            
            {/* Table rows */}
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton 
                  key={i} 
                  className="h-16 w-full rounded-lg animate-pulse"
                  style={{ animationDelay: `${i * 50}ms` }}
                />
              ))}
            </div>
            
            {/* Load more button */}
            <div className="flex justify-center pt-4">
              <Skeleton className="h-10 w-40 rounded-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
