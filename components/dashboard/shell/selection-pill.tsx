"use client"

import { forwardRef } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Floating pill with the actions for the current table selection, centred at the bottom of the work area.
 * Render it as the last child of a `flex flex-col min-h-full` page root: `mt-auto` keeps it at the bottom for short
 * tables, `sticky` for long ones. Geometry: 6px padding around 2rem actions plus 1px border, so the action radius
 * (16px) is concentric to the pill (outer 23px, inner 22px).
 */
export function SelectionPill({
  count,
  noun,
  onClear,
  children,
  className,
}: {
  count: number
  /** Singular and plural, e.g. ["Haus", "Häuser"]. */
  noun: [string, string]
  onClear: () => void
  children: React.ReactNode
  className?: string
}) {
  if (count === 0) return null

  return (
    <div className={cn("pointer-events-none sticky bottom-0 z-20 mt-auto flex justify-center px-4 pb-4", className)}>
      <div
        role="toolbar"
        aria-label="Aktionen für die Auswahl"
        className="pointer-events-auto flex max-w-full items-center gap-1 rounded-full border border-border-subtle bg-popover p-1.5 pl-4 text-popover-foreground shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200"
      >
        <span className="whitespace-nowrap text-sm font-medium tabular-nums" aria-live="polite">
          {count} {count === 1 ? noun[0] : noun[1]} ausgewählt
        </span>
        <button
          type="button"
          onClick={onClear}
          aria-label="Auswahl aufheben"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" />
        </button>
        <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden="true" />
        {children}
      </div>
    </div>
  )
}

type SelectionPillActionProps = {
  icon?: React.ElementType
  variant?: "default" | "destructive"
  children: React.ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>

/** Action inside the SelectionPill; the label collapses to the icon below `sm`. */
export const SelectionPillAction = forwardRef<HTMLButtonElement, SelectionPillActionProps>(function SelectionPillAction(
  { icon: Icon, variant = "default", children, className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        "max-sm:w-8 max-sm:justify-center max-sm:px-0",
        variant === "destructive"
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground hover:bg-muted",
        className,
      )}
      {...rest}
    >
      {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
      <span className="max-sm:sr-only">{children}</span>
    </button>
  )
})
