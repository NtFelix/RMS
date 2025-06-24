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

  useEffect(() => {
    setApartments(initialWohnungen);
  }, [initialWohnungen]);

  let buttonTooltipMessage = "";
  if (!isActiveSubscription) {
    buttonTooltipMessage = "Ein aktives Abonnement ist erforderlich, um Wohnungen hinzuzufügen.";
  } else if (apartmentCount >= apartmentLimit) {
    buttonTooltipMessage = "Sie haben die maximale Anzahl an Wohnungen für Ihr aktuelles Abonnement erreicht.";
  }
  const isAddButtonDisabled = !isActiveSubscription || apartmentCount >= apartmentLimit;
  
  // Function to handle successful form submission
  const handleSuccess = useCallback(() => {
    // No longer manually updating client-side state here,
    // as `revalidatePath` in server actions will trigger a data refresh.
    // The optimistic update (`updateApartmentInList`) and `refreshTable`
    // are removed to rely on Next.js's data fetching mechanism.
    // If an optimistic update is still desired, it could be added here,
    // but the primary source of truth will be the server-refreshed data.
  }, []);

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
      useModalStore.getState().openWohnungModal(apartment as Apartment, houses, () => handleSuccess());
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
    useModalStore.getState().openWohnungModal(
      undefined, // initialData for new apartment
      houses,
      handleSuccess,
      apartmentCount,      // Pass the prop
      apartmentLimit,      // Pass the prop
      isActiveSubscription // Pass the prop
    );
  }, [houses, handleSuccess, apartmentCount, apartmentLimit, isActiveSubscription]);

  // Function to handle editing an apartment
  const handleEdit = useCallback((apt: Apartment) => {
    // For editing, limit props might not be directly relevant for the modal's primary function,
    // but passing them for consistency if the modal ever needs them.
    // Or, they could be omitted if strictly not used by the edit flow inside the modal.
    useModalStore.getState().openWohnungModal(
      apt,
      houses,
      handleSuccess,
      apartmentCount,
      apartmentLimit,
      isActiveSubscription
    );
  }, [houses, handleSuccess, apartmentCount, apartmentLimit, isActiveSubscription]);

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
