"use client"

import * as React from "react"
import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Nebenkosten } from "@/lib/data-fetching"

interface OperatingCostsContextMenuProps {
  item: Nebenkosten
  onEdit: (item: Nebenkosten) => void
  onDelete: (id: string) => void
}

export function OperatingCostsContextMenu({ item, onEdit, onDelete }: OperatingCostsContextMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(item)}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDelete(item.id)}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
