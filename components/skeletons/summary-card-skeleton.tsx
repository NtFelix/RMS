import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface SummaryCardSkeletonProps {
  title?: string;
  icon: React.ReactNode;
}

export function SummaryCardSkeleton({ title, icon }: SummaryCardSkeletonProps) {
  return (
    <Card className="overflow-hidden rounded-2xl shadow-md flex-1">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        {title ? (
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
        ) : (
          <Skeleton className="h-4 w-28" />
        )}
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