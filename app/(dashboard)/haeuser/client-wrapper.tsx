"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ButtonWithTooltip } from "@/components/ui/button-with-tooltip";
import { PlusCircle, Building, Home, Key } from "lucide-react";
import { StatCard } from "@/components/stat-card";
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
    <Card className="overflow-hidden rounded-xl shadow-md">
      <CardHeader>
        <div className="flex flex-row items-center justify-between">
          <CardTitle>Hausliste</CardTitle>
          <ButtonWithTooltip onClick={onAdd} className="sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Haus hinzufügen
          </ButtonWithTooltip>
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
    try {
      openHouseModal(undefined, refreshTable);
    } catch (error) {
      console.error('Error opening house modal:', error);
    }
  }, [openHouseModal, refreshTable]);

  const handleEdit = useCallback(
    (house: House) => {
      try {
        openHouseModal(house, refreshTable);
      } catch (error) {
        console.error('Error opening house modal:', error);
      }
    },
    [openHouseModal, refreshTable]
  );

  // ===== Summary metrics =====
  const summary = useMemo(() => {
    const totalHouses = enrichedHaeuser.length;
    const totalApartments = enrichedHaeuser.reduce((sum, h) => sum + (h.totalApartments ?? 0), 0);
    const freeApartments = enrichedHaeuser.reduce((sum, h) => sum + (h.freeApartments ?? 0), 0);
    return { totalHouses, totalApartments, freeApartments };
  }, [enrichedHaeuser]);

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-wrap gap-4 mb-4">
        <StatCard title="Häuser" value={summary.totalHouses} icon={<Building className="h-4 w-4 text-muted-foreground" />} />
        <StatCard title="Wohnungen" value={summary.totalApartments} icon={<Home className="h-4 w-4 text-muted-foreground" />} />
        <StatCard title="Freie Wohnungen" value={summary.freeApartments} icon={<Key className="h-4 w-4 text-muted-foreground" />} />
      </div>
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
