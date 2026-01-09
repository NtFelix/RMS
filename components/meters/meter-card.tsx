"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
    Edit2,
    X,
    Check,
    CircleGauge,
    Calendar as CalendarIcon,
    Gauge,
    Clock,
    Hash,
    Droplet,
    Thermometer,
    Flame,
    Zap,
    Fuel,
    Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { ZaehlerTyp, ZAEHLER_CONFIG } from "@/lib/zaehler-types"

// Types
export interface Zaehler {
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

export interface EditingMeterState {
    id: string
    customId: string
    eichungsdatum: Date | undefined
    zaehlerTyp: ZaehlerTyp
}

interface MeterCardProps {
    zaehler: Zaehler
    editingMeter: EditingMeterState | null
    isSaving: boolean
    onStartEdit: (zaehler: Zaehler) => void
    onCancelEdit: () => void
    onSaveEdit: (id: string) => void
    onDelete: (id: string) => void
    onOpenAblesungen: (zaehler: Zaehler) => void
    onEditChange: (updates: Partial<Omit<EditingMeterState, 'id'>>) => void
}

// Helper function to get icon component based on meter type
export function getMeterIcon(zaehler_typ: ZaehlerTyp, className?: string) {
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
            return <Fuel className={cn(iconClass, "text-cyan-500")} />
        default:
            return <CircleGauge className={cn(iconClass, "text-primary")} />
    }
}

// Helper function to get background color based on meter type
export function getMeterBgColor(zaehler_typ: ZaehlerTyp) {
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

// Helper function to format date
export function formatDate(dateString: string | null) {
    if (!dateString) return "-"
    const date = new Date(dateString)
    return date.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    })
}

// Helper function to check if meter calibration is expired
export function isExpired(eichungsdatum: string | null) {
    if (!eichungsdatum) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const calibrationDate = new Date(eichungsdatum)
    calibrationDate.setHours(0, 0, 0, 0)
    return calibrationDate < today
}

// Meter type selector component
export function MeterTypeSelector({
    value,
    onChange,
    disabled
}: {
    value: ZaehlerTyp
    onChange: (value: ZaehlerTyp) => void
    disabled?: boolean
}) {
    return (
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
}

export function MeterCard({
    zaehler,
    editingMeter,
    isSaving,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    onDelete,
    onOpenAblesungen,
    onEditChange,
}: MeterCardProps) {
    const config = ZAEHLER_CONFIG[zaehler.zaehler_typ] || ZAEHLER_CONFIG.wasser
    const einheit = zaehler.einheit || config.einheit
    const isEditing = editingMeter?.id === zaehler.id

    const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            onSaveEdit(zaehler.id)
        } else if (e.key === "Escape") {
            onCancelEdit()
        }
    }, [onSaveEdit, onCancelEdit, zaehler.id])

    return (
        <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-all duration-300">
            <CardContent className="p-0">
                <AnimatePresence mode="wait">
                    {isEditing && editingMeter ? (
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
                                    <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", getMeterBgColor(editingMeter.zaehlerTyp))}>
                                        {getMeterIcon(editingMeter.zaehlerTyp)}
                                    </div>
                                    <span className="text-sm font-medium text-muted-foreground">Bearbeiten</span>
                                </div>
                                <div className="flex gap-1">
                                    <Button
                                        size="sm"
                                        onClick={() => onSaveEdit(zaehler.id)}
                                        disabled={!editingMeter.customId.trim() || isSaving}
                                    >
                                        <Check className="h-4 w-4 mr-1" />
                                        Speichern
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={onCancelEdit}
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
                                            value={editingMeter.zaehlerTyp}
                                            onChange={(value) => onEditChange({ zaehlerTyp: value })}
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
                                        value={editingMeter.customId}
                                        onChange={(e) => onEditChange({ customId: e.target.value })}
                                        onKeyDown={handleKeyDown}
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
                                        value={editingMeter.eichungsdatum}
                                        onChange={(value) => onEditChange({ eichungsdatum: value })}
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
                                            onClick={() => onOpenAblesungen(zaehler)}
                                            disabled={isSaving}
                                            className="h-8 w-8 p-0"
                                            title="Ablesungen verwalten"
                                        >
                                            <Gauge className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => onStartEdit(zaehler)}
                                            disabled={isSaving}
                                            className="h-8 w-8 p-0"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => onDelete(zaehler.id)}
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
