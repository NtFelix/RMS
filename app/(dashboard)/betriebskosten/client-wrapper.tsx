"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Droplets, X } from "lucide-react";
import { CreateAbrechnungDropdown } from "@/components/abrechnung/create-abrechnung-dropdown";
import { OperatingCostsFilters } from "@/components/finance/operating-costs-filters";
import { OperatingCostsTable } from "@/components/tables/operating-costs-table";

import { Haus } from "../../../lib/data-fetching"; // Ensure correct path
import { OptimizedNebenkosten } from "@/types/optimized-betriebskosten";
import { deleteNebenkosten as deleteNebenkostenServerAction } from "@/app/betriebskosten-actions"; // Fixed path
import ConfirmationAlertDialog from "@/components/ui/confirmation-alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useModalStore } from "@/hooks/use-modal-store"; // Added import
import { useRouter } from "next/navigation"; // Added import
import { BETRIEBSKOSTEN_GUIDE_COOKIE, BETRIEBSKOSTEN_GUIDE_VISIBILITY_CHANGED } from '@/constants/guide'; // Added import
import { getCookie, setCookie } from "@/utils/cookies";

// Props for the main client view component
interface BetriebskostenClientViewProps {
  initialNebenkosten: OptimizedNebenkosten[];
  initialHaeuser: Haus[];
  ownerName: string;
}



export default function BetriebskostenClientView({
  initialNebenkosten,
  initialHaeuser,
  ownerName,
}: BetriebskostenClientViewProps) {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHouseId, setSelectedHouseId] = useState<string>("all");
  const [filteredNebenkosten, setFilteredNebenkosten] = useState<OptimizedNebenkosten[]>(initialNebenkosten);
  // isModalOpen and editingNebenkosten are now managed by useModalStore
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedItemIdForDelete, setSelectedItemIdForDelete] = useState<string | null>(null);
  const { openBetriebskostenModal } = useModalStore(); // Get the action to open modal
  const { toast } = useToast();
  // Define router for potential refresh, though modal might handle it
  const router = useRouter();
  const tableRef = useRef<HTMLDivElement | null>(null);
  const [showGuide, setShowGuide] = useState(true);


  useEffect(() => {
    let result = initialNebenkosten;
    if (selectedHouseId && selectedHouseId !== "all") {
      result = result.filter(item => item.haeuser_id === selectedHouseId);
    }
    if (searchQuery) {
      result = result.filter(item =>
        item.startdatum?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.enddatum?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.haus_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.nebenkostenart && item.nebenkostenart.join(" ").toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    if (filter === "current_year") {
      const currentYear = new Date().getFullYear();
      const currentYearStart = `${currentYear}-01-01`;
      const currentYearEnd = `${currentYear}-12-31`;
      result = result.filter(item =>
        item.startdatum && item.enddatum &&
        item.startdatum <= currentYearEnd && item.enddatum >= currentYearStart
      );
    } else if (filter === "previous") {
      const currentYear = new Date().getFullYear();
      const currentYearStart = `${currentYear}-01-01`;
      result = result.filter(item =>
        item.enddatum && item.enddatum < currentYearStart
      );
    }
    setFilteredNebenkosten(result);
  }, [searchQuery, filter, initialNebenkosten, selectedHouseId]);

  const handleOpenCreateModal = useCallback((templateType: 'blank' | 'previous' | 'default' = 'blank') => {
    // Pass initialHaeuser and a success callback (e.g., to refresh data)
    openBetriebskostenModal(
      templateType !== 'blank' ? { useTemplate: templateType } : null,
      initialHaeuser,
      () => {
        // This callback is called on successful save from the modal
        router.refresh();
      }
    );
  }, [openBetriebskostenModal, initialHaeuser, router]);

  const handleOpenBlankModal = useCallback(() => handleOpenCreateModal('blank'), [handleOpenCreateModal]);
  const handleOpenPreviousTemplateModal = useCallback(() => handleOpenCreateModal('previous'), [handleOpenCreateModal]);
  const handleOpenDefaultTemplateModal = useCallback(() => handleOpenCreateModal('default'), [handleOpenCreateModal]);

  const handleOpenEditModal = useCallback((item: OptimizedNebenkosten) => {
    // Convert OptimizedNebenkosten to Nebenkosten format for the modal
    const nebenkostenItem = {
      ...item,
      Haeuser: { name: item.haus_name },
      gesamtFlaeche: item.gesamt_flaeche,
      anzahlWohnungen: item.anzahl_wohnungen,
      anzahlMieter: item.anzahl_mieter
    };
    openBetriebskostenModal(nebenkostenItem, initialHaeuser, () => {
      router.refresh(); // Example refresh
    });
  }, [openBetriebskostenModal, initialHaeuser, router]);

  // handleCloseModal is no longer needed as the modal store handles closing.

  const openDeleteAlert = useCallback((itemId: string) => {
    setSelectedItemIdForDelete(itemId);
    setIsDeleteAlertOpen(true);
  }, []);

  const handleDeleteDialogOnOpenChange = useCallback((open: boolean) => {
    setIsDeleteAlertOpen(open);
    if (!open) {
      setSelectedItemIdForDelete(null);
    }
  }, []);

  const executeDelete = useCallback(async () => {
    if (!selectedItemIdForDelete) return;
    const result = await deleteNebenkostenServerAction(selectedItemIdForDelete);
    if (result.success) {
      toast({
        title: "Erfolg",
        description: "Nebenkosten-Eintrag erfolgreich gelöscht.",
        variant: "success"
      });
      setFilteredNebenkosten(prev => prev.filter(item => item.id !== selectedItemIdForDelete));
    } else {
      toast({
        title: "Fehler",
        description: result.message || "Eintrag konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    }
  }, [selectedItemIdForDelete, toast]);

  const scrollToTable = useCallback(() => {
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Initialize guide visibility from cookie
  useEffect(() => {
    const hidden = getCookie(BETRIEBSKOSTEN_GUIDE_COOKIE);
    if (hidden === 'true') {
      setShowGuide(false);
    } else {
      setShowGuide(true);
    }
  }, []);

  // React to settings changes via custom event
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ hidden: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.hidden === 'boolean') {
        setShowGuide(!customEvent.detail.hidden);
      } else {
        console.warn('Received betriebskosten-guide-visibility-changed event without expected detail.hidden boolean');
      }
    };
    window.addEventListener(BETRIEBSKOSTEN_GUIDE_VISIBILITY_CHANGED, handler as EventListener);
    return () => window.removeEventListener(BETRIEBSKOSTEN_GUIDE_VISIBILITY_CHANGED, handler as EventListener);
  }, []);

  const handleDismissGuide = useCallback(() => {
    setCookie(BETRIEBSKOSTEN_GUIDE_COOKIE, 'true', 365);
    setShowGuide(false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(BETRIEBSKOSTEN_GUIDE_VISIBILITY_CHANGED, { detail: { hidden: true } }));
    }
  }, []);

  // Instruction steps data
  const instructionSteps = [
    {
      id: 1,
      title: 'Abrechnung anlegen',
      description: 'Erstelle eine neue Betriebskostenabrechnung für ein Jahr und ein Haus.',
    },
    {
      id: 2,
      title: 'Drei-Punkte-Menü öffnen',
      description: 'Klicke auf die drei Punkte (⋮) in der Aktionen-Spalte einer Abrechnungszeile.',
    },
    {
      id: 3,
      title: 'Zähler eintragen',
      description: 'Wähle "Zähler" aus dem Menü und erfasse die Zählerstände.',
    },
    {
      id: 4,
      title: 'Übersicht prüfen',
      description: 'Wähle "Übersicht" um Details und Plausibilitäten zu kontrollieren.',
    },
    {
      id: 5,
      title: 'Abrechnung erstellen',
      description: 'Wähle "Abrechnung erstellen" um die finale Abrechnung pro Mieter zu generieren.',
    }
  ];

  return (
    <div className="flex flex-col gap-8 p-8 bg-white dark:bg-[#181818]">
      <div
        className="absolute inset-0 z-[-1] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at top left, rgba(121, 68, 255, 0.05), transparent 20%), radial-gradient(circle at bottom right, rgba(255, 121, 68, 0.05), transparent 20%)`,
        }}
      />
      {/* Instruction Guide */}
      {showGuide && (
        <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-[2rem]">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">Anleitung: Betriebskostenabrechnung</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Folge diesen Schritten, um eine vollständige Betriebskostenabrechnung zu erstellen
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismissGuide}
                className="text-muted-foreground -mt-1"
              >
                <X className="h-4 w-4 mr-1" /> Ausblenden
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {instructionSteps.map((step, index) => (
                <div key={step.id} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/30 flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary dark:text-primary-foreground">{index + 1}</span>
                  </div>
                  <div className="flex-1 pt-0.5">
                    <h4 className="font-medium text-sm mb-1">{step.title}</h4>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
              <CreateAbrechnungDropdown
                onBlankClick={handleOpenBlankModal}
                onPreviousClick={handleOpenPreviousTemplateModal}
                onTemplateClick={handleOpenDefaultTemplateModal}
                className="flex-1"
                buttonText="Neue Abrechnung erstellen"
              />
              <Button
                variant="outline"
                onClick={scrollToTable}
                className="flex-1"
              >
                Zur Tabelle springen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Area including Card, Table, Modals */}
      <Card className="bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-[2rem]">
        <CardHeader>
          <div className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Betriebskostenübersicht</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Verwalten Sie hier alle Ihre Betriebskostenabrechnungen</p>
            </div>
            <div className="mt-1">
              <CreateAbrechnungDropdown
                onBlankClick={handleOpenBlankModal}
                onPreviousClick={handleOpenPreviousTemplateModal}
                onTemplateClick={handleOpenDefaultTemplateModal}
                buttonText="Betriebskostenabrechnung erstellen"
                className="sm:w-auto"
              />
            </div>
          </div>
        </CardHeader>
        <div className="px-6">
          <div className="h-px bg-gray-200 dark:bg-gray-700 w-full"></div>
        </div>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 mt-6">
            <OperatingCostsFilters
              onFilterChange={setFilter}
              onSearchChange={setSearchQuery}
              onHouseChange={setSelectedHouseId}
              haeuser={initialHaeuser}
              selectedHouseId={selectedHouseId}
              searchQuery={searchQuery}
            />
          </div>
          <div ref={tableRef}>
            <OperatingCostsTable
              nebenkosten={filteredNebenkosten}
              onEdit={handleOpenEditModal}
              onDeleteItem={openDeleteAlert}
              ownerName={ownerName}
              allHaeuser={initialHaeuser}
            />
          </div>
        </CardContent>
      </Card>

      {/* BetriebskostenEditModal is now rendered globally from layout.tsx
          and controls its own visibility via useModalStore.
          The trigger to open it is handled by openBetriebskostenModal action.
      */}

      <ConfirmationAlertDialog
        isOpen={isDeleteAlertOpen}
        onOpenChange={handleDeleteDialogOnOpenChange}
        onConfirm={executeDelete}
        title="Löschen Bestätigen"
        description="Sind Sie sicher, dass Sie diesen Nebenkosten-Eintrag löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden."
        confirmButtonText="Löschen"
        cancelButtonText="Abbrechen"
        confirmButtonVariant="destructive"
      />
    </div>
  );
}
