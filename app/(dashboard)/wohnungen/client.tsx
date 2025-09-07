"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { ButtonWithHoverCard } from "@/components/ui/button-with-hover-card";
import { PlusCircle, Home, Key, Euro, Ruler } from "lucide-react";
import { ApartmentFilters } from "@/components/apartment-filters";
import { ApartmentTable } from "@/components/apartment-table";
import { createClient as createBrowserClient } from "@/utils/supabase/client";
import type { Wohnung } from "@/types/Wohnung";
import { useModalStore } from "@/hooks/use-modal-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Apartment as ApartmentTableType } from "@/components/apartment-table";
import { StatCard } from "@/components/stat-card";

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
  const reloadRef = useRef<(() => void) | null>(null);
  const [apartments, setApartments] = useState<Wohnung[]>(initialWohnungenData);
  const { openWohnungModal } = useModalStore();

  // ======================= SUMMARY METRICS =======================
  const summary = useMemo(() => {
    const total = apartments.length;
    const freeCount = apartments.filter((a) => a.status === "frei").length;
    const rentedCount = total - freeCount;

    // Average rent
    const rentValues = apartments.map((a) => a.miete ?? 0).filter((v) => v > 0);
    const avgRent = rentValues.length ? rentValues.reduce((s, v) => s + v, 0) / rentValues.length : 0;

    // Average price per sqm
    const pricePerSqmValues = apartments
      .filter((a) => a.miete && a.groesse && a.groesse > 0)
      .map((a) => (a.miete as number) / (a.groesse as number));
    const avgPricePerSqm = pricePerSqmValues.length
      ? pricePerSqmValues.reduce((s, v) => s + v, 0) / pricePerSqmValues.length
      : 0;

    return { total, freeCount, rentedCount, avgRent, avgPricePerSqm };
  }, [apartments]);

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
  }, []);

  const refreshTable = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch('/api/wohnungen');
      if (res.ok) {
        const data: Wohnung[] = await res.json();
        setApartments(data);
      } else {
        console.error('Failed to fetch wohnungen for refreshTable, status:', res.status);
      }
    } catch (error) {
      console.error('Error fetching wohnungen in refreshTable:', error);
    }
  }, []);

  const handleSuccess = useCallback((data: Wohnung) => {
    updateApartmentInList(data);
    refreshTable();
  }, [updateApartmentInList, refreshTable]);

  const handleAddWohnung = useCallback(() => {
    try {
      openWohnungModal(undefined, housesData, handleSuccess, serverApartmentCount, serverApartmentLimit, serverUserIsEligibleToAdd);
    } catch (error) {
      console.error('Error opening wohnung modal:', error);
    }
  }, [openWohnungModal, housesData, handleSuccess, serverApartmentCount, serverApartmentLimit, serverUserIsEligibleToAdd]);

  const handleEditWohnung = useCallback(async (apartment: ApartmentTableType) => {
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
      {/* Summary cards */}
      <div className="flex flex-wrap gap-4">
        <StatCard
          title="Wohnungen gesamt"
          value={summary.total}
          icon={<Home className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Frei / Vermietet"
          value={`${summary.freeCount} / ${summary.rentedCount}`}
          icon={<Key className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Ø Miete"
          value={summary.avgRent}
          unit="€"
          decimals
          icon={<Euro className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Ø Preis pro m²"
          value={summary.avgPricePerSqm}
          unit="€/m²"
          decimals
          icon={<Ruler className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <Card className="overflow-hidden rounded-xl shadow-md">
        <CardHeader>
          <div className="flex flex-row items-center justify-between">
            <CardTitle>Wohnungsverwaltung</CardTitle>
            <ButtonWithHoverCard 
              onClick={handleAddWohnung} 
              className="sm:w-auto" 
              disabled={isAddButtonDisabled}
              tooltip={buttonTooltipMessage}
              showTooltip={isAddButtonDisabled && !!buttonTooltipMessage}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Wohnung hinzufügen
            </ButtonWithHoverCard>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <ApartmentFilters onFilterChange={setFilter} onSearchChange={setSearchQuery} />
          <ApartmentTable
            filter={filter}
            searchQuery={searchQuery}
            initialApartments={apartments}
            onEdit={handleEditWohnung}
            onTableRefresh={refreshTable}
            reloadRef={reloadRef}
            onFilterChange={setFilter}
            onSearchChange={setSearchQuery}
          />
        </CardContent>
      </Card>
    </div>
  );
}