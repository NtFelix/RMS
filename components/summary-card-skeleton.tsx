import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface SummaryCardSkeletonProps {
  icon: React.ReactNode
}

export function SummaryCardSkeleton({ icon }: SummaryCardSkeletonProps) {
  return (
    <Card className="overflow-hidden rounded-xl shadow-md flex-1">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-28" />
        {icon}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-full" />
        </div>
      </CardContent>
    </Card>
  )
}