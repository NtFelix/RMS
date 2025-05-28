"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { OperatingCostsFilters } from "@/components/operating-costs-filters";
import { OperatingCostsTable } from "@/components/operating-costs-table";
import { BetriebskostenEditModal } from "@/components/betriebskosten-edit-modal"; // Path adjusted
import { Nebenkosten, Haus } from "../../../lib/data-fetching"; // Nebenkosten type imported

interface BetriebskostenClientWrapperProps {
  initialNebenkosten: Nebenkosten[]; // Using Nebenkosten type
  initialHaeuser: Haus[];       // Using Haus type
  userId?: string;
}

export default function BetriebskostenClientWrapper({ 
  initialNebenkosten, 
  initialHaeuser, 
  userId 
}: BetriebskostenClientWrapperProps) {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredNebenkosten, setFilteredNebenkosten] = useState<Nebenkosten[]>(initialNebenkosten);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingNebenkosten, setEditingNebenkosten] = useState<Nebenkosten | null>(null);

  useEffect(() => {
    let result = initialNebenkosten;
    if (searchQuery) {
      result = result.filter(item =>
        item.jahr?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.Haeuser?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || // Search by house name
        item.nebenkostenart?.join(" ").toLowerCase().includes(searchQuery.toLowerCase()) // Search by cost types
      );
    }
    // Example filter logic (can be expanded)
    if (filter === "current_year") {
      const currentYear = new Date().getFullYear().toString();
      result = result.filter(item => item.jahr === currentYear);
    }
    setFilteredNebenkosten(result);
  }, [searchQuery, filter, initialNebenkosten]);

  const handleOpenCreateModal = () => {
    setEditingNebenkosten(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: Nebenkosten) => {
    setEditingNebenkosten(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingNebenkosten(null);
  };

  return (
    <>
      <Card className="overflow-hidden rounded-xl border-none shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Betriebskostenübersicht</CardTitle>
            <CardDescription>Hier können Sie Ihre Betriebskosten verwalten und abrechnen</CardDescription>
          </div>
          <Button onClick={handleOpenCreateModal} className="sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Betriebskostenabrechnung erstellen
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <OperatingCostsFilters 
            onFilterChange={setFilter} 
            onSearchChange={setSearchQuery} 
          />
          <OperatingCostsTable 
            nebenkosten={filteredNebenkosten} 
            onEdit={handleOpenEditModal} 
          />
        </CardContent>
      </Card>

      {isModalOpen && userId && (
        <BetriebskostenEditModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          nebenkostenToEdit={editingNebenkosten}
          haeuser={initialHaeuser}
          userId={userId}
        />
      )}
    </>
  );
}
