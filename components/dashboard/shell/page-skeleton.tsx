import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { SHELL_BAR_CLASS } from "@/components/dashboard/dashboard-layout-classes"
import { RailSection, SecondaryRail } from "./secondary-rail"

// Loading state of a page in the new layout (loading.tsx and the page's Suspense fallback). It renders its own
// SecondaryRail, so the rail column is already there while the data loads: when the real page replaces the skeleton,
// the rail unregisters and registers in the same commit and the main area does not jump by the rail width. Geometry
// (bar height, paddings, row heights) follows the real PageTopBar and tables.

type RailSectionSkeleton = { label: string; items?: number; stats?: number }

export function ShellPageSkeleton({
  label,
  title,
  rail,
  rowClassName = "h-[65px]",
  avatar = false,
  rows = 8,
}: {
  /** Accessible name of the loading state, e.g. "Häuser werden geladen". */
  label: string
  /** Title of the secondary rail, the same as on the loaded page. */
  title: string
  rail: RailSectionSkeleton[]
  /** Height of a table row of the loaded page. */
  rowClassName?: string
  avatar?: boolean
  rows?: number
}) {
  return (
    <>
      <SecondaryRail title={title}>
        {rail.map((section) => (
          <RailSection key={section.label} label={section.label}>
            {section.stats ? (
              <div className="mx-1 divide-y divide-border-subtle overflow-hidden rounded-lg border border-border-subtle">
                {Array.from({ length: section.stats }).map((_, i) => (
                  <div key={i} className="flex h-10 items-center gap-2 px-3">
                    <Skeleton className="h-3 flex-1" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                ))}
              </div>
            ) : (
              Array.from({ length: section.items ?? 0 }).map((_, i) => (
                <div key={i} className="flex h-8 items-center px-2">
                  <Skeleton className="h-3.5 w-3/4" />
                </div>
              ))
            )}
          </RailSection>
        ))}
      </SecondaryRail>

      <div className="flex min-h-full flex-col" role="status" aria-busy="true" aria-label={label}>
        <div className={SHELL_BAR_CLASS} aria-hidden="true">
          <Skeleton className="h-4 w-32" />
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="size-8 rounded-full" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full sm:w-28" />
          </div>
        </div>
        <div className="flex flex-col p-4 sm:p-6" aria-hidden="true">
          <div className="flex h-10 items-center gap-4 border-b border-foreground/15 md:h-12">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="hidden h-3.5 w-16 sm:block" />
            <Skeleton className="hidden h-3.5 w-16 md:block" />
            <Skeleton className="ml-auto h-3.5 w-16" />
          </div>
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className={cn("flex items-center gap-4 border-b", rowClassName)}>
              <Skeleton className="size-4 rounded" />
              {avatar && <Skeleton className="size-9 rounded-full" />}
              <Skeleton className="h-4 w-40" />
              <Skeleton className="hidden h-4 w-24 sm:block" />
              <Skeleton className="hidden h-4 w-20 md:block" />
              <Skeleton className="ml-auto size-8 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
