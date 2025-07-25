"use client";

import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { HousesDataTable } from "@/components/data-tables/houses-data-table";
import { House } from "@/types/supabase";
import { useModalStore } from "@/hooks/use-modal-store";

// Props for the main client view component
interface HaeuserClientViewProps {
  enrichedHaeuser: House[]; // Assuming enrichedHaeuser is an array of House
}

// AddHouseButton (can be kept as is or integrated)
function AddHouseButtonComponent({ onAdd }: { onAdd: () => void }) { // Renamed to avoid conflict if AddHouseButton is used as a type
  return (
    <Button onClick={onAdd} className="sm:w-auto">
      <PlusCircle className="mr-2 h-4 w-4" />
      Haus hinzufügen
    </Button>
  );
}

// HaeuserMainContent (can be kept as is or integrated)
function HaeuserMainContentComponent({
  haeuser,
}: {
  haeuser: House[];
}) {
  return (
    <Card className="overflow-hidden rounded-xl border-none shadow-md">
      <CardHeader>
        <CardTitle>Hausliste</CardTitle>
        <CardDescription>Hier können Sie Ihre Häuser verwalten und filtern</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <HousesDataTable data={haeuser} />
      </CardContent>
    </Card>
  );
}

// This is the new main client component, combining logic from old HaeuserPageClientComponent and HaeuserClientWrapper
export default function HaeuserClientView({ enrichedHaeuser }: HaeuserClientViewProps) {
  const { openHouseModal } = useModalStore();

  const refreshTable = useCallback(() => {}, []);

  const handleAdd = useCallback(() => {
    openHouseModal(undefined, refreshTable);
  }, [openHouseModal, refreshTable]);


  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Häuser</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Häuser und Immobilien</p>
        </div>
        <AddHouseButtonComponent onAdd={handleAdd} />
      </div>
      <HaeuserMainContentComponent
        haeuser={enrichedHaeuser}
      />
    </div>
  );
}
