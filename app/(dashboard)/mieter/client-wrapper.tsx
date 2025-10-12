"use client";

import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ButtonWithTooltip } from "@/components/ui/button-with-tooltip";
import { useModalStore } from "@/hooks/use-modal-store";
import { PlusCircle, Users, BadgeCheck, Euro, Search } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { TenantTable } from "@/components/tenant-table";
import { TenantBulkActionBar } from "@/components/tenant-bulk-action-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { deleteTenantAction } from "@/app/mieter-actions";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";


import type { Tenant } from "@/types/Tenant";
import type { Wohnung } from "@/types/Wohnung";

// Props for the main client view component
interface MieterClientViewProps {
  initialTenants: Tenant[];
  initialWohnungen: Wohnung[];
  serverAction: (formData: FormData) => Promise<{ success: boolean; error?: { message: string } }>;
}

// Internal AddTenantButton (could be kept from previous step if preferred)
function AddTenantButton({ onAdd }: { onAdd: () => void }) {
  return (
    <ButtonWithTooltip onClick={onAdd} className="sm:w-auto">
      <PlusCircle className="mr-2 h-4 w-4" />
      Mieter hinzufügen
    </ButtonWithTooltip>
  );
}

// This is the new main client component, previously MieterPageClientComponent in page.tsx
export default function MieterClientView({
  initialTenants,
  initialWohnungen,
  serverAction,
}: MieterClientViewProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<"current" | "previous" | "all">("current");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTenants, setSelectedTenants] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const { openTenantModal } = useModalStore();

  // Summary calculation for StatCards
  const summary = useMemo(() => {
    const total = initialTenants.length;
    const today = new Date();
    const activeCount = initialTenants.filter(t => !t.auszug || new Date(t.auszug) > today).length;
    const formerCount = total - activeCount;

    // Average utility cost (use last nebenkosten entry of each tenant if available)
    const utilityValues = initialTenants
      .map(t => {
        if (!t.nebenkosten || t.nebenkosten.length === 0) return undefined;

        // Find latest entry by date (ISO string)
        const latestEntry = t.nebenkosten.reduce((latest, current) => {
          return new Date(current.date) > new Date(latest.date) ? current : latest;
        });

        return parseFloat(latestEntry.amount);
      })
      .filter((v): v is number => typeof v === "number" && !isNaN(v));
    const avgUtilities = utilityValues.length ? utilityValues.reduce((s, v) => s + v, 0) / utilityValues.length : 0;

    return { total, activeCount, formerCount, avgUtilities };
  }, [initialTenants]);

  // Remove local state for dialogOpen and editingId, as store will manage modal state
  // const [dialogOpen, setDialogOpen] = useState(false);
  // const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddTenant = useCallback(() => {
    try {
      // Pass initialWohnungen. The serverAction is passed to TenantEditModal in layout.tsx
      openTenantModal(undefined, initialWohnungen);
    } catch (error) {
      console.error('Error opening tenant modal:', error);
    }
  }, [openTenantModal, initialWohnungen]);

  const handleEditTenantInTable = useCallback((tenant: Tenant) => {
    // Find the full tenant data if only partial data is passed by the table event
    const tenantToEdit = initialTenants.find(t => t.id === tenant.id);
    if (tenantToEdit) {
      // Format data as expected by TenantEditModal's useEffect for parsing Nebenkosten
      const formattedInitialData = {
        id: tenantToEdit.id,
        wohnung_id: tenantToEdit.wohnung_id || "",
        name: tenantToEdit.name,
        einzug: tenantToEdit.einzug || "",
        auszug: tenantToEdit.auszug || "",
        email: tenantToEdit.email || "",
        telefonnummer: tenantToEdit.telefonnummer || "",
        notiz: tenantToEdit.notiz || "",
        nebenkosten: tenantToEdit.nebenkosten || [],
      };
      try {
        openTenantModal(formattedInitialData, initialWohnungen);
      } catch (error) {
        console.error('Error opening tenant modal:', error);
      }
    } else {
      console.error("Tenant not found for editing:", tenant.id);
      // Optionally, show a toast message
    }
  }, [initialTenants, initialWohnungen, openTenantModal]);

  // Wohnungen map for bulk actions
  const wohnungsMap = useMemo(() => {
    const map: Record<string, string> = {}
    initialWohnungen?.forEach(w => { map[w.id] = w.name })
    return map
  }, [initialWohnungen])

  // Helper function to properly escape CSV values
  const escapeCsvValue = useCallback((value: string | null | undefined): string => {
    if (!value) return ''
    const stringValue = String(value)
    // If the value contains comma, quote, or newline, wrap it in quotes and escape internal quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
      return `"${stringValue.replace(/"/g, '""')}"`
    }
    return stringValue
  }, [])

  const handleBulkExport = useCallback(() => {
    const selectedTenantsData = initialTenants.filter(t => selectedTenants.has(t.id))
    
    // Create CSV header
    const headers = ['Name', 'Email', 'Telefon', 'Wohnung', 'Einzug', 'Auszug']
    const csvHeader = headers.map(h => escapeCsvValue(h)).join(',')
    
    // Create CSV rows with proper escaping
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
    link.href = URL.createObjectURL(blob)
    link.download = `mieter_export_${new Date().toISOString().split('T')[0]}.csv`
    link.click()

    toast({
      title: "Export erfolgreich",
      description: `${selectedTenants.size} Mieter exportiert.`,
      variant: "success",
    })
  }, [selectedTenants, initialTenants, wohnungsMap, escapeCsvValue])

  const handleBulkDelete = useCallback(async () => {
    setIsBulkDeleting(true)
    const selectedIds = Array.from(selectedTenants)
    let successCount = 0
    let errorCount = 0

    for (const tenantId of selectedIds) {
      try {
        const result = await deleteTenantAction(tenantId)
        if (result.success) {
          successCount++
        } else {
          errorCount++
        }
      } catch (error) {
        errorCount++
      }
    }

    setIsBulkDeleting(false)
    setShowBulkDeleteConfirm(false)
    setSelectedTenants(new Set())

    if (successCount > 0) {
      toast({
        title: "Erfolg",
        description: `${successCount} Mieter erfolgreich gelöscht${errorCount > 0 ? `, ${errorCount} fehlgeschlagen` : ''}.`,
        variant: "success",
      })
      router.refresh()
    } else {
      toast({
        title: "Fehler",
        description: "Keine Mieter konnten gelöscht werden.",
        variant: "destructive",
      })
    }
  }, [selectedTenants, router]);

  return (
    <div className="flex flex-col gap-8 p-8 bg-gray-50/50 dark:bg-[#181818]">
      <div
        className="absolute inset-0 z-[-1]"
        style={{
          backgroundImage: `radial-gradient(circle at top left, rgba(121, 68, 255, 0.05), transparent 20%), radial-gradient(circle at bottom right, rgba(255, 121, 68, 0.05), transparent 20%)`,
        }}
      />
      <div className="flex flex-wrap gap-4">
        <StatCard
          title="Mieter gesamt"
          value={summary.total}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl"
        />
        <StatCard
          title="Aktiv / Ehemalig"
          value={`${summary.activeCount} / ${summary.formerCount}`}
          icon={<BadgeCheck className="h-4 w-4 text-muted-foreground" />}
          className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl"
        />
        <StatCard
          title="Ø Nebenkosten"
          value={summary.avgUtilities}
          unit="€"
          decimals
          icon={<Euro className="h-4 w-4 text-muted-foreground" />}
          className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl"
        />
      </div>
      <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-[2rem]">
        <CardHeader>
          <div className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Mieterverwaltung</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Verwalten Sie hier alle Ihre Mieter</p>
            </div>
            <div className="mt-1">
              <AddTenantButton onAdd={handleAddTenant} />
            </div>
          </div>
        </CardHeader>
        <div className="px-6">
          <div className="h-px bg-gray-200 dark:bg-gray-700 w-full"></div>
        </div>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 mt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "current" as const, label: "Aktuelle Mieter" },
                  { value: "previous" as const, label: "Vorherige Mieter" },
                  { value: "all" as const, label: "Alle Mieter" },
                ].map(({ value, label }) => (
                  <Button
                    key={value}
                    variant={filter === value ? "default" : "ghost"}
                    onClick={() => setFilter(value)}
                    className="h-9 rounded-full"
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <div className="relative w-full sm:w-auto sm:min-w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Mieter suchen..."
                  className="pl-10 rounded-full"
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <TenantBulkActionBar
              selectedTenants={selectedTenants}
              tenants={initialTenants}
              wohnungsMap={wohnungsMap}
              onClearSelection={() => setSelectedTenants(new Set())}
              onExport={handleBulkExport}
              onDelete={() => setShowBulkDeleteConfirm(true)}
            />
          </div>
          <TenantTable
            tenants={initialTenants}
            wohnungen={initialWohnungen}
            filter={filter}
            searchQuery={searchQuery}
            onEdit={handleEditTenantInTable}
            selectedTenants={selectedTenants}
            onSelectionChange={setSelectedTenants}
          />
        </CardContent>
      </Card>

      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mehrere Mieter löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie wirklich {selectedTenants.size} Mieter löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isBulkDeleting} className="bg-red-600 hover:bg-red-700">
              {isBulkDeleting ? "Lösche..." : `${selectedTenants.size} Mieter löschen`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
