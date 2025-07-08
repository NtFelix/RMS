"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { OperatingCostsFilters } from "@/components/operating-costs-filters";
import { OperatingCostsTable } from "@/components/operating-costs-table";
import { BetriebskostenEditModal } from "@/components/betriebskosten-edit-modal";
import { Nebenkosten, Haus } from "../../../lib/data-fetching"; // Ensure correct path
import { deleteNebenkosten as deleteNebenkostenServerAction } from "../../../app/betriebskosten-actions"; // Ensure correct path
import ConfirmationAlertDialog from "@/components/ui/confirmation-alert-dialog";
import { useToast } from "@/hooks/use-toast";

// Props for the main client view component
interface BetriebskostenClientViewProps {
  initialNebenkosten: Nebenkosten[];
  initialHaeuser: Haus[];
  userId?: string;
  ownerName: string;
}

// AddBetriebskostenButton component (can be kept separate or integrated)
function AddBetriebskostenButton({ onAdd }: { onAdd: () => void }) {
  return (
    <Button onClick={onAdd} className="sm:w-auto">
      <PlusCircle className="mr-2 h-4 w-4" />
      Betriebskostenabrechnung erstellen
    </Button>
  );
}

export default function BetriebskostenClientView({
  initialNebenkosten,
  initialHaeuser,
  userId,
  ownerName,
}: BetriebskostenClientViewProps) {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHouseId, setSelectedHouseId] = useState<string>("all");
  const [filteredNebenkosten, setFilteredNebenkosten] = useState<Nebenkosten[]>(initialNebenkosten);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingNebenkosten, setEditingNebenkosten] = useState<Nebenkosten | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedItemIdForDelete, setSelectedItemIdForDelete] = useState<string | null>(null);
  const { toast } = useToast();

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
    setEditingNebenkosten(null);
    setIsModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback((item: Nebenkosten) => {
    setEditingNebenkosten(item);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingNebenkosten(null);
  }, []);

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

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Betriebskosten</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Betriebskosten und Abrechnungen</p>
        </div>
        <AddBetriebskostenButton onAdd={handleOpenCreateModal} />
      </div>

      {/* Main Content Area including Card, Table, Modals */}
      <Card className="overflow-hidden rounded-xl border-none shadow-md">
        <CardHeader>
          <div>
            <CardTitle>Betriebskostenübersicht</CardTitle>
            <CardDescription>Hier können Sie Ihre Betriebskosten verwalten und abrechnen</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <OperatingCostsFilters
            onFilterChange={setFilter}
            onSearchChange={setSearchQuery}
            onHouseChange={setSelectedHouseId}
            haeuser={initialHaeuser}
          />
          <OperatingCostsTable
            nebenkosten={filteredNebenkosten}
            onEdit={handleOpenEditModal}
            onDeleteItem={openDeleteAlert}
            ownerName={ownerName}
            allHaeuser={initialHaeuser}
          />
        </CardContent>
      </Card>

      {isModalOpen && userId && (
        <BetriebskostenEditModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          nebenkostenToEdit={editingNebenkosten}
          haeuser={initialHaeuser}
          userId={userId}
        />
      )}

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
