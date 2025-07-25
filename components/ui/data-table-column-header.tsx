import * as React from "react"
import { Column } from "@tanstack/react-table"
import { ArrowUpDown, ArrowUp, ArrowDown, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>
  title: string
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>
  }

  const sortDirection = column.getIsSorted()

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
            aria-label={
              sortDirection === "desc"
                ? `Sortiert nach ${title} absteigend. Klicken um aufsteigend zu sortieren.`
                : sortDirection === "asc"
                ? `Sortiert nach ${title} aufsteigend. Klicken um absteigend zu sortieren.`
                : `Sortieren nach ${title}`
            }
          >
            <span>{title}</span>
            {sortDirection === "desc" ? (
              <ArrowDown className="ml-2 h-4 w-4" aria-hidden="true" />
            ) : sortDirection === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" aria-hidden="true" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onClick={() => column.toggleSorting(false)}
            aria-label={`Aufsteigend nach ${title} sortieren`}
          >
            <ArrowUp className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Aufsteigend
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => column.toggleSorting(true)}
            aria-label={`Absteigend nach ${title} sortieren`}
          >
            <ArrowDown className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Absteigend
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => column.toggleVisibility(false)}
            aria-label={`Spalte ${title} ausblenden`}
          >
            <EyeOff className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Ausblenden
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}