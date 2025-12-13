"use client"

import * as React from "react"
import { useModalStore } from "@/hooks/use-modal-store"
import { useOnboardingStore } from "@/hooks/use-onboarding-store"
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
import {
  Loader2,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  CircleGauge,
  Calendar as CalendarIcon,
  Gauge,
  Clock,
  Hash,
  Droplet,
  Archive
} from "lucide-react"
import { WaterDropletLoader } from "@/components/ui/water-droplet-loader"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { format } from "date-fns"
import { de } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
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
  latest_reading?: {
    ablese_datum: string
    zaehlerstand: number
    verbrauch: number
  } | null
}

export function WasserZaehlerModal() {
  const {
    isWasserZaehlerModalOpen,
    wasserZaehlerModalData,
    closeWasserZaehlerModal,
    setWasserZaehlerModalDirty,
    openWasserAblesenModal,
  } = useModalStore()

  const [zaehlerList, setZaehlerList] = React.useState<WasserZaehler[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [newCustomId, setNewCustomId] = React.useState("")
  const [newEichungsdatum, setNewEichungsdatum] = React.useState<Date | undefined>(undefined)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editCustomId, setEditCustomId] = React.useState("")
  const [editEichungsdatum, setEditEichungsdatum] = React.useState<Date | undefined>(undefined)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [zaehlerToDelete, setZaehlerToDelete] = React.useState<string | null>(null)
  const [showExpiredMeters, setShowExpiredMeters] = React.useState(false)

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
          eichungsdatum: newEichungsdatum ? format(newEichungsdatum, "yyyy-MM-dd") : null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Fehler beim Hinzufügen")
      }

      const newZaehler = await response.json()
      setZaehlerList((prev) => [...prev, newZaehler])
      setNewCustomId("")
      setNewEichungsdatum(undefined)

      useOnboardingStore.getState().completeStep('create-meter-form');

      // The useEffect with hasUnsavedChanges will automatically update the dirty state
      // when the form state is cleared above

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
          eichungsdatum: editEichungsdatum ? format(editEichungsdatum, "yyyy-MM-dd") : null,
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
      setEditEichungsdatum(undefined)

      // The useEffect with hasUnsavedChanges will automatically update the dirty state
      // when the form state is cleared above

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
      setZaehlerToDelete(null)
      setDeleteDialogOpen(false)

      // The useEffect with hasUnsavedChanges will automatically update the dirty state
      // when the list is updated

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
    setEditEichungsdatum(zaehler.eichungsdatum ? new Date(zaehler.eichungsdatum) : undefined)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditCustomId("")
    setEditEichungsdatum(undefined)
    setWasserZaehlerModalDirty(false)
  }

  const handleClose = () => {
    setNewCustomId("")
    setNewEichungsdatum(undefined)
    setEditingId(null)
    setEditCustomId("")
    setEditEichungsdatum(undefined)
    setWasserZaehlerModalDirty(false)
    closeWasserZaehlerModal()
  }

  // Check if there are unsaved changes in edit mode or new meter form
  const hasUnsavedChanges = React.useMemo(() => {
    // Check if there's unsaved data in the new meter form
    if (newCustomId.trim() || newEichungsdatum) {
      return true
    }

    // Check if there are unsaved changes in edit mode
    if (editingId) {
      const originalZaehler = zaehlerList.find(z => z.id === editingId)
      if (originalZaehler) {
        const customIdChanged = editCustomId !== (originalZaehler.custom_id || "")
        const dateChanged = (editEichungsdatum ? format(editEichungsdatum, 'yyyy-MM-dd') : null) !== originalZaehler.eichungsdatum
        return customIdChanged || dateChanged
      }
    }

    return false
  }, [newCustomId, newEichungsdatum, editingId, editCustomId, editEichungsdatum, zaehlerList])

  // Update modal dirty state when unsaved changes are detected
  React.useEffect(() => {
    setWasserZaehlerModalDirty(hasUnsavedChanges)
  }, [hasUnsavedChanges, setWasserZaehlerModalDirty])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    const date = new Date(dateString)
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  // Check if a water meter's calibration date has expired (is before today)
  const isExpired = (eichungsdatum: string | null) => {
    if (!eichungsdatum) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const calibrationDate = new Date(eichungsdatum)
    calibrationDate.setHours(0, 0, 0, 0)
    return calibrationDate < today
  }

  // Separate active and expired meters
  const activeMeters = zaehlerList.filter(z => !isExpired(z.eichungsdatum))
  const expiredMeters = zaehlerList.filter(z => isExpired(z.eichungsdatum))
  const metersToDisplay = showExpiredMeters ? zaehlerList : activeMeters

  return (
    <>
      <Dialog open={isWasserZaehlerModalOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent
          id="meter-form-container"
          className="sm:max-w-[700px] max-h-[85vh] flex flex-col"
          isDirty={hasUnsavedChanges}
          onAttemptClose={handleClose}
        >
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
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newEichungsdatum && "text-muted-foreground"
                        )}
                        disabled={isSaving}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newEichungsdatum ? (
                          format(newEichungsdatum, "dd.MM.yyyy", { locale: de })
                        ) : (
                          <span>Eichungsdatum (optional)</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newEichungsdatum}
                        onSelect={setNewEichungsdatum}
                        locale={de}
                        captionLayout="dropdown"
                        fromYear={1990}
                        toYear={new Date().getFullYear() + 10}
                        initialFocus
                      />
                      {newEichungsdatum && (
                        <div className="p-3 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => setNewEichungsdatum(undefined)}
                          >
                            Datum löschen
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
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
                <div className="flex flex-col items-center justify-center p-12 space-y-4">
                  <WaterDropletLoader size="md" />
                  <p className="text-sm text-muted-foreground animate-pulse">
                    Lade Wasserzähler...
                  </p>
                </div>
              ) : zaehlerList.length === 0 ? (
                <Card className="bg-gray-50 dark:bg-[#22272e] border border-dashed border-gray-300 dark:border-gray-600 rounded-3xl">
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
                <div className="space-y-3">
                  {/* Active meters */}
                  <div className="grid gap-3">
                    {activeMeters.map((zaehler) => (
                      <Card key={zaehler.id} className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-all duration-300">
                        <CardContent className="p-0">
                          <AnimatePresence mode="wait">
                            {editingId === zaehler.id ? (
                              // Edit Mode
                              <motion.div
                                key="edit"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                className="p-4 space-y-4"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                      <CircleGauge className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <span className="text-sm font-medium text-muted-foreground">Bearbeiten</span>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      onClick={() => handleUpdateZaehler(zaehler.id)}
                                      disabled={!editCustomId.trim() || isSaving}
                                    >
                                      <Check className="h-4 w-4 mr-1" />
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

                                <Separator />

                                <div className="space-y-3">
                                  <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2, delay: 0.1 }}
                                  >
                                    <Label htmlFor={`edit-custom-id-${zaehler.id}`} className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Hash className="h-3 w-3" />
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
                                      className="mt-1.5"
                                    />
                                  </motion.div>
                                  <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2, delay: 0.2 }}
                                  >
                                    <Label htmlFor={`edit-eichungsdatum-${zaehler.id}`} className="text-xs text-muted-foreground flex items-center gap-1">
                                      <CalendarIcon className="h-3 w-3" />
                                      Eichungsdatum
                                    </Label>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="outline"
                                          className={cn(
                                            "w-full justify-start text-left font-normal mt-1.5",
                                            !editEichungsdatum && "text-muted-foreground"
                                          )}
                                          disabled={isSaving}
                                        >
                                          <CalendarIcon className="mr-2 h-4 w-4" />
                                          {editEichungsdatum ? (
                                            format(editEichungsdatum, "dd.MM.yyyy", { locale: de })
                                          ) : (
                                            <span>Datum wählen</span>
                                          )}
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                          mode="single"
                                          selected={editEichungsdatum}
                                          onSelect={setEditEichungsdatum}
                                          locale={de}
                                          captionLayout="dropdown"
                                          fromYear={1990}
                                          toYear={new Date().getFullYear() + 10}
                                          initialFocus
                                        />
                                        {editEichungsdatum && (
                                          <div className="p-3 border-t">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="w-full"
                                              onClick={() => setEditEichungsdatum(undefined)}
                                            >
                                              Datum löschen
                                            </Button>
                                          </div>
                                        )}
                                      </PopoverContent>
                                    </Popover>
                                  </motion.div>
                                </div>
                              </motion.div>
                            ) : (
                              // View Mode
                              <motion.div
                                key="view"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2, ease: "easeInOut" }}
                              >
                                {/* Header */}
                                <div className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <CircleGauge className="h-5 w-5 text-primary" />
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <h4 className="font-semibold text-base">
                                            {zaehler.custom_id || "Unbenannt"}
                                          </h4>
                                          {isExpired(zaehler.eichungsdatum) && (
                                            <Badge variant="destructive" className="text-xs">
                                              Abgelaufen
                                            </Badge>
                                          )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">Wasserzähler</p>
                                      </div>
                                    </div>
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => openWasserAblesenModal(zaehler.id, wasserZaehlerModalData?.wohnungName || "", zaehler.custom_id || undefined)}
                                        disabled={isSaving}
                                        className="h-8 w-8 p-0"
                                        title="Ablesungen verwalten"
                                      >
                                        <Droplet className="h-4 w-4" />
                                      </Button>
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

                                <Separator className="bg-gray-200 dark:bg-gray-700" />

                                {/* Information Grid */}
                                <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                  {/* Zählerstand (Placeholder) */}
                                  <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: 0.1 }}
                                    className="flex items-start gap-2"
                                  >
                                    <div className="flex-shrink-0 mt-0.5">
                                      <Gauge className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-muted-foreground mb-1">Zählerstand</p>
                                      {zaehler.latest_reading ? (
                                        <p className="text-sm font-medium">
                                          {zaehler.latest_reading.zaehlerstand} m³
                                        </p>
                                      ) : (
                                        <p className="text-sm font-medium text-muted-foreground italic">
                                          Noch nicht erfasst
                                        </p>
                                      )}
                                    </div>
                                  </motion.div>

                                  {/* Eichungsdatum */}
                                  <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: 0.2 }}
                                    className="flex items-start gap-2"
                                  >
                                    <div className="flex-shrink-0 mt-0.5">
                                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-muted-foreground mb-1">Eichungsdatum</p>
                                      <p className="text-sm font-medium">
                                        {zaehler.eichungsdatum ? formatDate(zaehler.eichungsdatum) : (
                                          <span className="text-muted-foreground italic">Nicht gesetzt</span>
                                        )}
                                      </p>
                                    </div>
                                  </motion.div>

                                  {/* Letzte Ablesung */}
                                  <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: 0.3 }}
                                    className="flex items-start gap-2"
                                  >
                                    <div className="flex-shrink-0 mt-0.5">
                                      <Clock className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-muted-foreground mb-1">Letzte Ablesung</p>
                                      {zaehler.latest_reading ? (
                                        <p className="text-sm font-medium">
                                          {formatDate(zaehler.latest_reading.ablese_datum)}
                                        </p>
                                      ) : (
                                        <p className="text-sm font-medium text-muted-foreground italic">
                                          Noch keine Ablesung
                                        </p>
                                      )}
                                    </div>
                                  </motion.div>
                                </div>

                                {/* Footer */}
                                <div className="px-4 pb-4">
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    <span>Erstellt am {formatDate(zaehler.erstellungsdatum)}</span>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Toggle button for expired meters */}
                  {expiredMeters.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => setShowExpiredMeters(!showExpiredMeters)}
                      className="w-full gap-2"
                    >
                      <Archive className="h-4 w-4" />
                      {showExpiredMeters
                        ? `Alte Wasserzähler ausblenden (${expiredMeters.length})`
                        : `Alte Wasserzähler anzeigen (${expiredMeters.length})`
                      }
                    </Button>
                  )}

                  {/* Expired meters - shown below the button when toggled */}
                  {showExpiredMeters && expiredMeters.length > 0 && (
                    <div className="grid gap-3">
                      {expiredMeters.map((zaehler) => (
                        <Card key={zaehler.id} className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-all duration-300">
                          <CardContent className="p-0">
                            <AnimatePresence mode="wait">
                              {editingId === zaehler.id ? (
                                // Edit Mode
                                <motion.div
                                  key="edit"
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 10 }}
                                  transition={{ duration: 0.2, ease: "easeInOut" }}
                                  className="p-4 space-y-4"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                        <CircleGauge className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                      </div>
                                      <span className="text-sm font-medium text-muted-foreground">Bearbeiten</span>
                                    </div>
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        onClick={() => handleUpdateZaehler(zaehler.id)}
                                        disabled={!editCustomId.trim() || isSaving}
                                      >
                                        <Check className="h-4 w-4 mr-1" />
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

                                  <Separator />

                                  <div className="space-y-3">
                                    <motion.div
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ duration: 0.2, delay: 0.1 }}
                                    >
                                      <Label htmlFor={`edit-custom-id-${zaehler.id}`} className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Hash className="h-3 w-3" />
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
                                        className="mt-1.5"
                                      />
                                    </motion.div>
                                    <motion.div
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ duration: 0.2, delay: 0.2 }}
                                    >
                                      <Label htmlFor={`edit-eichungsdatum-${zaehler.id}`} className="text-xs text-muted-foreground flex items-center gap-1">
                                        <CalendarIcon className="h-3 w-3" />
                                        Eichungsdatum
                                      </Label>
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Button
                                            variant="outline"
                                            className={cn(
                                              "w-full justify-start text-left font-normal mt-1.5",
                                              !editEichungsdatum && "text-muted-foreground"
                                            )}
                                            disabled={isSaving}
                                          >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {editEichungsdatum ? (
                                              format(editEichungsdatum, "dd.MM.yyyy", { locale: de })
                                            ) : (
                                              <span>Datum wählen</span>
                                            )}
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                          <Calendar
                                            mode="single"
                                            selected={editEichungsdatum}
                                            onSelect={setEditEichungsdatum}
                                            locale={de}
                                            captionLayout="dropdown"
                                            fromYear={1990}
                                            toYear={new Date().getFullYear() + 10}
                                            initialFocus
                                          />
                                          {editEichungsdatum && (
                                            <div className="p-3 border-t">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-full"
                                                onClick={() => setEditEichungsdatum(undefined)}
                                              >
                                                Datum löschen
                                              </Button>
                                            </div>
                                          )}
                                        </PopoverContent>
                                      </Popover>
                                    </motion.div>
                                  </div>
                                </motion.div>
                              ) : (
                                // View Mode
                                <motion.div
                                  key="view"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ duration: 0.2, ease: "easeInOut" }}
                                >
                                  {/* Header */}
                                  <div className="p-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                          <CircleGauge className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-base">
                                              {zaehler.custom_id || "Unbenannt"}
                                            </h4>
                                            {isExpired(zaehler.eichungsdatum) && (
                                              <Badge variant="destructive" className="text-xs">
                                                Abgelaufen
                                              </Badge>
                                            )}
                                          </div>
                                          <p className="text-xs text-muted-foreground">Wasserzähler</p>
                                        </div>
                                      </div>
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => openWasserAblesenModal(zaehler.id, wasserZaehlerModalData?.wohnungName || "", zaehler.custom_id || undefined)}
                                          disabled={isSaving}
                                          className="h-8 w-8 p-0"
                                          title="Ablesungen verwalten"
                                        >
                                          <Droplet className="h-4 w-4" />
                                        </Button>
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

                                  <Separator className="bg-gray-200 dark:bg-gray-700" />

                                  {/* Information Grid */}
                                  <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {/* Zählerstand */}
                                    <motion.div
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ duration: 0.3, delay: 0.1 }}
                                      className="flex items-start gap-2"
                                    >
                                      <div className="flex-shrink-0 mt-0.5">
                                        <Gauge className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs text-muted-foreground mb-1">Zählerstand</p>
                                        {zaehler.latest_reading ? (
                                          <p className="text-sm font-medium">
                                            {zaehler.latest_reading.zaehlerstand} m³
                                          </p>
                                        ) : (
                                          <p className="text-sm font-medium text-muted-foreground italic">
                                            Noch nicht erfasst
                                          </p>
                                        )}
                                      </div>
                                    </motion.div>

                                    {/* Eichungsdatum */}
                                    <motion.div
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ duration: 0.3, delay: 0.2 }}
                                      className="flex items-start gap-2"
                                    >
                                      <div className="flex-shrink-0 mt-0.5">
                                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs text-muted-foreground mb-1">Eichungsdatum</p>
                                        <p className="text-sm font-medium">
                                          {zaehler.eichungsdatum ? formatDate(zaehler.eichungsdatum) : (
                                            <span className="text-muted-foreground italic">Nicht gesetzt</span>
                                          )}
                                        </p>
                                      </div>
                                    </motion.div>

                                    {/* Letzte Ablesung */}
                                    <motion.div
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ duration: 0.3, delay: 0.3 }}
                                      className="flex items-start gap-2"
                                    >
                                      <div className="flex-shrink-0 mt-0.5">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs text-muted-foreground mb-1">Letzte Ablesung</p>
                                        {zaehler.latest_reading ? (
                                          <p className="text-sm font-medium">
                                            {formatDate(zaehler.latest_reading.ablese_datum)}
                                          </p>
                                        ) : (
                                          <p className="text-sm font-medium text-muted-foreground italic">
                                            Noch keine Ablesung
                                          </p>
                                        )}
                                      </div>
                                    </motion.div>
                                  </div>

                                  {/* Footer */}
                                  <div className="px-4 pb-4">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Clock className="h-3 w-3" />
                                      <span>Erstellt am {formatDate(zaehler.erstellungsdatum)}</span>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
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
