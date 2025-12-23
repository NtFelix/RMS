import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface ChartSkeletonProps {
  title: string
  description: string
  type: "pie" | "line" | "bar"
}

export function ChartSkeleton({ title, description, type }: ChartSkeletonProps) {
  return (
    <Card>
      <CardHeader>
    <Skeleton className="h-6 w-40 mb-2" />
    <Skeleton className="h-4 w-64" />
  </CardHeader>
      <CardContent>
        <div className="relative w-full h-auto min-h-[400px] flex items-center justify-center">
          {type === "pie" && <PieChartSkeleton />}
          {type === "line" && <LineChartSkeleton />}
          {type === "bar" && <BarChartSkeleton />}
        </div>
      </CardContent>
    </Card>
  )
}

function PieChartSkeleton() {
  return (
    <div className="flex items-center justify-center w-full h-full">
      <div className="relative">
        {/* Main pie circle with rotating animation */}
        <div className="relative w-80 h-80">
          <Skeleton className="w-full h-full rounded-full animate-pulse" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary/20 animate-spin" />
        </div>
        
        {/* Center hole to make it look like a donut */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-32 h-32 bg-background rounded-full border border-border" />
        </div>
        
        {/* Legend items with staggered animation */}
        <div className="absolute -right-32 top-8 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div 
              key={i} 
              className="flex items-center space-x-2 animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <Skeleton className="w-3 h-3 rounded-sm" />
              <Skeleton className="w-20 h-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function LineChartSkeleton() {
  return (
    <div className="w-full h-full p-4">
      {/* Y-axis */}
      <div className="flex h-80">
        <div className="flex flex-col justify-between mr-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton 
              key={i} 
              className="w-12 h-4 animate-pulse" 
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
        
        {/* Chart area */}
        <div className="flex-1 relative">
          {/* Grid lines */}
          <div className="absolute inset-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton 
                key={i} 
                className="w-full h-px mb-16 animate-pulse" 
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
          
          {/* Animated line path simulation */}
          <div className="absolute inset-0 flex items-center">
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-pulse">
              <div className="h-full bg-primary/30 animate-pulse" style={{
                clipPath: "polygon(0 80%, 8% 75%, 16% 85%, 25% 70%, 33% 90%, 41% 65%, 50% 80%, 58% 60%, 66% 75%, 75% 55%, 83% 70%, 91% 50%, 100% 65%)"
              }} />
            </div>
          </div>
          
          {/* Data points */}
          <div className="absolute inset-0">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-primary/40 rounded-full animate-pulse"
                style={{
                  left: `${(i / 11) * 100}%`,
                  top: `${Math.random() * 60 + 20}%`,
                  animationDelay: `${i * 150}ms`
                }}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* X-axis */}
      <div className="flex justify-between mt-4 ml-16">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton 
            key={i} 
            className="w-8 h-4 animate-pulse" 
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

function BarChartSkeleton() {
  return (
    <div className="w-full h-full p-4">
      {/* Y-axis */}
      <div className="flex h-80">
        <div className="flex flex-col justify-between mr-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton 
              key={i} 
              className="w-12 h-4 animate-pulse" 
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
        
        {/* Chart area */}
        <div className="flex-1 flex items-end justify-between space-x-1">
          {Array.from({ length: 12 }).map((_, i) => {
            const incomeHeight = Math.random() * 60 + 20;
            const expenseHeight = Math.random() * 40 + 10;
            
            return (
              <div key={i} className="flex flex-col space-y-1 flex-1">
                {/* Income bar */}
                <Skeleton 
                  className="w-full animate-pulse" 
                  style={{ 
                    height: `${incomeHeight}%`,
                    animationDelay: `${i * 100}ms`
                  }}
                />
                {/* Expense bar */}
                <Skeleton 
                  className="w-full animate-pulse" 
                  style={{ 
                    height: `${expenseHeight}%`,
                    animationDelay: `${i * 100 + 50}ms`
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>
      
      {/* X-axis */}
      <div className="flex justify-between mt-4 ml-16">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton 
            key={i} 
            className="w-8 h-4 animate-pulse" 
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex justify-center mt-4 space-x-6">
        <div className="flex items-center space-x-2 animate-pulse">
          <Skeleton className="w-4 h-4" />
          <Skeleton className="w-16 h-4" />
        </div>
        <div className="flex items-center space-x-2 animate-pulse" style={{ animationDelay: '200ms' }}>
          <Skeleton className="w-4 h-4" />
          <Skeleton className="w-16 h-4" />
        </div>
      </div>
    </div>
  )
}