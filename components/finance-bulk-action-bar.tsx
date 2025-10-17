"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { X, Download, Trash2, Home, TrendingUp, TrendingDown, Loader2 } from "lucide-react"
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
  wohnungsMap: Record<string, string>
  onClearSelection: () => void
  onExport: () => void
  onDelete: () => void
  onUpdate?: (updatedFinances: Finanz[]) => void
}

export function FinanceBulkActionBar({
  selectedFinances,
  wohnungsMap,
  onClearSelection,
  onExport,
  onDelete,
  onUpdate,
}: FinanceBulkActionBarProps) {
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedApartment, setSelectedApartment] = useState<string>("none")
  const [selectedType, setSelectedType] = useState<string>("none")

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      await onDelete();
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error during bulk delete:', error);
      toast({
        title: "Fehler",
        description: "Beim Löschen der ausgewählten Transaktionen ist ein Fehler aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };
  const [isUpdating, setIsUpdating] = useState(false)

  if (selectedFinances.size === 0) return null

  const handleBulkUpdate = async (updates: Record<string, any>) => {
    const selectedFinanceIds = Array.from(selectedFinances);

    try {
      const response = await fetch('/api/finanzen/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedFinanceIds,
          updates: updates
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle case where no valid records were found
        if (response.status === 404 && result.missingIds) {
          return {
            success: false,
            updatedCount: 0,
            total: selectedFinanceIds.length,
            missingIds: result.missingIds,
            updatedRecords: Array.isArray(result.updatedRecords) ? result.updatedRecords : [],
            error: result.error
          };
        }
        throw new Error(result.error || 'Fehler bei der Aktualisierung');
      }

      return {
        success: true,
        updatedCount: result.updatedCount || 0,
        total: selectedFinanceIds.length,
        missingIds: result.missingIds,
        updatedRecords: Array.isArray(result.updatedRecords) ? result.updatedRecords : []
      };
    } catch (error) {
      console.error('Fehler bei der Massenaktualisierung:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
        updatedCount: 0,
        total: selectedFinanceIds.length,
        updatedRecords: []
      };
    }
  };

  const handleAssignApartment = async () => {
    if (selectedApartment === "none") {
      toast({
        title: "Fehlende Auswahl",
        description: "Bitte wählen Sie eine Wohnung aus, um fortzufahren.",
        variant: "destructive"
      });
      return;
    }

    setIsUpdating(true);
    
    try {
      const result = await handleBulkUpdate({
        wohnung_id: selectedApartment === "none" ? null : selectedApartment
      });

      const failedUpdates = result.total - result.updatedCount;
      
      if (result.updatedCount > 0) {
        toast({
          title: "Erfolgreich aktualisiert",
          description: `${result.updatedCount} von ${result.total} Transaktionen wurden erfolgreich aktualisiert.`,
          variant: "success"
        });
      }
      
      if (failedUpdates > 0) {
        toast({
          title: "Teilweise Fehler",
          description: `Bei ${failedUpdates} von ${result.total} Transaktionen konnte die Aktualisierung nicht durchgeführt werden.`,
          variant: "destructive"
        });
      }
      
      // Only clear selection and close dialog if we had some successful updates
      if (result.updatedCount > 0) {
        if (result.updatedRecords?.length) {
          onUpdate?.(result.updatedRecords);
        }
        setIsAssignDialogOpen(false);
        setSelectedApartment("none");
        onClearSelection();
      } else if (result.error) {
        // Show specific error message if no updates were successful
        toast({
          title: "Aktualisierung fehlgeschlagen",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Transaktionen:", error);
      toast({
        title: "Fehler",
        description: "Es ist ein unerwarteter Fehler aufgetreten. Bitte versuchen Sie es später erneut.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangeType = async () => {
    if (selectedType === "none") {
      toast({
        title: "Fehlende Auswahl",
        description: "Bitte wählen Sie einen Typ aus, um fortzufahren.",
        variant: "destructive"
      });
      return;
    }

    setIsUpdating(true);
    
    try {
      const result = await handleBulkUpdate({
        ist_einnahmen: selectedType === "income"
      });

      const failedUpdates = result.total - result.updatedCount;
      
      if (result.updatedCount > 0) {
        toast({
          title: "Erfolgreich aktualisiert",
          description: `${result.updatedCount} von ${result.total} Transaktionen wurden erfolgreich aktualisiert.`,
          variant: "success"
        });
      }
      
      if (failedUpdates > 0) {
        toast({
          title: "Teilweise Fehler",
          description: `Bei ${failedUpdates} von ${result.total} Transaktionen konnte die Aktualisierung nicht durchgeführt werden.`,
          variant: "destructive"
        });
      }
      
      // Only clear selection and close dialog if we had some successful updates
      if (result.updatedCount > 0) {
        if (result.updatedRecords?.length) {
          onUpdate?.(result.updatedRecords);
        }
        setIsTypeDialogOpen(false);
        setSelectedType("none");
        onClearSelection();
      } else if (result.error) {
        // Show specific error message if no updates were successful
        toast({
          title: "Aktualisierung fehlgeschlagen",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Transaktionen:", error);
      toast({
        title: "Fehler",
        description: "Es ist ein unerwarteter Fehler aufgetreten. Bitte versuchen Sie es später erneut.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

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
          onClick={handleDeleteClick}
          disabled={isDeleting}
          className="h-8 gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
        >
          {isDeleting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Wird gelöscht...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4" />
              Löschen ({selectedFinances.size})
            </>
          )}
        </Button>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sind Sie sicher?</DialogTitle>
              <DialogDescription>
                Möchten Sie wirklich {selectedFinances.size} ausgewählte Transaktion{selectedFinances.size !== 1 ? 'en' : ''} löschen?
                Diese Aktion kann nicht rückgängig gemacht werden.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isDeleting}
              >
                Abbrechen
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird gelöscht...
                  </>
                ) : 'Löschen bestätigen'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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