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

interface ApartmentTableToolbarProps {
  numSelected: number
  selectedIds: string[]
  houses: { id: string; name: string }[]
  onRefresh?: () => Promise<void>
}

export function ApartmentTableToolbar({ numSelected, selectedIds, houses, onRefresh }: ApartmentTableToolbarProps) {
  const supabase = createClient()

  const handleUpdateHaus = async (hausId: string) => {
    const { error } = await supabase
      .from("Wohnungen")
      .update({ haus_id: hausId })
      .in("id", selectedIds)

    if (error) {
      toast({
        title: "Fehler",
        description: "Das Haus konnte nicht aktualisiert werden.",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Erfolg",
        description: "Das Haus wurde für die ausgewählten Wohnungen aktualisiert.",
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
            <DropdownMenuSubTrigger>Haus zuweisen</DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                {houses.map((haus) => (
                  <DropdownMenuItem key={haus.id} onClick={() => handleUpdateHaus(haus.id)}>
                    {haus.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
