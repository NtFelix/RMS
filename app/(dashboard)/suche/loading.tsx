import { Skeleton } from "@/components/ui/skeleton";

// Mirrors the layout of the search page (client-wrapper.tsx): hero with title and search field, then the
// category column next to the results. The search page awaits authentication and permissions first, so
// without this file it inherits the dashboard home skeleton.
export default function SucheLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Wird geladen"
      className="flex flex-col min-h-full w-full bg-zinc-50/40 dark:bg-zinc-950/20 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden"
    >
      <div className="relative overflow-hidden px-6 py-10 md:px-12 md:py-16 border-b border-zinc-200/50 dark:border-zinc-800/40 bg-white dark:bg-[#181818]">
        <div className="relative max-w-3xl mx-auto flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-9 md:h-10 w-64" />
            {/* The subtitle wraps to two 24px lines on desktop */}
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-full max-w-xl" />
              <Skeleton className="h-5 w-2/3 max-w-md" />
            </div>
          </div>
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      </div>
      <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-zinc-50/10 dark:bg-transparent">
        <div className="px-6 py-6 md:px-12 md:py-8 border-b md:border-b-0 md:border-r border-zinc-200/50 dark:border-zinc-800/40 w-full md:w-64 shrink-0">
          <div className="flex flex-col gap-4">
            <Skeleton className="hidden md:block h-4 w-20 mx-3" />
            <div className="flex flex-wrap md:flex-col gap-1.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-24 md:w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
        <div className="flex-1 px-6 py-8 md:px-12 md:py-8 min-h-0">
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
