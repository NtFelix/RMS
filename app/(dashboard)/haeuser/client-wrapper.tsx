"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ButtonWithTooltip } from "@/components/ui/button-with-tooltip";
import { PlusCircle, Building, Home, Key, X, Download, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Checkbox } from "@/components/ui/checkbox";
import { StatCard } from "@/components/stat-card";
import { HouseTable, House } from "@/components/house-table";
import { useModalStore } from "@/hooks/use-modal-store";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/hooks/use-onboarding-store";

// Props for the main client view component
interface HaeuserClientViewProps {
  enrichedHaeuser: House[]; // Assuming enrichedHaeuser is an array of House
}





// This is the new main client component, combining logic from old HaeuserPageClientComponent and HaeuserClientWrapper
export default function HaeuserClientView({ enrichedHaeuser }: HaeuserClientViewProps) {
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHouses, setSelectedHouses] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const tableReloadRef = useRef<() => void>(null);
  const { openHouseModal } = useModalStore();

  const refreshTable = useCallback(() => {
    if (tableReloadRef.current) {
      tableReloadRef.current();
    }
  }, []);

  const handleAdd = useCallback(() => {
    try {
      openHouseModal(undefined, refreshTable);
    } catch (error) {
      console.error('Error opening house modal:', error);
    }
  }, [openHouseModal, refreshTable]);

  const handleEdit = useCallback(
    (house: House) => {
      try {
        openHouseModal(house, refreshTable);
      } catch (error) {
        console.error('Error opening house modal:', error);
      }
    },
    [openHouseModal, refreshTable]
  );

  // ===== Summary metrics =====
  const summary = useMemo(() => {
    const totalHouses = enrichedHaeuser.length;
    const totalApartments = enrichedHaeuser.reduce((sum, h) => sum + (h.totalApartments ?? 0), 0);
    const freeApartments = enrichedHaeuser.reduce((sum, h) => sum + (h.freeApartments ?? 0), 0);
    return { totalHouses, totalApartments, freeApartments };
  }, [enrichedHaeuser]);

  const escapeCsvValue = useCallback((value: string | null | undefined): string => {
    if (!value) return ''
    const stringValue = String(value)
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
      return `"${stringValue.replace(/"/g, '""')}"`
    }
    return stringValue
  }, [])

  const handleBulkExport = useCallback(() => {
    const selectedHousesData = enrichedHaeuser.filter(h => selectedHouses.has(h.id))

    const headers = ['Haus', 'Ort', 'Größe (m²)', 'Miete (€)', '€/m²', 'Status']
    const csvHeader = headers.map(h => escapeCsvValue(h)).join(',')

    const csvRows = selectedHousesData.map(h => {
      const row = [
        h.name,
        h.ort || '',
        h.size || '',
        h.rent || '',
        h.pricePerSqm || '',
        `${(h.totalApartments ?? 0) - (h.freeApartments ?? 0)}/${h.totalApartments ?? 0} belegt`
      ]
      return row.map(value => escapeCsvValue(value)).join(',')
    })

    const csvContent = [csvHeader, ...csvRows].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `haeuser_export_${new Date().toISOString().split('T')[0]}.csv`
    link.click()

    toast({
      title: "Export erfolgreich",
      description: `${selectedHouses.size} Häuser exportiert.`,
      variant: "success",
    })
  }, [selectedHouses, enrichedHaeuser, escapeCsvValue])

  const handleBulkDelete = useCallback(async () => {
    if (selectedHouses.size === 0) {
      toast({
        title: "Keine Auswahl",
        description: "Bitte wählen Sie mindestens ein Haus zum Löschen aus.",
        variant: "destructive",
      });
      return;
    }

    setIsBulkDeleting(true);
    const selectedIds = Array.from(selectedHouses);

    try {
      const response = await fetch('/api/haeuser/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Fehler beim Löschen der Häuser.');
      }

      const { successCount } = await response.json();

      toast({
        title: "Erfolg",
        description: `${successCount} Häuser erfolgreich gelöscht.`,
        variant: "success",
      });

      refreshTable();
      router.refresh();
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Ein Fehler ist beim Löschen der Häuser aufgetreten.",
        variant: "destructive",
      });
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteConfirm(false);
      setSelectedHouses(new Set());
    }
  }, [selectedHouses, router, refreshTable]);

  return (
    <div className="flex flex-col gap-8 p-8 bg-white dark:bg-[#181818]">
      <div
        className="absolute inset-0 z-[-1]"
        style={{
          backgroundImage: `radial-gradient(circle at top left, rgba(121, 68, 255, 0.05), transparent 20%), radial-gradient(circle at bottom right, rgba(255, 121, 68, 0.05), transparent 20%)`,
        }}
      />
      <div className="flex flex-wrap gap-4">
        <StatCard
          title="Häuser gesamt"
          value={summary.totalHouses}
          icon={<Building className="h-4 w-4 text-muted-foreground" />}
          className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl"
        />
        <StatCard
          title="Wohnungen gesamt"
          value={summary.totalApartments}
          icon={<Home className="h-4 w-4 text-muted-foreground" />}
          className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl"
        />
        <StatCard
          title="Freie Wohnungen"
          value={summary.freeApartments}
          icon={<Key className="h-4 w-4 text-muted-foreground" />}
          className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl"
        />
      </div>
      <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-[2rem]">
        <CardHeader>
          <div className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Hausverwaltung</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Verwalten Sie hier alle Ihre Häuser</p>
            </div>
            <div className="mt-1">
              <ButtonWithTooltip
                id="create-object-btn"
                onClick={() => {
                  useOnboardingStore.getState().completeStep('create-house-start');
                  handleAdd();
                }}
                className="sm:w-auto"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Haus hinzufügen
              </ButtonWithTooltip>
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
                  { value: "all", label: "Alle Häuser" },
                  { value: "full", label: "Voll belegt" },
                  { value: "vacant", label: "Mit freien Wohnungen" },
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
              <SearchInput
                placeholder="Häuser suchen..."
                className="rounded-full"
                mode="table"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery("")}
              />
            </div>
            {selectedHouses.size > 0 && (
              <div className="p-4 bg-primary/10 dark:bg-primary/20 border border-primary/20 rounded-lg flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={true}
                      onCheckedChange={() => setSelectedHouses(new Set())}
                      className="data-[state=checked]:bg-primary"
                    />
                    <span className="font-medium text-sm">
                      {selectedHouses.size} {selectedHouses.size === 1 ? 'Haus' : 'Häuser'} ausgewählt
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedHouses(new Set())}
                    className="h-8 px-2 hover:bg-primary/20"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkExport}
                    className="h-8 gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Exportieren
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkDeleteConfirm(true)}
                    disabled={isBulkDeleting}
                    className="h-8 gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    {isBulkDeleting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Wird gelöscht...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        Löschen ({selectedHouses.size})
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
          <HouseTable
            filter={filter}
            searchQuery={searchQuery}
            reloadRef={tableReloadRef}
            onEdit={handleEdit}
            initialHouses={enrichedHaeuser}
            selectedHouses={selectedHouses}
            onSelectionChange={setSelectedHouses}
          />
        </CardContent>
      </Card>

      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mehrere Häuser löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie wirklich {selectedHouses.size} Häuser löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isBulkDeleting} className="bg-red-600 hover:bg-red-700">
              {isBulkDeleting ? "Lösche..." : `${selectedHouses.size} Häuser löschen`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
