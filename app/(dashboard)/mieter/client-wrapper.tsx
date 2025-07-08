"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useModalStore } from "@/hooks/use-modal-store";
import { PlusCircle } from "lucide-react";
import { TenantFilters } from "@/components/tenant-filters";
import { TenantTable } from "@/components/tenant-table";
import { TenantDialogWrapper } from "@/components/tenant-dialog-wrapper";

// Types matching those in page.tsx
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddTenant = useCallback(() => {
    openTenantModal(undefined, initialWohnungen); // Removed serverAction
  }, [openTenantModal, initialWohnungen]);

  const handleEditTenantInTable = useCallback((tenant: Tenant) => {
    setEditingId(tenant.id);
    setDialogOpen(true);
  }, []);

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mieter</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Mieter und Mietverhältnisse</p>
        </div>
        <AddTenantButton onAdd={handleAddTenant} />
      </div>

      {/* TenantDialogWrapper for editing from table */}
      <TenantDialogWrapper
        wohnungen={initialWohnungen}
        mieter={initialTenants}
        serverAction={serverAction}
        open={dialogOpen}
        editingId={editingId}
        setOpen={setDialogOpen}
        setEditingId={setEditingId}
      />
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
