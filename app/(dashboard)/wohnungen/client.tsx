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
import { toast } from "@/hooks/use-toast"; // Import for test button
import { createClient } from "@/utils/supabase/client"; // Keep if handleEditFromEvent is kept, otherwise remove
import type { Apartment } from "@/components/apartment-table";
import { useModalStore } from "@/hooks/use-modal-store"; // Added

// Client-side component for interactive UI elements
export function WohnungenClient({ 
  initialWohnungen, 
  houses 
}: { 
  initialWohnungen: Apartment[]; 
  houses: { id: string; name: string }[]; 
}) {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  // Local dialog state (dialogOpen, editingId, formData) is removed
  // const [dialogOpen, setDialogOpen] = useState(false);
  // const [editingId, setEditingId] = useState<string | null>(null);
  // const [formData, setFormData] = useState({ name: "", groesse: "", miete: "", haus_id: "" });
  const reloadRef = useRef<(() => void) | null>(null); // Keep for table reload if needed
  const [wohnungen, setWohnungen] = useState(initialWohnungen); // Keep for table display

  // Updated handleEdit to use global modal
  const handleEdit = useCallback((apt: Apartment) => {
    useModalStore.getState().openWohnungModal(apt, houses);
  }, [houses]); // houses is a dependency

  // Event listener for edit-apartment Event
  // This logic might need re-evaluation if it's still required.
  // If kept, it should also use the global modal.
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
      // Use global modal for editing from event
      useModalStore.getState().openWohnungModal(apartment as Apartment, houses);
    } catch (error) {
      console.error('Fehler beim Laden der Wohnung:', error);
    }
  }, [houses]); // houses is a dependency

  // Client-side event listeners (keep if handleEditFromEvent is kept)
  useEffect(() => {
    const handleEditApartmentListener = (event: Event) => { // Renamed for clarity
      const customEvent = event as CustomEvent<{id: string}>;
      const apartmentId = customEvent.detail?.id;
      if (!apartmentId) return;
      
      handleEditFromEvent(apartmentId);
    };
    
    window.addEventListener('edit-apartment', handleEditApartmentListener);
    
    return () => {
      window.removeEventListener('edit-apartment', handleEditApartmentListener);
    };
  }, [handleEditFromEvent]); // handleEditFromEvent is a dependency

  // handleOpenChange is removed (was for local dialog)
  // handleChange is removed (was for local dialog form)
  // handleSubmit is removed (was for local dialog form)

  // Function to trigger adding a new apartment using the global modal
  const handleAddWohnung = () => {
    useModalStore.getState().openWohnungModal(undefined, houses);
  };

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        {/* Button now directly calls handleAddWohnung to open global modal */}
        <Button onClick={handleAddWohnung} className="sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" />
          Wohnung hinzufügen
        </Button>
        <Button onClick={() => { console.log('Test Toast button clicked'); toast({ title: 'Test Toast', description: 'This is a test notification.' }); }} className="sm:w-auto">
          Test Toast
        </Button>
        {/* Local Dialog component for adding/editing is removed */}
      </div>

      <ApartmentFilters onFilterChange={setFilter} onSearchChange={setSearchQuery} />
      <ApartmentTable 
        filter={filter}
        searchQuery={searchQuery}
        reloadRef={reloadRef}
        onEdit={handleEdit}
        initialApartments={initialWohnungen}
      />
    </>
  );
}
