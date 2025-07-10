"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useModalStore } from "@/hooks/use-modal-store";
import { PlusCircle } from "lucide-react";
import { TenantFilters } from "@/components/tenant-filters";
import { TenantTable } from "@/components/tenant-table";
import { TenantDialogWrapper } from "@/components/tenant-dialog-wrapper";

import type { Tenant } from "@/types/Tenant";
import type { Wohnung } from "@/types/Wohnung";

// Props for the main client view component
interface MieterClientViewProps {
  initialTenants: Tenant[];
  initialWohnungen: Wohnung[];
  serverAction: (formData: FormData) => Promise<{ success: boolean; error?: { message: string } }>;
}

// Internal AddTenantButton (could be kept from previous step if preferred)
function AddTenantButton({ onAdd }: { onAdd: () => void }) {
  return (
    <Button onClick={onAdd} className="sm:w-auto">
      <PlusCircle className="mr-2 h-4 w-4" />
      Mieter hinzufügen
    </Button>
  );
}

// This is the new main client component, previously MieterPageClientComponent in page.tsx
export default function MieterClientView({
  initialTenants,
  initialWohnungen,
  serverAction,
}: MieterClientViewProps) {
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const { openTenantModal } = useModalStore();

  // Remove local state for dialogOpen and editingId, as store will manage modal state
  // const [dialogOpen, setDialogOpen] = useState(false);
  // const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddTenant = useCallback(() => {
    // Pass initialWohnungen. The serverAction is passed to TenantEditModal in layout.tsx
    openTenantModal(undefined, initialWohnungen);
  }, [openTenantModal, initialWohnungen]);

  const handleEditTenantInTable = useCallback((tenant: Tenant) => {
    // Find the full tenant data if only partial data is passed by the table event
    const tenantToEdit = initialTenants.find(t => t.id === tenant.id);
    if (tenantToEdit) {
      // Format data as expected by TenantEditModal's useEffect for parsing Nebenkosten
      const formattedInitialData = {
        id: tenantToEdit.id,
        wohnung_id: tenantToEdit.wohnung_id || "",
        name: tenantToEdit.name,
        einzug: tenantToEdit.einzug || "",
        auszug: tenantToEdit.auszug || "",
        email: tenantToEdit.email || "",
        telefonnummer: tenantToEdit.telefonnummer || "",
        notiz: tenantToEdit.notiz || "",
        nebenkosten: Array.isArray(tenantToEdit.nebenkosten) ? tenantToEdit.nebenkosten.join(",") : (tenantToEdit.nebenkosten || ""),
        nebenkosten_datum: Array.isArray(tenantToEdit.nebenkosten_datum) ? tenantToEdit.nebenkosten_datum.join(",") : (tenantToEdit.nebenkosten_datum || ""),
      };
      openTenantModal(formattedInitialData, initialWohnungen);
    } else {
      console.error("Tenant not found for editing:", tenant.id);
      // Optionally, show a toast message
    }
  }, [initialTenants, initialWohnungen, openTenantModal]);

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mieter</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Mieter und Mietverhältnisse</p>
        </div>
        <AddTenantButton onAdd={handleAddTenant} />
      </div>

      {/* TenantDialogWrapper is no longer needed here as TenantEditModal is global
          and opened directly via useModalStore actions.
      */}
      {/*
      <TenantDialogWrapper
        wohnungen={initialWohnungen}
        mieter={initialTenants}
        serverAction={serverAction} // This prop is for TenantEditModal, not wrapper
        open={dialogOpen}
        editingId={editingId}
        setOpen={setDialogOpen}
        setEditingId={setEditingId}
      />
      */}
      <Card className="overflow-hidden rounded-xl border-none shadow-md">
        <CardHeader>
          <div>
            <CardTitle>Mieterverwaltung</CardTitle>
            <CardDescription>Hier können Sie Ihre Mieter verwalten und filtern</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <TenantFilters onFilterChange={setFilter} onSearchChange={setSearchQuery} />
          <TenantTable
            tenants={initialTenants} // Directly use initialTenants or manage a separate 'filteredTenants' state if needed
            wohnungen={initialWohnungen}
            filter={filter}
            searchQuery={searchQuery}
            onEdit={handleEditTenantInTable}
          />
        </CardContent>
      </Card>
    </div>
  );
}
