import { Skeleton } from "@/components/ui/skeleton"

export default function SettingsLoading() {
  return (
    <div className="flex h-full gap-3 p-4">
      <nav className="flex flex-col bg-white dark:bg-[#181818] border border-border/50 rounded-2xl shadow-xs w-56">
        <div className="p-3 pb-2">
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
        <div className="flex-1 pb-3 px-2 space-y-0.5">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      </nav>
      <div className="flex-1 overflow-y-auto min-w-0 p-4">
        <div className="space-y-6">
          <div className="space-y-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="p-6 bg-gray-50 dark:bg-gray-900/20 rounded-2xl border border-gray-200 dark:border-gray-800">
            <div className="space-y-3">
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-4/6" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-3/6" />
            </div>
          </div>
          <div className="p-6 bg-gray-50 dark:bg-gray-900/20 rounded-2xl border border-gray-200 dark:border-gray-800">
            <div className="space-y-3">
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-4/6" />
              <Skeleton className="h-3 w-6/6" />
              <Skeleton className="h-3 w-2/6" />
            </div>
          </div>
          <div className="p-6 bg-gray-50 dark:bg-gray-900/20 rounded-2xl border border-gray-200 dark:border-gray-800">
            <div className="space-y-3">
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-4/6" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
