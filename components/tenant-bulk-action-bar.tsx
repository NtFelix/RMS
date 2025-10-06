"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { X, Download, Trash2, Home } from "lucide-react"
import { Tenant } from "@/types/Tenant"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { updateTenantApartment } from "@/app/mieter-actions"

interface TenantBulkActionBarProps {
  selectedTenants: Set<string>
  tenants: Tenant[]
  wohnungsMap: Record<string, string>
  onClearSelection: () => void
  onExport: () => void
  onDelete: () => void
  onUpdate?: () => void // Callback to refresh the tenant list after update
}

export function TenantBulkActionBar({
  selectedTenants,
  tenants,
  wohnungsMap,
  onClearSelection,
  onExport,
  onDelete,
  onUpdate,
}: TenantBulkActionBarProps) {
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [selectedApartment, setSelectedApartment] = useState<string>("none")
  const [isUpdating, setIsUpdating] = useState(false)

  if (selectedTenants.size === 0) return null

  const handleAssignApartment = async () => {
    if (selectedApartment === "none") {
      toast.error("Bitte wählen Sie eine Wohnung aus")
      return
    }

    setIsUpdating(true)
    try {
      const selectedTenantIds = Array.from(selectedTenants)
      const updatePromises = selectedTenantIds.map(tenantId => 
        updateTenantApartment(tenantId, selectedApartment === "none" ? "" : selectedApartment)
      )
      
      await Promise.all(updatePromises)
      
      toast.success(`${selectedTenantIds.length} Mieter wurden erfolgreich aktualisiert`)
      setIsAssignDialogOpen(false)
      setSelectedApartment("")
      onUpdate?.()
      onClearSelection()
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Mieter:", error)
      toast.error("Ein Fehler ist beim Aktualisieren der Mieter aufgetreten")
    } finally {
      setIsUpdating(false)
    }
  }

  const apartmentOptions = Object.entries(wohnungsMap).map(([id, name]) => ({
    id,
    name: name || `Wohnung ${id}`
  }))

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
          onClick={() => setIsAssignDialogOpen(true)}
          className="h-8 gap-2"
        >
          <Home className="h-4 w-4" />
          Wohnung zuweisen
        </Button>
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

      {/* Assign Apartment Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Wohnung zuweisen</DialogTitle>
            <DialogDescription>
              Weisen Sie {selectedTenants.size} {selectedTenants.size === 1 ? 'ausgewähltem Mieter' : 'ausgewählten Mietern'} eine Wohnung zu.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="apartment" className="text-right">
                Wohnung
              </Label>
              <Select
                value={selectedApartment}
                onValueChange={setSelectedApartment}
                disabled={isUpdating}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Wohnung auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine Wohnung</SelectItem>
                  {apartmentOptions.map((apartment) => (
                    <SelectItem key={apartment.id} value={apartment.id}>
                      {apartment.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAssignDialogOpen(false)}
              disabled={isUpdating}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={handleAssignApartment}
              disabled={!selectedApartment || isUpdating}
            >
              {isUpdating ? 'Wird gespeichert...' : 'Zuweisen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
