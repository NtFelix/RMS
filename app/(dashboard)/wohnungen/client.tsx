"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { ButtonWithHoverCard } from "@/components/ui/button-with-hover-card";
import { PlusCircle, Home, Key, Euro, Ruler, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApartmentTable } from "@/components/apartment-table";
import { createClient as createBrowserClient } from "@/utils/supabase/client";
import type { Wohnung } from "@/types/Wohnung";
import { useModalStore } from "@/hooks/use-modal-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Apartment as ApartmentTableType } from "@/components/apartment-table";
import { StatCard } from "@/components/stat-card";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

// Props for the main client view component, matching what page.tsx will pass
interface WohnungenClientViewProps {
  initialWohnungenData: Wohnung[];
  housesData: { id: string; name: string }[];
  serverApartmentCount: number;
  serverApartmentLimit: number;
  serverUserIsEligibleToAdd: boolean;
  serverLimitReason: 'trial' | 'subscription' | 'none';
}

// This is the new main client component, previously WohnungenPageClientComponent in page.tsx
export default function WohnungenClientView({
  initialWohnungenData,
  housesData,
  serverApartmentCount,
  serverApartmentLimit,
  serverUserIsEligibleToAdd,
  serverLimitReason,
}: WohnungenClientViewProps) {
  const router = useRouter()
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const reloadRef = useRef<(() => void) | null>(null);
  const [apartments, setApartments] = useState<Wohnung[]>(initialWohnungenData);
  const [selectedApartments, setSelectedApartments] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const { openWohnungModal } = useModalStore();

  // ======================= SUMMARY METRICS =======================
  const summary = useMemo(() => {
    const total = apartments.length;
    const freeCount = apartments.filter((a) => a.status === "frei").length;
    const rentedCount = total - freeCount;

    // Average rent
    const rentValues = apartments.map((a) => a.miete ?? 0).filter((v) => v > 0);
    const avgRent = rentValues.length ? rentValues.reduce((s, v) => s + v, 0) / rentValues.length : 0;

    // Average price per sqm
    const pricePerSqmValues = apartments
      .filter((a) => a.miete && a.groesse && a.groesse > 0)
      .map((a) => (a.miete as number) / (a.groesse as number));
    const avgPricePerSqm = pricePerSqmValues.length
      ? pricePerSqmValues.reduce((s, v) => s + v, 0) / pricePerSqmValues.length
      : 0;

    return { total, freeCount, rentedCount, avgRent, avgPricePerSqm };
  }, [apartments]);

  const [isAddButtonDisabled, setIsAddButtonDisabled] = useState(!serverUserIsEligibleToAdd || (serverApartmentCount >= serverApartmentLimit && serverApartmentLimit !== Infinity));
  const [buttonTooltipMessage, setButtonTooltipMessage] = useState("");

  useEffect(() => {
    let message = "";
    const limitReached = serverApartmentCount >= serverApartmentLimit && serverApartmentLimit !== Infinity;
    
    if (!serverUserIsEligibleToAdd) {
      message = "Ein aktives Abonnement oder eine gültige Testphase ist erforderlich, um Wohnungen hinzuzufügen.";
    } else if (limitReached) {
      if (serverLimitReason === 'trial') {
        message = `Maximale Anzahl an Wohnungen (${serverApartmentLimit}) für Ihre Testphase erreicht.`;
      } else if (serverLimitReason === 'subscription') {
        message = `Sie haben die maximale Anzahl an Wohnungen (${serverApartmentLimit}) für Ihr aktuelles Abonnement erreicht.`;
      } else {
        message = "Das Wohnungslimit ist erreicht.";
      }
    }
    
    setButtonTooltipMessage(message);
    setIsAddButtonDisabled(!serverUserIsEligibleToAdd || limitReached);
  }, [serverApartmentCount, serverApartmentLimit, serverUserIsEligibleToAdd, serverLimitReason]);

  const escapeCsvValue = useCallback((value: string | null | undefined): string => {
    if (!value) return ''
    const stringValue = String(value)
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
      return `"${stringValue.replace(/"/g, '""')}"`
    }
    return stringValue
  }, [])

  const handleBulkExport = useCallback(() => {
    const selectedApartmentsData = apartments.filter(a => selectedApartments.has(a.id))
    
    const headers = ['Name', 'Größe (m²)', 'Miete (€)', 'Miete pro m²', 'Haus', 'Status']
    const csvHeader = headers.map(h => escapeCsvValue(h)).join(',')
    
    const csvRows = selectedApartmentsData.map(a => {
      const row = [
        a.name,
        a.groesse?.toString() || '',
        a.miete?.toString() || '',
        a.groesse && a.miete ? (a.miete / a.groesse).toFixed(2) : '',
        a.Haeuser?.name || '',
        a.status || ''
      ]
      return row.map(value => escapeCsvValue(value)).join(',')
    })
    
    const csvContent = [csvHeader, ...csvRows].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `wohnungen_export_${new Date().toISOString().split('T')[0]}.csv`
    link.click()

    toast({
      title: "Export erfolgreich",
      description: `${selectedApartments.size} Wohnungen exportiert.`,
      variant: "success",
    })
  }, [selectedApartments, apartments, escapeCsvValue])

  const handleBulkDelete = useCallback(async () => {
    setIsBulkDeleting(true)
    const selectedIds = Array.from(selectedApartments)
    let successCount = 0
    let errorCount = 0

    for (const apartmentId of selectedIds) {
      try {
        const response = await fetch(`/api/wohnungen/${apartmentId}`, { method: 'DELETE' })
        if (response.ok) {
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
    setSelectedApartments(new Set())

    if (successCount > 0) {
      toast({
        title: "Erfolg",
        description: `${successCount} Wohnungen erfolgreich gelöscht${errorCount > 0 ? `, ${errorCount} fehlgeschlagen` : ''}.`,
        variant: "success",
      })
      await refreshTable()
      router.refresh()
    } else {
      toast({
        title: "Fehler",
        description: "Keine Wohnungen konnten gelöscht werden.",
        variant: "destructive",
      })
    }
  }, [selectedApartments, router]);

  const updateApartmentInList = useCallback((updatedApartment: Wohnung) => {
    setApartments(prev => {
      const exists = prev.some(apt => apt.id === updatedApartment.id);
      if (exists) return prev.map(apt => (apt.id === updatedApartment.id ? updatedApartment : apt));
      return [updatedApartment, ...prev];
    });
  }, []);

  const refreshTable = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch('/api/wohnungen');
      if (res.ok) {
        const data: Wohnung[] = await res.json();
        setApartments(data);
      } else {
        console.error('Failed to fetch wohnungen for refreshTable, status:', res.status);
      }
    } catch (error) {
      console.error('Error fetching wohnungen in refreshTable:', error);
    }
  }, []);

  const handleSuccess = useCallback((data: Wohnung) => {
    updateApartmentInList(data);
    refreshTable();
  }, [updateApartmentInList, refreshTable]);

  const handleAddWohnung = useCallback(() => {
    try {
      openWohnungModal(undefined, housesData, handleSuccess, serverApartmentCount, serverApartmentLimit, serverUserIsEligibleToAdd);
    } catch (error) {
      console.error('Error opening wohnung modal:', error);
    }
  }, [openWohnungModal, housesData, handleSuccess, serverApartmentCount, serverApartmentLimit, serverUserIsEligibleToAdd]);

  const handleEditWohnung = useCallback(async (apartment: ApartmentTableType) => {
    try {
      const supabase = createBrowserClient();
      const { data: aptToEdit, error } = await supabase.from('Wohnungen').select('*, Haeuser(name)').eq('id', apartment.id).single();
      if (error || !aptToEdit) {
        console.error('Wohnung nicht gefunden oder Fehler:', error?.message);
        return;
      }
      const transformedApt = { ...aptToEdit, Haeuser: Array.isArray(aptToEdit.Haeuser) ? aptToEdit.Haeuser[0] : aptToEdit.Haeuser } as Wohnung;
      openWohnungModal(transformedApt, housesData, handleSuccess, serverApartmentCount, serverApartmentLimit, serverUserIsEligibleToAdd);
    } catch (error) {
      console.error('Fehler beim Laden der Wohnung für Bearbeitung:', error);
    }
  }, [openWohnungModal, housesData, handleSuccess, serverApartmentCount, serverApartmentLimit, serverUserIsEligibleToAdd]);

  useEffect(() => {
    const handleEditApartmentListener = async (event: Event) => {
      const customEvent = event as CustomEvent<{id: string}>;
      const apartmentId = customEvent.detail?.id;
      if (!apartmentId) return;
      try {
        const supabase = createBrowserClient();
        const { data: aptToEdit, error } = await supabase.from('Wohnungen').select('*, Haeuser(name)').eq('id', apartmentId).single();
        if (error || !aptToEdit) { console.error('Wohnung nicht gefunden oder Fehler:', error?.message); return; }
        const transformedApt = { ...aptToEdit, Haeuser: Array.isArray(aptToEdit.Haeuser) ? aptToEdit.Haeuser[0] : aptToEdit.Haeuser } as Wohnung;
        handleEditWohnung(transformedApt);
      } catch (error) { console.error('Fehler beim Laden der Wohnung für Event-Edit:', error); }
    };
    window.addEventListener('edit-apartment', handleEditApartmentListener);
    return () => window.removeEventListener('edit-apartment', handleEditApartmentListener);
  }, [handleEditWohnung]);

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
          title="Wohnungen gesamt"
          value={summary.total}
          icon={<Home className="h-4 w-4 text-muted-foreground" />}
          className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl"
        />
        <StatCard
          title="Frei / Vermietet"
          value={`${summary.freeCount} / ${summary.rentedCount}`}
          icon={<Key className="h-4 w-4 text-muted-foreground" />}
          className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl"
        />
        <StatCard
          title="Ø Miete"
          value={summary.avgRent}
          unit="€"
          decimals
          icon={<Euro className="h-4 w-4 text-muted-foreground" />}
          className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl"
        />
        <StatCard
          title="Ø Preis pro m²"
          value={summary.avgPricePerSqm}
          unit="€/m²"
          decimals
          icon={<Ruler className="h-4 w-4 text-muted-foreground" />}
          className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl"
        />
      </div>

      <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-[2rem]">
        <CardHeader>
          <div className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Wohnungsverwaltung</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Verwalten Sie hier alle Ihre Wohnungen</p>
            </div>
            <div className="mt-1">
              <ButtonWithHoverCard 
                onClick={handleAddWohnung} 
                className="sm:w-auto" 
                disabled={isAddButtonDisabled}
                tooltip={buttonTooltipMessage}
                showTooltip={isAddButtonDisabled && !!buttonTooltipMessage}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Wohnung hinzufügen
              </ButtonWithHoverCard>
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
                  { value: "all", label: "Alle Wohnungen" },
                  { value: "free", label: "Freie Wohnungen" },
                  { value: "rented", label: "Vermietete Wohnungen" },
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
                  placeholder="Wohnungen suchen..."
                  className="pl-10 rounded-full"
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            {selectedApartments.size > 0 && (
              <div className="p-4 bg-primary/10 dark:bg-primary/20 border border-primary/20 rounded-lg flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm">
                    {selectedApartments.size} {selectedApartments.size === 1 ? 'Wohnung' : 'Wohnungen'} ausgewählt
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedApartments(new Set())}
                    className="h-8 px-2 hover:bg-primary/20"
                  >
                    Auswahl aufheben
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkExport}
                    className="h-8 gap-2"
                  >
                    Exportieren
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkDeleteConfirm(true)}
                    className="h-8 gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    Löschen
                  </Button>
                </div>
              </div>
            )}
          </div>
          <ApartmentTable
            filter={filter}
            searchQuery={searchQuery}
            initialApartments={apartments}
            onEdit={handleEditWohnung}
            onTableRefresh={refreshTable}
            reloadRef={reloadRef}
            selectedApartments={selectedApartments}
            onSelectionChange={setSelectedApartments}
          />
        </CardContent>
      </Card>

      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mehrere Wohnungen löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchten Sie wirklich {selectedApartments.size} Wohnungen löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isBulkDeleting} className="bg-red-600 hover:bg-red-700">
              {isBulkDeleting ? "Lösche..." : `${selectedApartments.size} Wohnungen löschen`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}