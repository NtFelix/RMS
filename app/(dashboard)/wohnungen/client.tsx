"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { ApartmentFilters } from "@/components/apartment-filters";
import { ApartmentTable } from "@/components/apartment-table";
// Dialog related imports are removed as they are no longer needed
// import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
// import { toast } from "@/components/ui/use-toast"; // toast is used by global modal
import { createClient } from "@/utils/supabase/client"; // Keep if handleEditFromEvent is kept, otherwise remove
import type { Apartment } from "@/components/apartment-table";
import { useModalStore } from "@/hooks/use-modal-store"; // Added

// Client-side component for interactive UI elements
export function WohnungenClient({ 
  initialWohnungen, 
  houses,
  apartmentCount,
  apartmentLimit,
  isActiveSubscription
}: { 
  initialWohnungen: Apartment[]; 
  houses: { id: string; name: string }[]; 
  apartmentCount: number;
  apartmentLimit: number;
  isActiveSubscription: boolean;
}) {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  // Local dialog state (dialogOpen, editingId, formData) is removed
  // const [dialogOpen, setDialogOpen] = useState(false);
  // const [editingId, setEditingId] = useState<string | null>(null);
  // const [formData, setFormData] = useState({ name: "", groesse: "", miete: "", haus_id: "" });
  const reloadRef = useRef<(() => void) | null>(null);
  const [apartments, setApartments] = useState(initialWohnungen);

  let buttonTooltipMessage = "";
  if (!isActiveSubscription) {
    buttonTooltipMessage = "Ein aktives Abonnement ist erforderlich, um Wohnungen hinzuzufügen.";
  } else if (apartmentCount >= apartmentLimit) {
    buttonTooltipMessage = "Sie haben die maximale Anzahl an Wohnungen für Ihr aktuelles Abonnement erreicht.";
  }
  const isAddButtonDisabled = !isActiveSubscription || apartmentCount >= apartmentLimit;
  
  // Function to update the apartments list with a new or updated apartment
  const updateApartmentInList = useCallback((updatedApartment: Apartment) => {
    setApartments(prevApartments => {
      // If no previous apartments, just return the new one in an array
      if (!prevApartments || prevApartments.length === 0) {
        return [updatedApartment];
      }
      
      // Check if the apartment already exists in the list
      const exists = prevApartments.some(apt => apt.id === updatedApartment.id);
      
      if (exists) {
        // Update existing apartment
        return prevApartments.map(apt => 
          apt.id === updatedApartment.id ? updatedApartment : apt
        );
      } else {
        // Add new apartment to the beginning of the list
        return [updatedApartment, ...prevApartments];
      }
    });
  }, []);

  // Function to refresh the table data
  const refreshTable = useCallback(async () => {
    try {
      const res = await fetch('/api/wohnungen');
      if (res.ok) {
        const data = await res.json();
        setApartments(data);
        return data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching wohnungen:', error);
      return [];
    }
  }, []);

  // Function to handle successful form submission
  const handleSuccess = useCallback((data: Apartment) => {
    // Update the apartments list with the new/updated apartment
    updateApartmentInList(data);
    
    // Also trigger a full refresh to ensure all data is in sync
    refreshTable();
  }, [refreshTable, updateApartmentInList]);

  // Event listener for edit-apartment Event
  const handleEditFromEvent = useCallback(async (apartmentId: string) => {
    try {
      const { data: apartment } = await createClient()
        .from('Wohnungen')
        .select('*')
        .eq('id', apartmentId)
        .single();
      
      if (!apartment) {
        console.error('Wohnung nicht gefunden:', apartmentId);
        return;
      }
      // Use global modal with success callback
      useModalStore.getState().openWohnungModal(apartment as Apartment, houses, handleSuccess);
    } catch (error) {
      console.error('Fehler beim Laden der Wohnung:', error);
    }
  }, [houses, handleSuccess]);

  // Client-side event listeners for edit events
  useEffect(() => {
    const handleEditApartmentListener = (event: Event) => {
      const customEvent = event as CustomEvent<{id: string}>;
      const apartmentId = customEvent.detail?.id;
      if (!apartmentId) return;
      
      // Use the global modal with success callback
      handleEditFromEvent(apartmentId);
    };
    
    window.addEventListener('edit-apartment', handleEditApartmentListener);
    
    return () => {
      window.removeEventListener('edit-apartment', handleEditApartmentListener);
    };
  }, [handleEditFromEvent]);

  // Function to trigger adding a new apartment using the global modal
  const handleAddWohnung = useCallback(() => {
    useModalStore.getState().openWohnungModal(undefined, houses, handleSuccess);
  }, [houses, handleSuccess]);

  // Function to handle editing an apartment
  const handleEdit = useCallback((apt: Apartment) => {
    useModalStore.getState().openWohnungModal(apt, houses, handleSuccess);
  }, [houses, handleSuccess]);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div> {/* Added a div to group button and potential message */}
          <Button onClick={handleAddWohnung} className="sm:w-auto" disabled={isAddButtonDisabled}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Wohnung hinzufügen
          </Button>
          {isAddButtonDisabled && (
            <p className="text-sm text-red-500 mt-1">{buttonTooltipMessage}</p>
          )}
        </div>
        {/* Local Dialog component for adding/editing is removed */}
      </div>

      <ApartmentFilters onFilterChange={setFilter} onSearchChange={setSearchQuery} />
      <ApartmentTable 
        filter={filter}
        searchQuery={searchQuery}
        initialApartments={apartments}
        onEdit={handleEdit}
      />
    </>
  );
}
