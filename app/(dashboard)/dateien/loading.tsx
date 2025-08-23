import { Skeleton } from "@/components/ui/skeleton"

export default function DateienLoading() {
  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          </div>
          <div className="md:col-span-2 space-y-4">
            <Skeleton className="h-6 w-40" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}