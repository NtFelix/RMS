import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { PlusCircle, ArrowUpCircle, ArrowDownCircle, BarChart3, Wallet } from "lucide-react"
import { SummaryCardSkeleton } from "@/components/summary-card-skeleton"
import { ChartSkeleton } from "@/components/chart-skeletons"

export default function Loading() {
  return (
    <div className="flex flex-col gap-8 p-8 animate-in fade-in-0 duration-300">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="animate-pulse" style={{ animationDelay: '0ms' }}>
          <SummaryCardSkeleton 
            title="Ø Monatliche Einnahmen" 
            icon={<ArrowUpCircle className="h-4 w-4 text-green-500" />} 
          />
        </div>
        <div className="animate-pulse" style={{ animationDelay: '100ms' }}>
          <SummaryCardSkeleton 
            title="Ø Monatliche Ausgaben" 
            icon={<ArrowDownCircle className="h-4 w-4 text-red-500" />} 
          />
        </div>
        <div className="animate-pulse" style={{ animationDelay: '200ms' }}>
          <SummaryCardSkeleton 
            title="Ø Monatlicher Cashflow" 
            icon={<Wallet className="h-4 w-4 text-muted-foreground" />} 
          />
        </div>
        <div className="animate-pulse" style={{ animationDelay: '300ms' }}>
          <SummaryCardSkeleton 
            title="Jahresprognose" 
            icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />} 
          />
        </div>
      </div>

      {/* Chart Skeleton */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          {/* Chart type selector skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
          {/* Year selector skeleton */}
          <div className="mt-4 md:mt-0 flex items-center gap-2">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-9 w-16" />
          </div>
        </div>
        
        <ChartSkeleton 
          title="Einnahmen nach Wohnung" 
          description="Verteilung der Mieteinnahmen nach Wohnungen"
          type="pie" 
        />
      </Card>

      {/* Transactions Table Skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              <Skeleton className="h-6 w-32" />
            </CardTitle>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search and filter bar */}
            <div className="flex items-center gap-4">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
            
            {/* Table header */}
            <div className="grid grid-cols-6 gap-4 pb-2 border-b">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-12" />
            </div>
            
            {/* Table rows */}
            {Array.from({ length: 10 }).map((_, i) => (
              <div 
                key={i} 
                className="grid grid-cols-6 gap-4 py-3 border-b border-border/50 animate-pulse"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
            
            {/* Load more button */}
            <div className="flex justify-center pt-4">
              <Skeleton className="h-9 w-32" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
