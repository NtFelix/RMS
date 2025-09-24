"use client"

import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/client"
import { toast } from "@/hooks/use-toast"

interface FinanceTableToolbarProps {
  numSelected: number
  selectedIds: string[]
  onRefresh?: () => Promise<void>
}

export function FinanceTableToolbar({ numSelected, selectedIds, onRefresh }: FinanceTableToolbarProps) {
  const supabase = createClient()

  const handleUpdateType = async (ist_einnahmen: boolean) => {
    const { error } = await supabase
      .from("Finanzen")
      .update({ ist_einnahmen })
      .in("id", selectedIds)

    if (error) {
      toast({
        title: "Fehler",
        description: "Der Typ konnte nicht aktualisiert werden.",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Erfolg",
        description: "Der Typ wurde für die ausgewählten Transaktionen aktualisiert.",
      })
      onRefresh?.()
    }
  }

  if (numSelected === 0) {
    return null
  }

  return (
    <div className="flex items-center justify-between p-4">
      <div className="text-sm text-muted-foreground pl-2">
        {numSelected} Zeile(n) ausgewählt
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">Aktionen</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Massenaktionen</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Typ ändern</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => handleUpdateType(true)}>
                  Einnahme
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleUpdateType(false)}>
                  Ausgabe
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
