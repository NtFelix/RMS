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
    Archive,
    Thermometer,
    Flame,
    Zap,
} from "lucide-react"
import { WaterDropletLoader } from "@/components/ui/water-droplet-loader"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DatePicker } from "@/components/ui/date-picker"
import { Separator } from "@/components/ui/separator"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { format } from "date-fns"
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
import { ZaehlerTyp, ZAEHLER_CONFIG } from "@/lib/data-fetching"

interface Zaehler {
    id: string
    custom_id: string | null
    wohnung_id: string
    erstellungsdatum: string
    eichungsdatum: string | null
    zaehler_typ: ZaehlerTyp
    einheit: string
    latest_reading?: {
        ablese_datum: string
        zaehlerstand: number
        verbrauch: number
    } | null
}

// Helper function to get icon component based on meter type
function getMeterIcon(zaehler_typ: ZaehlerTyp, className?: string) {
    const iconClass = className || "h-5 w-5"
    switch (zaehler_typ) {
        case 'wasser':
        case 'kaltwasser':
            return <Droplet className={cn(iconClass, "text-blue-500")} />
        case 'warmwasser':
            return <Thermometer className={cn(iconClass, "text-red-500")} />
        case 'waermemenge':
            return <Flame className={cn(iconClass, "text-orange-500")} />
        case 'heizkostenverteiler':
            return <Gauge className={cn(iconClass, "text-purple-500")} />
        case 'strom':
            return <Zap className={cn(iconClass, "text-yellow-500")} />
        case 'gas':
            return <Flame className={cn(iconClass, "text-cyan-500")} />
        default:
            return <CircleGauge className={cn(iconClass, "text-primary")} />
    }
}

// Helper function to get background color based on meter type
function getMeterBgColor(zaehler_typ: ZaehlerTyp) {
    switch (zaehler_typ) {
        case 'wasser':
        case 'kaltwasser':
            return "bg-blue-100 dark:bg-blue-900/30"
        case 'warmwasser':
            return "bg-red-100 dark:bg-red-900/30"
        case 'waermemenge':
            return "bg-orange-100 dark:bg-orange-900/30"
        case 'heizkostenverteiler':
            return "bg-purple-100 dark:bg-purple-900/30"
        case 'strom':
            return "bg-yellow-100 dark:bg-yellow-900/30"
        case 'gas':
            return "bg-cyan-100 dark:bg-cyan-900/30"
        default:
            return "bg-primary/10"
    }
}

export function ZaehlerModal() {
    const {
        isZaehlerModalOpen,
        zaehlerModalData,
        closeZaehlerModal,
        setZaehlerModalDirty,
        openWasserAblesenModal,
    } = useModalStore()

    const [zaehlerList, setZaehlerList] = React.useState<Zaehler[]>([])
    const [isLoading, setIsLoading] = React.useState(false)
    const [isSaving, setIsSaving] = React.useState(false)
    const [newCustomId, setNewCustomId] = React.useState("")
    const [newEichungsdatum, setNewEichungsdatum] = React.useState<Date | undefined>(undefined)
    const [newZaehlerTyp, setNewZaehlerTyp] = React.useState<ZaehlerTyp>("wasser")
    const [editingId, setEditingId] = React.useState<string | null>(null)
    const [editCustomId, setEditCustomId] = React.useState("")
    const [editEichungsdatum, setEditEichungsdatum] = React.useState<Date | undefined>(undefined)
    const [editZaehlerTyp, setEditZaehlerTyp] = React.useState<ZaehlerTyp>("wasser")
    const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
    const [zaehlerToDelete, setZaehlerToDelete] = React.useState<string | null>(null)
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
            const response = await fetch(`/api/wasser-zaehler?wohnung_id=${zaehlerModalData.wohnungId}`)
            if (response.ok) {
                const data = await response.json()
                // Ensure each meter has zaehler_typ and einheit (for backward compatibility)
                const normalizedData = data.map((z: any) => {
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
        if (!newCustomId.trim() || !zaehlerModalData?.wohnungId) return

        setIsSaving(true)
        try {
            const config = ZAEHLER_CONFIG[newZaehlerTyp]
            const response = await fetch("/api/wasser-zaehler", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    custom_id: newCustomId.trim(),
                    wohnung_id: zaehlerModalData.wohnungId,
                    eichungsdatum: newEichungsdatum ? format(newEichungsdatum, "yyyy-MM-dd") : null,
                    zaehler_typ: newZaehlerTyp,
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
                zaehler_typ: newZaehler.zaehler_typ || newZaehlerTyp,
                einheit: newZaehler.einheit || config.einheit,
            }])
            setNewCustomId("")
            setNewEichungsdatum(undefined)
            setNewZaehlerTyp("wasser")

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
        if (!editCustomId.trim()) return

        setIsSaving(true)
        try {
            const config = ZAEHLER_CONFIG[editZaehlerTyp]
            const response = await fetch(`/api/wasser-zaehler/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    custom_id: editCustomId.trim(),
                    eichungsdatum: editEichungsdatum ? format(editEichungsdatum, "yyyy-MM-dd") : null,
                    zaehler_typ: editZaehlerTyp,
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
                    zaehler_typ: updatedZaehler.zaehler_typ || editZaehlerTyp,
                    einheit: updatedZaehler.einheit || config.einheit,
                } : z))
            )
            setEditingId(null)
            setEditCustomId("")
            setEditEichungsdatum(undefined)
            setEditZaehlerTyp("wasser")

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

    const startEdit = (zaehler: Zaehler) => {
        setEditingId(zaehler.id)
        setEditCustomId(zaehler.custom_id || "")
        setEditEichungsdatum(zaehler.eichungsdatum ? new Date(zaehler.eichungsdatum) : undefined)
        setEditZaehlerTyp(zaehler.zaehler_typ || "wasser")
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditCustomId("")
        setEditEichungsdatum(undefined)
        setEditZaehlerTyp("wasser")
        setZaehlerModalDirty(false)
    }

    const handleClose = () => {
        setNewCustomId("")
        setNewEichungsdatum(undefined)
        setNewZaehlerTyp("wasser")
        setEditingId(null)
        setEditCustomId("")
        setEditEichungsdatum(undefined)
        setEditZaehlerTyp("wasser")
        setZaehlerModalDirty(false)
        closeZaehlerModal()
    }

    // Check if there are unsaved changes
    const hasUnsavedChanges = React.useMemo(() => {
        if (newCustomId.trim() || newEichungsdatum || newZaehlerTyp !== "wasser") {
            return true
        }

        if (editingId) {
            const originalZaehler = zaehlerList.find(z => z.id === editingId)
            if (originalZaehler) {
                const customIdChanged = editCustomId !== (originalZaehler.custom_id || "")
                const dateChanged = (editEichungsdatum ? format(editEichungsdatum, 'yyyy-MM-dd') : null) !== originalZaehler.eichungsdatum
                const typeChanged = editZaehlerTyp !== (originalZaehler.zaehler_typ || "wasser")
                return customIdChanged || dateChanged || typeChanged
            }
        }

        return false
    }, [newCustomId, newEichungsdatum, newZaehlerTyp, editingId, editCustomId, editEichungsdatum, editZaehlerTyp, zaehlerList])

    React.useEffect(() => {
        setZaehlerModalDirty(hasUnsavedChanges)
    }, [hasUnsavedChanges, setZaehlerModalDirty])

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "-"
        const date = new Date(dateString)
        return date.toLocaleDateString("de-DE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        })
    }

    const isExpired = (eichungsdatum: string | null) => {
        if (!eichungsdatum) return false
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const calibrationDate = new Date(eichungsdatum)
        calibrationDate.setHours(0, 0, 0, 0)
        return calibrationDate < today
    }

    const activeMeters = zaehlerList.filter(z => !isExpired(z.eichungsdatum))
    const expiredMeters = zaehlerList.filter(z => isExpired(z.eichungsdatum))

    // Meter type selector component
    const MeterTypeSelector = ({
        value,
        onChange,
        disabled
    }: {
        value: ZaehlerTyp
        onChange: (value: ZaehlerTyp) => void
        disabled?: boolean
    }) => (
        <Select value={value} onValueChange={(v) => onChange(v as ZaehlerTyp)} disabled={disabled}>
            <SelectTrigger className="w-full">
                <SelectValue placeholder="Zählertyp wählen">
                    <div className="flex items-center gap-2">
                        {getMeterIcon(value, "h-4 w-4")}
                        <span>{ZAEHLER_CONFIG[value]?.label || "Zähler"}</span>
                    </div>
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                {(Object.keys(ZAEHLER_CONFIG) as ZaehlerTyp[]).map((typ) => (
                    <SelectItem key={typ} value={typ}>
                        <div className="flex items-center gap-2">
                            {getMeterIcon(typ, "h-4 w-4")}
                            <span>{ZAEHLER_CONFIG[typ].label}</span>
                            <span className="text-muted-foreground text-xs">({ZAEHLER_CONFIG[typ].einheit})</span>
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )

    const renderMeterCard = (zaehler: Zaehler) => {
        const config = ZAEHLER_CONFIG[zaehler.zaehler_typ] || ZAEHLER_CONFIG.wasser
        const einheit = zaehler.einheit || config.einheit

        return (
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
                                        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", getMeterBgColor(editZaehlerTyp))}>
                                            {getMeterIcon(editZaehlerTyp)}
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
                                    <div>
                                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                            <CircleGauge className="h-3 w-3" />
                                            Zählertyp
                                        </Label>
                                        <div className="mt-1.5">
                                            <MeterTypeSelector
                                                value={editZaehlerTyp}
                                                onChange={setEditZaehlerTyp}
                                                disabled={isSaving}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Hash className="h-3 w-3" />
                                            Zähler-ID
                                        </Label>
                                        <Input
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
                                            className="mt-1.5"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                            <CalendarIcon className="h-3 w-3" />
                                            Eichungsdatum
                                        </Label>
                                        <DatePicker
                                            value={editEichungsdatum}
                                            onChange={setEditEichungsdatum}
                                            placeholder="Datum wählen"
                                            disabled={isSaving}
                                            variant="button"
                                            fromYear={1990}
                                            toYear={2100}
                                            className="mt-1.5"
                                        />
                                    </div>
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
                                            <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", getMeterBgColor(zaehler.zaehler_typ))}>
                                                {getMeterIcon(zaehler.zaehler_typ)}
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
                                                <p className="text-xs text-muted-foreground">{config.label}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => openWasserAblesenModal(zaehler.id, zaehlerModalData?.wohnungName || "", zaehler.custom_id || undefined, zaehler.zaehler_typ, zaehler.einheit)}
                                                disabled={isSaving}
                                                className="h-8 w-8 p-0"
                                                title="Ablesungen verwalten"
                                            >
                                                <Gauge className="h-4 w-4" />
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
                                                    {zaehler.latest_reading.zaehlerstand} {einheit}
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
        )
    }

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
                                    value={newZaehlerTyp}
                                    onChange={setNewZaehlerTyp}
                                    disabled={isSaving}
                                />
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
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <DatePicker
                                        value={newEichungsdatum}
                                        onChange={setNewEichungsdatum}
                                        placeholder="Eichungsdatum (optional)"
                                        disabled={isSaving}
                                        variant="button"
                                        fromYear={1990}
                                        toYear={2100}
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
                                        {activeMeters.map((zaehler) => renderMeterCard(zaehler))}
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
                                            {expiredMeters.map((zaehler) => renderMeterCard(zaehler))}
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
