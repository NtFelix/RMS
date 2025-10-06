"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { X, Download, Trash2 } from "lucide-react"
import { Tenant } from "@/types/Tenant"

interface TenantBulkActionBarProps {
  selectedTenants: Set<string>
  tenants: Tenant[]
  wohnungsMap: Record<string, string>
  onClearSelection: () => void
  onExport: () => void
  onDelete: () => void
}

export function TenantBulkActionBar({
  selectedTenants,
  tenants,
  wohnungsMap,
  onClearSelection,
  onExport,
  onDelete,
}: TenantBulkActionBarProps) {
  if (selectedTenants.size === 0) return null

  return (
    <div className="p-4 bg-primary/10 dark:bg-primary/20 border border-primary/20 rounded-lg flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={true}
            onCheckedChange={onClearSelection}
            className="data-[state=checked]:bg-primary"
          />
          <span className="font-medium text-sm">
            {selectedTenants.size} {selectedTenants.size === 1 ? 'Mieter' : 'Mieter'} ausgewählt
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-8 px-2 hover:bg-primary/20"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="h-8 gap-2"
        >
          <Download className="h-4 w-4" />
          Exportieren
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="h-8 gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
        >
          <Trash2 className="h-4 w-4" />
          Löschen
        </Button>
      </div>
    </div>
  )
}
