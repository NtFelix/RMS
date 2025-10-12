"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { X, Download, Trash2, Home, TrendingUp, TrendingDown } from "lucide-react"
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
import { toast } from "@/hooks/use-toast"

interface Finanz {
  id: string;
  wohnung_id?: string;
  name: string;
  datum?: string;
  betrag: number;
  ist_einnahmen: boolean;
  notiz?: string;
  Wohnungen?: { name: string };
}

interface FinanceBulkActionBarProps {
  selectedFinances: Set<string>
  finances: Finanz[]
  wohnungsMap: Record<string, string>
  onClearSelection: () => void
  onExport: () => void
  onDelete: () => void
  onUpdate?: () => void // Callback to refresh the finance list after update
}

export function FinanceBulkActionBar({
  selectedFinances,
  finances,
  wohnungsMap,
  onClearSelection,
  onExport,
  onDelete,
  onUpdate,
}: FinanceBulkActionBarProps) {
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false)
  const [selectedApartment, setSelectedApartment] = useState<string>("none")
  const [selectedType, setSelectedType] = useState<string>("none")
  const [isUpdating, setIsUpdating] = useState(false)

  if (selectedFinances.size === 0) return null

  const handleAssignApartment = async () => {
    if (selectedApartment === "none") {
      toast({
        title: "Fehlende Auswahl",
        description: "Bitte wählen Sie eine Wohnung aus, um fortzufahren.",
        variant: "destructive"
      })
      return
    }

    setIsUpdating(true)
    
    try {
      const selectedFinanceIds = Array.from(selectedFinances)
      const updateResults = await Promise.allSettled(
        selectedFinanceIds.map(async (financeId) => {
          const finance = finances.find(f => f.id === financeId)
          if (!finance) return { success: false }
          
          const response = await fetch(`/api/finanzen/${financeId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              wohnung_id: selectedApartment === "none" ? null : selectedApartment
            }),
          })
          
          return { success: response.ok }
        })
      )
      
      const successfulUpdates = updateResults.filter(
        (result): result is PromiseFulfilledResult<{ success: boolean }> => 
          result.status === 'fulfilled' && result.value.success
      )
      
      const failedUpdates = updateResults.length - successfulUpdates.length
      
      if (successfulUpdates.length > 0) {
        toast({
          title: "Erfolgreich aktualisiert",
          description: `${successfulUpdates.length} von ${updateResults.length} Transaktionen wurden erfolgreich aktualisiert.`,
          variant: "success"
        })
      }
      
      if (failedUpdates > 0) {
        toast({
          title: "Teilweise Fehler",
          description: `Bei ${failedUpdates} von ${updateResults.length} Transaktionen ist ein Fehler aufgetreten.`,
          variant: "destructive"
        })
      }
      
      if (successfulUpdates.length > 0) {
        setIsAssignDialogOpen(false)
        setSelectedApartment("none")
        onUpdate?.()
        onClearSelection()
      }
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Transaktionen:", error)
      toast({
        title: "Fehler",
        description: "Es ist ein unerwarteter Fehler aufgetreten. Bitte versuchen Sie es später erneut.",
        variant: "destructive"
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleChangeType = async () => {
    if (selectedType === "none") {
      toast({
        title: "Fehlende Auswahl",
        description: "Bitte wählen Sie einen Typ aus, um fortzufahren.",
        variant: "destructive"
      })
      return
    }

    setIsUpdating(true)
    
    try {
      const selectedFinanceIds = Array.from(selectedFinances)
      const updateResults = await Promise.allSettled(
        selectedFinanceIds.map(async (financeId) => {
          const response = await fetch(`/api/finanzen/${financeId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ist_einnahmen: selectedType === "income"
            }),
          })
          
          return { success: response.ok }
        })
      )
      
      const successfulUpdates = updateResults.filter(
        (result): result is PromiseFulfilledResult<{ success: boolean }> => 
          result.status === 'fulfilled' && result.value.success
      )
      
      const failedUpdates = updateResults.length - successfulUpdates.length
      
      if (successfulUpdates.length > 0) {
        toast({
          title: "Erfolgreich aktualisiert",
          description: `${successfulUpdates.length} von ${updateResults.length} Transaktionen wurden erfolgreich aktualisiert.`,
          variant: "success"
        })
      }
      
      if (failedUpdates > 0) {
        toast({
          title: "Teilweise Fehler",
          description: `Bei ${failedUpdates} von ${updateResults.length} Transaktionen ist ein Fehler aufgetreten.`,
          variant: "destructive"
        })
      }
      
      if (successfulUpdates.length > 0) {
        setIsTypeDialogOpen(false)
        setSelectedType("none")
        onUpdate?.()
        onClearSelection()
      }
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Transaktionen:", error)
      toast({
        title: "Fehler",
        description: "Es ist ein unerwarteter Fehler aufgetreten. Bitte versuchen Sie es später erneut.",
        variant: "destructive"
      })
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
            {selectedFinances.size} {selectedFinances.size === 1 ? 'Transaktion' : 'Transaktionen'} ausgewählt
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
          onClick={() => setIsTypeDialogOpen(true)}
          className="h-8 gap-2"
        >
          <TrendingUp className="h-4 w-4" />
          Typ ändern
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
              Weisen Sie {selectedFinances.size} {selectedFinances.size === 1 ? 'ausgewählter Transaktion' : 'ausgewählten Transaktionen'} eine Wohnung zu.
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

      {/* Change Type Dialog */}
      <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Transaktionstyp ändern</DialogTitle>
            <DialogDescription>
              Ändern Sie den Typ von {selectedFinances.size} {selectedFinances.size === 1 ? 'ausgewählter Transaktion' : 'ausgewählten Transaktionen'}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Typ
              </Label>
              <Select
                value={selectedType}
                onValueChange={setSelectedType}
                disabled={isUpdating}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Typ auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      Einnahme
                    </div>
                  </SelectItem>
                  <SelectItem value="expense">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      Ausgabe
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsTypeDialogOpen(false)}
              disabled={isUpdating}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={handleChangeType}
              disabled={!selectedType || selectedType === "none" || isUpdating}
            >
              {isUpdating ? 'Wird gespeichert...' : 'Ändern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}