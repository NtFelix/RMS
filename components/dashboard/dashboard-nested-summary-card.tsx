import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export interface DashboardNestedSummaryCardProps {
  href: string;
  title: string;
  value: React.ReactNode;
  description: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  layout?: "vertical" | "horizontal";
  className?: string;
  innerClassName?: string;
  id?: string;
  arrowLabel?: string;
}

/**
 * Nested Summary Card for the Dashboard
 *
 * Architecture:
 * - Outer container: Generously rounded frame (r=26px) with tight 5px inset
 * - Layout options:
 *    - 'vertical' (Standard): Title & animated arrow above the nested card
 *    - 'horizontal' (Alternative): Text on the left, nested container on the right (auf einer Höhe)
 * - Micro-interaction: Smooth hover animation shifting the arrow right (translate-x-1)
 */
export function DashboardNestedSummaryCard({
  href,
  title,
  value,
  description,
  icon,
  badge,
  layout = "vertical",
  className,
  innerClassName,
  id,
  arrowLabel,
}: DashboardNestedSummaryCardProps) {
  const cardId = id || `dashboard-summary-${title.replace(/\s+/g, "-").toLowerCase()}`;

  if (layout === "horizontal") {
    return (
      <Link
        href={href}
        id={cardId}
        aria-label={`${title}: ${value} - ${description}`}
        className={cn(
          "group relative flex items-center justify-between h-full overflow-hidden select-none",
          "rounded-[1.625rem] p-[5px]",
          "bg-gray-100/80 dark:bg-[#1a1f26]",
          "border border-gray-200/90 dark:border-[#3C4251]/80",
          "shadow-2xs hover:shadow-md hover:border-gray-300 dark:hover:border-zinc-600",
          "transition-all duration-200 ease-out cursor-pointer",
          "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className
        )}
      >
        {/* Left side: Text (Title + Description + Arrow) */}
        <div className="flex-1 flex flex-col justify-between h-full py-2 pl-3.5 pr-2 min-w-0">
          <div className="flex items-center gap-1.5 text-xs sm:text-[13px] font-medium text-muted-foreground dark:text-zinc-400 group-hover:text-foreground dark:group-hover:text-zinc-200 transition-colors duration-200 leading-none">
            <span>{title}</span>
            <ArrowRight className="size-3.5 transition-transform duration-200 ease-out group-hover:translate-x-1 text-muted-foreground/60 group-hover:text-foreground dark:group-hover:text-white" />
          </div>
          <p className="text-xs text-muted-foreground dark:text-zinc-400 line-clamp-1 font-medium mt-1">
            {description}
          </p>
        </div>

        {/* Right side: Nested Container on the same height */}
        <div
          className={cn(
            "h-full px-4 py-2.5 rounded-[1.3125rem] min-h-0",
            "bg-white dark:bg-[#22272e]",
            "border border-gray-200/90 dark:border-[#3C4251]",
            "shadow-2xs group-hover:border-primary/20 group-hover:shadow-xs",
            "transition-all duration-200 ease-out",
            "flex items-center gap-3 shrink-0",
            innerClassName
          )}
        >
          <div className="flex flex-col items-end">
            <span className="text-xl sm:text-2xl font-bold leading-none tracking-tight text-foreground dark:text-zinc-100 tabular-nums">
              {value}
            </span>
            {badge && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-muted dark:bg-zinc-800 text-muted-foreground dark:text-zinc-300 mt-1 shrink-0">
                {badge}
              </span>
            )}
          </div>
          <div className="size-8 rounded-lg bg-muted/60 dark:bg-zinc-800/80 border border-border/40 dark:border-white/5 flex items-center justify-center text-muted-foreground dark:text-zinc-300 group-hover:text-primary dark:group-hover:text-zinc-100 transition-colors duration-200 shrink-0">
            {icon}
          </div>
        </div>
      </Link>
    );
  }

  // Standard vertical layout
  return (
    <Link
      href={href}
      id={cardId}
      aria-label={`${title}: ${value} - ${description}`}
      className={cn(
        "group relative flex flex-col h-full overflow-hidden select-none",
        "rounded-[1.625rem] p-[5px]",
        "bg-gray-100/80 dark:bg-[#1a1f26]",
        "border border-gray-200/90 dark:border-[#3C4251]/80",
        "shadow-2xs hover:shadow-md hover:border-gray-300 dark:hover:border-zinc-600",
        "transition-all duration-200 ease-out cursor-pointer",
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
    >
      {/* Header above the nested card: Title on the left (sentence case), right arrow on the right */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1.5 shrink-0">
        <span className="text-xs sm:text-[13px] font-medium text-muted-foreground dark:text-zinc-400 group-hover:text-foreground dark:group-hover:text-zinc-200 transition-colors duration-200 leading-none">
          {title}
        </span>
        <div
          className="flex items-center justify-center text-muted-foreground/60 dark:text-zinc-400 group-hover:text-foreground dark:group-hover:text-white transition-colors duration-200"
          aria-hidden="true"
          title={arrowLabel || `Zu ${title} navigieren`}
        >
          <ArrowRight className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-1" />
        </div>
      </div>

      {/* Inner nested summary card (concentric radius: 26px - 5px = 21px) */}
      <div
        className={cn(
          "flex-1 flex flex-col justify-between p-3 sm:p-3.5 rounded-[1.3125rem] min-h-0",
          "bg-white dark:bg-[#22272e]",
          "border border-gray-200/90 dark:border-[#3C4251]",
          "shadow-2xs group-hover:border-primary/20 group-hover:shadow-xs",
          "transition-all duration-200 ease-out",
          innerClassName
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-baseline gap-2 min-w-0">
            <span className="text-xl sm:text-2xl font-bold leading-none tracking-tight text-foreground dark:text-zinc-100 tabular-nums truncate">
              {value}
            </span>
            {badge && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted dark:bg-zinc-800 text-muted-foreground dark:text-zinc-300 shrink-0">
                {badge}
              </span>
            )}
          </div>
          <div className="size-8 rounded-lg bg-muted/60 dark:bg-zinc-800/80 border border-border/40 dark:border-white/5 flex items-center justify-center text-muted-foreground dark:text-zinc-300 group-hover:text-primary dark:group-hover:text-zinc-100 transition-colors duration-200 shrink-0">
            {icon}
          </div>
        </div>
        <p className="text-xs text-muted-foreground dark:text-zinc-400 mt-1.5 line-clamp-1 font-medium">
          {description}
        </p>
      </div>
    </Link>
  );
}

/**
 * Skeleton loading state for DashboardNestedSummaryCard
 */
export function DashboardNestedSummaryCardSkeleton({
  layout = "vertical",
  className,
}: {
  layout?: "vertical" | "horizontal";
  className?: string;
}) {
  if (layout === "horizontal") {
    return (
      <div
        className={cn(
          "relative flex items-center justify-between h-full overflow-hidden",
          "rounded-[1.625rem] p-[5px]",
          "bg-gray-100/60 dark:bg-[#1a1f26]/60",
          "border border-gray-200/60 dark:border-[#3C4251]/40",
          className
        )}
      >
        <div className="flex flex-col justify-between h-full py-2 pl-3.5 pr-2">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3 w-24 mt-1" />
        </div>
        <div className="h-full px-4 py-2.5 rounded-[1.3125rem] bg-white/70 dark:bg-[#22272e]/70 border border-gray-200/60 dark:border-[#3C4251]/40 flex items-center gap-3">
          <Skeleton className="h-7 w-12" />
          <Skeleton className="size-8 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex flex-col h-full overflow-hidden",
        "rounded-[1.625rem] p-[5px]",
        "bg-gray-100/60 dark:bg-[#1a1f26]/60",
        "border border-gray-200/60 dark:border-[#3C4251]/40",
        className
      )}
    >
      <div className="flex items-center justify-between px-3 pt-2 pb-1.5 shrink-0">
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="h-3.5 w-4 rounded-xs" />
      </div>
      <div className="flex-1 flex flex-col justify-between p-3 sm:p-3.5 rounded-[1.3125rem] bg-white/70 dark:bg-[#22272e]/70 border border-gray-200/60 dark:border-[#3C4251]/40">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="size-8 rounded-lg" />
        </div>
        <Skeleton className="h-3 w-28 mt-1.5" />
      </div>
    </div>
  );
}
