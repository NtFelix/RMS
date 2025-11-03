"use client"

import * as React from "react"
import { useModalStore } from "@/hooks/use-modal-store"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import { Loader2, Plus, Trash2, Edit2, X, Check, CircleGauge, Calendar } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface WasserZaehler {
  id: string
  custom_id: string | null
  wohnung_id: string
  erstellungsdatum: string
  eichungsdatum: string | null
}

export function WasserZaehlerModal() {
  const {
    isWasserZaehlerModalOpen,
    wasserZaehlerModalData,
    closeWasserZaehlerModal,
    setWasserZaehlerModalDirty,
  } = useModalStore()

  const [zaehlerList, setZaehlerList] = React.useState<WasserZaehler[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [newCustomId, setNewCustomId] = React.useState("")
  const [newEichungsdatum, setNewEichungsdatum] = React.useState("")
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editCustomId, setEditCustomId] = React.useState("")
  const [editEichungsdatum, setEditEichungsdatum] = React.useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [zaehlerToDelete, setZaehlerToDelete] = React.useState<string | null>(null)

  // Load existing Wasserzähler when modal opens
  React.useEffect(() => {
    if (isWasserZaehlerModalOpen && wasserZaehlerModalData?.wohnungId) {
      loadZaehler()
    }
  }, [isWasserZaehlerModalOpen, wasserZaehlerModalData?.wohnungId])

  const loadZaehler = async () => {
    if (!wasserZaehlerModalData?.wohnungId) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/wasser-zaehler?wohnung_id=${wasserZaehlerModalData.wohnungId}`)
      if (response.ok) {
        const data = await response.json()
        setZaehlerList(data)
      } else {
        throw new Error("Fehler beim Laden der Wasserzähler")
      }
    } catch (error) {
      console.error("Error loading Wasserzähler:", error)
      toast({
        title: "Fehler",
        description: "Wasserzähler konnten nicht geladen werden.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddZaehler = async () => {
    if (!newCustomId.trim() || !wasserZaehlerModalData?.wohnungId) return

    setIsSaving(true)
    try {
      const response = await fetch("/api/wasser-zaehler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          custom_id: newCustomId.trim(),
          wohnung_id: wasserZaehlerModalData.wohnungId,
          eichungsdatum: newEichungsdatum || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Fehler beim Hinzufügen")
      }

      const newZaehler = await response.json()
      setZaehlerList((prev) => [...prev, newZaehler])
      setNewCustomId("")
      setNewEichungsdatum("")
      setWasserZaehlerModalDirty(true)
      
      toast({
        title: "Erfolg",
        description: "Wasserzähler erfolgreich hinzugefügt.",
        variant: "success",
      })
    } catch (error) {
      console.error("Error adding Wasserzähler:", error)
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Wasserzähler konnte nicht hinzugefügt werden.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateZaehler = async (id: string) => {
    if (!editCustomId.trim()) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/wasser-zaehler/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          custom_id: editCustomId.trim(),
          eichungsdatum: editEichungsdatum || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Fehler beim Aktualisieren")
      }

      const updatedZaehler = await response.json()
      setZaehlerList((prev) =>
        prev.map((z) => (z.id === id ? updatedZaehler : z))
      )
      setEditingId(null)
      setEditCustomId("")
      setEditEichungsdatum("")
      setWasserZaehlerModalDirty(true)
      
      toast({
        title: "Erfolg",
        description: "Wasserzähler erfolgreich aktualisiert.",
        variant: "success",
      })
    } catch (error) {
      console.error("Error updating Wasserzähler:", error)
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Wasserzähler konnte nicht aktualisiert werden.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteZaehler = async () => {
    if (!zaehlerToDelete) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/wasser-zaehler/${zaehlerToDelete}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Fehler beim Löschen")
      }

      setZaehlerList((prev) => prev.filter((z) => z.id !== zaehlerToDelete))
      setDeleteDialogOpen(false)
      setZaehlerToDelete(null)
      setWasserZaehlerModalDirty(true)
      
      toast({
        title: "Erfolg",
        description: "Wasserzähler erfolgreich gelöscht.",
        variant: "success",
      })
    } catch (error) {
      console.error("Error deleting Wasserzähler:", error)
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Wasserzähler konnte nicht gelöscht werden.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const startEdit = (zaehler: WasserZaehler) => {
    setEditingId(zaehler.id)
    setEditCustomId(zaehler.custom_id || "")
    setEditEichungsdatum(zaehler.eichungsdatum || "")
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditCustomId("")
    setEditEichungsdatum("")
  }

  const handleClose = () => {
    setNewCustomId("")
    setNewEichungsdatum("")
    setEditingId(null)
    setEditCustomId("")
    setEditEichungsdatum("")
    closeWasserZaehlerModal()
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    const date = new Date(dateString)
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  return (
    <>
      <Dialog open={isWasserZaehlerModalOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Wasserzähler verwalten</DialogTitle>
            <DialogDescription>
              Wasserzähler für Wohnung: <span className="font-medium">{wasserZaehlerModalData?.wohnungName}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            {/* Add new Wasserzähler */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Neuen Wasserzähler hinzufügen</Label>
              <div className="flex gap-2">
                <div className="flex-1 space-y-2">
                  <Input
                    id="custom_id"
                    placeholder="Zähler-ID eingeben..."
                    value={newCustomId}
                    onChange={(e) => setNewCustomId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newCustomId.trim()) {
                        handleAddZaehler()
                      }
                    }}
                    disabled={isSaving}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Input
                    id="eichungsdatum"
                    type="date"
                    placeholder="Eichungsdatum (optional)"
                    value={newEichungsdatum}
                    onChange={(e) => setNewEichungsdatum(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
                <Button
                  onClick={handleAddZaehler}
                  disabled={!newCustomId.trim() || isSaving}
                  size="default"
                  className="self-start"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Hinzufügen
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* List of existing Wasserzähler */}
            <div className="space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : zaehlerList.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                    <CircleGauge className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Keine Wasserzähler vorhanden
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Fügen Sie oben einen neuen Wasserzähler hinzu
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {zaehlerList.map((zaehler) => (
                    <Card key={zaehler.id} className="overflow-hidden hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        {editingId === zaehler.id ? (
                          // Edit Mode
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 mt-1">
                                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                  <CircleGauge className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                              </div>
                              <div className="flex-1 space-y-3">
                                <div>
                                  <Label htmlFor={`edit-custom-id-${zaehler.id}`} className="text-xs text-muted-foreground">
                                    Zähler-ID
                                  </Label>
                                  <Input
                                    id={`edit-custom-id-${zaehler.id}`}
                                    value={editCustomId}
                                    onChange={(e) => setEditCustomId(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        handleUpdateZaehler(zaehler.id)
                                      } else if (e.key === "Escape") {
                                        cancelEdit()
                                      }
                                    }}
                                    disabled={isSaving}
                                    placeholder="Zähler-ID"
                                    autoFocus
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`edit-eichungsdatum-${zaehler.id}`} className="text-xs text-muted-foreground">
                                    Eichungsdatum
                                  </Label>
                                  <Input
                                    id={`edit-eichungsdatum-${zaehler.id}`}
                                    type="date"
                                    value={editEichungsdatum}
                                    onChange={(e) => setEditEichungsdatum(e.target.value)}
                                    disabled={isSaving}
                                    className="mt-1"
                                  />
                                </div>
                                <div className="flex gap-2 pt-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateZaehler(zaehler.id)}
                                    disabled={!editCustomId.trim() || isSaving}
                                    className="flex-1"
                                  >
                                    <Check className="h-4 w-4 mr-2" />
                                    Speichern
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={cancelEdit}
                                    disabled={isSaving}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          // View Mode
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <CircleGauge className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-base truncate">
                                    {zaehler.custom_id || "Unbenannt"}
                                  </h4>
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {zaehler.eichungsdatum && (
                                      <Badge variant="secondary" className="text-xs font-normal">
                                        <Calendar className="h-3 w-3 mr-1" />
                                        Eichung: {formatDate(zaehler.eichungsdatum)}
                                      </Badge>
                                    )}
                                    <Badge variant="outline" className="text-xs font-normal">
                                      Erstellt: {formatDate(zaehler.erstellungsdatum)}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => startEdit(zaehler)}
                                    disabled={isSaving}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setZaehlerToDelete(zaehler.id)
                                      setDeleteDialogOpen(true)
                                    }}
                                    disabled={isSaving}
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wasserzähler löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie diesen Wasserzähler wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteZaehler}
              disabled={isSaving}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSaving ? "Löschen..." : "Löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
