"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

// Types for Mieter
interface Mieter {
  id: string;
  name: string;
  einzug?: string; // move-in date
  auszug?: string; // move-out date
}

interface ApartmentOverviewModalProps {
  open: boolean;
  onClose: () => void;
  apartmentId: string;
  apartmentName: string;
}

export function ApartmentOverviewModal({
  open,
  onClose,
  apartmentId,
  apartmentName,
}: ApartmentOverviewModalProps) {
  const [mieter, setMieter] = React.useState<Mieter[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    // Fetch Mieter for this Wohnung
    fetch(`/api/mieter?wohnung_id=${apartmentId}`)
      .then((r) => r.json())
      .then((data) => setMieter(data.mieter || []))
      .finally(() => setIsLoading(false));
  }, [open, apartmentId]);

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle>Überblick: {apartmentName}</DialogTitle>
          <DialogDescription>
            Mieter dieser Wohnung
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="py-8 text-center">Lade Mieter...</div>
        ) : (
          <div className="overflow-y-auto max-h-[60vh]">
            {mieter.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">Keine Mieter gefunden.</div>
            ) : (
              <div className="divide-y">
                {mieter.map((m) => (
                  <div key={m.id} className="py-4 px-1 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <div className="font-semibold">{m.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {m.einzug && <>Einzug: {m.einzug} </>}
                        {m.auszug && <>| Auszug: {m.auszug}</>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <Separator className="my-4" />
        <Button onClick={onClose} variant="outline" className="w-full">
          Schließen
        </Button>
      </DialogContent>
    </Dialog>
  );
}