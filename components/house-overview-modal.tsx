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

interface HouseEntity {
  id: string;
  name: string;
  strasse?: string;
  ort?: string;
  groesse?: number | string;
  rent?: number | string;
  pricePerSqm?: number | string;
  status?: string;
  [key: string]: any;
}
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
  house?: HouseEntity; // allow passing full house object
}

export function HouseOverviewModal({
  open,
  onClose,
  houseId,
  house,
}: HouseOverviewModalProps) {
  const [wohnungen, setWohnungen] = React.useState<Wohnung[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [houseData, setHouseData] = React.useState<HouseEntity | null>(house || null);
  const [isHouseLoading, setIsHouseLoading] = React.useState(false);

  // Always fetch latest Wohnungen when opened
  React.useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    fetch(`/api/wohnungen?haus_id=${houseId}`)
      .then((r) => r.json())
      .then((data) => setWohnungen(data.wohnungen || []))
      .finally(() => setIsLoading(false));
  }, [open, houseId]);

  // Fetch house details if not provided
  React.useEffect(() => {
    if (!open) return;
    if (house) {
      setHouseData(house);
    } else {
      setIsHouseLoading(true);
      fetch(`/api/haeuser/${houseId}`)
        .then((r) => r.json())
        .then((data) => setHouseData(data.house || null))
        .finally(() => setIsHouseLoading(false));
    }
  }, [open, houseId, house]);

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-4xl w-full">
        <div className="flex flex-col md:flex-row gap-8 min-h-[320px]">
          {/* Left Side: Big House Icon & Info */}
          <div className="flex flex-col items-center justify-center md:min-w-[260px] min-w-[140px] py-8 md:py-0 border-r md:border-r border-b-0 md:border-b-0 border-border bg-muted/40">
            <Home className="w-24 h-24 text-primary mb-4" />
            <span className="text-xl font-semibold text-center break-words">{houseData?.name || "Haus"}</span>
            {isHouseLoading ? (
              <div className="mt-4 text-xs text-muted-foreground">Lade Hausdaten...</div>
            ) : (
              <div className="mt-5 w-full flex flex-col gap-2 text-sm text-muted-foreground px-2">
                {houseData?.strasse && <div><span className="font-medium">Adresse:</span> {houseData.strasse}</div>}
                {houseData?.ort && <div><span className="font-medium">Ort:</span> {houseData.ort}</div>}
                {houseData?.groesse && <div><span className="font-medium">Größe:</span> {houseData.groesse} m²</div>}
                {houseData?.rent && <div><span className="font-medium">Gesamtmiete:</span> {houseData.rent} €</div>}
                {houseData?.pricePerSqm && <div><span className="font-medium">€/m²:</span> {houseData.pricePerSqm}</div>}
                {houseData?.status && <div><span className="font-medium">Status:</span> {houseData.status}</div>}
              </div>
            )}
          </div>
          {/* Right Side: Wohnungen */}
          <div className="flex-1 flex flex-col">
            <DialogHeader>
              <DialogTitle>Überblick: {houseData?.name || ""}</DialogTitle>
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