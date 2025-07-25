"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useModalStore } from "@/hooks/use-modal-store";
import { PlusCircle } from "lucide-react";
import { DataTable } from "@/components/ui/data-table/data-table";
import { columns } from "./columns";

import type { Tenant } from "@/types/Tenant";
import type { Wohnung } from "@/types/Wohnung";

interface MieterClientViewProps {
  initialTenants: Tenant[];
  initialWohnungen: Wohnung[];
  serverAction: (formData: FormData) => Promise<{ success: boolean; error?: { message: string } }>;
}

function AddTenantButton({ onAdd }: { onAdd: () => void }) {
  return (
    <Button onClick={onAdd} className="sm:w-auto">
      <PlusCircle className="mr-2 h-4 w-4" />
      Mieter hinzufügen
    </Button>
  );
}

export default function MieterClientView({
  initialTenants,
  initialWohnungen,
  serverAction,
}: MieterClientViewProps) {
  const { openTenantModal } = useModalStore();

  const handleAddTenant = useCallback(() => {
    openTenantModal(undefined, initialWohnungen);
  }, [openTenantModal, initialWohnungen]);

  const tenantsWithWohnungName = initialTenants.map(tenant => {
    const wohnung = initialWohnungen.find(w => w.id === tenant.wohnung_id);
    return {
      ...tenant,
      wohnung: {
        name: wohnung ? wohnung.name : "-",
      },
      status: tenant.auszug ? "inactive" : "active",
    };
  });

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
          <DataTable columns={columns} data={tenantsWithWohnungName} filterColumn="name" />
        </CardContent>
      </Card>
    </div>
  );
}
