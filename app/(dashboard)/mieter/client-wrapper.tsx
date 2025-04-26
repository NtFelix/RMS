"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  serverAction: (formData: FormData) => Promise<void>;
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
    setEditingId(null);
    setDialogOpen(true);
  };

  return (
    <>
      <TenantDialogWrapper
        wohnungen={wohnungen}
        mieter={tenants}
        serverAction={serverAction}
        onEditExternal={id => setEditingId(id)}
        onAddExternal={() => setEditingId(null)}
        open={dialogOpen}
        editingId={editingId}
        setOpen={setDialogOpen}
        setEditingId={setEditingId}
      />
      <Card className="overflow-hidden rounded-xl border-none shadow-md">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Mieterverwaltung</CardTitle>
            <CardDescription>Hier können Sie Ihre Mieter verwalten und filtern</CardDescription>
          </div>
          <Button onClick={handleAdd} className="sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Mieter hinzufügen
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <TenantFilters onFilterChange={setFilter} onSearchChange={setSearchQuery} />
          <TenantTable tenants={tenants} wohnungen={wohnungen} filter={filter} searchQuery={searchQuery} onEdit={handleEdit} />
        </CardContent>
      </Card>
    </>
  );
}
