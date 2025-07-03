"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { OperatingCostsFilters } from "@/components/operating-costs-filters";
import { OperatingCostsTable } from "@/components/operating-costs-table";
import { BetriebskostenEditModal } from "@/components/betriebskosten-edit-modal";
import { Nebenkosten, Haus } from "../../../lib/data-fetching";
import { deleteNebenkosten } from "../../../app/betriebskosten-actions"; // Adjusted path
import ConfirmationAlertDialog from "@/components/ui/confirmation-alert-dialog"; // Adjusted path
import { useToast } from "@/hooks/use-toast"; // Adjusted path

interface BetriebskostenClientWrapperProps {
  initialNebenkosten: Nebenkosten[]; // Using Nebenkosten type
  initialHaeuser: Haus[];       // Using Haus type
  userId?: string;
  ownerName: string;
}

export default function BetriebskostenClientWrapper({ 
  initialNebenkosten, 
  initialHaeuser, 
  userId,
  ownerName
}: BetriebskostenClientWrapperProps) {
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
    
    // Apply house filter
    if (selectedHouseId && selectedHouseId !== "all") {
      result = result.filter(item => item.haeuser_id === selectedHouseId);
    }
    
    // Apply search query
    if (searchQuery) {
      result = result.filter(item =>
        item.jahr?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.Haeuser?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || // Search by house name
        item.nebenkostenart?.join(" ").toLowerCase().includes(searchQuery.toLowerCase()) // Search by cost types
      );
    }
    
    // Apply other filters
    if (filter === "current_year") {
      const currentYear = new Date().getFullYear().toString();
      result = result.filter(item => item.jahr === currentYear);
    } else if (filter === "pending") {
      // Currently no pending filter as abgerechnet is not part of the type
      // You can add custom filtering logic here if needed
    } else if (filter === "previous") {
      // Filter for previous years
      const currentYear = new Date().getFullYear().toString();
      result = result.filter(item => item.jahr !== currentYear);
    }
    
    setFilteredNebenkosten(result);
  }, [searchQuery, filter, initialNebenkosten, selectedHouseId]);

  const handleOpenCreateModal = () => {
    setEditingNebenkosten(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: Nebenkosten) => {
    setEditingNebenkosten(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingNebenkosten(null);
  };

  const openDeleteAlert = (itemId: string) => {
    setSelectedItemIdForDelete(itemId);
    setIsDeleteAlertOpen(true);
  };

  const handleDialogOnOpenChange = (open: boolean) => {
      setIsDeleteAlertOpen(open);
      if (!open) {
          setSelectedItemIdForDelete(null); // Clear selection when dialog closes
      }
  };

  const executeDelete = async () => {
    if (!selectedItemIdForDelete) return;

    const result = await deleteNebenkosten(selectedItemIdForDelete);
    if (result.success) {
      toast({ title: "Erfolg", description: "Nebenkosten-Eintrag erfolgreich gelöscht." });
      // Data revalidation happens via revalidatePath in server action
    } else {
      toast({
        title: "Fehler",
        description: result.message || "Eintrag konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    }
    // setIsDeleteAlertOpen(false); // Dialog will close itself via its onConfirm -> onOpenChange(false)
    // setSelectedItemIdForDelete(null); // Already handled by handleDialogOnOpenChange
  };

  return (
    <>
      <Card className="overflow-hidden rounded-xl border-none shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Betriebskostenübersicht</CardTitle>
            <CardDescription>Hier können Sie Ihre Betriebskosten verwalten und abrechnen</CardDescription>
          </div>
          <Button onClick={handleOpenCreateModal} className="sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Betriebskostenabrechnung erstellen
          </Button>
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
        onOpenChange={handleDialogOnOpenChange}
        onConfirm={executeDelete}
        title="Löschen Bestätigen"
        description="Sind Sie sicher, dass Sie diesen Nebenkosten-Eintrag löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden."
        confirmButtonText="Löschen"
        cancelButtonText="Abbrechen"
        confirmButtonVariant="destructive"
      />
    </>
  );
}
