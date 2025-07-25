"use client"

import { Row } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useModalStore } from "@/hooks/use-modal-store"
import { Betriebskosten } from "@/types/supabase"

interface OperatingCostsContextMenuProps {
  row: Row<Betriebskosten>
}

export function OperatingCostsContextMenu({ row }: OperatingCostsContextMenuProps) {
  const { openBetriebskostenModal } = useModalStore()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => openBetriebskostenModal(row.original, [], () => {})}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {}}>Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
