"use client"

import React, { useState, useMemo, useCallback, useReducer } from "react"
import { CheckedState } from "@radix-ui/react-checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TenantContextMenu } from "@/components/tenants/tenant-context-menu"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { ChevronsUpDown, ArrowUp, ArrowDown, User, Mail, Phone, Home, FileText, Pencil, Trash2, Euro, MoreVertical, X, Download, Sparkles, ExternalLink } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ActionMenu } from "@/components/ui/action-menu"

import { useModalStore } from "@/hooks/use-modal-store"
import { useKautionOeffnen } from "@/hooks/use-kaution-oeffnen"
import { deleteTenantAction } from "@/app/mieter-actions"
import { bewerberLoeschenAction } from "@/app/bewerber-actions"
import { toast } from "@/hooks/use-toast"

import { Tenant, NebenkostenEntry } from "@/types/Tenant";
import { getTodayISOString, isTenantActive } from "@/utils/date-calculations";
import { formatFailureReasons, summarizeBulkDeleteResults } from "@/lib/bulk-delete-summary";

export type TenantSortKey = "name" | "email" | "telefonnummer" | "wohnung" | "nebenkosten" | ""
export type SortDirection = "asc" | "desc"

interface TenantTableProps {
  tenants: Tenant[];
  wohnungen: { id: string; name: string }[];
  filter: string;
  searchQuery: string;
  onEdit?: (t: Tenant) => void;
  onDelete?: (id: string) => void;
  selectedTenants?: Set<string>;
  onSelectionChange?: (selected: Set<string>) => void;
  mode?: "tenants" | "applicants";
  /** Sortierung von außen (Toolbar): gesteuert nur, wenn alle drei Props gesetzt sind, sonst hält die Tabelle sie selbst. */
  sortKey?: TenantSortKey;
  sortDirection?: SortDirection;
  onSortChange?: (key: TenantSortKey, direction: SortDirection) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  /** Modulrecht `kautionen: ansehen` (GH-6): ohne dieses Recht gibt es weder Tabellen-Button noch Kontextmenü-Eintrag "Kaution". */
  canViewKautionen?: boolean;
}

interface SortState {
  sortKey: TenantSortKey
  sortDirection: SortDirection
}

type SortAction =
  | { type: "TOGGLE"; payload: TenantSortKey }
  | { type: "SET"; payload: SortState }

function sortReducer(state: SortState, action: SortAction): SortState {
  switch (action.type) {
    case "TOGGLE":
      if (state.sortKey === action.payload) {
        return { ...state, sortDirection: state.sortDirection === "asc" ? "desc" : "asc" }
      }
      return { sortKey: action.payload, sortDirection: "asc" }
    default:
      return state
  }
}

interface DialogState {
  showDeleteConfirm: boolean
  tenantToDelete: Tenant | null
  isDeleting: boolean
  showBulkDeleteConfirm: boolean
  isBulkDeleting: boolean
}

type DialogAction =
  | { type: "OPEN_DELETE"; payload: Tenant }
  | { type: "CLOSE_DELETE" }
  | { type: "SET_DELETING"; payload: boolean }
  | { type: "OPEN_BULK_DELETE" }
  | { type: "CLOSE_BULK_DELETE" }
  | { type: "SET_BULK_DELETING"; payload: boolean }
  | { type: "RESET_ALL" }

const initialDialogState: DialogState = {
  showDeleteConfirm: false,
  tenantToDelete: null,
  isDeleting: false,
  showBulkDeleteConfirm: false,
  isBulkDeleting: false,
}

function dialogReducer(state: DialogState, action: DialogAction): DialogState {
  switch (action.type) {
    case "OPEN_DELETE":
      return { ...state, showDeleteConfirm: true, tenantToDelete: action.payload }
    case "CLOSE_DELETE":
      return { ...state, showDeleteConfirm: false, tenantToDelete: null }
    case "SET_DELETING":
      return { ...state, isDeleting: action.payload }
    case "OPEN_BULK_DELETE":
      return { ...state, showBulkDeleteConfirm: true }
    case "CLOSE_BULK_DELETE":
      return { ...state, showBulkDeleteConfirm: false }
    case "SET_BULK_DELETING":
      return { ...state, isBulkDeleting: action.payload }
    case "RESET_ALL":
      return initialDialogState
    default:
      return state
  }
}

function BulkActionBar({
  selectedCount,
  onClearSelection,
  onExport,
  onDelete,
  canDelete,
}: {
  selectedCount: number;
  onClearSelection: () => void;
  onExport: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  return (
    <div className="mb-4 p-4 bg-primary/10 dark:bg-primary/20 border border-primary/20 rounded-lg flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={true}
            onCheckedChange={onClearSelection}
            className="data-[state=checked]:bg-primary"
          />
          <span className="font-medium text-sm">
            {selectedCount} {selectedCount === 1 ? 'Mieter' : 'Mieter'} ausgewählt
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
          disabled={!canDelete}
          className="h-8 gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
        >
          <Trash2 className="h-4 w-4" />
          Löschen
        </Button>
      </div>
    </div>
  );
}

function SortIcon({ currentSortKey, sortKey, sortDirection }: { currentSortKey: TenantSortKey; sortKey: TenantSortKey; sortDirection: SortDirection }) {
  // Inaktive Spalten zeigen den Sortier-Hinweis nur beim Hover, die aktive Sortierung bleibt sichtbar
  if (currentSortKey !== sortKey) {
    return <ChevronsUpDown className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover/header:opacity-100 group-focus-within/header:opacity-100" />
  }
  return sortDirection === "asc" ? (
    <ArrowUp className="size-3.5 text-foreground" />
  ) : (
    <ArrowDown className="size-3.5 text-foreground" />
  )
}

function TableHeaderCell({ sortKey, currentSortKey, sortDirection, children, className = '', icon: Icon, sortable = true, onSort }: {
  sortKey: TenantSortKey;
  currentSortKey: TenantSortKey;
  sortDirection: SortDirection;
  children: React.ReactNode;
  className?: string;
  icon: React.ElementType;
  sortable?: boolean;
  onSort: (key: TenantSortKey) => void;
}) {
  return (
    <TableHead
      className={`${className} group/header h-10 whitespace-nowrap text-[13px] font-semibold text-foreground hover:bg-transparent dark:hover:bg-transparent`}
      aria-sort={sortable && currentSortKey === sortKey ? (sortDirection === "asc" ? "ascending" : "descending") : undefined}
    >
      <div
        onClick={() => sortable && onSort(sortKey)}
        onKeyUp={(e) => { if (sortable && (e.key === 'Enter' || e.key === ' ')) onSort(sortKey) }}
        role={sortable ? 'button' : undefined}
        tabIndex={sortable ? 0 : undefined}
        className={`-ml-1.5 inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring ${sortable ? 'cursor-pointer transition-colors hover:bg-muted' : ''}`}
      >
        <Icon className="size-3.5 text-muted-foreground" />
        {children}
        {sortable && <SortIcon currentSortKey={currentSortKey} sortKey={sortKey} sortDirection={sortDirection} />}
      </div>
    </TableHead>
  );
}

function DeleteConfirmDialog({
  open,
  onOpenChange,
  isDeleting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDeleting: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sind Sie sicher?</AlertDialogTitle>
          <AlertDialogDescription>
            Möchten Sie den Mieter wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isDeleting} className="bg-red-600 hover:bg-red-700">{isDeleting ? "Lösche..." : "Löschen"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function BulkDeleteConfirmDialog({
  open,
  onOpenChange,
  selectedCount,
  isBulkDeleting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  isBulkDeleting: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mehrere Mieter löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            Möchten Sie wirklich {selectedCount} Mieter löschen? Diese Aktion kann nicht rückgängig gemacht werden.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isBulkDeleting}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isBulkDeleting} className="bg-red-600 hover:bg-red-700">
            {isBulkDeleting ? "Lösche..." : `${selectedCount} Mieter löschen`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function escapeCsvValue(value: string | null | undefined): string {
  if (!value) return ''
  const stringValue = String(value)
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function TenantTableContent({
  allSelected,
  partiallySelected,
  handleSelectAll,
  sortKey,
  sortDirection,
  handleSort,
  sortedAndFilteredData,
  selectedTenants,
  handleSelectTenant,
  onEdit,
  canEdit,
  canDelete,
  canViewKautionen,
  contextMenuRefs,
  wohnungsMap,
  wohnungen,
  mode,
  router,
  handleOpenKaution,
}: {
  allSelected: boolean;
  partiallySelected: boolean;
  handleSelectAll: (checked: CheckedState) => void;
  sortKey: TenantSortKey;
  sortDirection: SortDirection;
  handleSort: (key: TenantSortKey) => void;
  sortedAndFilteredData: Tenant[];
  selectedTenants: Set<string>;
  handleSelectTenant: (id: string, checked: CheckedState) => void;
  onEdit?: (t: Tenant) => void;
  canEdit: boolean;
  canDelete: boolean;
  canViewKautionen: boolean;
  contextMenuRefs: React.MutableRefObject<Map<string, HTMLElement>>;
  wohnungsMap: Record<string, string>;
  wohnungen: { id: string; name: string }[];
  mode: "tenants" | "applicants";
  router: ReturnType<typeof import("next/navigation").useRouter>;
  handleOpenKaution: (tenant: Tenant) => void;
}) {
  const { openApplicantScoreModal, openMailPreviewModal } = useModalStore()
  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <div className="inline-block min-w-full align-middle">
        <Table className="min-w-full">
          <TableHeader>
            {/* Kopfzeile ohne Hintergrund: fette Beschriftung und eine kräftigere Linie trennen sie von den Daten */}
            <TableRow className="border-b border-foreground/15 hover:bg-transparent dark:hover:bg-transparent">
              <TableHead className="h-10 w-12 pl-0 pr-0 -ml-2 hover:bg-transparent dark:hover:bg-transparent">
                <div className="flex items-center justify-start w-6 h-6 rounded-md transition-transform duration-100">
                  <Checkbox
                    aria-label="Alle Mieter auswählen"
                    checked={allSelected ? true : partiallySelected ? "indeterminate" : false}
                    onCheckedChange={handleSelectAll}
                    className="transition-transform duration-100 hover:scale-105"
                  />
                </div>
              </TableHead>
              <TableHeaderCell sortKey="name" currentSortKey={sortKey} sortDirection={sortDirection} className="w-[250px]" icon={User} onSort={handleSort}>Name</TableHeaderCell>
              <TableHeaderCell sortKey="email" currentSortKey={sortKey} sortDirection={sortDirection} icon={Mail} onSort={handleSort}>E-Mail</TableHeaderCell>
              <TableHeaderCell sortKey="telefonnummer" currentSortKey={sortKey} sortDirection={sortDirection} icon={Phone} onSort={handleSort}>Telefon</TableHeaderCell>
              <TableHeaderCell sortKey="wohnung" currentSortKey={sortKey} sortDirection={sortDirection} icon={Home} onSort={handleSort}>Wohnung</TableHeaderCell>
              <TableHeaderCell sortKey="nebenkosten" currentSortKey={sortKey} sortDirection={sortDirection} icon={FileText} onSort={handleSort}>{mode === 'applicants' ? 'Score' : 'Nebenkosten'}</TableHeaderCell>
              <TableHeaderCell sortKey="" currentSortKey={sortKey} sortDirection={sortDirection} className="w-[80px] pr-2" icon={Pencil} sortable={false} onSort={handleSort}>Aktionen</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAndFilteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Keine Mieter gefunden.
                </TableCell>
              </TableRow>
            ) : (
              sortedAndFilteredData.map((tenant, index) => {
                const isLastRow = index === sortedAndFilteredData.length - 1
                const isSelected = selectedTenants.has(tenant.id)

                return (
                  <TenantContextMenu
                    key={tenant.id}
                    tenant={tenant}
                    onEdit={() => onEdit?.(tenant)}
                    onRefresh={() => router.refresh()}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    canViewKautionen={canViewKautionen}
                    wohnungen={wohnungen}
                  >
                    <TableRow
                      ref={(el) => {
                        if (el) {
                          contextMenuRefs.current.set(tenant.id, el)
                        } else {
                          contextMenuRefs.current.delete(tenant.id)
                        }
                      }}
                      className={`relative cursor-pointer transition-all duration-200 ease-out transform hover:scale-[1.005] active:scale-[0.998] ${isSelected
                        ? `bg-primary/10 dark:bg-primary/20 ${isLastRow ? 'rounded-b-lg' : ''}`
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                      onClick={() => canEdit ? onEdit?.(tenant) : undefined}
                    >
                      <TableCell
                        className={`py-4 ${isSelected && isLastRow ? 'rounded-bl-lg' : ''}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {/* Flex statt inline-block: sonst sitzt die Checkbox auf der Textgrundlinie, ein paar Pixel über der Zeilenmitte */}
                        <div className="flex items-center">
                          <Checkbox
                            aria-label={`Mieter ${tenant.name} auswählen`}
                            checked={selectedTenants.has(tenant.id)}
                            onCheckedChange={(checked) => handleSelectTenant(tenant.id, checked)}
                          />
                        </div>
                      </TableCell>
                      {/* Flex im inneren Element: display:flex auf dem <td> bricht die Tabellen-Ausrichtung der Zeile */}
                      <TableCell className={`font-medium py-4 dark:text-[#f3f4f6]`}>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 shrink-0 bg-primary text-primary-foreground">
                            <AvatarImage src="" alt={tenant.name} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {getInitials(tenant.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="whitespace-nowrap">{tenant.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className={`py-4 whitespace-nowrap dark:text-[#f3f4f6]`}>{tenant.email}</TableCell>
                      <TableCell className={`py-4 whitespace-nowrap dark:text-[#f3f4f6]`}>{tenant.telefonnummer}</TableCell>
                      <TableCell className={`py-4 dark:text-[#f3f4f6]`}>
                        {/* Einzeilig; der volle Wohnungsname steht im Tooltip */}
                        <span
                          className="block max-w-[14rem] truncate"
                          title={tenant.wohnung_id ? wohnungsMap[tenant.wohnung_id] : undefined}
                        >
                          {tenant.wohnung_id ? wohnungsMap[tenant.wohnung_id] || '-' : '-'}
                        </span>
                      </TableCell>
                      <TableCell className={`py-4`}>
                        {mode === 'applicants' ? (
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500"
                                style={{ width: `${Math.min(tenant.bewerbung_score || 0, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">
                              {tenant.bewerbung_score !== undefined
                                ? (tenant.bewerbung_score / 10).toFixed(1)
                                : '-'}
                            </span>
                          </div>
                        ) : (
                          tenant.nebenkosten && tenant.nebenkosten.length > 0
                            ? tenant.nebenkosten
                              .slice(0, 3)
                              .map((n: NebenkostenEntry) => `${n.amount} €`)
                              .join(', ') + (tenant.nebenkosten.length > 3 ? '...' : '')
                            : '-'
                        )}
                      </TableCell>
                      <TableCell
                        className={`py-2 pr-2 text-right w-[130px] ${isSelected && isLastRow ? 'rounded-br-lg' : ''}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <ActionMenu
                          actions={[
                            {
                              id: `edit-${tenant.id}`,
                              icon: Pencil,
                              label: "Bearbeiten",
                              onClick: () => onEdit?.(tenant),
                              variant: 'primary',
                              disabled: !canEdit,
                              tooltip: !canEdit ? "Keine Berechtigung zum Bearbeiten" : undefined,
                            },
                            ...(tenant.bewerbung_metadaten ? [{
                              id: `ai-score-${tenant.id}`,
                              icon: Sparkles,
                              label: "Datenblatt (AI)",
                              onClick: () => openApplicantScoreModal({
                                tenant: {
                                  id: tenant.id,
                                  name: tenant.name,
                                  email: tenant.email || undefined,
                                  bewerbung_score: tenant.bewerbung_score,
                                  bewerbung_metadaten: tenant.bewerbung_metadaten,
                                  bewerbung_mail_id: tenant.bewerbung_mail_id
                                }
                              }),
                              variant: 'default' as const,
                            }] : []),
                            ...(tenant.bewerbung_mail_id ? [{
                              id: `mail-link-${tenant.id}`,
                              icon: ExternalLink,
                              label: "Zur E-Mail",
                              onClick: () => openMailPreviewModal(tenant.bewerbung_mail_id!),
                              variant: 'default' as const,
                            }] : []),
                            // Kaution (GH-6): nur mit Modulrecht `kautionen: ansehen`; der Dialog bekommt seine Rechte
                            // (erstellen/bearbeiten/löschen) autoritativ vom Server, die Datenbank prüft erneut.
                            ...(canViewKautionen && tenant.status !== "bewerber" ? [{
                              id: `kaution-${tenant.id}`,
                              icon: Euro,
                              label: "Kaution",
                              onClick: () => handleOpenKaution(tenant),
                              variant: 'default' as const,
                            }] : []),
                            {
                              id: `more-${tenant.id}`,
                              icon: MoreVertical,
                              label: "Mehr Optionen",
                              onClick: (e) => {
                                if (!e) return;
                                const rowElement = contextMenuRefs.current.get(tenant.id)
                                if (rowElement) {
                                  const contextMenuEvent = new MouseEvent('contextmenu', {
                                    bubbles: true,
                                    cancelable: true,
                                    view: window,
                                    clientX: e.clientX,
                                    clientY: e.clientY,
                                  })
                                  rowElement.dispatchEvent(contextMenuEvent)
                                }
                              },
                              variant: 'default',
                            }
                          ]}
                          shape="pill"
                          visibility="always"
                          className="inline-flex"
                        />
                      </TableCell>
                    </TableRow>
                  </TenantContextMenu>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function TenantTable({ tenants, wohnungen, filter, searchQuery, onEdit, onDelete, selectedTenants: externalSelectedTenants, onSelectionChange, mode = "tenants", sortKey: controlledSortKey, sortDirection: controlledSortDirection, onSortChange, canEdit = true, canDelete = true, canViewKautionen = false }: TenantTableProps) {
  const router = useRouter()
  const [internalSort, dispatchSort] = useReducer(sortReducer, { sortKey: "name" as TenantSortKey, sortDirection: "asc" as SortDirection })
  const isSortControlled = controlledSortKey !== undefined && controlledSortDirection !== undefined && !!onSortChange
  const sortKey = isSortControlled ? controlledSortKey : internalSort.sortKey
  const sortDirection = isSortControlled ? controlledSortDirection : internalSort.sortDirection
  const [internalSelectedTenants, setInternalSelectedTenants] = useState<Set<string>>(new Set())
  const [dialogState, dispatchDialog] = useReducer(dialogReducer, initialDialogState)
  // Lazy-initialised, stable ref-like container (keeps `.current` for callers without touching a ref during render)
  const [contextMenuRefs] = useState<React.MutableRefObject<Map<string, HTMLElement>>>(() => ({ current: new Map<string, HTMLElement>() }))

  const selectedTenants = externalSelectedTenants ?? internalSelectedTenants
  const setSelectedTenants = onSelectionChange ?? setInternalSelectedTenants

  const wohnungsMap = useMemo(() => {
    const map: Record<string, string> = {}
    wohnungen?.forEach(w => { map[w.id] = w.name })
    return map
  }, [wohnungen])

  const sortedAndFilteredData = useMemo(() => {
    let result = [...tenants]

    const todayStr = getTodayISOString()

    // Apply filters
    if (filter === "current") {
      result = result.filter(t => isTenantActive(t.auszug, todayStr))
    } else if (filter === "previous") {
      result = result.filter(t => !isTenantActive(t.auszug, todayStr))
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.email && t.email.toLowerCase().includes(q)) ||
        (t.telefonnummer && t.telefonnummer.toLowerCase().includes(q)) ||
        (t.wohnung_id && t.wohnung_id.toLowerCase().includes(q))
      )
    }

    if (sortKey) {
      result.sort((a, b) => {
        let valA, valB

        if (sortKey === 'wohnung') {
          valA = a.wohnung_id ? wohnungsMap[a.wohnung_id] || '' : ''
          valB = b.wohnung_id ? wohnungsMap[b.wohnung_id] || '' : ''
        } else if (sortKey === 'nebenkosten') {
          if (mode === 'applicants') {
            valA = a.bewerbung_score || 0;
            valB = b.bewerbung_score || 0;
          } else {
            const totalA = a.nebenkosten?.reduce((sum, n) => sum + parseFloat(n.amount || '0'), 0) || 0
            const totalB = b.nebenkosten?.reduce((sum, n) => sum + parseFloat(n.amount || '0'), 0) || 0
            valA = totalA
            valB = totalB
          }
        } else {
          valA = a[sortKey]
          valB = b[sortKey]
        }

        if (valA === undefined || valA === null) valA = ''
        if (valB === undefined || valB === null) valB = ''

        const numA = parseFloat(String(valA));
        const numB = parseFloat(String(valB));

        if (!isNaN(numA) && !isNaN(numB)) {
          if (numA < numB) return sortDirection === "asc" ? -1 : 1;
          if (numA > numB) return sortDirection === "asc" ? 1 : -1;
          return 0;
        } else {
          const strA = String(valA);
          const strB = String(valB);
          return sortDirection === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
        }
      })
    }

    return result
  }, [tenants, filter, searchQuery, sortKey, sortDirection, wohnungsMap, mode])

  // Der Kautionsdialog lädt seine Daten selbst (getKautionDetailsAction); der Store bekommt nur den Mieter.
  // Mehrere Kautionen eines Mieters: zuerst die Auswahl (hooks/use-kaution-oeffnen.ts).
  const oeffneKaution = useKautionOeffnen()
  const handleOpenKaution = useCallback((tenant: Tenant) => {
    void oeffneKaution({ id: tenant.id, name: tenant.name, wohnung_id: tenant.wohnung_id })
  }, [oeffneKaution])

  const visibleTenantIds = useMemo(() => sortedAndFilteredData.map((tenant) => tenant.id), [sortedAndFilteredData])

  const allSelected = visibleTenantIds.length > 0 && visibleTenantIds.every((id) => selectedTenants.has(id))
  const partiallySelected = visibleTenantIds.some((id) => selectedTenants.has(id)) && !allSelected

  const handleSelectAll = (checked: CheckedState) => {
    const isChecked = checked === true
    const next = new Set(selectedTenants)
    if (isChecked) {
      visibleTenantIds.forEach((id) => next.add(id))
    } else {
      visibleTenantIds.forEach((id) => next.delete(id))
    }
    setSelectedTenants(next)
  }

  const handleSelectTenant = (tenantId: string, checked: CheckedState) => {
    const isChecked = checked === true
    const next = new Set(selectedTenants)
    if (isChecked) {
      next.add(tenantId)
    } else {
      next.delete(tenantId)
    }
    setSelectedTenants(next)
  }

  const handleSort = (key: TenantSortKey) => {
    if (isSortControlled) {
      // Gleiche Umschalt-Logik wie sortReducer
      onSortChange(key, key === sortKey ? (sortDirection === "asc" ? "desc" : "asc") : "asc")
      return
    }
    dispatchSort({ type: "TOGGLE", payload: key })
  }

  const handleBulkDelete = async () => {
    dispatchDialog({ type: "SET_BULK_DELETING", payload: true })
    const selectedIds = Array.from(selectedTenants)

    // Bewerber liegen in "Bewerber" und werden dort gelöscht; alle anderen Zeilen sind Mieter.
    const bewerberIds = new Set(tenants.filter((t) => t.status === "bewerber").map((t) => t.id))
    const results = await Promise.allSettled(
      selectedIds.map((id) => (bewerberIds.has(id) ? bewerberLoeschenAction(id) : deleteTenantAction(id)))
    )
    // Gründe der abgelehnten Löschungen (z. B. Mieter mit hinterlegter Kaution) werden angezeigt, nicht verworfen.
    const { successCount, errorCount, reasons } = summarizeBulkDeleteResults(results)
    const reasonText = formatFailureReasons(reasons)

    dispatchDialog({ type: "SET_BULK_DELETING", payload: false })
    dispatchDialog({ type: "CLOSE_BULK_DELETE" })
    setSelectedTenants(new Set())

    if (successCount > 0) {
      toast({
        title: "Erfolg",
        description: `${successCount} Mieter erfolgreich gelöscht${errorCount > 0 ? `, ${errorCount} fehlgeschlagen` : ''}.${errorCount > 0 && reasonText ? ` ${reasonText}` : ''}`,
        variant: "success",
      })
      router.refresh()
    } else {
      toast({
        title: "Fehler",
        description: `Keine Mieter konnten gelöscht werden.${reasonText ? ` ${reasonText}` : ''}`,
        variant: "destructive",
      })
    }
  }

  const handleBulkExport = () => {
    const selectedTenantsData = tenants.filter(t => selectedTenants.has(t.id))

    const headers = ['Name', 'Email', 'Telefon', 'Wohnung', 'Einzug', 'Auszug']
    const csvHeader = headers.map(h => escapeCsvValue(h)).join(',')

    const csvRows = selectedTenantsData.map(t => {
      const row = [
        t.name,
        t.email || '',
        t.telefonnummer || '',
        t.wohnung_id ? wohnungsMap[t.wohnung_id] || '' : '',
        t.einzug || '',
        t.auszug || ''
      ]
      return row.map(value => escapeCsvValue(value)).join(',')
    })

    const csvContent = [csvHeader, ...csvRows].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const downloadUrl = URL.createObjectURL(blob)
    link.href = downloadUrl
    link.download = `mieter_export_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(downloadUrl)

    toast({
      title: "Export erfolgreich",
      description: `${selectedTenants.size} Mieter exportiert.`,
      variant: "success",
    })
  }

  const handleDeleteConfirm = async () => {
    if (!dialogState.tenantToDelete) return
    dispatchDialog({ type: "SET_DELETING", payload: true })
    if (onDelete) await onDelete(dialogState.tenantToDelete.id)
    dispatchDialog({ type: "CLOSE_DELETE" })
    dispatchDialog({ type: "SET_DELETING", payload: false })
  }

  return (
    <div className="rounded-lg">
      {!externalSelectedTenants && selectedTenants.size > 0 && (
        <BulkActionBar
          selectedCount={selectedTenants.size}
          onClearSelection={() => setSelectedTenants(new Set())}
          onExport={handleBulkExport}
          onDelete={() => dispatchDialog({ type: "OPEN_BULK_DELETE" })}
          canDelete={canDelete}
        />
      )}
      <TenantTableContent
        allSelected={allSelected}
        partiallySelected={partiallySelected}
        handleSelectAll={handleSelectAll}
        sortKey={sortKey}
        sortDirection={sortDirection}
        handleSort={handleSort}
        sortedAndFilteredData={sortedAndFilteredData}
        selectedTenants={selectedTenants}
        handleSelectTenant={handleSelectTenant}
        onEdit={onEdit}
        canEdit={canEdit}
        canDelete={canDelete}
        canViewKautionen={canViewKautionen}
        contextMenuRefs={contextMenuRefs}
        wohnungsMap={wohnungsMap}
        wohnungen={wohnungen}
        mode={mode}
        router={router}
        handleOpenKaution={handleOpenKaution}
      />

      <DeleteConfirmDialog
        open={dialogState.showDeleteConfirm}
        onOpenChange={(open) => !open && dispatchDialog({ type: "CLOSE_DELETE" })}
        isDeleting={dialogState.isDeleting}
        onConfirm={handleDeleteConfirm}
      />

      <BulkDeleteConfirmDialog
        open={dialogState.showBulkDeleteConfirm}
        onOpenChange={(open) => !open && dispatchDialog({ type: "CLOSE_BULK_DELETE" })}
        selectedCount={selectedTenants.size}
        isBulkDeleting={dialogState.isBulkDeleting}
        onConfirm={handleBulkDelete}
      />
    </div>
  )
}
