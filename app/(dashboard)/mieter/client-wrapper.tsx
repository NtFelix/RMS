"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveButtonWithTooltip } from "@/components/ui/responsive-button";
import { ResponsiveFilterButton } from "@/components/ui/responsive-filter-button";
import { useModalStore } from "@/hooks/use-modal-store";
import { PlusCircle, Users, BadgeCheck, Euro, Search, Building2, BarChart3 } from "lucide-react";
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
import { ApplicantScoreModal } from "@/components/tenants/applicant-score-modal";
import { MailPreviewModal } from "@/components/mail-preview-modal";
import { ChevronDown, UserPlus, Mail } from "lucide-react";
import { TenantsDonutChart } from "@/components/dashboard/dashboard-charts";


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
  const [currentTab, setCurrentTab] = useState<"mieter" | "bewerber" | "overview">("mieter");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTenants, setSelectedTenants] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const { openTenantModal } = useModalStore();
  const showApplicantsTab = useFeatureFlagEnabled('applicants-tab');

  // Fallback to "mieter" if applicants tab is disabled and user is on "bewerber"
  useEffect(() => {
    if (showApplicantsTab === false && currentTab === "bewerber") {
      setCurrentTab("mieter");
    }
  }, [showApplicantsTab, currentTab]);

  // Compute tenant stats for overview subpage
  const tenantStats = useMemo(() => {
    if (!initialTenants || initialTenants.length === 0) {
      return {
        total: 0,
        activeCount: 0,
        applicantCount: 0,
        pastCount: 0,
        totalDeposit: 0,
        depositReceived: 0,
        depositOutstanding: 0,
        depositStatusCount: {} as Record<string, number>,
      }
    }

    let activeCount = 0
    let applicantCount = 0
    let pastCount = 0

    let totalDeposit = 0
    let depositReceived = 0
    let depositOutstanding = 0
    const depositStatusCount: Record<string, number> = {}

    initialTenants.forEach(t => {
      const status = t.status || 'mieter'
      if (status === 'mieter') {
        activeCount++
      } else if (status === 'bewerber') {
        applicantCount++
      } else {
        pastCount++
      }

      if (t.kaution) {
        const amount = typeof t.kaution.amount === 'string'
          ? parseFloat(t.kaution.amount)
          : Number(t.kaution.amount || 0);

        if (!isNaN(amount) && amount > 0) {
          totalDeposit += amount
          const statusLabel = (t.kaution.status || 'Ausstehend') as string
          depositStatusCount[statusLabel] = (depositStatusCount[statusLabel] || 0) + amount

          if (statusLabel === 'Erhalten' || statusLabel === 'Bezahlt') {
            depositReceived += amount
          } else if (statusLabel === 'Ausstehend' || statusLabel === 'Offen') {
            depositOutstanding += amount
          }
        }
      }
    })

    const total = initialTenants.length

    return {
      total,
      activeCount,
      applicantCount,
      pastCount,
      totalDeposit,
      depositReceived,
      depositOutstanding,
      depositStatusCount,
    }
  }, [initialTenants])

  // Compute occupancy rate
  const occupancyRate = useMemo(() => {
    if (!initialWohnungen || initialWohnungen.length === 0) return 0;
    const today = new Date();
    const activeTenantWohnungIds = new Set(
      initialTenants
        .filter(t => (t.status || 'mieter') === 'mieter' && (!t.auszug || new Date(t.auszug) > today))
        .map(t => t.wohnung_id)
        .filter(Boolean)
    );
    return Math.round((activeTenantWohnungIds.size / initialWohnungen.length) * 100);
  }, [initialWohnungen, initialTenants]);

  // Filter tenants based on tab
  const filteredTenantsByTab = useMemo(() => {
    return initialTenants.filter(t => {
      // Default to "mieter" if status is missing (migration fallback)
      const status = t.status || 'mieter';
      // If current tab is overview, we don't strictly filter list records since overview shows stats,
      // but let's fall back to mieter to prevent errors in list bindings
      const activeFilterTab = currentTab === 'overview' ? 'mieter' : currentTab;
      return status === activeFilterTab;
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
    <div className="flex flex-col gap-6 sm:gap-8 p-4 sm:p-8">

      <div className="flex flex-col gap-6">
        {/* 3-way sliding toggle */}
        <div className="flex items-center gap-1 bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200/30 dark:border-zinc-800/30 p-1 rounded-full relative w-full sm:w-fit max-w-[400px] select-none z-0">
          <motion.button
            layout
            onClick={() => {
              setCurrentTab("mieter");
              setFilter("current");
              setSelectedTenants(new Set());
            }}
            className={cn(
              "flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-full h-9 px-6 relative outline-none cursor-pointer text-sm font-medium transition-colors duration-300",
              currentTab === "mieter" ? "text-gray-900 dark:text-gray-100 font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {currentTab === "mieter" && (
              <motion.div
                layoutId="active-tenant-tab-pill"
                className="absolute inset-0 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/10 dark:border-zinc-700/30 rounded-full -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Users className="h-4 w-4 shrink-0 transition-transform duration-300" />
            <span>Mieter</span>
          </motion.button>

          {showApplicantsTab && (
            <motion.button
              layout
              onClick={() => {
                setCurrentTab("bewerber");
                setFilter("current");
                setSelectedTenants(new Set());
              }}
              className={cn(
                "flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-full h-9 px-6 relative outline-none cursor-pointer text-sm font-medium transition-colors duration-300",
                currentTab === "bewerber" ? "text-gray-900 dark:text-gray-100 font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {currentTab === "bewerber" && (
                <motion.div
                  layoutId="active-tenant-tab-pill"
                  className="absolute inset-0 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/10 dark:border-zinc-700/30 rounded-full -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <UserPlus className="h-4 w-4 shrink-0 transition-transform duration-300" />
              <span>Bewerber</span>
            </motion.button>
          )}

          <motion.button
            layout
            onClick={() => {
              setCurrentTab("overview");
              setSelectedTenants(new Set());
            }}
            className={cn(
              "flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-full h-9 px-6 relative outline-none cursor-pointer text-sm font-medium transition-colors duration-300",
              currentTab === "overview" ? "text-gray-900 dark:text-gray-100 font-semibold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {currentTab === "overview" && (
              <motion.div
                layoutId="active-tenant-tab-pill"
                className="absolute inset-0 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/10 dark:border-zinc-700/30 rounded-full -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <BarChart3 className="h-4 w-4 shrink-0 transition-transform duration-300" />
            <span>Übersicht</span>
          </motion.button>
        </div>

        {currentTab !== "overview" ? (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4 animate-in fade-in duration-300">
              <StatCard
                title={currentTab === 'mieter' ? "Mieter gesamt" : "Bewerber gesamt"}
                value={summary.total}
                icon={<Users className="h-4 w-4 text-muted-foreground" />}
                className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
              />
              {currentTab === 'mieter' && (
                <>
                  <StatCard
                    title="Aktiv / Ehemalig"
                    value={`${summary.activeCount} / ${summary.formerCount}`}
                    icon={<BadgeCheck className="h-4 w-4 text-muted-foreground" />}
                    className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
                  />
                  <StatCard
                    title="Ø Nebenkosten"
                    value={summary.avgUtilities}
                    unit="€"
                    decimals
                    icon={<Euro className="h-4 w-4 text-muted-foreground" />}
                    className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
                  />
                </>
              )}
            </div>

            <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] animate-in fade-in duration-300">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>{currentTab === 'mieter' ? 'Mieterverwaltung' : 'Bewerberverwaltung'}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 hidden sm:block">
                      {currentTab === 'mieter' ? 'Verwalten Sie hier alle Ihre Mieter' : 'Verwalten Sie hier potenzielle Mieter und Interessenten'}
                    </p>
                  </div>
                  <div className="mt-0 sm:mt-1">
                    {showApplicantsTab ? (
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
                    ) : (
                      <Button onClick={handleAddTenant} className="w-full sm:w-auto gap-2">
                        <PlusCircle className="h-4 w-4" />
                        Mieter hinzufügen
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <div className="px-6">
                <div className="h-px bg-gray-200 dark:bg-gray-700 w-full"></div>
              </div>

              {currentTab === "mieter" ? (
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
              ) : (
                <CardContent className="flex flex-col gap-6">
                  <div className="flex flex-col gap-4 mt-4 sm:mt-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                    filter="all"
                    searchQuery={searchQuery}
                    onEdit={handleEditTenantInTable}
                    selectedTenants={selectedTenants}
                    onSelectionChange={setSelectedTenants}
                    mode="applicants"
                  />
                </CardContent>
              )}
            </Card>
          </>
        ) : (
          <div className="flex flex-col gap-6 sm:gap-8 animate-in fade-in duration-300">
            {/* Stats cards for Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Mieter (aktiv)"
                value={tenantStats.activeCount}
                icon={<Users className="h-4 w-4 text-muted-foreground" />}
                className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
              />
              <StatCard
                title="Bewerber"
                value={tenantStats.applicantCount}
                icon={<UserPlus className="h-4 w-4 text-muted-foreground" />}
                className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
              />
              <StatCard
                title="Auslastung"
                value={occupancyRate}
                unit="%"
                icon={<BadgeCheck className="h-4 w-4 text-muted-foreground" />}
                className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
              />
              <StatCard
                title="Gesamte Kautionen"
                value={tenantStats.totalDeposit}
                unit="€"
                decimals
                icon={<Euro className="h-4 w-4 text-muted-foreground" />}
                className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-3xl"
              />
            </div>

            {/* Grid with Donut Chart and Deposit Details */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <Card className="lg:col-span-7 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6">
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="text-base font-semibold">Kaution Status & Details</CardTitle>
                </CardHeader>
                <CardContent className="px-0 pb-0 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                      <span className="text-xs text-muted-foreground block mb-1">Erhalten / Bezahlt</span>
                      <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        {tenantStats.depositReceived.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      </span>
                    </div>
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                      <span className="text-xs text-muted-foreground block mb-1">Ausstehend / Offen</span>
                      <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                        {tenantStats.depositOutstanding.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kautions-Aufteilung</h4>
                    {Object.entries(tenantStats.depositStatusCount).map(([status, amount]) => (
                      <div key={status} className="flex justify-between items-center text-sm border-b border-gray-100 dark:border-gray-800 pb-2">
                        <span className="font-medium">{status}</span>
                        <span className="font-semibold">{amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-5 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-xs rounded-[2rem] p-6 flex flex-col justify-between">
                <CardHeader className="px-0 pt-0 pb-2">
                  <CardTitle className="text-base font-semibold">Mieterverteilung</CardTitle>
                </CardHeader>
                <CardContent className="px-0 pb-0 flex-1 flex items-center justify-center">
                  <TenantsDonutChart tenants={initialTenants} />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

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
      <ApplicantScoreModal />
      <MailPreviewModal />
    </div>
  );
}
