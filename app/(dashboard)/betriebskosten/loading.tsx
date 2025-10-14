import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="flex flex-col gap-8 p-8 bg-white dark:bg-[#181818]">
      <div
        className="absolute inset-0 z-[-1]"
        style={{
          backgroundImage: `radial-gradient(circle at top left, rgba(121, 68, 255, 0.05), transparent 20%), radial-gradient(circle at bottom right, rgba(255, 121, 68, 0.05), transparent 20%)`,
        }}
      />
      {/* Instruction Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((idx) => (
          <Card key={idx} className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-48" />
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-9 w-28 rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Card Structure Skeleton */}
      <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-[2rem]">
        <CardHeader>
          <div className="flex flex-row items-start justify-between">
            <div>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-10 w-60 sm:w-[280px] rounded-full" />
          </div>
        </CardHeader>
        <div className="px-6">
          <div className="h-px bg-gray-200 dark:bg-gray-700 w-full"></div>
        </div>
        <CardContent className="flex flex-col gap-6">
          {/* Filters Skeleton */}
          <div className="flex flex-col gap-4 mt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-32 rounded-full" />
                ))}
              </div>
              <Skeleton className="h-10 w-full sm:w-[300px] rounded-full" />
            </div>
          </div>

          {/* Table Skeleton */}
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
