"use client"

import Link from "next/link"
import { Fragment } from "react"
import { PanelLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { SHELL_BAR_CLASS } from "@/components/dashboard/dashboard-layout-classes"
import { useSecondaryRail } from "./secondary-rail-context"
import { SECONDARY_RAIL_ID } from "./secondary-rail-context-value"

export interface PageBreadcrumb {
  label: string
  href?: string
}

/**
 * Slim bar on top of the work area: breadcrumb on the left, table tools (filter, sort, search) and the primary
 * action on the right. Height and right inset follow the container radius, so the action in the corner is
 * concentric to it (see --spacing-shell-bar in globals.css).
 */
export function PageTopBar({
  breadcrumbs,
  tools,
  actions,
  className,
}: {
  breadcrumbs: PageBreadcrumb[]
  /** Toolbar controls (ToolbarFilterMenu, ToolbarSortMenu, ToolbarSearch …). */
  tools?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  const { hasRail, drawerOpen, setDrawerOpen } = useSecondaryRail()

  return (
    <header
      className={cn(
        SHELL_BAR_CLASS,
        "sticky top-0 z-10 bg-surface-container",
        className,
      )}
    >
      {hasRail && (
        <Button
          variant="ghost"
          size="icon"
          className="-ml-2 size-8 shrink-0 rounded-full lg:hidden"
          aria-label="Navigation öffnen"
          aria-expanded={drawerOpen}
          aria-controls={SECONDARY_RAIL_ID}
          onClick={() => setDrawerOpen(!drawerOpen)}
        >
          <PanelLeft className="size-4" />
        </Button>
      )}

      {/* Below sm the tools take the space; the rail drawer names the page */}
      <Breadcrumb className={cn("min-w-0", tools && "max-sm:hidden")}>
        <BreadcrumbList className="flex-nowrap gap-1.5 sm:gap-1.5">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1
            return (
              <Fragment key={crumb.href ?? crumb.label}>
                <BreadcrumbItem className="min-w-0">
                  {isLast ? (
                    <BreadcrumbPage className="truncate font-medium">{crumb.label}</BreadcrumbPage>
                  ) : crumb.href ? (
                    <BreadcrumbLink asChild className="truncate">
                      <Link href={crumb.href}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <span className="truncate">{crumb.label}</span>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator />}
              </Fragment>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex min-w-0 items-center justify-end gap-2 max-sm:flex-1">
        {tools && <div className="flex min-w-0 items-center justify-end gap-0.5 max-sm:flex-1">{tools}</div>}
        {actions}
      </div>
    </header>
  )
}
