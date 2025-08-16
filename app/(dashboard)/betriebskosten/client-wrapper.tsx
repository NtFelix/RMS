"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ButtonWithTooltip } from "@/components/ui/button-with-tooltip";
import { Button } from "@/components/ui/button";
import { PlusCircle, Droplets, FileText } from "lucide-react";
import { OperatingCostsFilters } from "@/components/operating-costs-filters";
import { OperatingCostsTable } from "@/components/operating-costs-table";

import { Nebenkosten, Haus } from "../../../lib/data-fetching"; // Ensure correct path
import { deleteNebenkosten as deleteNebenkostenServerAction } from "@/app/betriebskosten-actions"; // Fixed path
import ConfirmationAlertDialog from "@/components/ui/confirmation-alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useModalStore } from "@/hooks/use-modal-store"; // Added import
import { useRouter } from "next/navigation"; // Added import

// Props for the main client view component
interface BetriebskostenClientViewProps {
  initialNebenkosten: Nebenkosten[];
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
  const [filteredNebenkosten, setFilteredNebenkosten] = useState<Nebenkosten[]>(initialNebenkosten);
  // isModalOpen and editingNebenkosten are now managed by useModalStore
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedItemIdForDelete, setSelectedItemIdForDelete] = useState<string | null>(null);
  const { openBetriebskostenModal } = useModalStore(); // Get the action to open modal
  const { toast } = useToast();
   // Define router for potential refresh, though modal might handle it
  const router = useRouter();
  const tableRef = useRef<HTMLDivElement | null>(null);


  useEffect(() => {
    let result = initialNebenkosten;
    if (selectedHouseId && selectedHouseId !== "all") {
      result = result.filter(item => item.haeuser_id === selectedHouseId);
    }
    if (searchQuery) {
      result = result.filter(item =>
        item.jahr?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.Haeuser?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.nebenkostenart && item.nebenkostenart.join(" ").toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    if (filter === "current_year") {
      const currentYear = new Date().getFullYear().toString();
      result = result.filter(item => item.jahr === currentYear);
    } else if (filter === "previous") {
      const currentYear = new Date().getFullYear().toString();
      result = result.filter(item => item.jahr !== currentYear);
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

  const handleOpenEditModal = useCallback((item: Nebenkosten) => {
    openBetriebskostenModal(item, initialHaeuser, () => {
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

  return (
    <div className="flex flex-col gap-8 p-8">
      {/* Instruction Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <PlusCircle className="h-4 w-4" />
              1. Abrechnung anlegen
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground flex items-center justify-between gap-4">
            <p>
              Lege eine neue Betriebskostenabrechnung für ein Jahr und ein Haus an.
            </p>
            <ButtonWithTooltip onClick={handleOpenCreateModal} className="whitespace-nowrap">
              <PlusCircle className="mr-2 h-4 w-4" />
              Erstellen
            </ButtonWithTooltip>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Droplets className="h-4 w-4" />
              2. Wasserzähler eintragen
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground flex items-center justify-between gap-4">
            <p>
              Rechtsklick auf eine Abrechnungszeile → "Wasserzähler" auswählen und Zählerstände erfassen.
            </p>
            <Button variant="outline" size="sm" onClick={scrollToTable} className="whitespace-nowrap">
              Zur Tabelle
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              3. Über Übersicht prüfen
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground flex items-center justify-between gap-4">
            <p>
              Rechtsklick → "Übersicht" um Details und Plausibilitäten zu kontrollieren.
            </p>
            <Button variant="outline" size="sm" onClick={scrollToTable} className="whitespace-nowrap">
              Zur Tabelle
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              4. Abrechnung erstellen
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground flex items-center justify-between gap-4">
            <p>
              Rechtsklick → "Abrechnung erstellen" um die finale Abrechnung pro Mieter zu generieren.
            </p>
            <Button variant="outline" size="sm" onClick={scrollToTable} className="whitespace-nowrap">
              Zur Tabelle
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area including Card, Table, Modals */}
      <Card className="overflow-hidden rounded-xl shadow-md">
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
