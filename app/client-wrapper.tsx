"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { OperatingCostsFilters } from "@/components/operating-costs-filters";
import { OperatingCostsTable } from "@/components/operating-costs-table";
// Placeholder types - will be replaced by actual types from data-fetching.ts
// import { Nebenkosten, Haus } from "../../../lib/data-fetching"; 

interface BetriebskostenClientWrapperProps {
  initialNebenkosten: any[]; // Replace any with Nebenkosten[]
  initialHaeuser: any[];   // Replace any with Haus[]
}

export default function BetriebskostenClientWrapper({ initialNebenkosten, initialHaeuser }: BetriebskostenClientWrapperProps) {
  const [filter, setFilter] = useState("all"); // Or adapt to new filter types
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredNebenkosten, setFilteredNebenkosten] = useState(initialNebenkosten);
  const [isModalOpen, setIsModalOpen] = useState(false); // For managing modal visibility

  useEffect(() => {
    let result = initialNebenkosten;
    // Basic search example, adapt as needed for actual fields
    if (searchQuery) {
      result = result.filter(item => 
        item.jahr?.toString().toLowerCase().includes(searchQuery.toLowerCase()) || 
        // Add other searchable fields here based on Nebenkosten structure
        item.someOtherField?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    // Add filter logic based on the 'filter' state if applicable
    // e.g., if (filter !== "all") { result = result.filter(item => item.status === filter); }
    setFilteredNebenkosten(result);
  }, [searchQuery, filter, initialNebenkosten]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    // Later, this might also set an item to edit
    console.log("Open modal");
  };

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Title and description are now in page.tsx */}
        {/* Button is now part of the Card header or actions area */}
      </div>
      <Card className="overflow-hidden rounded-xl border-none shadow-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Betriebskostenübersicht</CardTitle>
            <CardDescription>Hier können Sie Ihre Betriebskosten verwalten und abrechnen</CardDescription>
          </div>
          <Button onClick={handleOpenModal} className="sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Betriebskostenabrechnung erstellen
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <OperatingCostsFilters 
            onFilterChange={setFilter} 
            onSearchChange={setSearchQuery} 
            // Pass haeuser for potential filtering options
            // haeuser={initialHaeuser} 
          />
          <OperatingCostsTable 
            nebenkosten={filteredNebenkosten} 
            // Pass any actions like onEdit
          />
        </CardContent>
      </Card>
      {/* Modal will be rendered here based on isModalOpen state */}
      {/* <BetriebskostenEditModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} haeuser={initialHaeuser} /> */}
    </>
  );
}
