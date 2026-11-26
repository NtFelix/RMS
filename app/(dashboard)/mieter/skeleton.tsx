import { Skeleton } from "@/components/ui/skeleton"

const ROW_COUNT = 8

// Used as the Suspense fallback of page.tsx and as loading.tsx. It mirrors the main area of client-wrapper.tsx (top bar + table).
export function MieterSkeleton() {
  return (
    <div
      className="flex flex-col animate-in fade-in duration-500"
      role="status"
      aria-busy="true"
      aria-label="Mieter werden geladen"
    >
      <div className="flex items-center justify-between gap-3 h-14 px-4 sm:px-6 border-b border-border">
        <Skeleton className="h-4 w-40" />
        <div className="flex items-center gap-2">
          <Skeleton className="hidden sm:block h-9 w-56 rounded-full" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <Skeleton className="h-9 w-full rounded-lg" />
        {Array.from({ length: ROW_COUNT }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="hidden sm:block h-5 w-24" />
            <Skeleton className="hidden md:block h-5 w-20" />
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
