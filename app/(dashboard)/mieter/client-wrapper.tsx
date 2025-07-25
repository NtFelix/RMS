"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useModalStore } from "@/hooks/use-modal-store";
import { PlusCircle } from "lucide-react";
import { TenantsDataTable } from "@/components/data-tables/tenants-data-table";

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
}: MieterClientViewProps) {
  const { openTenantModal } = useModalStore();

  const handleAddTenant = useCallback(() => {
    openTenantModal(undefined, initialWohnungen);
  }, [openTenantModal, initialWohnungen]);

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mieter</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Mieter und Mietverhältnisse</p>
        </div>
        <AddTenantButton onAdd={handleAddTenant} />
      </div>

      <Card className="overflow-hidden rounded-xl border-none shadow-md">
        <CardHeader>
          <div>
            <CardTitle>Mieterverwaltung</CardTitle>
            <CardDescription>Hier können Sie Ihre Mieter verwalten und filtern</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <TenantsDataTable data={initialTenants} />
        </CardContent>
      </Card>
    </div>
  );
}
