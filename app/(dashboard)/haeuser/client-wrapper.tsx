"use client";

import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { HouseFilters } from "@/components/house-filters";
import { HouseTable, House } from "@/components/house-table";
import { useModalStore } from "@/hooks/use-modal-store";

// Props for the main client view component
interface HaeuserClientViewProps {
  enrichedHaeuser: House[]; // Assuming enrichedHaeuser is an array of House
}



// HaeuserMainContent (can be kept as is or integrated)
function HaeuserMainContentComponent({ // Renamed for clarity within this scope
  haeuser,
  onEdit,
  onAdd,
  filter,
  searchQuery,
  setFilter,
  setSearchQuery,
  tableReloadRef,
}: {
  haeuser: House[];
  onEdit: (house: House) => void;
  onAdd: () => void;
  filter: string;
  searchQuery: string;
  setFilter: (filter: string) => void;
  setSearchQuery: (query: string) => void;
  tableReloadRef: React.MutableRefObject<(() => void) | null>;
}) {
  return (
    <Card className="overflow-hidden rounded-xl border-none shadow-md">
      <CardHeader>
        <div className="flex flex-row items-center justify-between">
          <CardTitle>Hausliste</CardTitle>
          <Button onClick={onAdd} className="sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Haus hinzufügen
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <HouseFilters onFilterChange={setFilter} onSearchChange={setSearchQuery} />
        <HouseTable
          filter={filter}
          searchQuery={searchQuery}
          reloadRef={tableReloadRef}
          onEdit={onEdit}
          initialHouses={haeuser}
        />
      </CardContent>
    </Card>
  );
}

// This is the new main client component, combining logic from old HaeuserPageClientComponent and HaeuserClientWrapper
export default function HaeuserClientView({ enrichedHaeuser }: HaeuserClientViewProps) {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const tableReloadRef = useRef<() => void>(null);
  const { openHouseModal } = useModalStore();

  const refreshTable = useCallback(() => {
    if (tableReloadRef.current) {
      tableReloadRef.current();
    }
  }, []);

  const handleAdd = useCallback(() => {
    openHouseModal(undefined, refreshTable);
  }, [openHouseModal, refreshTable]);

  const handleEdit = useCallback(
    (house: House) => {
      openHouseModal(house, refreshTable);
    },
    [openHouseModal, refreshTable]
  );

  return (
    <div className="flex flex-col gap-8 p-8">
      <HaeuserMainContentComponent
        haeuser={enrichedHaeuser}
        onEdit={handleEdit}
        onAdd={handleAdd}
        filter={filter}
        searchQuery={searchQuery}
        setFilter={setFilter}
        setSearchQuery={setSearchQuery}
        tableReloadRef={tableReloadRef}
      />
    </div>
  );
}
