import { Skeleton } from "@/components/ui/skeleton"

interface PillToggleSkeletonProps {
  count: number
  tabWidth?: string
  /** Overrides the default container width. */
  containerWidth?: string
}

// Loading twin of AnimatedPillToggle; three or more tabs share the width, fewer ones keep their own.
export function PillToggleSkeleton({ count, tabWidth = "w-24", containerWidth }: PillToggleSkeletonProps) {
  const fullWidth = count >= 3
  return (
    <div
      className={`flex items-center gap-1 bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200/30 dark:border-zinc-800/30 p-1 rounded-full relative w-full ${
        containerWidth || (fullWidth ? "sm:w-[300px] overflow-hidden" : "sm:w-fit max-w-[400px]")
      }`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={`h-9 ${fullWidth ? "flex-1" : tabWidth} rounded-full`} />
      ))}
    </div>
  )
}
