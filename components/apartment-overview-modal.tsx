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
import { Building } from "lucide-react";

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
    fetch(`/api/mieter?wohnung_id=${apartmentId}`)
      .then((r) => r.json())
      .then((data) => setMieter(data.mieter || []))
      .finally(() => setIsLoading(false));
  }, [open, apartmentId]);

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-4xl w-full">
        <div className="flex flex-col md:flex-row gap-8 min-h-[320px]">
          {/* Left Side: Big Apartment Icon */}
          <div className="flex flex-col items-center justify-center md:min-w-[220px] min-w-[120px] py-8 md:py-0 border-r md:border-r border-b-0 md:border-b-0 border-border">
            <Building className="w-24 h-24 text-primary mb-4" />
            <span className="text-lg font-semibold">{apartmentName}</span>
          </div>
          {/* Right Side: Content */}
          <div className="flex-1 flex flex-col">
            <DialogHeader>
              <DialogTitle>Überblick: {apartmentName}</DialogTitle>
              <DialogDescription>
                Mieter dieser Wohnung
              </DialogDescription>
            </DialogHeader>
            <Separator className="my-2" />
            {isLoading ? (
              <div className="py-8 text-center">Lade Mieter...</div>
            ) : (
              <div className="overflow-y-auto max-h-[50vh]">
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
            <Button onClick={onClose} variant="outline" className="w-full mt-auto">
              Schließen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}