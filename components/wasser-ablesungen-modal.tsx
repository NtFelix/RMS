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
import { NumberInput } from "@/components/ui/number-input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import {
  Loader2,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  Droplet,
  Calendar as CalendarIcon,
  Gauge,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  MessageSquare
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
import { formatNumber } from "@/utils/format"
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

interface WasserAblesung {
  id: string
  ablese_datum: string | null
  zaehlerstand: number | null
  verbrauch: number
  wasser_zaehler_id: string
  user_id: string
  kommentar?: string | null
}

export function WasserAblesenModal() {
  const {
    isWasserAblesenModalOpen,
    wasserAblesenModalData,
    closeWasserAblesenModal,
    setWasserAblesenModalDirty,
  } = useModalStore()

  const [ablesenList, setAblesenList] = React.useState<WasserAblesung[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [newAbleseDatum, setNewAbleseDatum] = React.useState<Date | undefined>(undefined)
  const [newZaehlerstand, setNewZaehlerstand] = React.useState("")
  const [newVerbrauch, setNewVerbrauch] = React.useState("")
  const [newVerbrauchWarning, setNewVerbrauchWarning] = React.useState("")
  const [newKommentar, setNewKommentar] = React.useState("")
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editAbleseDatum, setEditAbleseDatum] = React.useState<Date | undefined>(undefined)
  const [editZaehlerstand, setEditZaehlerstand] = React.useState("")
  const [editVerbrauch, setEditVerbrauch] = React.useState("")
  const [editVerbrauchWarning, setEditVerbrauchWarning] = React.useState("")
  const [editKommentar, setEditKommentar] = React.useState("")
  const [currentAblesung, setCurrentAblesung] = React.useState<WasserAblesung | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [ablesenToDelete, setAblesenToDelete] = React.useState<string | null>(null)

  // Load existing Wasser_Ablesungen when modal opens
  React.useEffect(() => {
    if (isWasserAblesenModalOpen && wasserAblesenModalData?.wasserZaehlerId) {
      loadAblesungen()
    }
  }, [isWasserAblesenModalOpen, wasserAblesenModalData?.wasserZaehlerId])

  const loadAblesungen = async () => {
    if (!wasserAblesenModalData?.wasserZaehlerId) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/wasser-ablesungen?wasser_zaehler_id=${wasserAblesenModalData.wasserZaehlerId}`)
      if (response.ok) {
        const data = await response.json()
        // Sort by date descending (newest first)
        const sortedData = data.sort((a: WasserAblesung, b: WasserAblesung) => {
          const dateA = a.ablese_datum ? new Date(a.ablese_datum).getTime() : 0
          const dateB = b.ablese_datum ? new Date(b.ablese_datum).getTime() : 0
          return dateB - dateA
        })
        setAblesenList(sortedData)
      } else {
        throw new Error("Fehler beim Laden der Ablesungen")
      }
    } catch (error) {
      console.error("Error loading Wasser_Ablesungen:", error)
      toast({
        title: "Fehler",
        description: "Ablesungen konnten nicht geladen werden.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Smart calculation for new reading
  const handleNewZaehlerstandChange = (value: string) => {
    setNewZaehlerstand(value)

    const currentReading = parseFloat(value)
    if (isNaN(currentReading) || !value.trim()) {
      setNewVerbrauch("")
      setNewVerbrauchWarning("")
      return
    }

    // Get the most recent reading (first in sorted list)
    const previousReading = ablesenList[0]

    if (previousReading && previousReading.zaehlerstand !== null) {
      const consumption = currentReading - previousReading.zaehlerstand
      setNewVerbrauch(consumption.toFixed(2))

      // Only show warnings for significant differences
      if (consumption < 0) {
        setNewVerbrauchWarning("error|Negativer Verbrauch - Zählerstand ist niedriger als vorherige Ablesung")
      } else if (previousReading.verbrauch > 0) {
        const changePercent = ((consumption - previousReading.verbrauch) / previousReading.verbrauch) * 100
        if (changePercent > 50) {
          setNewVerbrauchWarning(`warning|Verbrauch ist ${changePercent.toFixed(0)}% höher als letzte Ablesung (${previousReading.verbrauch} m³)`)
        } else if (changePercent < -50) {
          setNewVerbrauchWarning(`info|Verbrauch ist ${Math.abs(changePercent).toFixed(0)}% niedriger als letzte Ablesung (${previousReading.verbrauch} m³)`)
        } else {
          setNewVerbrauchWarning("")
        }
      } else if (consumption > 1000) {
        setNewVerbrauchWarning("warning|Sehr hoher Verbrauch - bitte überprüfen")
      } else {
        setNewVerbrauchWarning("")
      }
    } else {
      // No previous reading, user must enter consumption manually
      setNewVerbrauch("")
      setNewVerbrauchWarning("")
    }
  }

  // Find the most recent reading before the specified date
  const findPreviousReading = (date: Date, currentId: string) => {
    // Get all readings that are before the specified date and not the current reading
    const readingsBeforeDate = ablesenList.filter(a =>
      a.id !== currentId &&
      a.ablese_datum &&
      new Date(a.ablese_datum) < date
    )

    // The list is already sorted descending, so the first element is the most recent one before our date
    return readingsBeforeDate[0] || null
  }

  // Smart calculation for editing
  const handleEditZaehlerstandChange = (value: string, currentAblesung: WasserAblesung) => {
    setEditZaehlerstand(value)

    const currentReading = parseFloat(value)
    if (isNaN(currentReading) || !value.trim()) {
      setEditVerbrauch("")
      setEditVerbrauchWarning("")
      return
    }

    // Use the current date in the form or the original reading's date
    const currentDate = editAbleseDatum ||
      (currentAblesung.ablese_datum ? new Date(currentAblesung.ablese_datum) : new Date())

    // Find the previous reading based on the current date
    const previousReading = findPreviousReading(currentDate, currentAblesung.id)

    if (previousReading?.zaehlerstand !== null && previousReading?.zaehlerstand !== undefined) {
      const consumption = currentReading - previousReading.zaehlerstand
      setEditVerbrauch(consumption.toFixed(2))

      // Only show warnings for significant differences
      if (consumption < 0) {
        setEditVerbrauchWarning("error|Negativer Verbrauch - Zählerstand ist niedriger als vorherige Ablesung")
      } else if (previousReading.verbrauch > 0) {
        const changePercent = ((consumption - previousReading.verbrauch) / previousReading.verbrauch) * 100
        if (changePercent > 50) {
          setEditVerbrauchWarning(`warning|Verbrauch ist ${changePercent.toFixed(0)}% höher als vorherige Ablesung (${previousReading.verbrauch} m³)`)
        } else if (changePercent < -50) {
          setEditVerbrauchWarning(`info|Verbrauch ist ${Math.abs(changePercent).toFixed(0)}% niedriger als vorherige Ablesung (${previousReading.verbrauch} m³)`)
        } else {
          setEditVerbrauchWarning("")
        }
      } else if (consumption > 1000) {
        setEditVerbrauchWarning("warning|Sehr hoher Verbrauch - bitte überprüfen")
      } else {
        setEditVerbrauchWarning("")
      }
    } else {
      // No previous reading
      setEditVerbrauch("")
      setEditVerbrauchWarning("")
    }
  }

  const handleAddAblesung = async () => {
    if (!newZaehlerstand.trim() || !wasserAblesenModalData?.wasserZaehlerId) return

    setIsSaving(true)
    try {
      const response = await fetch("/api/wasser-ablesungen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ablese_datum: newAbleseDatum ? format(newAbleseDatum, "yyyy-MM-dd") : null,
          zaehlerstand: parseFloat(newZaehlerstand),
          verbrauch: parseFloat(newVerbrauch) || 0,
          wasser_zaehler_id: wasserAblesenModalData.wasserZaehlerId,
          kommentar: newKommentar.trim() || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Fehler beim Hinzufügen")
      }

      const newAblesung = await response.json()
      setAblesenList((prev) => [newAblesung, ...prev])
      setNewAbleseDatum(undefined)
      setNewZaehlerstand("")
      setNewVerbrauch("")
      setNewVerbrauchWarning("")
      setNewKommentar("")

      // The useEffect with hasUnsavedChanges will automatically update the dirty state
      // when the form state is cleared below

      toast({
        title: "Erfolg",
        description: "Ablesung erfolgreich hinzugefügt.",
        variant: "success",
      })
    } catch (error) {
      console.error("Error adding Wasser_Ablesung:", error)
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Ablesung konnte nicht hinzugefügt werden.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateAblesung = async (id: string) => {
    if (!editZaehlerstand.trim()) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/wasser-ablesungen/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ablese_datum: editAbleseDatum ? format(editAbleseDatum, "yyyy-MM-dd") : null,
          zaehlerstand: parseFloat(editZaehlerstand),
          verbrauch: parseFloat(editVerbrauch) || 0,
          kommentar: editKommentar.trim() || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Fehler beim Aktualisieren")
      }

      const updatedAblesung = await response.json()

      // Update the list with the updated reading and re-sort by date
      setAblesenList((prev) => {
        const updatedList = prev.map((a) => (a.id === id ? updatedAblesung : a))

        // Sort by date descending (newest first)
        return updatedList.sort((a, b) => {
          const dateA = a.ablese_datum ? new Date(a.ablese_datum).getTime() : 0
          const dateB = b.ablese_datum ? new Date(b.ablese_datum).getTime() : 0
          return dateB - dateA
        })
      })

      setEditingId(null)
      setEditAbleseDatum(undefined)
      setEditZaehlerstand("")
      setEditVerbrauch("")
      setEditVerbrauchWarning("")
      setEditKommentar("")
      setCurrentAblesung(null)

      // The useEffect with hasUnsavedChanges will automatically update the dirty state
      // when the form state is cleared below

      toast({
        title: "Erfolg",
        description: "Ablesung erfolgreich aktualisiert.",
        variant: "success",
      })
    } catch (error) {
      console.error("Error updating Wasser_Ablesung:", error)
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Ablesung konnte nicht aktualisiert werden.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAblesung = async () => {
    if (!ablesenToDelete) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/wasser-ablesungen/${ablesenToDelete}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Fehler beim Löschen")
      }

      setAblesenList((prev) => prev.filter((a) => a.id !== ablesenToDelete))
      setDeleteDialogOpen(false)
      setAblesenToDelete(null)
      setWasserAblesenModalDirty(true)

      toast({
        title: "Erfolg",
        description: "Ablesung erfolgreich gelöscht.",
        variant: "success",
      })
    } catch (error) {
      console.error("Error deleting Wasser_Ablesung:", error)
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Ablesung konnte nicht gelöscht werden.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const startEdit = (ablesung: WasserAblesung) => {
    setEditingId(ablesung.id)
    setCurrentAblesung(ablesung)
    setEditAbleseDatum(ablesung.ablese_datum ? new Date(ablesung.ablese_datum) : undefined)
    setEditZaehlerstand(ablesung.zaehlerstand?.toString() || "")
    setEditVerbrauch(ablesung.verbrauch.toString())
    setEditVerbrauchWarning("")
    setEditKommentar(ablesung.kommentar || "")
  }

  const handleEdit = (ablesung: WasserAblesung) => {
    setEditingId(ablesung.id)
    setEditZaehlerstand(ablesung.zaehlerstand?.toString() || "")
    setEditVerbrauch(ablesung.verbrauch.toString())
    setEditVerbrauchWarning("")
    setEditKommentar(ablesung.kommentar || "")
    setEditAbleseDatum(ablesung.ablese_datum ? new Date(ablesung.ablese_datum) : undefined)
    setCurrentAblesung(ablesung)
  }

  // Handle date change and recalculate consumption if needed
  const handleEditDateChange = (date: Date | undefined, currentAblesung: WasserAblesung) => {
    setEditAbleseDatum(date)

    // Only recalculate if we have a zaehlerstand value and a valid date
    if (editZaehlerstand && date) {
      // Find the previous reading based on the new date
      const previousReading = findPreviousReading(date, currentAblesung.id)

      // If we have a previous reading, recalculate the consumption
      if (previousReading?.zaehlerstand !== null && previousReading?.zaehlerstand !== undefined) {
        const currentReading = parseFloat(editZaehlerstand)
        if (!isNaN(currentReading)) {
          const consumption = currentReading - previousReading.zaehlerstand
          setEditVerbrauch(consumption.toFixed(2))

          // Update warnings if needed
          if (consumption < 0) {
            setEditVerbrauchWarning("error|Negativer Verbrauch - Zählerstand ist niedriger als vorherige Ablesung")
          } else if (previousReading.verbrauch > 0) {
            const changePercent = ((consumption - previousReading.verbrauch) / previousReading.verbrauch) * 100
            if (changePercent > 50) {
              setEditVerbrauchWarning(`warning|Verbrauch ist ${changePercent.toFixed(0)}% höher als vorherige Ablesung (${previousReading.verbrauch} m³)`)
            } else if (changePercent < -50) {
              setEditVerbrauchWarning(`info|Verbrauch ist ${Math.abs(changePercent).toFixed(0)}% niedriger als vorherige Ablesung (${previousReading.verbrauch} m³)`)
            } else {
              setEditVerbrauchWarning("")
            }
          } else if (consumption > 1000) {
            setEditVerbrauchWarning("warning|Sehr hoher Verbrauch - bitte überprüfen")
          } else {
            setEditVerbrauchWarning("")
          }
        }
      } else {
        // No previous reading found, clear the consumption
        setEditVerbrauch("")
        setEditVerbrauchWarning("")
      }
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditAbleseDatum(undefined)
    setEditZaehlerstand("")
    setEditVerbrauch("")
    setEditVerbrauchWarning("")
    setEditKommentar("")
    setCurrentAblesung(null)
    setWasserAblesenModalDirty(false)
  }

  const handleClose = () => {
    setNewAbleseDatum(undefined)
    setNewZaehlerstand("")
    setNewVerbrauch("")
    setNewVerbrauchWarning("")
    setNewKommentar("")
    setEditingId(null)
    setEditAbleseDatum(undefined)
    setEditZaehlerstand("")
    setEditVerbrauch("")
    setEditVerbrauchWarning("")
    setEditKommentar("")
    setWasserAblesenModalDirty(false)
    closeWasserAblesenModal()
  }

  // Check if there are unsaved changes in edit mode or new reading form
  const hasUnsavedChanges = React.useMemo(() => {
    // Check if there's unsaved data in the new reading form
    if (newAbleseDatum || newZaehlerstand.trim() || newVerbrauch.trim() || newKommentar.trim()) {
      return true
    }

    // Check if there are unsaved changes in edit mode
    if (editingId) {
      const originalAblesung = ablesenList.find(a => a.id === editingId)
      if (originalAblesung) {
        const dateChanged = editAbleseDatum?.toISOString().split('T')[0] !== originalAblesung.ablese_datum
        const zaehlerstandChanged = editZaehlerstand !== (originalAblesung.zaehlerstand?.toString() || "")
        const verbrauchChanged = editVerbrauch !== originalAblesung.verbrauch.toString()
        const kommentarChanged = editKommentar !== (originalAblesung.kommentar || "")
        return dateChanged || zaehlerstandChanged || verbrauchChanged || kommentarChanged
      }
    }

    return false
  }, [newAbleseDatum, newZaehlerstand, newVerbrauch, editingId, editAbleseDatum, editZaehlerstand, editVerbrauch, ablesenList])

  // Update modal dirty state when unsaved changes are detected
  React.useEffect(() => {
    setWasserAblesenModalDirty(hasUnsavedChanges)
  }, [hasUnsavedChanges, setWasserAblesenModalDirty])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    const date = new Date(dateString)
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  // Calculate consumption change between readings
  const getConsumptionChange = (index: number) => {
    if (index >= ablesenList.length - 1) return null
    const current = ablesenList[index]
    const previous = ablesenList[index + 1]
    if (!current.verbrauch || !previous.verbrauch) return null
    return ((current.verbrauch - previous.verbrauch) / previous.verbrauch) * 100
  }

  // Render warning alert (button-sized pill with animation)
  const renderWarningAlert = (warning: string) => {
    if (!warning) return null

    const [type, message] = warning.split("|")

    const getIcon = () => {
      switch (type) {
        case "error":
          return <X className="h-4 w-4 flex-shrink-0" />
        case "warning":
          return <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        case "info":
          return <TrendingDown className="h-4 w-4 flex-shrink-0" />
        default:
          return null
      }
    }

    const getStyles = () => {
      switch (type) {
        case "error":
          return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
        case "warning":
          return "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800"
        case "info":
          return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
        default:
          return ""
      }
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={`flex items-center gap-2 px-4 py-3 rounded-full border ${getStyles()}`}
      >
        {getIcon()}
        <span className="text-sm font-medium">{message}</span>
      </motion.div>
    )
  }

  return (
    <>
      <Dialog open={isWasserAblesenModalOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent
          className="sm:max-w-[700px] max-h-[85vh] flex flex-col"
          isDirty={hasUnsavedChanges}
          onAttemptClose={handleClose}
        >
          <DialogHeader>
            <DialogTitle>Wasserzähler-Ablesungen verwalten</DialogTitle>
            <DialogDescription>
              Ablesungen für Wohnung: <span className="font-medium">{wasserAblesenModalData?.wohnungName}</span>
              {wasserAblesenModalData?.customId && (
                <> • Zähler-ID: <span className="font-medium">{wasserAblesenModalData.customId}</span></>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            {/* Add new Ablesung */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Neue Ablesung hinzufügen</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newAbleseDatum && "text-muted-foreground"
                        )}
                        disabled={isSaving}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newAbleseDatum ? (
                          format(newAbleseDatum, "dd.MM.yyyy", { locale: de })
                        ) : (
                          <span>Datum</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newAbleseDatum}
                        onSelect={setNewAbleseDatum}
                        locale={de as unknown as Parameters<typeof Calendar>[0]['locale']}
                        fromYear={1990}
                        toYear={new Date().getFullYear() + 10}
                        initialFocus
                      />
                      {newAbleseDatum && (
                        <div className="p-3 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            onClick={() => setNewAbleseDatum(undefined)}
                          >
                            Datum löschen
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <NumberInput
                    step="0.01"
                    placeholder="Zählerstand (m³)"
                    value={newZaehlerstand}
                    onChange={(e) => handleNewZaehlerstandChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newZaehlerstand.trim()) {
                        handleAddAblesung()
                      }
                    }}
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <NumberInput
                    step="0.01"
                    placeholder="Verbrauch (m³)"
                    value={newVerbrauch}
                    onChange={(e) => setNewVerbrauch(e.target.value)}
                    disabled={isSaving}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Textarea
                  placeholder="Kommentar (optional)"
                  value={newKommentar}
                  onChange={(e) => setNewKommentar(e.target.value)}
                  disabled={isSaving}
                  className="min-h-[60px] resize-none"
                />
              </div>
              <AnimatePresence mode="wait">
                {newVerbrauchWarning && renderWarningAlert(newVerbrauchWarning)}
              </AnimatePresence>
              <Button
                onClick={handleAddAblesung}
                disabled={!newZaehlerstand.trim() || isSaving}
                size="default"
                className="w-full"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Ablesung hinzufügen
                  </>
                )}
              </Button>
            </div>

            {/* List of existing Ablesungen */}
            <div className="space-y-3">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center p-12 space-y-4">
                  <WaterDropletLoader size="md" />
                  <p className="text-sm text-muted-foreground animate-pulse">
                    Ablesungen werden geladen...
                  </p>
                </div>
              ) : ablesenList.length === 0 ? (
                <Card className="bg-gray-50 dark:bg-[#22272e] border border-dashed border-gray-300 dark:border-gray-600 rounded-3xl">
                  <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                    <Droplet className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Keine Ablesungen vorhanden
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Fügen Sie oben eine neue Ablesung hinzu
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {ablesenList.map((ablesung, index) => {
                    const consumptionChange = getConsumptionChange(index)

                    return (
                      <Card key={ablesung.id} className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-all duration-300">
                        <CardContent className="p-0">
                          <AnimatePresence mode="wait">
                            {editingId === ablesung.id ? (
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
                                      <Droplet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <span className="text-sm font-medium text-muted-foreground">Bearbeiten</span>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      onClick={() => handleUpdateAblesung(ablesung.id)}
                                      disabled={!editZaehlerstand.trim() || isSaving}
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

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div>
                                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                      <CalendarIcon className="h-3 w-3" />
                                      Datum
                                    </Label>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="outline"
                                          className={cn(
                                            "w-full justify-start text-left font-normal mt-1.5",
                                            !editAbleseDatum && "text-muted-foreground"
                                          )}
                                          disabled={isSaving}
                                        >
                                          <CalendarIcon className="mr-2 h-4 w-4" />
                                          {editAbleseDatum ? (
                                            format(editAbleseDatum, "dd.MM.yyyy", { locale: de })
                                          ) : (
                                            <span>Datum wählen</span>
                                          )}
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                          mode="single"
                                          selected={editAbleseDatum}
                                          onSelect={(date) => currentAblesung && handleEditDateChange(date, currentAblesung)}
                                          locale={de as unknown as Parameters<typeof Calendar>[0]['locale']}
                                          fromYear={1990}
                                          toYear={new Date().getFullYear() + 10}
                                          initialFocus
                                        />
                                        {editAbleseDatum && (
                                          <div className="p-3 border-t">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="w-full"
                                              onClick={() => setEditAbleseDatum(undefined)}
                                            >
                                              Datum löschen
                                            </Button>
                                          </div>
                                        )}
                                      </PopoverContent>
                                    </Popover>
                                  </div>
                                  <div>
                                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Gauge className="h-3 w-3" />
                                      Zählerstand
                                    </Label>
                                    <NumberInput
                                      step="0.01"
                                      value={editZaehlerstand}
                                      onChange={(e) => {
                                        const currentAblesung = ablesenList.find(a => a.id === editingId)
                                        if (currentAblesung) {
                                          handleEditZaehlerstandChange(e.target.value, currentAblesung)
                                        }
                                      }}
                                      disabled={isSaving}
                                      placeholder="Zählerstand"
                                      className="mt-1.5"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Droplet className="h-3 w-3" />
                                      Verbrauch
                                    </Label>
                                    <NumberInput
                                      step="0.01"
                                      value={editVerbrauch}
                                      onChange={(e) => setEditVerbrauch(e.target.value)}
                                      disabled={isSaving}
                                      placeholder="Verbrauch"
                                      className="mt-1.5"
                                    />
                                  </div>
                                </div>
                                <div className="mt-3">
                                  <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1.5">
                                    <MessageSquare className="h-3 w-3" />
                                    Kommentar
                                  </Label>
                                  <Textarea
                                    placeholder="Kommentar (optional)"
                                    value={editKommentar}
                                    onChange={(e) => setEditKommentar(e.target.value)}
                                    disabled={isSaving}
                                    className="min-h-[60px] resize-none"
                                  />
                                </div>
                                <AnimatePresence mode="wait">
                                  {editVerbrauchWarning && (
                                    <div className="mt-3">
                                      {renderWarningAlert(editVerbrauchWarning)}
                                    </div>
                                  )}
                                </AnimatePresence>
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
                                        <Droplet className="h-5 w-5 text-primary" />
                                      </div>
                                      <div>
                                        <h4 className="font-semibold text-base">
                                          {formatDate(ablesung.ablese_datum)}
                                        </h4>
                                        <p className="text-xs text-muted-foreground">Ablesung</p>
                                      </div>
                                    </div>
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => startEdit(ablesung)}
                                        disabled={isSaving}
                                        className="h-8 w-8 p-0"
                                      >
                                        <Edit2 className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setAblesenToDelete(ablesung.id)
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
                                      <p className="text-sm font-medium">
                                        {ablesung.zaehlerstand !== null ? `${formatNumber(ablesung.zaehlerstand)} m³` : (
                                          <span className="text-muted-foreground italic">Nicht gesetzt</span>
                                        )}
                                      </p>
                                    </div>
                                  </motion.div>

                                  <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: 0.2 }}
                                    className="flex items-start gap-2"
                                  >
                                    <div className="flex-shrink-0 mt-0.5">
                                      <Droplet className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-muted-foreground mb-1">Verbrauch</p>
                                      <p className="text-sm font-medium">
                                        {formatNumber(ablesung.verbrauch)} m³
                                      </p>
                                    </div>
                                  </motion.div>

                                  <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3, delay: 0.3 }}
                                    className="flex items-start gap-2"
                                  >
                                    <div className="flex-shrink-0 mt-0.5">
                                      {(() => {
                                        const change = getConsumptionChange(index)
                                        if (change === null) return <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                        return change > 0 ? <TrendingUp className="h-4 w-4 text-muted-foreground" /> : <TrendingDown className="h-4 w-4 text-muted-foreground" />
                                      })()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-muted-foreground mb-1">Verbrauchsänderung</p>
                                      <p className="text-sm font-medium">
                                        {(() => {
                                          const change = getConsumptionChange(index)
                                          if (change === null) {
                                            return <span className="text-muted-foreground italic">Keine Vergleichsdaten</span>
                                          }
                                          const changeClass = change > 20
                                            ? "text-red-600 dark:text-red-400"
                                            : change < -10
                                              ? "text-green-600 dark:text-green-400"
                                              : ""
                                          return (
                                            <span className={changeClass}>
                                              {change > 0 ? '+' : ''}{formatNumber(change, 1)}%
                                            </span>
                                          )
                                        })()}
                                      </p>
                                    </div>
                                  </motion.div>

                                  {ablesung.kommentar && (
                                    <motion.div
                                      initial={{ opacity: 0, y: 5 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ duration: 0.3, delay: 0.4 }}
                                      className="col-span-1 sm:col-span-3 mt-1 pt-3 border-t border-dashed border-gray-200 dark:border-gray-700"
                                    >
                                      <div className="flex items-start gap-2">
                                        <div className="flex-shrink-0 mt-0.5">
                                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs text-muted-foreground mb-1">Kommentar</p>
                                          <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                                            "{ablesung.kommentar}"
                                          </p>
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </CardContent>
                      </Card>
                    )
                  })}
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
            <AlertDialogTitle>Ablesung löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie diese Ablesung wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAblesung}
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
