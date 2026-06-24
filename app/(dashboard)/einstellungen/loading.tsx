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
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="p-6 bg-gray-50 dark:bg-gray-900/20 rounded-2xl border border-gray-200 dark:border-gray-800">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              <Skeleton className="h-9 w-40" />
            </div>
          </div>
          <div className="p-6 bg-gray-50 dark:bg-gray-900/20 rounded-2xl border border-gray-200 dark:border-gray-800">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              <Skeleton className="h-9 w-48" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
