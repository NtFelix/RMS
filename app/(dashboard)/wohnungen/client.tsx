"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { ApartmentFilters } from "@/components/apartment-filters";
import { ApartmentsDataTable } from "@/components/data-tables/apartments-data-table";
import { createClient as createBrowserClient } from "@/utils/supabase/client";
import type { Wohnung } from "@/types/Wohnung";
import { useModalStore } from "@/hooks/use-modal-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; // For layout

// Props for the main client view component, matching what page.tsx will pass
interface WohnungenClientViewProps {
  initialWohnungenData: Wohnung[];
  housesData: { id: string; name: string }[];
  serverApartmentCount: number;
  serverApartmentLimit: number;
  serverUserIsEligibleToAdd: boolean;
  serverLimitReason: 'trial' | 'subscription' | 'none';
}

// This is the new main client component, previously WohnungenPageClientComponent in page.tsx
export default function WohnungenClientView({
  initialWohnungenData,
  housesData,
  serverApartmentCount,
  serverApartmentLimit,
  serverUserIsEligibleToAdd,
  serverLimitReason,
}: WohnungenClientViewProps) {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [apartments, setApartments] = useState<Wohnung[]>(initialWohnungenData);
  const reloadRef = useRef<(() => void) | null>(null);
  const { openWohnungModal } = useModalStore();

  const [isAddButtonDisabled, setIsAddButtonDisabled] = useState(!serverUserIsEligibleToAdd || (serverApartmentCount >= serverApartmentLimit && serverApartmentLimit !== Infinity));
  const [buttonTooltipMessage, setButtonTooltipMessage] = useState("");

  useEffect(() => {
    let message = "";
    const limitReached = serverApartmentCount >= serverApartmentLimit && serverApartmentLimit !== Infinity;
    if (!serverUserIsEligibleToAdd) {
      message = "Ein aktives Abonnement oder eine gültige Testphase ist erforderlich, um Wohnungen hinzuzufügen.";
    } else if (limitReached) {
      if (serverLimitReason === 'trial') {
        message = `Maximale Anzahl an Wohnungen (${serverApartmentLimit}) für Ihre Testphase erreicht.`;
      } else if (serverLimitReason === 'subscription') {
        message = `Sie haben die maximale Anzahl an Wohnungen (${serverApartmentLimit}) für Ihr aktuelles Abonnement erreicht.`;
      } else {
        message = "Das Wohnungslimit ist erreicht.";
      }
    }
    setButtonTooltipMessage(message);
    setIsAddButtonDisabled(!serverUserIsEligibleToAdd || limitReached);
  }, [serverApartmentCount, serverApartmentLimit, serverUserIsEligibleToAdd, serverLimitReason]);

  const updateApartmentInList = useCallback((updatedApartment: Wohnung) => {
    setApartments(prev => {
      const exists = prev.some(apt => apt.id === updatedApartment.id);
      if (exists) return prev.map(apt => (apt.id === updatedApartment.id ? updatedApartment : apt));
      return [updatedApartment, ...prev];
    });
  }, [setApartments]);

  const refreshTable = useCallback(async (): Promise<void> => { // Explicitly set return type to Promise<void>
    try {
      const res = await fetch('/api/wohnungen');
      if (res.ok) {
        const data: Wohnung[] = await res.json();
        setApartments(data);
        // No explicit return here
      } else {
        console.error('Failed to fetch wohnungen for refreshTable, status:', res.status);
      }
    } catch (error) {
      console.error('Error fetching wohnungen in refreshTable:', error);
    }
  }, [setApartments]);

  const handleSuccess = useCallback((data: Wohnung) => {
    updateApartmentInList(data);
    refreshTable(); // This call is fine, refreshTable now returns Promise<void>
  }, [updateApartmentInList, refreshTable]);

  const handleAddWohnung = useCallback(() => {
    openWohnungModal(undefined, housesData, handleSuccess, serverApartmentCount, serverApartmentLimit, serverUserIsEligibleToAdd);
  }, [openWohnungModal, housesData, handleSuccess, serverApartmentCount, serverApartmentLimit, serverUserIsEligibleToAdd]);

  const handleEditWohnung = useCallback(async (apartment: Wohnung) => {
    try {
      const supabase = createBrowserClient();
      const { data: aptToEdit, error } = await supabase.from('Wohnungen').select('*, Haeuser(name)').eq('id', apartment.id).single();
      if (error || !aptToEdit) {
        console.error('Wohnung nicht gefunden oder Fehler:', error?.message);
        return;
      }
      const transformedApt = { ...aptToEdit, Haeuser: Array.isArray(aptToEdit.Haeuser) ? aptToEdit.Haeuser[0] : aptToEdit.Haeuser } as Wohnung;
      openWohnungModal(transformedApt, housesData, handleSuccess, serverApartmentCount, serverApartmentLimit, serverUserIsEligibleToAdd);
    } catch (error) {
      console.error('Fehler beim Laden der Wohnung für Bearbeitung:', error);
    }
  }, [openWohnungModal, housesData, handleSuccess, serverApartmentCount, serverApartmentLimit, serverUserIsEligibleToAdd]);

  useEffect(() => {
    const handleEditApartmentListener = async (event: Event) => {
      const customEvent = event as CustomEvent<{id: string}>;
      const apartmentId = customEvent.detail?.id;
      if (!apartmentId) return;
      try {
        const supabase = createBrowserClient();
        const { data: aptToEdit, error } = await supabase.from('Wohnungen').select('*, Haeuser(name)').eq('id', apartmentId).single();
        if (error || !aptToEdit) { console.error('Wohnung nicht gefunden oder Fehler:', error?.message); return; }
        const transformedApt = { ...aptToEdit, Haeuser: Array.isArray(aptToEdit.Haeuser) ? aptToEdit.Haeuser[0] : aptToEdit.Haeuser } as Wohnung;
        handleEditWohnung(transformedApt);
      } catch (error) { console.error('Fehler beim Laden der Wohnung für Event-Edit:', error); }
    };
    window.addEventListener('edit-apartment', handleEditApartmentListener);
    return () => window.removeEventListener('edit-apartment', handleEditApartmentListener);
  }, [handleEditWohnung]);

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wohnungen</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Wohnungen und Apartments</p>
        </div>
        <div> {/* Wrapper for button and tooltip */}
          <Button onClick={handleAddWohnung} className="sm:w-auto" disabled={isAddButtonDisabled}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Wohnung hinzufügen
          </Button>
          {isAddButtonDisabled && buttonTooltipMessage && (
            <p className="text-sm text-red-500 mt-1">{buttonTooltipMessage}</p>
          )}
        </div>
      </div>
      <Card className="overflow-hidden rounded-xl border-none shadow-md">
        <CardHeader>
          <CardTitle>Wohnungsverwaltung</CardTitle>
          <CardDescription>Hier können Sie Ihre Wohnungen verwalten und filtern</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <ApartmentFilters onFilterChange={setFilter} onSearchChange={setSearchQuery} />
          <ApartmentsDataTable data={apartments} />
        </CardContent>
      </Card>
    </div>
  );
}
