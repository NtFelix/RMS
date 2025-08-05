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
import { Home } from "lucide-react";

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
    fetch(`/api/wohnungen?haus_id=${houseId}`)
      .then((r) => r.json())
      .then((data) => setWohnungen(data.wohnungen || []))
      .finally(() => setIsLoading(false));
  }, [open, houseId]);

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-4xl w-full">
        <div className="flex flex-col md:flex-row gap-8 min-h-[320px]">
          {/* Left Side: Big House Icon */}
          <div className="flex flex-col items-center justify-center md:min-w-[220px] min-w-[120px] py-8 md:py-0 border-r md:border-r border-b-0 md:border-b-0 border-border">
            <Home className="w-24 h-24 text-primary mb-4" />
            <span className="text-lg font-semibold">{houseName}</span>
          </div>
          {/* Right Side: Content */}
          <div className="flex-1 flex flex-col">
            <DialogHeader>
              <DialogTitle>Überblick: {houseName}</DialogTitle>
              <DialogDescription>
                Wohnungen in diesem Haus
              </DialogDescription>
            </DialogHeader>
            <Separator className="my-2" />
            {isLoading ? (
              <div className="py-8 text-center">Lade Wohnungen...</div>
            ) : (
              <div className="overflow-y-auto max-h-[50vh]">
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
            <Button onClick={onClose} variant="outline" className="w-full mt-auto">
              Schließen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}