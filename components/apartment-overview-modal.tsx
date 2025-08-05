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

interface ApartmentEntity {
  id: string;
  name: string;
  groesse?: number | string;
  miete?: number | string;
  haus_id?: string;
  [key: string]: any;
}
interface Mieter {
  id: string;
  name: string;
  einzug?: string;
  auszug?: string;
}

interface ApartmentOverviewModalProps {
  open: boolean;
  onClose: () => void;
  apartmentId: string;
  apartment?: ApartmentEntity; // allow passing full apartment object
}

export function ApartmentOverviewModal({
  open,
  onClose,
  apartmentId,
  apartment,
}: ApartmentOverviewModalProps) {
  const [mieter, setMieter] = React.useState<Mieter[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [apartmentData, setApartmentData] = React.useState<ApartmentEntity | null>(apartment || null);
  const [isApartmentLoading, setIsApartmentLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    fetch(`/api/mieter?wohnung_id=${apartmentId}`)
      .then((r) => r.json())
      .then((data) => setMieter(Array.isArray(data) ? data : data.mieter || []))
      .finally(() => setIsLoading(false));
  }, [open, apartmentId]);

  React.useEffect(() => {
    if (!open) return;
    if (apartment) {
      setApartmentData(apartment);
    } else {
      setIsApartmentLoading(true);
      fetch(`/api/wohnungen/${apartmentId}`)
        .then((r) => r.json())
        .then((data) => setApartmentData(data.wohnung || null))
        .finally(() => setIsApartmentLoading(false));
    }
  }, [open, apartmentId, apartment]);

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-4xl w-full">
        <div className="flex flex-col md:flex-row gap-8 min-h-[320px]">
          {/* Left Side: Big Apartment Icon & Info */}
          <div className="flex flex-col items-center justify-center md:min-w-[260px] min-w-[140px] py-8 md:py-0 border-r md:border-r border-b-0 md:border-b-0 border-border bg-muted/40">
            <Building className="w-24 h-24 text-primary mb-4" />
            <span className="text-xl font-semibold text-center break-words">{apartmentData?.name || "Wohnung"}</span>
            {isApartmentLoading ? (
              <div className="mt-4 text-xs text-muted-foreground">Lade Wohnungsdaten...</div>
            ) : (
              <div className="mt-5 w-full flex flex-col gap-2 text-sm text-muted-foreground px-2">
                {apartmentData?.groesse && <div><span className="font-medium">Größe:</span> {apartmentData.groesse} m²</div>}
                {apartmentData?.miete && <div><span className="font-medium">Miete:</span> {apartmentData.miete} €</div>}
                {apartmentData?.haus_id && <div><span className="font-medium">Haus-ID:</span> {apartmentData.haus_id}</div>}
              </div>
            )}
          </div>
          {/* Right Side: Mieter */}
          <div className="flex-1 flex flex-col">
            <DialogHeader>
              <DialogTitle>Überblick: {apartmentData?.name || ""}</DialogTitle>
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