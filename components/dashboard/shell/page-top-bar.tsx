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
import { useSecondaryRail } from "./secondary-rail-context"

export interface PageBreadcrumb {
  label: string
  href?: string
}

/** Slim bar on top of the work area: breadcrumb on the left, search and primary actions on the right. */
export function PageTopBar({
  breadcrumbs,
  search,
  actions,
  className,
}: {
  breadcrumbs: PageBreadcrumb[]
  search?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  const { hasRail, drawerOpen, setDrawerOpen } = useSecondaryRail()

  return (
    <header
      className={cn(
        "sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border-subtle bg-surface-container px-4 lg:px-6",
        className,
      )}
    >
      {hasRail && (
        <Button
          variant="ghost"
          size="icon"
          className="-ml-2 size-8 shrink-0 lg:hidden"
          aria-label="Navigation öffnen"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(!drawerOpen)}
        >
          <PanelLeft className="size-4" />
        </Button>
      )}

      {/* Below sm the search takes the space; the rail drawer names the page */}
      <Breadcrumb className={cn("min-w-0", search && "max-sm:hidden")}>
        <BreadcrumbList className="flex-nowrap gap-1.5 sm:gap-1.5">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1
            return (
              <Fragment key={`${index}-${crumb.label}`}>
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
        {search}
        {actions}
      </div>
    </header>
  )
}
