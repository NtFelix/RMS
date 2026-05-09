import { Skeleton } from "@/components/ui/skeleton"

export const runtime = 'edge'

export default function DateienLoading() {
  return (
    <div className="flex flex-col gap-8 p-8 bg-white dark:bg-[#181818]">
      <div
        className="absolute inset-0 z-[-1] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at top left, rgba(121, 68, 255, 0.05), transparent 20%), radial-gradient(circle at bottom right, rgba(255, 121, 68, 0.05), transparent 20%)`,
        }}
      />
      
      {/* Summary Cards Skeleton - 3 equal flex cards */}
      <div className="flex flex-wrap gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="relative overflow-hidden rounded-3xl shadow-sm flex-1 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251]">
            <div className="p-6">
              <div className="flex items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-4" />
              </div>
              <div>
                <Skeleton className="h-8 w-28 mb-1" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Main File Container Skeleton */}
      <div className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-[2rem] flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <div className="flex flex-row items-start justify-between mb-6">
              <div>
                <Skeleton className="h-8 w-32 mb-1" />
                <Skeleton className="h-4 w-80" />
              </div>
            </div>
            
            {/* Quick Actions Skeleton */}
            <div className="space-y-4">
              {/* Search and sort row */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Left side: Search, Sort, Categories */}
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-9 w-full sm:w-[300px] rounded-full" />
                  <Skeleton className="h-9 w-28 rounded-full" />
                  <Skeleton className="h-9 w-32 rounded-full" />
                </div>
                
                {/* Right side: View mode toggle + Add button */}
                <div className="flex items-center gap-2 mt-1">
                  {/* View mode toggle */}
                  <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-full p-1">
                    <Skeleton className="h-8 w-10 rounded-full" />
                    <Skeleton className="h-8 w-10 rounded-full" />
                  </div>
                  {/* Add button */}
                  <Skeleton className="h-10 w-32 rounded-lg" />
                </div>
              </div>
            </div>
            
            {/* Breadcrumb Skeleton */}
            <nav className="flex items-center space-x-1 text-base mt-4">
              <Skeleton className="h-9 w-28 rounded-md" />
            </nav>
          </div>
        </div>
        
        {/* Content Area Skeleton */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="animate-pulse" style={{ animationDelay: `${i * 20}ms` }}>
                  <Skeleton className="h-32 rounded-2xl mb-3 bg-gray-100 dark:bg-[#22272e]" />
                  <Skeleton className="h-4 w-3/4 mb-1" />
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