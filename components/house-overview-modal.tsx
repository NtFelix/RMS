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

// Types for Haus and Wohnung (could import from app/types if available)
interface Wohnung {
  id: string;
  name: string;
  groesse?: number;
  miete?: number;
  mieterCount?: number;
}

interface HouseOverviewModalProps {
  open: boolean;
  onClose: () => void;
  houseId: string;
  houseName: string;
}

export function HouseOverviewModal({
  open,
  onClose,
  houseId,
  houseName,
}: HouseOverviewModalProps) {
  const [wohnungen, setWohnungen] = React.useState<Wohnung[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    // Fetch Wohnungen for this Haus
    fetch(`/api/wohnungen?haus_id=${houseId}`)
      .then((r) => r.json())
      .then((data) => setWohnungen(data.wohnungen || []))
      .finally(() => setIsLoading(false));
  }, [open, houseId]);

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-2xl w-full">
        <DialogHeader>
          <DialogTitle>Überblick: {houseName}</DialogTitle>
          <DialogDescription>
            Wohnungen in diesem Haus
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="py-8 text-center">Lade Wohnungen...</div>
        ) : (
          <div className="overflow-y-auto max-h-[60vh]">
            {wohnungen.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">Keine Wohnungen gefunden.</div>
            ) : (
              <div className="divide-y">
                {wohnungen.map((w) => (
                  <div key={w.id} className="py-4 px-1 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <div className="font-semibold">{w.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Größe: {w.groesse ?? "?"} m² &nbsp;|&nbsp; Miete: {w.miete ?? "?"} €
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(w.mieterCount ?? 0) > 0
                        ? `${w.mieterCount} Mieter`
                        : "Keine Mieter"}
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