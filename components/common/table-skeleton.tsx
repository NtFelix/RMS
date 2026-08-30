import { Skeleton } from "@/components/ui/skeleton"

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      <div className="border border-border/50 rounded-2xl p-4 bg-muted/20 space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-border/40">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/6" />
        </div>

        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex justify-between items-center py-2">
            <Skeleton className="h-5 w-1/4" />
            <Skeleton className="h-5 w-1/4" />
            <Skeleton className="h-5 w-1/4" />
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}
