"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { OperatingCostsDataTable } from "@/components/data-tables/operating-costs-data-table";
import { Haus } from "../../../lib/data-fetching"; // Ensure correct path
import { Betriebskosten } from "@/types/supabase";
import { deleteNebenkosten as deleteNebenkostenServerAction } from "../../../app/betriebskosten-actions"; // Ensure correct path
import ConfirmationAlertDialog from "@/components/ui/confirmation-alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useModalStore } from "@/hooks/use-modal-store"; // Added import
import { useRouter } from "next/navigation"; // Added import

// Props for the main client view component
interface BetriebskostenClientViewProps {
  initialNebenkosten: Betriebskosten[];
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
  const [filteredNebenkosten, setFilteredNebenkosten] = useState<Betriebskosten[]>(initialNebenkosten);
  // isModalOpen and editingNebenkosten are now managed by useModalStore
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedItemIdForDelete, setSelectedItemIdForDelete] = useState<string | null>(null);
  const { openBetriebskostenModal } = useModalStore(); // Get the action to open modal
  const { toast } = useToast();
   // Define router for potential refresh, though modal might handle it
  const router = useRouter();


  useEffect(() => {
    let result = initialNebenkosten;
    if (selectedHouseId && selectedHouseId !== "all") {
      result = result.filter(item => item.haeuser_id === selectedHouseId);
    }
    if (searchQuery) {
      result = result.filter(item =>
        item.jahr?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.Haeuser?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.kostenart && item.kostenart.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    if (filter === "current_year") {
      const currentYear = new Date().getFullYear();
      result = result.filter(item => item.jahr === currentYear);
    } else if (filter === "previous") {
      const currentYear = new Date().getFullYear();
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

  const handleOpenEditModal = useCallback((item: Betriebskosten) => {
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
          <OperatingCostsDataTable data={filteredNebenkosten} />
        </CardContent>
      </Card>

    </div>
  );
}
