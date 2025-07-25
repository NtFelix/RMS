"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { HousesDataTable } from "@/components/data-tables/houses-data-table";
import { House } from "@/components/columns/houses-columns";
import { DataTableErrorBoundary } from "@/components/ui/data-table-error-boundary";
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

// HaeuserMainContent with enhanced data table
function HaeuserMainContentComponent({
  haeuser,
  onEdit,
  onRefresh,
  loading,
}: {
  haeuser: House[];
  onEdit: (house: House) => void;
  onRefresh: () => Promise<void>;
  loading?: boolean;
}) {
  return (
    <Card className="overflow-hidden rounded-xl border-none shadow-md">
      <CardHeader>
        <CardTitle>Hausliste</CardTitle>
        <CardDescription>Hier können Sie Ihre Häuser verwalten und filtern</CardDescription>
      </CardHeader>
      <CardContent>
        <DataTableErrorBoundary>
          <HousesDataTable
            data={haeuser}
            onEdit={onEdit}
            onRefresh={onRefresh}
            enableSelection={true}
            loading={loading}
          />
        </DataTableErrorBoundary>
      </CardContent>
    </Card>
  );
}

// This is the new main client component with enhanced data table
export default function HaeuserClientView({ enrichedHaeuser }: HaeuserClientViewProps) {
  const [loading, setLoading] = useState(false);
  const { openHouseModal } = useModalStore();

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    try {
      // Trigger a page refresh to reload server-side data
      window.location.reload();
    } catch (error) {
      console.error('Error refreshing houses:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAdd = useCallback(() => {
    openHouseModal(undefined, handleRefresh);
  }, [openHouseModal, handleRefresh]);

  const handleEdit = useCallback(
    (house: House) => {
      openHouseModal(house, handleRefresh);
    },
    [openHouseModal, handleRefresh]
  );

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
        onEdit={handleEdit}
        onRefresh={handleRefresh}
        loading={loading}
      />
    </div>
  );
}
