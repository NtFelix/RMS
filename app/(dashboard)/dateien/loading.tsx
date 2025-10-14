import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"

export const runtime = 'edge'

export default function DateienLoading() {
  return (
    <div className="flex flex-col gap-8 p-8 bg-white dark:bg-[#181818]">
      <div
        className="absolute inset-0 z-[-1]"
        style={{
          backgroundImage: `radial-gradient(circle at top left, rgba(121, 68, 255, 0.05), transparent 20%), radial-gradient(circle at bottom right, rgba(255, 121, 68, 0.05), transparent 20%)`,
        }}
      />
      
      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-4 w-32" />
          </Card>
        ))}
      </div>
      
      {/* Main File Container Skeleton */}
      <div className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-[2rem] flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <div className="flex flex-row items-start justify-between mb-6">
              <div>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-4 w-72" />
              </div>
            </div>
            
            {/* Quick Actions Skeleton */}
            <div className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-10 w-32 rounded-full" />
                  <Skeleton className="h-10 w-36 rounded-full" />
                  <Skeleton className="h-10 w-32 rounded-full" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-10 w-10 rounded-lg" />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <Skeleton className="h-10 flex-1 max-w-md rounded-full" />
                <div className="flex gap-2 ml-4">
                  <Skeleton className="h-10 w-24 rounded-lg" />
                  <Skeleton className="h-10 w-20 rounded-lg" />
                  <Skeleton className="h-10 w-20 rounded-lg" />
                </div>
              </div>
            </div>
            
            {/* Breadcrumb Skeleton */}
            <div className="flex items-center space-x-2 mt-4">
              <Skeleton className="h-8 w-24 rounded-md" />
              <span className="text-muted-foreground/50">/</span>
              <Skeleton className="h-8 w-32 rounded-md" />
            </div>
          </div>
        </div>
        
        {/* Content Area Skeleton */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="animate-pulse" style={{ animationDelay: `${i * 20}ms` }}>
                  <Skeleton className="h-32 rounded-2xl mb-3 bg-gray-100 dark:bg-[#22272e]" />
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}