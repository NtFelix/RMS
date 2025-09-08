import { Skeleton } from "@/components/ui/skeleton"

export const runtime = 'edge'

export default function DateienLoading() {
  return (
    <div className="h-full flex flex-col">
      {/* Header skeleton */}
      <div className="border-b p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="flex space-x-3">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-32" />
            </div>
            <div className="flex space-x-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <Skeleton className="h-9 w-96" />
            <div className="flex space-x-2">
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Content skeleton */}
      <div className="flex-1 p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <Skeleton className="h-32 rounded-lg mb-3" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}