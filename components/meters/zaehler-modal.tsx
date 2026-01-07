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
    CircleGauge,
    Archive,
} from "lucide-react"
import { WaterDropletLoader } from "@/components/ui/water-droplet-loader"
import { Card, CardContent } from "@/components/ui/card"
import { DatePicker } from "@/components/ui/date-picker"
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
import { ZaehlerTyp, ZAEHLER_CONFIG } from "@/lib/zaehler-types"
import { format } from "date-fns"
import {
    MeterCard,
    MeterTypeSelector,
    isExpired,
    type Zaehler,
    type EditingMeterState,
} from "./meter-card"

// Interface for raw API response data (before normalization)
interface RawZaehlerFromApi {
    id: string
    custom_id: string | null
    wohnung_id: string
    erstellungsdatum: string
    eichungsdatum: string | null
    zaehler_typ?: ZaehlerTyp
    einheit?: string
    latest_reading?: {
        ablese_datum: string
        zaehlerstand: number
        verbrauch: number
    } | null
}

// Consolidated state for new meter form
interface NewMeterState {
    customId: string
    eichungsdatum: Date | undefined
    zaehlerTyp: ZaehlerTyp
}

const INITIAL_NEW_METER_STATE: NewMeterState = {
    customId: "",
    eichungsdatum: undefined,
    zaehlerTyp: "wasser",
}

export function ZaehlerModal() {
    const {
        isZaehlerModalOpen,
        zaehlerModalData,
        closeZaehlerModal,
        setZaehlerModalDirty,
        openAblesungenModal,
    } = useModalStore()

    // Core state
    const [zaehlerList, setZaehlerList] = React.useState<Zaehler[]>([])
    const [isLoading, setIsLoading] = React.useState(false)
    const [isSaving, setIsSaving] = React.useState(false)

    // Consolidated new meter state
    const [newMeter, setNewMeter] = React.useState<NewMeterState>(INITIAL_NEW_METER_STATE)

    // Consolidated editing state (null when not editing)
    const [editingMeter, setEditingMeter] = React.useState<EditingMeterState | null>(null)

    // Delete dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
    const [zaehlerToDelete, setZaehlerToDelete] = React.useState<string | null>(null)

    // UI state
    const [showExpiredMeters, setShowExpiredMeters] = React.useState(false)

    // Load existing Zähler when modal opens
    React.useEffect(() => {
        if (isZaehlerModalOpen && zaehlerModalData?.wohnungId) {
            loadZaehler()
        }
    }, [isZaehlerModalOpen, zaehlerModalData?.wohnungId])

    const loadZaehler = async () => {
        if (!zaehlerModalData?.wohnungId) return

        setIsLoading(true)
        try {
            const response = await fetch(`/api/zaehler?wohnung_id=${zaehlerModalData.wohnungId}`)
            if (response.ok) {
                const data: RawZaehlerFromApi[] = await response.json()
                // Ensure each meter has zaehler_typ and einheit (for backward compatibility)
                const normalizedData: Zaehler[] = data.map((z) => {
                    const typ: ZaehlerTyp = z.zaehler_typ || 'wasser'
                    return {
                        ...z,
                        zaehler_typ: typ,
                        einheit: z.einheit || ZAEHLER_CONFIG[typ]?.einheit || 'm³',
                    }
                })
                setZaehlerList(normalizedData)
            } else {
                throw new Error("Fehler beim Laden der Zähler")
            }
        } catch (error) {
            console.error("Error loading Zähler:", error)
            toast({
                title: "Fehler",
                description: "Zähler konnten nicht geladen werden.",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleAddZaehler = async () => {
        if (!newMeter.customId.trim() || !zaehlerModalData?.wohnungId) return

        setIsSaving(true)
        try {
            const config = ZAEHLER_CONFIG[newMeter.zaehlerTyp]
            const response = await fetch("/api/zaehler", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    custom_id: newMeter.customId.trim(),
                    wohnung_id: zaehlerModalData.wohnungId,
                    eichungsdatum: newMeter.eichungsdatum ? format(newMeter.eichungsdatum, "yyyy-MM-dd") : null,
                    zaehler_typ: newMeter.zaehlerTyp,
                    einheit: config.einheit,
                }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || "Fehler beim Hinzufügen")
            }

            const newZaehler = await response.json()
            setZaehlerList((prev) => [...prev, {
                ...newZaehler,
                zaehler_typ: newZaehler.zaehler_typ || newMeter.zaehlerTyp,
                einheit: newZaehler.einheit || config.einheit,
            }])
            setNewMeter(INITIAL_NEW_METER_STATE)

            useOnboardingStore.getState().completeStep('create-meter-form')

            toast({
                title: "Erfolg",
                description: `${config.label} erfolgreich hinzugefügt.`,
                variant: "success",
            })
        } catch (error) {
            console.error("Error adding Zähler:", error)
            toast({
                title: "Fehler",
                description: error instanceof Error ? error.message : "Zähler konnte nicht hinzugefügt werden.",
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    const handleUpdateZaehler = async (id: string) => {
        if (!editingMeter || !editingMeter.customId.trim()) return

        setIsSaving(true)
        try {
            const config = ZAEHLER_CONFIG[editingMeter.zaehlerTyp]
            const response = await fetch(`/api/zaehler/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    custom_id: editingMeter.customId.trim(),
                    eichungsdatum: editingMeter.eichungsdatum ? format(editingMeter.eichungsdatum, "yyyy-MM-dd") : null,
                    zaehler_typ: editingMeter.zaehlerTyp,
                    einheit: config.einheit,
                }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || "Fehler beim Aktualisieren")
            }

            const updatedZaehler = await response.json()
            setZaehlerList((prev) =>
                prev.map((z) => (z.id === id ? {
                    ...updatedZaehler,
                    zaehler_typ: updatedZaehler.zaehler_typ || editingMeter.zaehlerTyp,
                    einheit: updatedZaehler.einheit || config.einheit,
                } : z))
            )
            setEditingMeter(null)

            toast({
                title: "Erfolg",
                description: `${config.label} erfolgreich aktualisiert.`,
                variant: "success",
            })
        } catch (error) {
            console.error("Error updating Zähler:", error)
            toast({
                title: "Fehler",
                description: error instanceof Error ? error.message : "Zähler konnte nicht aktualisiert werden.",
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
            const response = await fetch(`/api/zaehler/${zaehlerToDelete}`, {
                method: "DELETE",
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || "Fehler beim Löschen")
            }

            setZaehlerList((prev) => prev.filter((z) => z.id !== zaehlerToDelete))
            setZaehlerToDelete(null)
            setDeleteDialogOpen(false)

            toast({
                title: "Erfolg",
                description: "Zähler erfolgreich gelöscht.",
                variant: "success",
            })
        } catch (error) {
            console.error("Error deleting Zähler:", error)
            toast({
                title: "Fehler",
                description: error instanceof Error ? error.message : "Zähler konnte nicht gelöscht werden.",
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    const handleStartEdit = React.useCallback((zaehler: Zaehler) => {
        setEditingMeter({
            id: zaehler.id,
            customId: zaehler.custom_id || "",
            eichungsdatum: zaehler.eichungsdatum ? new Date(zaehler.eichungsdatum) : undefined,
            zaehlerTyp: zaehler.zaehler_typ || "wasser",
        })
    }, [])

    const handleCancelEdit = React.useCallback(() => {
        setEditingMeter(null)
        setZaehlerModalDirty(false)
    }, [setZaehlerModalDirty])

    const handleEditChange = React.useCallback((updates: Partial<Omit<EditingMeterState, 'id'>>) => {
        setEditingMeter((prev) => prev ? { ...prev, ...updates } : null)
    }, [])

    const handleOpenAblesungen = React.useCallback((zaehler: Zaehler) => {
        openAblesungenModal(
            zaehler.id,
            zaehlerModalData?.wohnungName || "",
            zaehler.custom_id || undefined,
            zaehler.zaehler_typ,
            zaehler.einheit
        )
    }, [openAblesungenModal, zaehlerModalData?.wohnungName])

    const handleDeleteClick = React.useCallback((id: string) => {
        setZaehlerToDelete(id)
        setDeleteDialogOpen(true)
    }, [])

    const handleClose = () => {
        setNewMeter(INITIAL_NEW_METER_STATE)
        setEditingMeter(null)
        setZaehlerModalDirty(false)
        closeZaehlerModal()
    }

    // Check if there are unsaved changes
    const hasUnsavedChanges = React.useMemo(() => {
        // Check new meter form
        if (
            newMeter.customId.trim() ||
            newMeter.eichungsdatum ||
            newMeter.zaehlerTyp !== "wasser"
        ) {
            return true
        }

        // Check editing state
        if (editingMeter) {
            const originalZaehler = zaehlerList.find(z => z.id === editingMeter.id)
            if (originalZaehler) {
                const customIdChanged = editingMeter.customId !== (originalZaehler.custom_id || "")
                const dateChanged = (editingMeter.eichungsdatum ? format(editingMeter.eichungsdatum, 'yyyy-MM-dd') : null) !== originalZaehler.eichungsdatum
                const typeChanged = editingMeter.zaehlerTyp !== (originalZaehler.zaehler_typ || "wasser")
                return customIdChanged || dateChanged || typeChanged
            }
        }

        return false
    }, [newMeter, editingMeter, zaehlerList])

    React.useEffect(() => {
        setZaehlerModalDirty(hasUnsavedChanges)
    }, [hasUnsavedChanges, setZaehlerModalDirty])

    const activeMeters = zaehlerList.filter(z => !isExpired(z.eichungsdatum))
    const expiredMeters = zaehlerList.filter(z => isExpired(z.eichungsdatum))

    return (
        <>
            <Dialog open={isZaehlerModalOpen} onOpenChange={(open) => !open && handleClose()}>
                <DialogContent
                    id="meter-form-container"
                    className="sm:max-w-[700px] max-h-[85vh] flex flex-col"
                    isDirty={hasUnsavedChanges}
                    onAttemptClose={handleClose}
                >
                    <DialogHeader>
                        <DialogTitle>Zähler verwalten</DialogTitle>
                        <DialogDescription>
                            Zähler für Wohnung: <span className="font-medium">{zaehlerModalData?.wohnungName}</span>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4 overflow-y-auto flex-1">
                        {/* Add new Zähler */}
                        <div className="space-y-3">
                            <Label className="text-sm font-medium">Neuen Zähler hinzufügen</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <MeterTypeSelector
                                    value={newMeter.zaehlerTyp}
                                    onChange={(value) => setNewMeter(prev => ({ ...prev, zaehlerTyp: value }))}
                                    disabled={isSaving}
                                />
                                <Input
                                    id="custom_id"
                                    placeholder="Zähler-ID eingeben..."
                                    value={newMeter.customId}
                                    onChange={(e) => setNewMeter(prev => ({ ...prev, customId: e.target.value }))}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && newMeter.customId.trim()) {
                                            handleAddZaehler()
                                        }
                                    }}
                                    disabled={isSaving}
                                />
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <DatePicker
                                        value={newMeter.eichungsdatum}
                                        onChange={(value) => setNewMeter(prev => ({ ...prev, eichungsdatum: value }))}
                                        placeholder="Eichungsdatum (optional)"
                                        disabled={isSaving}
                                        variant="button"
                                        fromYear={1990}
                                        toYear={2100}
                                    />
                                </div>
                                <Button
                                    onClick={handleAddZaehler}
                                    disabled={!newMeter.customId.trim() || isSaving}
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
                        </div>

                        {/* List of existing Zähler */}
                        <div className="space-y-3">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center p-12 space-y-4">
                                    <WaterDropletLoader size="md" />
                                    <p className="text-sm text-muted-foreground animate-pulse">
                                        Lade Zähler...
                                    </p>
                                </div>
                            ) : zaehlerList.length === 0 ? (
                                <Card className="bg-gray-50 dark:bg-[#22272e] border border-dashed border-gray-300 dark:border-gray-600 rounded-3xl">
                                    <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                                        <CircleGauge className="h-12 w-12 text-muted-foreground/50 mb-3" />
                                        <p className="text-sm text-muted-foreground">
                                            Keine Zähler vorhanden
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Fügen Sie oben einen neuen Zähler hinzu
                                        </p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="space-y-3">
                                    {/* Active meters */}
                                    <div className="grid gap-3">
                                        {activeMeters.map((zaehler) => (
                                            <MeterCard
                                                key={zaehler.id}
                                                zaehler={zaehler}
                                                editingMeter={editingMeter}
                                                isSaving={isSaving}
                                                onStartEdit={handleStartEdit}
                                                onCancelEdit={handleCancelEdit}
                                                onSaveEdit={handleUpdateZaehler}
                                                onDelete={handleDeleteClick}
                                                onOpenAblesungen={handleOpenAblesungen}
                                                onEditChange={handleEditChange}
                                            />
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
                                                ? `Alte Zähler ausblenden (${expiredMeters.length})`
                                                : `Alte Zähler anzeigen (${expiredMeters.length})`
                                            }
                                        </Button>
                                    )}

                                    {/* Expired meters */}
                                    {showExpiredMeters && expiredMeters.length > 0 && (
                                        <div className="grid gap-3">
                                            {expiredMeters.map((zaehler) => (
                                                <MeterCard
                                                    key={zaehler.id}
                                                    zaehler={zaehler}
                                                    editingMeter={editingMeter}
                                                    isSaving={isSaving}
                                                    onStartEdit={handleStartEdit}
                                                    onCancelEdit={handleCancelEdit}
                                                    onSaveEdit={handleUpdateZaehler}
                                                    onDelete={handleDeleteClick}
                                                    onOpenAblesungen={handleOpenAblesungen}
                                                    onEditChange={handleEditChange}
                                                />
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
                        <AlertDialogTitle>Zähler löschen?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Möchten Sie diesen Zähler wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
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
