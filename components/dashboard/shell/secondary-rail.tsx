"use client"

import Link from "next/link"
import { useLayoutEffect } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { useOptionalSecondaryRail } from "./secondary-rail-context"

/**
 * Content of the contextual secondary rail of a page. Portals into the host of the shell and registers itself
 * while mounted, so the shell shows the column. Without a shell the children render inline.
 */
export function SecondaryRail({
  title,
  action,
  children,
  className,
}: {
  /** Page title at the top of the rail, on one line with the PageTopBar. */
  title?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  const shell = useOptionalSecondaryRail()
  const registerRail = shell?.registerRail

  // Layout effect: the column appears in the same frame as the page, not one frame later.
  useLayoutEffect(() => registerRail?.(), [registerRail])

  const header = (title || action) && (
    <div className="box-content flex h-shell-bar shrink-0 items-center justify-between gap-2 border-b border-border-subtle pl-4 pr-shell-bar-inset">
      {title && <h2 className="truncate text-[15px] font-semibold tracking-tight">{title}</h2>}
      {action}
    </div>
  )

  if (!shell) return <>{header}{children}</>
  if (!shell.hostNode) return null

  return createPortal(
    <>
      {header}
      <div className={cn("flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-3", className)}>{children}</div>
    </>,
    shell.hostNode,
  )
}

export function RailSection({
  label,
  action,
  children,
  className,
}: {
  label?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("flex flex-col gap-1", className)}>
      {(label || action) && (
        <div className="flex h-6 items-center justify-between gap-2 px-2">
          <h3 className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</h3>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

type RailNavItemProps = {
  icon?: React.ElementType
  label: string
  active?: boolean
  count?: number | string
  onClick?: () => void
  href?: string
  className?: string
} & Omit<React.HTMLAttributes<HTMLElement>, "onClick" | "className" | "children">

export function RailNavItem({ icon: Icon, label, active, count, onClick, href, className, ...rest }: RailNavItemProps) {
  const shell = useOptionalSecondaryRail()
  // In the drawer (< lg) a choice closes it again, so the result is visible right away.
  const handleClick = () => {
    onClick?.()
    shell?.setDrawerOpen(false)
  }
  const classes = cn(
    "flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm transition-colors",
    active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
    className,
  )
  const content = (
    <>
      {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count !== undefined && <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{count}</span>}
    </>
  )

  if (href) {
    return (
      <Link href={href} onClick={handleClick} className={classes} aria-current={active ? "page" : undefined} {...rest}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" onClick={handleClick} className={classes} aria-pressed={active} {...rest}>
      {content}
    </button>
  )
}

export function RailStat({
  label,
  value,
  icon,
  hint,
}: {
  label: string
  value: React.ReactNode
  icon?: React.ReactNode
  hint?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2.5">
      <div className="flex items-center gap-2">
        {icon && <span className="flex shrink-0 text-muted-foreground [&_svg]:size-3.5">{icon}</span>}
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{label}</span>
        <span className="shrink-0 text-sm font-semibold tabular-nums">{value}</span>
      </div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

/** Compact KPI block: one card, one row per RailStat. */
export function RailStats({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-1 divide-y divide-border-subtle overflow-hidden rounded-lg border border-border-subtle bg-surface-outer/40">
      {children}
    </div>
  )
}
