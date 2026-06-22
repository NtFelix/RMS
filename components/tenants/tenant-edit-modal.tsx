"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NumberInput } from "@/components/ui/number-input"
import { Label } from "@/components/ui/label"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { CustomCombobox, ComboboxOption } from "@/components/ui/custom-combobox"
import { DatePicker } from "@/components/ui/date-picker"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "@/hooks/use-toast"
import { useModalStore } from "@/hooks/use-modal-store"
import { useOnboardingStore } from "@/hooks/use-onboarding-store"
import { cn } from "@/lib/utils"
import { Tenant, NebenkostenEntry, TenantStatus } from "@/types/Tenant"
import { useFeatureFlagEnabled } from "posthog-js/react"
import { tenantActions, getVisibleActions } from "@/components/tenants/tenant-menu-actions"
import {
  Users,
  UserPlus,
  Building2,
  Mail,
  Phone,
  FileText,
  Lightbulb,
  GripVertical,
  Trash2,
  MoreHorizontal,
  Calendar,
  type LucideIcon,
} from "lucide-react"
import { CustomDropdown, CustomDropdownItem, CustomDropdownSeparator } from "@/components/ui/custom-dropdown"
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
import { deleteTenantAction } from "@/app/mieter-actions"

interface Mieter extends Tenant {}

interface Wohnung {
  id: string
  name: string
}

interface TenantEditModalProps {
  serverAction: (formData: FormData) => Promise<{ success: boolean; error?: { message: string } }>
}

function PropertyHeader({ icon: Icon, label, infoText, htmlFor }: { icon: LucideIcon, label: string, infoText: string, htmlFor: string }) {
  return (
    <>
      <Label htmlFor={htmlFor} className="block sm:hidden text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </Label>
      <div className="hidden sm:block">
        <HoverCard openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>
            <Label
              htmlFor={htmlFor}
              className="flex items-center gap-3 text-muted-foreground/70 cursor-help transition-colors hover:text-foreground/90 w-fit group/header focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-[4px]"
            >
              <Icon className="h-4 w-4 group-hover/header:text-primary transition-colors" />
              <span className="text-sm font-medium uppercase tracking-wider cursor-help group-hover/header:text-foreground transition-colors">
                {label}
              </span>
            </Label>
          </HoverCardTrigger>
          <HoverCardContent side="top" align="start" className="w-80 shadow-2xl border-border/40 bg-background/95 backdrop-blur-md rounded-[28px] p-5 overflow-hidden">
            <div className="flex gap-3 items-start">
              <div className="flex-none h-8 w-8 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner border border-amber-500/20">
                <Lightbulb className="h-4 w-4" />
              </div>
              <div className="space-y-1.5 pt-1">
                <h4 className="font-bold text-foreground text-sm uppercase tracking-tight">Tipp</h4>
                <p className="text-sm leading-relaxed text-muted-foreground/90">{infoText}</p>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      </div>
    </>
  )
}

function ResizeHandle({
  isResizing,
  setWidth,
  onMouseDown,
}: {
  isResizing: boolean
  setWidth: React.Dispatch<React.SetStateAction<number>>
  onMouseDown: (e: React.MouseEvent) => void
}) {
  return (
    <button
      type="button"
      aria-label="Panelgröße anpassen"
      onMouseDown={onMouseDown}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          setWidth(prev => Math.max(360, prev - 20))
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          setWidth(prev => Math.min(window.innerWidth * 0.9, prev + 20))
        }
      }}
      className={cn(
        "absolute -left-1 top-0 bottom-0 w-2 cursor-ew-resize z-50 select-none group/resize-handle hidden sm:block appearance-none bg-transparent border-none p-0",
        isResizing ? "cursor-ew-resize" : ""
      )}
    >
      <div className={cn(
        "absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 transition-all duration-150 ease-in-out",
        isResizing ? "bg-primary" : "bg-transparent group-hover/resize-handle:bg-primary/40"
      )} />
    </button>
  )
}

function TopBar({
  tenantInitialData,
  onDeleteRequest,
  actions,
}: {
  tenantInitialData: Tenant | null
  onDeleteRequest: () => void
  actions: { key: string; onClick: () => void }[]
}) {
  if (!tenantInitialData) return null

  return (
    <div className="absolute top-0 left-0 right-0 h-14 flex items-center justify-end px-4 z-10 pointer-events-none">
      <CustomDropdown
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className="rounded-lg opacity-50 hover:opacity-100 hover:bg-hover-bg pointer-events-auto cursor-pointer h-8 w-8 active:scale-[0.995]"
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="sr-only">Aktionen</span>
          </Button>
        }
        align="end"
      >
        {actions.map((action) => {
          const def = tenantActions.find((a) => a.key === action.key)
          if (!def) return null
          return (
            <CustomDropdownItem key={action.key} onClick={action.onClick} className={def.className}>
              <def.icon className="h-4 w-4 mr-2" />
              <span>{def.label}</span>
            </CustomDropdownItem>
          )
        })}
        <CustomDropdownSeparator />
        <CustomDropdownItem onClick={onDeleteRequest} className="text-red-600 focus:text-red-600">
          <Trash2 className="h-4 w-4 mr-2" />
          <span>Löschen</span>
        </CustomDropdownItem>
      </CustomDropdown>
    </div>
  )
}

function DeleteTenantDialog({
  open,
  onOpenChange,
  tenantName,
  isDeleting,
  onDelete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenantName: string
  isDeleting: boolean
  onDelete: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mieter löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            Möchten Sie den Mieter &ldquo;{tenantName}&rdquo; wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction onClick={(e) => { e.preventDefault(); onDelete(); }} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">
            {isDeleting ? "Löschen..." : "Löschen"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function FormFields({
  formData,
  onFieldChange,
  handleDateChange,
  handleComboboxChange,
  isSubmitting,
  isLoadingWohnungen,
  apartmentOptions,
  tenantInitialData,
  nebenkostenEntries,
  handleNebenkostenChange,
  addNebenkostenEntry,
  removeNebenkostenEntry,
  nebenkostenValidationErrors,
  textareaRef,
  initResize,
}: {
  formData: { name: string; wohnung_id: string; einzug: string; auszug: string; email: string; telefonnummer: string; notiz: string; status: TenantStatus }
  onFieldChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  handleDateChange: (name: 'einzug' | 'auszug', date: Date | undefined) => void
  handleComboboxChange: (value: string | null) => void
  isSubmitting: boolean
  isLoadingWohnungen: boolean
  apartmentOptions: ComboboxOption[]
  tenantInitialData: Tenant | null
  nebenkostenEntries: NebenkostenEntry[]
  handleNebenkostenChange: (id: string, field: 'amount' | 'date', value: string) => void
  addNebenkostenEntry: () => void
  removeNebenkostenEntry: (id: string) => void
  nebenkostenValidationErrors: Record<string, { amount?: string; date?: string }>
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  initResize: (e: React.MouseEvent) => void
}) {
  const isApplicant = formData.status === 'bewerber'

  return (
    <div className="max-w-[90%] mx-auto pt-10 sm:pt-14 pb-6 px-4 sm:px-8 space-y-4 sm:space-y-8">
      <div className="space-y-2 sm:space-y-3">
        <div className="text-primary/80">
          {isApplicant ? (
            <UserPlus className="h-8 w-8 sm:h-10 sm:w-10" />
          ) : (
            <Users className="h-8 w-8 sm:h-10 sm:w-10" />
          )}
        </div>
        <div className="space-y-1">
          <SheetTitle className="sr-only">
            {tenantInitialData ? "Mieter bearbeiten" : "Mieter hinzufügen"}
          </SheetTitle>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={onFieldChange}
            placeholder={tenantInitialData ? "Unbenannter Mieter" : "Mieter hinzufügen"}
            disabled={isSubmitting}
            aria-label={tenantInitialData ? "Name des Mieters" : "Name des neuen Mieters"}
            className="text-2xl sm:text-4xl font-bold tracking-tight w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-0 text-foreground placeholder:opacity-30 placeholder:text-muted-foreground/50 cursor-text"
          />
          <SheetDescription className="text-sm sm:text-base text-muted-foreground/80">
            {tenantInitialData
              ? "Bearbeiten Sie die Informationen für diesen Mieter."
              : "Legen Sie einen neuen Mieter in Ihrer Verwaltung an."}
          </SheetDescription>
        </div>
      </div>

      <div className="space-y-3 sm:space-y-6">
        <div className="sm:space-y-4 sm:pt-3 sm:border-t sm:border-border/40">
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-muted-foreground/50 uppercase tracking-widest">
            Wohnung
          </div>

          <div className="sm:grid sm:gap-4 space-y-2 sm:space-y-0">
            <div className="sm:grid sm:grid-cols-[140px_1fr] sm:items-center sm:gap-4 space-y-1 sm:space-y-0">
              <PropertyHeader
                icon={Building2}
                label="Wohnung"
                htmlFor="wohnung_id"
                infoText="Wählen Sie die Wohnung aus, die der Mieter bewohnt."
              />
              <div className="relative">
                <CustomCombobox
                  width="w-full"
                  options={apartmentOptions}
                  value={formData.wohnung_id}
                  onChange={handleComboboxChange}
                  placeholder={isLoadingWohnungen ? "Lädt Wohnungen..." : "Wohnung auswählen"}
                  searchPlaceholder="Wohnung suchen..."
                  emptyText="Keine Wohnung gefunden."
                  disabled={isLoadingWohnungen || isSubmitting}
                  id="wohnung_id"
                  triggerClassName="hover:scale-100 active:scale-[0.995] shadow-none hover:shadow-none hover:bg-hover-bg hover:text-foreground"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="sm:space-y-4 sm:pt-3 sm:border-t sm:border-border/40">
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-muted-foreground/50 uppercase tracking-widest">
            Kontaktdaten
          </div>

          <div className="sm:grid sm:gap-4 space-y-2 sm:space-y-0">
            <div className="sm:grid sm:grid-cols-[140px_1fr] sm:items-center sm:gap-4 space-y-1 sm:space-y-0">
              <PropertyHeader
                icon={Calendar}
                label={isApplicant ? "Geplanter Einzug" : "Einzug"}
                htmlFor="einzug"
                infoText="Datum im Format TT.MM.JJJJ."
              />
              <DatePicker
                id="einzug"
                value={formData.einzug}
                onChange={(date) => handleDateChange('einzug', date)}
                placeholder="TT.MM.JJJJ"
                disabled={isSubmitting}
                className="bg-transparent border-none shadow-none hover:bg-muted/10 focus:bg-muted/20 px-2 py-1 -mx-2 rounded-lg transition-all h-auto text-sm focus-visible:scale-100"
              />
              <input type="hidden" name="einzug" value={formData.einzug} />
            </div>

            {!isApplicant && (
              <div className="sm:grid sm:grid-cols-[140px_1fr] sm:items-center sm:gap-4 space-y-1 sm:space-y-0 animate-in fade-in slide-in-from-top-1">
                <PropertyHeader
                  icon={Calendar}
                  label="Auszug"
                  htmlFor="auszug"
                  infoText="Auszugsdatum (optional). Leer lassen, wenn der Mietvertrag noch aktiv ist."
                />
                <DatePicker
                  id="auszug"
                  value={formData.auszug}
                  onChange={(date) => handleDateChange('auszug', date)}
                  placeholder="TT.MM.JJJJ"
                  disabled={isSubmitting}
                  className="bg-transparent border-none shadow-none hover:bg-muted/10 focus:bg-muted/20 px-2 py-1 -mx-2 rounded-lg transition-all h-auto text-sm focus-visible:scale-100"
                />
                <input type="hidden" name="auszug" value={formData.auszug} />
              </div>
            )}

            <div className="sm:grid sm:grid-cols-[140px_1fr] sm:items-center sm:gap-4 space-y-1 sm:space-y-0">
              <PropertyHeader
                icon={Mail}
                label="E-Mail"
                htmlFor="email"
                infoText="Kontakt-E-Mail (empfohlen für bessere Organisation und schnelle Erreichbarkeit)."
              />
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={onFieldChange}
                placeholder="max@mustermann.de"
                disabled={isSubmitting}
                className="bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-muted/10 focus:bg-muted/20 px-2 py-1 -mx-2 rounded-lg transition-all h-auto text-sm focus-visible:scale-100 hover:border-transparent focus:border-transparent"
              />
            </div>

            <div className="sm:grid sm:grid-cols-[140px_1fr] sm:items-center sm:gap-4 space-y-1 sm:space-y-0">
              <PropertyHeader
                icon={Phone}
                label="Telefon"
                htmlFor="telefonnummer"
                infoText="Telefonnummer (hilft bei der Organisation und schnellen Kontaktaufnahme)."
              />
              <Input
                id="telefonnummer"
                name="telefonnummer"
                type="tel"
                value={formData.telefonnummer}
                onChange={onFieldChange}
                placeholder="+49 123 456789"
                disabled={isSubmitting}
                className="bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-muted/10 focus:bg-muted/20 px-2 py-1 -mx-2 rounded-lg transition-all h-auto text-sm focus-visible:scale-100 hover:border-transparent focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="sm:space-y-4 sm:pt-3 sm:border-t sm:border-border/40">
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-muted-foreground/50 uppercase tracking-widest">
            Notizen
          </div>

          <div className="sm:grid sm:gap-4 space-y-2 sm:space-y-0">
            <div className="sm:grid sm:grid-cols-[140px_1fr] sm:items-start sm:gap-4 space-y-1 sm:space-y-0">
              <PropertyHeader
                icon={FileText}
                label="Notiz"
                htmlFor="notiz"
                infoText="Hier können Sie zusätzliche Informationen oder Anmerkungen zum Mieter erfassen."
              />
              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  id="notiz"
                  name="notiz"
                  value={formData.notiz}
                  onChange={onFieldChange}
                  placeholder="Interne Notizen..."
                  disabled={isSubmitting}
                  className="bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-muted/10 focus:bg-muted/20 px-2 py-1 -mx-2 rounded-lg transition-all text-sm focus-visible:scale-100 resize-none min-h-[80px] pr-8"
                />
                <div
                  className="absolute bottom-2 right-2 cursor-ns-resize p-1 rounded-md hover:bg-muted transition-colors"
                  onMouseDown={initResize}
                >
                  <GripVertical className="size-4 text-foreground/70" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {!isApplicant && (
          <div className="sm:space-y-4 sm:pt-3 sm:border-t sm:border-border/40">
            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-muted-foreground/50 uppercase tracking-widest">
              Nebenkosten
            </div>

            <div className="space-y-3">
              <div className="bg-muted/20 rounded-xl border border-border/50">
                <div className={cn('flex flex-col', nebenkostenEntries.length > 1 ? 'max-h-48 overflow-y-auto' : 'min-h-[96px]')}>
                  <div className="p-3 flex flex-col gap-3 sm:p-4 sm:flex flex-col gap-4">
                    {nebenkostenEntries.length === 0 ? (
                      <div className="flex items-center justify-center h-20 text-muted-foreground text-sm">
                        Keine Nebenkosten-Vorauszahlungen vorhanden
                      </div>
                    ) : nebenkostenEntries.map((entry) => (
                      <div key={entry.id} className="grid gap-2 grid-cols-[1fr_auto] sm:gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start">
                        <div className="flex flex-col gap-1">
                          <NumberInput
                            step="0.01"
                            placeholder="Betrag (€)"
                            value={entry.amount}
                            onChange={(e) => handleNebenkostenChange(entry.id, 'amount', e.target.value)}
                            className={`bg-transparent border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-muted/10 focus:bg-muted/20 px-2 py-1 -mx-2 rounded-lg transition-all h-auto text-sm focus-visible:scale-100 hover:border-transparent focus:border-transparent ${nebenkostenValidationErrors[entry.id]?.amount ? 'text-red-500' : ''}`}
                            disabled={isSubmitting}
                          />
                          {nebenkostenValidationErrors[entry.id]?.amount && (
                            <p className="text-xs text-red-500">{nebenkostenValidationErrors[entry.id]?.amount}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <DatePicker
                            value={entry.date}
                            onChange={(date) => handleNebenkostenChange(entry.id, 'date', date ? format(date, "yyyy-MM-dd") : "")}
                            placeholder="Datum (TT.MM.JJJJ)"
                            className={`bg-transparent border-none shadow-none hover:bg-muted/10 focus:bg-muted/20 px-2 py-1 -mx-2 rounded-lg transition-all h-auto text-sm focus-visible:scale-100 ${nebenkostenValidationErrors[entry.id]?.date ? 'text-red-500' : ''}`}
                            disabled={isSubmitting}
                          />
                          {nebenkostenValidationErrors[entry.id]?.date && (
                            <p className="text-xs text-red-500">{nebenkostenValidationErrors[entry.id]?.date}</p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeNebenkostenEntry(entry.id)}
                          disabled={isSubmitting}
                          className="justify-self-end"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t border-border/40 p-3 sm:p-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addNebenkostenEntry}
                    disabled={isSubmitting}
                    className="w-full hover:scale-[1.005] active:scale-[0.995]"
                  >
                    Eintrag hinzufügen
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="hidden sm:block space-y-3 pt-3 border-t border-border/40">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground/50 uppercase tracking-widest">
            Beschreibung
          </div>
          <div className="bg-muted/20 rounded-xl p-4 text-sm text-muted-foreground/80 leading-relaxed border border-border/50">
            <div className="flex gap-2 items-start">
              <FileText className="h-4 w-4 mt-0.5 shrink-0 opacity-40" />
              <p>
                Diese Informationen werden für die automatische Erstellung von Nebenkostenabrechnungen, Mietverträgen und offiziellen Dokumenten verwendet.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FormActions({
  isSubmitting,
  onCancel,
  tenantInitialData,
}: {
  isSubmitting: boolean
  onCancel: () => void
  tenantInitialData: Tenant | null
}) {
  return (
    <SheetFooter className="px-4 pb-8 pt-2 sm:p-8 sm:pb-14 sm:pt-4">
      <div className="max-w-[90%] mx-auto w-full flex gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 rounded-xl h-11 text-muted-foreground hover:text-foreground hover:scale-[1.005] active:scale-[0.995] hover:shadow-none"
        >
          Abbrechen
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-xl h-11 shadow-sm font-semibold hover:scale-[1.005] active:scale-[0.995] hover:shadow-sm"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" style={{ animationDuration: "600ms" }} viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Wird gespeichert...
            </span>
          ) : (tenantInitialData ? "Änderungen speichern" : "Mieter anlegen")}
        </Button>
      </div>
    </SheetFooter>
  )
}

export function TenantEditModal({ serverAction }: TenantEditModalProps) {
  const router = useRouter()


  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Textarea resize
  const [isResizing, setIsResizing] = useState(false)
  const dragInfoRef = useRef({ startY: 0, startHeight: 0 })

  const MIN_HEIGHT_PX = 80
  const MAX_HEIGHT_PX = 150

  const initResize = (e: React.MouseEvent) => {
    e.preventDefault()
    const textarea = textareaRef.current
    if (!textarea) return

    dragInfoRef.current = {
      startY: e.clientY,
      startHeight: textarea.offsetHeight,
    }
    setIsResizing(true)
  }

  useEffect(() => {
    if (!isResizing) return

    const textarea = textareaRef.current
    if (!textarea) {
      setIsResizing(false)
      return
    }

    const { startY, startHeight } = dragInfoRef.current

    const doDrag = (e: MouseEvent) => {
      let newHeight = startHeight + e.clientY - startY
      newHeight = Math.max(MIN_HEIGHT_PX, newHeight)
      newHeight = Math.min(MAX_HEIGHT_PX, newHeight)
      textarea.style.height = `${newHeight}px`
    }

    const stopDrag = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', doDrag)
    document.addEventListener('mouseup', stopDrag)

    return () => {
      document.removeEventListener('mousemove', doDrag)
      document.removeEventListener('mouseup', stopDrag)
    }
  }, [isResizing])

  const [nebenkostenEntries, setNebenkostenEntries] = useState<NebenkostenEntry[]>([])
  const generateId = () => crypto.randomUUID()
  const [nebenkostenValidationErrors, setNebenkostenValidationErrors] = useState<Record<string, { amount?: string; date?: string }>>({})

  const [formData, setFormData] = useState({
    wohnung_id: "",
    name: "",
    einzug: "",
    auszug: "",
    email: "",
    telefonnummer: "",
    notiz: "",
    status: "mieter" as TenantStatus,
  })

  // Sheet resize
  const [width, setWidth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const savedWidth = localStorage.getItem("tenant-modal-width")
      if (savedWidth) {
        const parsed = parseInt(savedWidth, 10)
        if (!isNaN(parsed)) return parsed
      }
    }
    return 600
  })
  const [isSheetResizing, setIsSheetResizing] = useState(false)
  const widthRef = useRef(width)

  useEffect(() => {
    widthRef.current = width
  }, [width])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleResetWidth = () => {
        setWidth(600)
      }
      window.addEventListener("reset-tenant-modal-width", handleResetWidth)
      return () => {
        window.removeEventListener("reset-tenant-modal-width", handleResetWidth)
      }
    }
  }, [])

  const startResizing = (mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault()
    setIsSheetResizing(true)
  }

  useEffect(() => {
    if (!isSheetResizing) return

    document.body.style.cursor = "ew-resize"
    document.body.style.userSelect = "none"

    const handleMouseMove = (mouseMoveEvent: MouseEvent) => {
      const newWidth = window.innerWidth - mouseMoveEvent.clientX
      const minWidth = 360
      const maxWidth = window.innerWidth * 0.9
      setWidth(Math.max(minWidth, Math.min(newWidth, maxWidth)))
    }

    const handleMouseUp = () => {
      setIsSheetResizing(false)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      const finalWidth = widthRef.current
      if (typeof finalWidth === "number" && !isNaN(finalWidth) && finalWidth >= 360) {
        localStorage.setItem("tenant-modal-width", String(finalWidth))
      }
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isSheetResizing])

  const {
    isTenantModalOpen,
    closeTenantModal,
    tenantInitialData,
    tenantModalWohnungen,
    isTenantModalDirty,
    setTenantModalDirty,
    openKautionModal,
    openTenantMailTemplatesModal,
    openApplicantScoreModal,
  } = useModalStore()

  const getSortedNebenkostenEntries = (entries: NebenkostenEntry[]): NebenkostenEntry[] => {
    const sorted = [...entries]
    sorted.sort((a, b) => {
      const dateA = a.date || ""
      const dateB = b.date || ""
      if (dateA === "" && dateB === "") return 0
      if (dateA === "") return 1
      if (dateB === "") return -1
      return dateA.localeCompare(dateB)
    })
    return sorted
  }

  useEffect(() => {
    if (isTenantModalOpen) {
      setFormData({
        wohnung_id: tenantInitialData?.wohnung_id || "",
        name: tenantInitialData?.name || "",
        einzug: tenantInitialData?.einzug || "",
        auszug: tenantInitialData?.auszug || "",
        email: tenantInitialData?.email || "",
        telefonnummer: tenantInitialData?.telefonnummer || "",
        notiz: tenantInitialData?.notiz || "",
        status: (tenantInitialData?.status || "mieter") as TenantStatus,
      })

      if (tenantInitialData?.nebenkosten) {
        setNebenkostenEntries(getSortedNebenkostenEntries(tenantInitialData.nebenkosten))
      } else {
        setNebenkostenEntries([{ id: generateId(), amount: "", date: "" }])
      }
      setNebenkostenValidationErrors({})
      setTenantModalDirty(false)
    }
  }, [tenantInitialData, isTenantModalOpen, setTenantModalDirty])

  const apartmentOptions: ComboboxOption[] = (tenantModalWohnungen || []).map((w: Wohnung) => ({ value: w.id, label: w.name }))

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    if (!isTenantModalDirty) setTenantModalDirty(true)
  }

  const handleComboboxChange = (value: string | null) => {
    setFormData(prev => ({ ...prev, wohnung_id: value || "" }))
    if (!isTenantModalDirty) setTenantModalDirty(true)
  }

  const validateNebenkostenEntry = (entry: NebenkostenEntry): { amount?: string; date?: string } => {
    const errors: { amount?: string; date?: string } = {}
    const amountValue = entry.amount.trim() === "" ? NaN : parseFloat(entry.amount)
    if (entry.amount.trim() !== "") {
      if (isNaN(amountValue)) errors.amount = "Ungültiger Betrag."
      else if (amountValue <= 0) errors.amount = "Betrag muss positiv sein."
    }
    if (entry.amount.trim() !== "" && entry.date.trim() === "") {
      errors.date = "Datum ist erforderlich, wenn ein Betrag vorhanden ist."
    }
    return errors
  }

  const handleNebenkostenChange = (id: string, field: 'amount' | 'date', value: string) => {
    let updatedEntryGlobal: NebenkostenEntry | undefined
    setNebenkostenEntries(entries => {
      const newEntries = entries.map(entry => {
        if (entry.id === id) {
          updatedEntryGlobal = { ...entry, [field]: value }
          return updatedEntryGlobal
        }
        return entry
      })
      if (updatedEntryGlobal) {
        const errors = validateNebenkostenEntry(updatedEntryGlobal)
        setNebenkostenValidationErrors(prev => {
          const newErrors = { ...prev }
          if (Object.keys(errors).length > 0) newErrors[id] = errors
          else delete newErrors[id]
          return newErrors
        })
      }
      return getSortedNebenkostenEntries(newEntries)
    })
    if (!isTenantModalDirty) setTenantModalDirty(true)
  }

  const addNebenkostenEntry = () => {
    const newId = generateId()
    setNebenkostenEntries(entries => getSortedNebenkostenEntries([...entries, { id: newId, amount: "", date: "" }]))
    setNebenkostenValidationErrors(prev => {
      const newErrors = { ...prev }; delete newErrors[newId]; return newErrors
    })
    if (!isTenantModalDirty) setTenantModalDirty(true)
  }

  const removeNebenkostenEntry = (id: string) => {
    setNebenkostenEntries(entries => entries.filter(entry => entry.id !== id))
    setNebenkostenValidationErrors(prev => {
      const newErrors = { ...prev }; delete newErrors[id]; return newErrors
    })
    if (!isTenantModalDirty) setTenantModalDirty(true)
  }

  const handleDateChange = (name: 'einzug' | 'auszug', date: Date | undefined) => {
    const formattedDate = date ? format(date, "yyyy-MM-dd") : ""
    setFormData(prevFormData => {
      const newFormData = { ...prevFormData, [name]: formattedDate }

      if (name === 'einzug' && formattedDate) {
        setNebenkostenEntries(prevEntries => {
          if (prevEntries.length === 0) {
            return [{ id: generateId(), amount: "", date: formattedDate }]
          }

          const firstEntry = prevEntries[0]
          if (firstEntry && (!firstEntry.date || firstEntry.date === prevFormData.einzug)) {
            return getSortedNebenkostenEntries([
              { ...firstEntry, date: formattedDate },
              ...prevEntries.slice(1)
            ])
          }

          return prevEntries
        })
      }

      return newFormData
    })
    if (!isTenantModalDirty) setTenantModalDirty(true)
  }

  const isApplicant = formData.status === 'bewerber'
  const templatesEnabled = useFeatureFlagEnabled('template-modal-enabled')

  const attemptClose = () => {
    closeTenantModal()
  }

  const handleCancelClick = () => {
    closeTenantModal({ force: true })
  }

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const isPending = isSubmitting || isDeleting

  const handleDelete = async () => {
    if (!tenantInitialData || isPending) return
    try {
      setIsDeleting(true)
      const result = await deleteTenantAction(tenantInitialData.id)

      if (result.success) {
        toast({
          title: "Erfolg",
          description: `Der Mieter "${tenantInitialData.name}" wurde erfolgreich gelöscht.`,
          variant: "success",
        })
        setTenantModalDirty(false)
        closeTenantModal()
        router.refresh()
      } else {
        toast({
          title: "Fehler",
          description: result.error?.message || "Der Mieter konnte nicht gelöscht werden.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Unerwarteter Fehler beim Löschen des Mieters:", error)
      toast({
        title: "Systemfehler",
        description: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isPending) return

    let currentNkErrors: Record<string, { amount?: string; date?: string }> = {}
    let hasValidationErrors = false

    if (!isApplicant) {
      for (const entry of nebenkostenEntries) {
        if (entry.amount.trim() === "" && entry.date.trim() === "") {
          if (nebenkostenValidationErrors[entry.id]) {
            setNebenkostenValidationErrors(prev => {
              const newErrors = { ...prev }; delete newErrors[entry.id]; return newErrors
            })
          }
          continue
        }
        const entryErrors = validateNebenkostenEntry(entry)
        if (Object.keys(entryErrors).length > 0) {
          currentNkErrors[entry.id] = entryErrors; hasValidationErrors = true
        }
      }
      setNebenkostenValidationErrors(currentNkErrors)

      if (hasValidationErrors) {
        toast({ title: "Validierungsfehler", description: "Bitte überprüfen Sie die Nebenkosten Einträge.", variant: "destructive" })
        return
      }
    }

    setIsSubmitting(true)

    try {
      const currentFormData = new FormData(e.currentTarget as HTMLFormElement)

      if (!isApplicant) {
        const finalNebenkostenEntries = nebenkostenEntries.filter(entry => entry.amount.trim() !== "")
        currentFormData.set('nebenkosten', JSON.stringify(finalNebenkostenEntries))
      } else {
        currentFormData.set('nebenkosten', JSON.stringify([]))
      }

      if (formData.wohnung_id) currentFormData.set('wohnung_id', formData.wohnung_id)
      else currentFormData.set('wohnung_id', '')

      currentFormData.set('status', formData.status)

      if (tenantInitialData?.id) {
        currentFormData.set('id', tenantInitialData.id)
      }

      const tenantNameForToast = formData.name
      const result = await serverAction(currentFormData)

      if (result.success) {
        toast({
          title: tenantInitialData?.id ? "Mieter aktualisiert" : "Mieter erstellt",
          description: `Die Daten des Mieters "${tenantNameForToast}" wurden erfolgreich ${tenantInitialData?.id ? "aktualisiert" : "erstellt"}.`,
          variant: "success",
        })
        setTenantModalDirty(false)
        useOnboardingStore.getState().completeStep('assign-tenant-form')
        closeTenantModal()
        router.refresh()
      } else {
        toast({
          title: "Fehler",
          description: result.error?.message || "Ein unbekannter Fehler ist aufgetreten.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Unerwarteter Fehler",
        description: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={isTenantModalOpen} onOpenChange={(open) => !open && attemptClose()}>
      <SheetContent
        id="tenant-form-container"
        className="w-full sm:w-[var(--sheet-width)] sm:max-w-none flex flex-col h-full p-0 gap-0"
        style={{
          "--sheet-width": `${width}px`,
          transition: isSheetResizing ? "none" : undefined
        } as React.CSSProperties}
        isDirty={isTenantModalDirty}
        onAttemptClose={attemptClose}
      >
        <ResizeHandle
          isResizing={isSheetResizing}
          setWidth={setWidth}
          onMouseDown={startResizing}
        />

        <TopBar
          tenantInitialData={tenantInitialData}
          onDeleteRequest={() => setDeleteDialogOpen(true)}
          actions={tenantInitialData ? getVisibleActions(tenantInitialData, { templatesEnabled: !!templatesEnabled }).map((action) => {
            const handlerMap: Record<string, () => void> = {
              kaution: () => openKautionModal(
                { id: tenantInitialData.id, name: tenantInitialData.name, wohnung_id: tenantInitialData.wohnung_id },
                tenantInitialData.kaution
              ),
              vorlagen: () => openTenantMailTemplatesModal(tenantInitialData.name, tenantInitialData.email),
              datenblatt: () => openApplicantScoreModal({
                tenant: {
                  id: tenantInitialData.id,
                  name: tenantInitialData.name,
                  email: tenantInitialData.email,
                  bewerbung_score: tenantInitialData.bewerbung_score,
                  bewerbung_metadaten: tenantInitialData.bewerbung_metadaten,
                  bewerbung_mail_id: tenantInitialData.bewerbung_mail_id,
                }
              }),
            }
            return { key: action.key, onClick: handlerMap[action.key] }
          }) : []}
        />

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <ScrollArea className="flex-1">
            <FormFields
              formData={formData}
              onFieldChange={handleChange}
              handleDateChange={handleDateChange}
              handleComboboxChange={handleComboboxChange}
              isSubmitting={isSubmitting}
              isLoadingWohnungen={false}
              apartmentOptions={apartmentOptions}
              tenantInitialData={tenantInitialData}
              nebenkostenEntries={nebenkostenEntries}
              handleNebenkostenChange={handleNebenkostenChange}
              addNebenkostenEntry={addNebenkostenEntry}
              removeNebenkostenEntry={removeNebenkostenEntry}
              nebenkostenValidationErrors={nebenkostenValidationErrors}
              textareaRef={textareaRef}
              initResize={initResize}
            />
          </ScrollArea>

          <FormActions
            isSubmitting={isSubmitting}
            onCancel={handleCancelClick}
            tenantInitialData={tenantInitialData}
          />
        </form>

        <DeleteTenantDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          tenantName={tenantInitialData?.name || formData.name}
          isDeleting={isDeleting}
          onDelete={handleDelete}
        />
      </SheetContent>
    </Sheet>
  )
}
