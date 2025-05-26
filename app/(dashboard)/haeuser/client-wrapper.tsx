"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { HouseFilters } from "@/components/house-filters";
import { HouseTable, House } from "@/components/house-table";
// Dialog related imports are removed as the modal is now global
// import { Input } from "@/components/ui/input"; // No longer needed here
// import { Label } from "@/components/ui/label"; // No longer needed here
import { useRouter } from "next/navigation"; // Keep for potential page refresh logic if needed

import { useModalStore } from "@/hooks/use-modal-store"; // Added

interface HaeuserClientWrapperProps {
  haeuser: House[];
  // serverAction prop is likely no longer needed here as the modal is global.
  // If HouseTable or other parts use it for non-modal actions, it can be kept.
  // For now, let's assume it's not needed for the primary add/edit flow.
  // serverAction: (id: string | null, formData: FormData) => Promise<void>; 
}

export default function HaeuserClientWrapper({ haeuser }: HaeuserClientWrapperProps) {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  // State for local dialog (dialogOpen, editingHouse) is removed
  // const [dialogOpen, setDialogOpen] = useState(false);
  // const [editingHouse, setEditingHouse] = useState<House | null>(null);
  const tableReloadRef = useRef<() => void>(null);
  const router = useRouter(); // Keep for now, might be used for table refresh

  // useEffect for 'open-add-house-modal' event is removed.
  // This will be handled by CommandMenu triggering useModalStore.

  // handleOpenChange is removed (was for local dialog)

  // Function to refresh the table data
  const refreshTable = useCallback(() => {
    if (tableReloadRef.current) {
      tableReloadRef.current();
    }
  }, []);

  // Handle house edit with success callback
  const handleEdit = useCallback((house: House) => {
    useModalStore.getState().openHouseModal(house, refreshTable);
  }, [refreshTable]);

  // Handle add new house with success callback
  const handleAdd = useCallback(() => {
    useModalStore.getState().openHouseModal(undefined, refreshTable);
  }, [refreshTable]);

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Häuser</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Häuser und Immobilien</p>
        </div>
        {/* Button to add a new house - now uses the global modal store */}
        <Button onClick={handleAdd} className="sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" />
          Haus hinzufügen
        </Button>
        {/* The local Dialog component for adding/editing was removed in the previous step */}
      </div>
      <Card className="overflow-hidden rounded-xl border-none shadow-md">
        <CardHeader>
          <CardTitle>Hausliste</CardTitle>
          <CardDescription>Hier können Sie Ihre Häuser verwalten und filtern</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <HouseFilters onFilterChange={setFilter} onSearchChange={setSearchQuery} />
          {/* HouseTable's onEdit prop now correctly triggers the global modal for editing */}
          <HouseTable filter={filter} searchQuery={searchQuery} reloadRef={tableReloadRef} onEdit={handleEdit} initialHouses={haeuser} />
        </CardContent>
      </Card>
    </div>
  );
}
