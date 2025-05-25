"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useModalStore } from "@/hooks/use-modal-store"; // Added
import { PlusCircle } from "lucide-react";
import { TenantFilters } from "@/components/tenant-filters";
import { TenantTable } from "@/components/tenant-table";
import { TenantDialogWrapper } from "@/components/tenant-dialog-wrapper";

interface Tenant {
  id: string;
  wohnung_id?: string;
  name: string;
  einzug?: string;
  auszug?: string;
  email?: string;
  telefonnummer?: string;
  notiz?: string;
  nebenkosten?: number[];
}

interface Wohnung {
  id: string;
  name: string;
}

interface TenantClientWrapperProps {
  tenants: Tenant[];
  wohnungen: Wohnung[];
  serverAction: (formData: FormData) => Promise<{ success: boolean; error?: { message: string } }>;
}

export default function TenantClientWrapper({ tenants, wohnungen, serverAction }: TenantClientWrapperProps) {
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Callback für Tabelle
  const handleEdit = (tenant: Tenant) => {
    setEditingId(tenant.id);
    setDialogOpen(true);
  };
  // Callback für Hinzufügen
  const handleAdd = () => {
    // Use modal store to open tenant modal for adding, pass wohnungen
    useModalStore.getState().openTenantModal(undefined, wohnungen);
  };

  // Callback für Tabelle (Edit-Funktion) - bleibt gleich, nutzt weiterhin TenantDialogWrapper
  const handleEditTenantInTable = (tenant: Tenant) => {
    setEditingId(tenant.id);
    setDialogOpen(true);
  };

  return (
    <>
      {/* TenantDialogWrapper is still used for editing via the table's onEdit prop */}
      <TenantDialogWrapper
        wohnungen={wohnungen}
        mieter={tenants} // Pass all tenants for editing lookup
        serverAction={serverAction}
        // onEditExternal and onAddExternal are primarily for the dialog's internal logic
        // or if it were used stand-alone.
        // For editing via table, we directly control its open state and editingId.
        open={dialogOpen} // Controls visibility for editing
        editingId={editingId} // Sets the tenant to edit
        setOpen={setDialogOpen} // Allows TenantDialogWrapper to close itself
        setEditingId={setEditingId} // Allows TenantDialogWrapper to clear editingId on close
      />
      <Card className="overflow-hidden rounded-xl border-none shadow-md">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Mieterverwaltung</CardTitle>
            <CardDescription>Hier können Sie Ihre Mieter verwalten und filtern</CardDescription>
          </div>
          {/* This button now uses the global modal store */}
          <Button onClick={handleAdd} className="sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Mieter hinzufügen
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <TenantFilters onFilterChange={setFilter} onSearchChange={setSearchQuery} />
          {/* Ensure TenantTable's onEdit calls handleEditTenantInTable */}
          <TenantTable tenants={tenants} wohnungen={wohnungen} filter={filter} searchQuery={searchQuery} onEdit={handleEditTenantInTable} />
        </CardContent>
      </Card>
    </>
  );
}
