"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Nebenkosten, Haus } from "@/lib/data-fetching";
import { deleteNebenkosten as deleteNebenkostenServerAction } from "@/app/betriebskosten-actions";
import ConfirmationAlertDialog from "@/components/ui/confirmation-alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useModalStore } from "@/hooks/use-modal-store";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/data-table/data-table";
import { columns } from "./columns";

interface BetriebskostenClientViewProps {
  initialNebenkosten: Nebenkosten[];
  initialHaeuser: Haus[];
  userId?: string;
  ownerName: string;
}

function AddBetriebskostenButton({ onAdd }: { onAdd: () => void }) {
  return (
    <Button onClick={onAdd} className="sm:w-auto">
      <PlusCircle className="mr-2 h-4 w-4" />
      Betriebskostenabrechnung erstellen
    </Button>
  );
}

export default function BetriebskostenClientView({
  initialNebenkosten,
  initialHaeuser,
  userId,
  ownerName,
}: BetriebskostenClientViewProps) {
  const [filteredNebenkosten, setFilteredNebenkosten] = useState<Nebenkosten[]>(initialNebenkosten);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedItemIdForDelete, setSelectedItemIdForDelete] = useState<string | null>(null);
  const { openBetriebskostenModal } = useModalStore();
  const { toast } = useToast();
  const router = useRouter();

  const handleOpenCreateModal = useCallback(() => {
    openBetriebskostenModal(null, initialHaeuser, () => {
      router.refresh();
    });
  }, [openBetriebskostenModal, initialHaeuser, router]);

  const openDeleteAlert = useCallback((itemId: string) => {
    setSelectedItemIdForDelete(itemId);
    setIsDeleteAlertOpen(true);
  }, []);

  const handleDeleteDialogOnOpenChange = useCallback((open: boolean) => {
    setIsDeleteAlertOpen(open);
    if (!open) {
      setSelectedItemIdForDelete(null);
    }
  }, []);

  const executeDelete = useCallback(async () => {
    if (!selectedItemIdForDelete) return;
    const result = await deleteNebenkostenServerAction(selectedItemIdForDelete);
    if (result.success) {
      toast({ title: "Erfolg", description: "Nebenkosten-Eintrag erfolgreich gelöscht." });
      setFilteredNebenkosten(prev => prev.filter(item => item.id !== selectedItemIdForDelete));
    } else {
      toast({
        title: "Fehler",
        description: result.message || "Eintrag konnte nicht gelöscht werden.",
        variant: "destructive",
      });
    }
  }, [selectedItemIdForDelete, toast]);

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Betriebskosten</h1>
          <p className="text-muted-foreground">Verwalten Sie Ihre Betriebskosten und Abrechnungen</p>
        </div>
        <AddBetriebskostenButton onAdd={handleOpenCreateModal} />
      </div>

      <Card className="overflow-hidden rounded-xl border-none shadow-md">
        <CardHeader>
          <div>
            <CardTitle>Betriebskostenübersicht</CardTitle>
            <CardDescription>Hier können Sie Ihre Betriebskosten verwalten und abrechnen</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <DataTable columns={columns} data={filteredNebenkosten} filterColumn="jahr" />
        </CardContent>
      </Card>

      <ConfirmationAlertDialog
        isOpen={isDeleteAlertOpen}
        onOpenChange={handleDeleteDialogOnOpenChange}
        onConfirm={executeDelete}
        title="Löschen Bestätigen"
        description="Sind Sie sicher, dass Sie diesen Nebenkosten-Eintrag löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden."
        confirmButtonText="Löschen"
        cancelButtonText="Abbrechen"
        confirmButtonVariant="destructive"
      />
    </div>
  );
}
