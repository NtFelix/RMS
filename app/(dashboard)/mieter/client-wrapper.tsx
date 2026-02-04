"use client";

import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveButtonWithTooltip } from "@/components/ui/responsive-button";
import { ResponsiveFilterButton } from "@/components/ui/responsive-filter-button";
import { useModalStore } from "@/hooks/use-modal-store";
import { PlusCircle, Users, BadgeCheck, Euro, Search } from "lucide-react";
import { StatCard } from "@/components/common/stat-card";
import { TenantTable } from "@/components/tables/tenant-table";
import { TenantBulkActionBar } from "@/components/tenants/tenant-bulk-action-bar";
import { SearchInput } from "@/components/ui/search-input";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { deleteTenantAction, deleteAllApplicantsAction } from "@/app/mieter-actions";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/hooks/use-onboarding-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ApplicantImportModal } from "@/components/tenants/applicant-import-modal";
import { ChevronDown, UserPlus, Mail } from "lucide-react";


import { Trash2 } from "lucide-react";
import type { Tenant, TenantStatus } from "@/types/Tenant";
import type { Wohnung } from "@/types/Wohnung";

// Props for the main client view component
interface MieterClientViewProps {
  initialTenants: Tenant[];
  initialWohnungen: Wohnung[];
  serverAction: (formData: FormData) => Promise<{ success: boolean; error?: { message: string } }>;
}

// Internal AddTenantButton (could be kept from previous step if preferred)


// This is the new main client component, previously MieterPageClientComponent in page.tsx
import { useFeatureFlagEnabled } from "posthog-js/react";

export default function MieterClientView({
  initialTenants,
  initialWohnungen,
  serverAction,
}: MieterClientViewProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<"current" | "previous" | "all">("current");
  const [currentTab, setCurrentTab] = useState<TenantStatus>("mieter");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTenants, setSelectedTenants] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const { openTenantModal } = useModalStore();
  const showTenantTabs = useFeatureFlagEnabled('show-tenant-tabs');

  // Filter tenants based on tab
  const filteredTenantsByTab = useMemo(() => {
    return initialTenants.filter(t => {
      // Default to "mieter" if status is missing (migration fallback)
      const status = t.status || 'mieter';
      return status === currentTab;
    });
  }, [initialTenants, currentTab]);

  // Calculate stats based on the CURRENT TAB
  const summary = useMemo(() => {
    const tenantsInTab = filteredTenantsByTab;
    const total = tenantsInTab.length;
    const today = new Date();

    // For "mieter" tab, we distinguish active vs former
    // For "bewerber" tab, activeCount/formerCount doesn't make as much sense with current definitions,
    // so we might just show Total and maybe "With Email" or similar.
    // But to keep it simple, we reuse the logic:
    const activeCount = tenantsInTab.filter(t => !t.auszug || new Date(t.auszug) > today).length;
    const formerCount = total - activeCount;

    // Average utility cost (use last nebenkosten entry of each tenant if available)
    const utilityValues = tenantsInTab
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
  }, [filteredTenantsByTab]);

  // Remove local state for dialogOpen and editingId, as store will manage modal state
  // const [dialogOpen, setDialogOpen] = useState(false);
  // const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddTenant = useCallback(() => {
    try {
      // Pass initialWohnungen. The serverAction is passed to TenantEditModal in layout.tsx
      // We want to pass the current tab as the default status for the new tenant
      // We do this by passing a partial object with just the status
      const defaultStatus = { status: currentTab };
      openTenantModal(defaultStatus, initialWohnungen);
    } catch (error) {
      console.error('Error opening tenant modal:', error);
    }
  }, [openTenantModal, initialWohnungen, currentTab]);

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
        status: tenantToEdit.status || "mieter",
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
    const headers = ['Name', 'Email', 'Telefon', 'Wohnung', 'Einzug', 'Auszug', 'Status']
    const csvHeader = headers.map(h => escapeCsvValue(h)).join(',')

    // Create CSV rows with proper escaping
    const csvRows = selectedTenantsData.map(t => {
      const row = [
        t.name,
        t.email || '',
        t.telefonnummer || '',
        t.wohnung_id ? wohnungsMap[t.wohnung_id] || '' : '',
        t.einzug || '',
        t.auszug || '',
        t.status || 'mieter'
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
      description: `${selectedTenants.size} Einträge exportiert.`,
      variant: "success",
    })
  }, [selectedTenants, initialTenants, wohnungsMap, escapeCsvValue])

  const handleBulkDelete = useCallback(async () => {
    if (selectedTenants.size === 0) {
      toast({
        title: "Keine Einträge ausgewählt",
        description: "Bitte wählen Sie mindestens einen Eintrag zum Löschen aus.",
        variant: "destructive",
      })
      return
    }

    setIsBulkDeleting(true)

    try {
      const response = await fetch('/api/mieter/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: Array.from(selectedTenants)
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Fehler beim Löschen der Einträge')
      }

      setShowBulkDeleteConfirm(false)
      setSelectedTenants(new Set())

      toast({
        title: "Erfolg",
        description: `${result.successCount} Einträge erfolgreich gelöscht.`,
        variant: "success",
      })

      router.refresh()
    } catch (error) {
      console.error('Bulk delete error:', error)
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Fehler beim Löschen der Einträge",
        variant: "destructive",
      })
    } finally {
      setIsBulkDeleting(false)
    }
  }, [selectedTenants, router]);

  const handleDeleteAllApplicants = async () => {
    setIsDeletingAll(true);
    try {
      const result = await deleteAllApplicantsAction();
      if (!result.success) {
        throw new Error(result.error?.message || "Fehler beim Löschen aller Bewerber");
      }
      setShowDeleteAllConfirm(false);
      toast({
        title: "Erfolg",
        description: "Alle Bewerber wurden gelöscht.",
        variant: "success",
      });
      router.refresh();
    } catch (error) {
      console.error(error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Fehler beim Löschen",
        variant: "destructive",
      });
    } finally {
      setIsDeletingAll(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8 p-4 sm:p-8 bg-white dark:bg-[#181818]">

      {/* Tab Selector */}
      <Tabs value={currentTab} onValueChange={(v) => {
        setCurrentTab(v as TenantStatus);
        // Reset filter to 'current' when switching tabs, although 'current' applies to both mostly
        setFilter("current");
        setSelectedTenants(new Set()); // Clear selection on tab change
      }} className="w-full">

        <div className="flex flex-col gap-6">
          {showTenantTabs && (
            <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
              <TabsTrigger value="mieter">Mieter</TabsTrigger>
              <TabsTrigger value="bewerber">Bewerber</TabsTrigger>
            </TabsList>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            <StatCard
              title={currentTab === 'mieter' ? "Mieter gesamt" : "Bewerber gesamt"}
              value={summary.total}
              icon={<Users className="h-4 w-4 text-muted-foreground" />}
              className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl"
            />
            {currentTab === 'mieter' && (
              <>
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
              </>
            )}
          </div>

          <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-[2rem]">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>{currentTab === 'mieter' ? 'Mieterverwaltung' : 'Bewerberverwaltung'}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
                    {currentTab === 'mieter' ? 'Verwalten Sie hier alle Ihre Mieter' : 'Verwalten Sie hier potenzielle Mieter und Interessenten'}
                  </p>
                </div>
                <div className="mt-0 sm:mt-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="w-full sm:w-auto gap-2">
                        <PlusCircle className="h-4 w-4" />
                        Hinzufügen
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      <DropdownMenuItem onClick={handleAddTenant} className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                        <div className="flex items-center font-medium">
                          <UserPlus className="mr-2 h-4 w-4" />
                          Manuell hinzufügen
                        </div>
                        <span className="text-xs text-muted-foreground ml-6">
                          Erstellen Sie einen neuen Mieter oder Bewerber per Hand.
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowImportModal(true)} className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                        <div className="flex items-center font-medium">
                          <Mail className="mr-2 h-4 w-4" />
                          Aus E-Mails importieren
                        </div>
                        <span className="text-xs text-muted-foreground ml-6">
                          Die KI analysiert E-Mails und erstellt automatisch Bewerber-Profile.
                        </span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <div className="px-6">
              <div className="h-px bg-gray-200 dark:bg-gray-700 w-full"></div>
            </div>

            <TabsContent value="mieter" className="mt-0">
              <CardContent className="flex flex-col gap-6">
                <div className="flex flex-col gap-4 mt-4 sm:mt-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      {[
                        { value: "current" as const, shortLabel: "Aktuelle", fullLabel: "Aktuelle Mieter" },
                        { value: "previous" as const, shortLabel: "Vorherige", fullLabel: "Vorherige Mieter" },
                        { value: "all" as const, shortLabel: "Alle", fullLabel: "Alle Mieter" },
                      ].map(({ value, shortLabel, fullLabel }) => (
                        <ResponsiveFilterButton
                          key={value}
                          shortLabel={shortLabel}
                          fullLabel={fullLabel}
                          isActive={filter === value}
                          onClick={() => setFilter(value)}
                        />
                      ))}
                    </div>
                    <SearchInput
                      placeholder="Mieter suchen..."
                      className="rounded-full"
                      mode="table"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onClear={() => setSearchQuery("")}
                    />
                  </div>
                  <TenantBulkActionBar
                    selectedTenants={selectedTenants}
                    tenants={filteredTenantsByTab}
                    wohnungsMap={wohnungsMap}
                    onClearSelection={() => setSelectedTenants(new Set())}
                    onExport={handleBulkExport}
                    onDelete={() => setShowBulkDeleteConfirm(true)}
                  />
                </div>
                <TenantTable
                  tenants={filteredTenantsByTab}
                  wohnungen={initialWohnungen}
                  filter={filter}
                  searchQuery={searchQuery}
                  onEdit={handleEditTenantInTable}
                  selectedTenants={selectedTenants}
                  onSelectionChange={setSelectedTenants}
                />
              </CardContent>
            </TabsContent>

            <TabsContent value="bewerber" className="mt-0">
              <CardContent className="flex flex-col gap-6">
                <div className="flex flex-col gap-4 mt-4 sm:mt-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* No filter buttons for applicants for now, just search */}
                    <div className="flex-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeleteAllConfirm(true)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Alle Bewerber löschen
                      </Button>
                    </div>
                    <SearchInput
                      placeholder="Bewerber suchen..."
                      className="rounded-full"
                      mode="table"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onClear={() => setSearchQuery("")}
                    />
                  </div>
                  <TenantBulkActionBar
                    selectedTenants={selectedTenants}
                    tenants={filteredTenantsByTab}
                    wohnungsMap={wohnungsMap}
                    onClearSelection={() => setSelectedTenants(new Set())}
                    onExport={handleBulkExport}
                    onDelete={() => setShowBulkDeleteConfirm(true)}
                  />
                </div>
                <TenantTable
                  tenants={filteredTenantsByTab}
                  wohnungen={initialWohnungen}
                  filter="all" // Apply "all" filter so checking dates doesn't hide applicants without dates
                  searchQuery={searchQuery}
                  onEdit={handleEditTenantInTable}
                  selectedTenants={selectedTenants}
                  onSelectionChange={setSelectedTenants}
                  mode="applicants"
                />
              </CardContent>
            </TabsContent>

          </Card>
        </div>
      </Tabs>

      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mehrere Einträge löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie wirklich {selectedTenants.size} Einträge löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isBulkDeleting} className="bg-red-600 hover:bg-red-700">
              {isBulkDeleting ? "Lösche..." : `${selectedTenants.size} Einträge löschen`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteAllConfirm} onOpenChange={setShowDeleteAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alle Bewerber löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie wirklich ALLE Bewerber unwiderruflich löschen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAll}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAllApplicants} disabled={isDeletingAll} className="bg-red-600 hover:bg-red-700">
              {isDeletingAll ? "Lösche..." : "Alle löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ApplicantImportModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
      />
    </div>
  );
}
