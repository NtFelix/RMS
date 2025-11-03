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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import { Loader2, Plus, Trash2, Edit2, X, Check } from "lucide-react"
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
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editValue, setEditValue] = React.useState("")
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
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Fehler beim Hinzufügen")
      }

      const newZaehler = await response.json()
      setZaehlerList((prev) => [...prev, newZaehler])
      setNewCustomId("")
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
    if (!editValue.trim()) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/wasser-zaehler/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custom_id: editValue.trim() }),
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
      setEditValue("")
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
    setEditValue(zaehler.custom_id || "")
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue("")
  }

  const handleClose = () => {
    setNewCustomId("")
    setEditingId(null)
    setEditValue("")
    closeWasserZaehlerModal()
  }

  return (
    <>
      <Dialog open={isWasserZaehlerModalOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Wasserzähler verwalten</DialogTitle>
            <DialogDescription>
              Wasserzähler für Wohnung: {wasserZaehlerModalData?.wohnungName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Add new Wasserzähler */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="custom_id" className="sr-only">
                  Zähler-ID
                </Label>
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
              <Button
                onClick={handleAddZaehler}
                disabled={!newCustomId.trim() || isSaving}
                size="default"
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

            {/* List of existing Wasserzähler */}
            <div className="border rounded-lg">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : zaehlerList.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  Keine Wasserzähler vorhanden
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Zähler-ID</TableHead>
                      <TableHead className="w-[100px] text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zaehlerList.map((zaehler) => (
                      <TableRow key={zaehler.id}>
                        <TableCell>
                          {editingId === zaehler.id ? (
                            <div className="flex gap-2">
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleUpdateZaehler(zaehler.id)
                                  } else if (e.key === "Escape") {
                                    cancelEdit()
                                  }
                                }}
                                disabled={isSaving}
                                autoFocus
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleUpdateZaehler(zaehler.id)}
                                disabled={!editValue.trim() || isSaving}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={cancelEdit}
                                disabled={isSaving}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <span>{zaehler.custom_id || "-"}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {editingId !== zaehler.id && (
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startEdit(zaehler)}
                                disabled={isSaving}
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
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
