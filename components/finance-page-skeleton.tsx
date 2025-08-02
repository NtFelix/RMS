import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { PlusCircle, ArrowUpCircle, ArrowDownCircle, BarChart3, Wallet } from "lucide-react"
import { SummaryCardSkeleton } from "@/components/summary-card-skeleton"
import { ChartSkeleton } from "@/components/chart-skeletons"

export function FinancePageSkeleton() {
  return (
    <div className="flex flex-col gap-8 p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finanzen</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Einnahmen und Ausgaben</p>
        </div>
        <Button disabled className="sm:w-auto opacity-50">
          <PlusCircle className="mr-2 h-4 w-4" />
          Transaktion hinzufügen
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SummaryCardSkeleton 
          title="Ø Monatliche Einnahmen" 
          icon={<ArrowUpCircle className="h-4 w-4 text-green-500" />} 
        />
        <SummaryCardSkeleton 
          title="Ø Monatliche Ausgaben" 
          icon={<ArrowDownCircle className="h-4 w-4 text-red-500" />} 
        />
        <SummaryCardSkeleton 
          title="Ø Monatlicher Cashflow" 
          icon={<Wallet className="h-4 w-4 text-muted-foreground" />} 
        />
        <SummaryCardSkeleton 
          title="Jahresprognose" 
          icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />} 
        />
      </div>

      {/* Chart Skeleton */}
      <ChartSkeleton 
        title="Einnahmen nach Wohnung" 
        description="Verteilung der Mieteinnahmen nach Wohnungen"
        type="pie" 
      />

      {/* Transactions Table Skeleton */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Table header */}
            <div className="grid grid-cols-5 gap-4 pb-2 border-b">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12" />
            </div>
            
            {/* Table rows */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="grid grid-cols-5 gap-4 py-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}