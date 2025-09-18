"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ButtonWithTooltip } from "@/components/ui/button-with-tooltip";
import { Button } from "@/components/ui/button";
import { PlusCircle, Droplets, FileText, X } from "lucide-react";
import { OperatingCostsFilters } from "@/components/operating-costs-filters";
import { OperatingCostsTable } from "@/components/operating-costs-table";

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

  const handleOpenCreateModal = useCallback(() => {
    // Pass initialHaeuser and a success callback (e.g., to refresh data)
    openBetriebskostenModal(null, initialHaeuser, () => {
      // This callback is called on successful save from the modal
      // Trigger data refresh here, e.g., by re-fetching or using router.refresh()
      // For now, let's assume the modal itself or a global mechanism handles refresh.
      // If not, this is where you'd add `router.refresh()` or similar.
      router.refresh(); // Example refresh
    });
  }, [openBetriebskostenModal, initialHaeuser, router]);

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
      toast({ title: "Erfolg", description: "Nebenkosten-Eintrag erfolgreich gelöscht." });
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

  // Instruction cards data
  const instructionCards = [
    {
      id: 1,
      icon: PlusCircle,
      title: '1. Abrechnung anlegen',
      description: 'Lege eine neue Betriebskostenabrechnung für ein Jahr und ein Haus an.',
      button: (
        <ButtonWithTooltip 
          onClick={handleOpenCreateModal} 
          className="whitespace-nowrap"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Erstellen
        </ButtonWithTooltip>
      )
    },
    {
      id: 2,
      icon: Droplets,
      title: '2. Wasserzähler eintragen',
      description: 'Rechtsklick auf eine Abrechnungszeile → "Wasserzähler" auswählen und Zählerstände erfassen.',
      button: (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={scrollToTable} 
          className="whitespace-nowrap"
        >
          Zur Tabelle
        </Button>
      )
    },
    {
      id: 3,
      icon: FileText,
      title: '3. Über Übersicht prüfen',
      description: 'Rechtsklick → "Übersicht" um Details und Plausibilitäten zu kontrollieren.',
      button: (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={scrollToTable} 
          className="whitespace-nowrap"
        >
          Zur Tabelle
        </Button>
      )
    },
    {
      id: 4,
      icon: FileText,
      title: '4. Abrechnung erstellen',
      description: 'Rechtsklick → "Abrechnung erstellen" um die finale Abrechnung pro Mieter zu generieren.',
      button: (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={scrollToTable} 
          className="whitespace-nowrap"
        >
          Zur Tabelle
        </Button>
      )
    }
  ];

  return (
    <div className="flex flex-col gap-8 p-8">
      {/* Instruction Cards */}
      {showGuide && (
        <>
          <div className="flex justify-end -mb-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDismissGuide} 
              className="text-muted-foreground"
            >
              <X className="h-4 w-4 mr-1" /> Anleitung ausblenden
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {instructionCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card 
                  key={card.id}
                  className="relative overflow-hidden rounded-xl shadow-md border summary-card"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Icon className="h-4 w-4" />
                      {card.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground flex items-center justify-between gap-4">
                    <p>{card.description}</p>
                    {card.button}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Main Content Area including Card, Table, Modals */}
      <Card className="overflow-hidden rounded-2xl shadow-md">
        <CardHeader>
          <div className="flex flex-row items-center justify-between">
            <CardTitle>Betriebskostenübersicht</CardTitle>
            <ButtonWithTooltip onClick={handleOpenCreateModal} className="sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Betriebskostenabrechnung erstellen
            </ButtonWithTooltip>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <OperatingCostsFilters
            onFilterChange={setFilter}
            onSearchChange={setSearchQuery}
            onHouseChange={setSelectedHouseId}
            haeuser={initialHaeuser}
            selectedHouseId={selectedHouseId}
          />
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
