import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ReactNode } from "react"

interface PageSkeletonProps {
  statsCards?: ReactNode
  headerTitleWidth?: string
  headerDescriptionWidth?: string
  buttonWidth?: string
  filterCount?: number
  tableRowCount?: number
  showInstructionGuide?: boolean
  tabCount?: number
  tabWidth?: string
}

export function PageSkeleton({
  statsCards,
  headerTitleWidth = "w-48",
  headerDescriptionWidth = "w-72",
  buttonWidth = "w-40",
  filterCount = 3,
  tableRowCount = 5,
  showInstructionGuide = false,
  tabCount = 2,
  tabWidth = "w-24",
}: PageSkeletonProps) {
  const isFullWidthTabs = tabCount >= 3

  return (
    <div className="flex flex-col gap-6 sm:gap-8 p-4 sm:p-8">
      {/* Tab Toggle Skeleton */}
      {tabCount > 0 && (
        <div
          className={
            isFullWidthTabs
              ? "flex items-center gap-1 bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200/30 dark:border-zinc-800/30 p-1 rounded-full relative w-full sm:w-[300px] overflow-hidden"
              : "flex items-center gap-1 bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200/30 dark:border-zinc-800/30 p-1 rounded-full relative w-full sm:w-fit max-w-[400px]"
          }
        >
          {Array.from({ length: tabCount }).map((_, i) =>
            isFullWidthTabs ? (
              <Skeleton key={i} className="h-9 flex-1 rounded-full" />
            ) : (
              <Skeleton key={i} className={`h-9 ${tabWidth} rounded-full`} />
            )
          )}
        </div>
      )}

      {/* Stats Cards (optional) */}
      {statsCards}

      {/* Instruction Guide Skeleton (optional) */}
      {showInstructionGuide && (
        <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem]">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <Skeleton className="h-6 w-64 mb-2" />
                <Skeleton className="h-4 w-96 max-w-full" />
              </div>
              <Skeleton className="h-8 w-24 rounded-lg shrink-0" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="shrink-0 size-8 rounded-full" />
                  <div className="flex-1 flex flex-col gap-2 min-w-0">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-2 sm:flex-row sm:gap-3">
              <Skeleton className="h-10 flex-1 rounded-full" />
              <Skeleton className="h-10 flex-1 sm:w-40 rounded-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Card Structure Skeleton */}
      <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem]">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <Skeleton className={`h-6 ${headerTitleWidth} mb-2`} />
              <Skeleton className={`h-4 ${headerDescriptionWidth}`} />
            </div>
            <Skeleton className={`h-10 ${buttonWidth} rounded-full shrink-0`} />
          </div>
        </CardHeader>
        <div className="px-6">
          <div className="h-px bg-gray-200 dark:bg-gray-700 w-full"></div>
        </div>
        <CardContent className="flex flex-col gap-6">
          {/* Filters Skeleton */}
          <div className="flex flex-col gap-4 mt-4 sm:mt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: filterCount }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-24 sm:w-28 rounded-full" />
                ))}
              </div>
              <Skeleton className="h-10 w-full sm:w-[280px] rounded-full" />
            </div>
          </div>

          {/* Table Skeleton */}
          <div className="flex flex-col gap-3">
            {Array.from({ length: tableRowCount }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-16 w-full rounded-lg"
                style={{ animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
