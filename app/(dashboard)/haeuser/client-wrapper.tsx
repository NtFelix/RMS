"use client";

import { useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { House } from "@/types";
import { useModalStore } from "@/hooks/use-modal-store";
import { DataTable } from "@/components/ui/data-table/data-table";
import { columns } from "./columns";

interface HaeuserClientViewProps {
  enrichedHaeuser: House[];
}

function AddHouseButtonComponent({ onAdd }: { onAdd: () => void }) {
  return (
    <Button onClick={onAdd} className="sm:w-auto">
      <PlusCircle className="mr-2 h-4 w-4" />
      Haus hinzufügen
    </Button>
  );
}

export default function HaeuserClientView({ enrichedHaeuser }: HaeuserClientViewProps) {
  const { openHouseModal } = useModalStore();

  const refreshTable = useCallback(() => {
    // For now, we'll just log to the console.
    // In a real-world scenario, you'd probably re-fetch the data.
    console.log("Refreshing table...");
  }, []);

  const handleAdd = useCallback(() => {
    openHouseModal(undefined, refreshTable);
  }, [openHouseModal, refreshTable]);

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Häuser</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Häuser und Immobilien</p>
        </div>
        <AddHouseButtonComponent onAdd={handleAdd} />
      </div>
      <Card className="overflow-hidden rounded-xl border-none shadow-md">
        <CardHeader>
          <CardTitle>Hausliste</CardTitle>
          <CardDescription>Hier können Sie Ihre Häuser verwalten und filtern</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <DataTable columns={columns} data={enrichedHaeuser} filterColumn="name" />
        </CardContent>
      </Card>
    </div>
  );
}
