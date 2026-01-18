"use client";

import { useEffect, useState, useMemo } from "react";
import { isoToGermanDate } from "@/utils/date-calculations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { useToast } from "@/hooks/use-toast";
import { useModalStore } from "@/hooks/use-modal-store";
import {
  Building2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  User,
  Gauge,
  Activity,
  Search,
  Loader2,
  Calendar as CalendarIcon,
  Home,
  Upload
} from "lucide-react";
import { WaterDropletLoader } from "@/components/ui/water-droplet-loader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MeterImportModal } from "./meter-import-modal";
import { Zaehler as SharedMeter, ZaehlerAblesung } from "@/lib/data-fetching";
import { formatNumber } from "@/utils/format";
import { ZaehlerTyp, ZAEHLER_CONFIG } from "@/lib/zaehler-types";
import { getMeterIcon, getMeterBgColor } from "@/components/meters/meter-card";

// Local interface for UI presentation
interface Meter {
  id: string;
  custom_id: string | null;
  wohnung_id: string;
  erstellungsdatum: string;
  eichungsdatum: string | null;
  zaehler_typ?: ZaehlerTyp;
  einheit?: string;
}

/**
 * Check if a meter's calibration date is valid for the given period
 */
function isCalibrationValid(eichungsdatum: string | null, enddatum: string): boolean {
  if (!eichungsdatum) return true;
  const calibrationDate = new Date(eichungsdatum);
  const end = new Date(enddatum);
  calibrationDate.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return calibrationDate > end;
}

interface Wohnung {
  id: string;
  name: string;
  groesse: number;
}

interface MeterInfo {
  zaehler_id: string;
  custom_id: string | null;
  wohnung_name: string;
  wohnung_groesse: number;
  mieter_id: string | null;
  mieter_name: string | null;
  reading_count: number;
  zaehler_typ: ZaehlerTyp;
  einheit: string;
  latest_reading: {
    ablese_datum: string;
    zaehlerstand: number;
    verbrauch: number;
  } | null;
  previous_reading: {
    ablese_datum: string;
    zaehlerstand: number;
    verbrauch: number;
  } | null;
}

interface MeterAblesungenModalProps {
  isOpen: boolean;
  onClose: () => void;
  hausId: string;
  hausName: string;
  startdatum: string;
  enddatum: string;
  nebenkostenId: string;
}

export function MeterAblesungenModal({
  isOpen,
  onClose,
  hausId,
  hausName,
  startdatum,
  enddatum,
}: MeterAblesungenModalProps) {
  const [meterList, setMeterList] = useState<MeterInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredOutCount, setFilteredOutCount] = useState(0);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [rawMeters, setRawMeters] = useState<SharedMeter[]>([]);
  const [rawReadings, setRawReadings] = useState<ZaehlerAblesung[]>([]);

  const { toast } = useToast();
  const { openAblesungenModal } = useModalStore();

  useEffect(() => {
    if (isOpen && hausId) {
      loadData();
    }
  }, [isOpen, hausId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const { getMeterForHausAction } = await import('@/app/meter-actions');
      const result = await getMeterForHausAction(hausId);

      if (!result.success || !result.data) {
        throw new Error(result.message || "Failed to fetch data");
      }

      const { wohnungen, meters, readings, mieter: allMieter } = result.data;

      setRawMeters(meters as unknown as SharedMeter[]);
      setRawReadings(readings as unknown as ZaehlerAblesung[]);

      const totalMetersCount = meters.length;

      const filteredMeters: (Meter & { wohnung: Wohnung })[] = meters
        .filter((z: Meter) => isCalibrationValid(z.eichungsdatum, enddatum))
        .map((z: Meter) => ({
          ...z,
          wohnung: wohnungen.find((w: any) => w.id === z.wohnung_id)!
        }));

      setFilteredOutCount(totalMetersCount - filteredMeters.length);

      const meterInfoList: MeterInfo[] = filteredMeters.map((meter) => {
        const meterReadings = readings.filter((r: any) => r.zaehler_id === meter.id);
        const mieter = allMieter.find((m: any) => m.wohnung_id === meter.wohnung_id);

        const sortedReadings = meterReadings.sort((a: any, b: any) =>
          new Date(b.ablese_datum).getTime() - new Date(a.ablese_datum).getTime()
        );

        const latestReading = sortedReadings[0];
        const previousReading = sortedReadings[1];

        const zaehlerTyp: ZaehlerTyp = meter.zaehler_typ || 'kaltwasser';
        const config = ZAEHLER_CONFIG[zaehlerTyp] || ZAEHLER_CONFIG.kaltwasser;

        return {
          zaehler_id: meter.id,
          custom_id: meter.custom_id,
          wohnung_name: meter.wohnung.name,
          wohnung_groesse: meter.wohnung.groesse,
          mieter_id: mieter?.id || null,
          mieter_name: mieter?.name || null,
          reading_count: meterReadings.length,
          zaehler_typ: zaehlerTyp,
          einheit: meter.einheit || config.einheit,
          latest_reading: latestReading ? {
            ablese_datum: latestReading.ablese_datum,
            zaehlerstand: latestReading.zaehlerstand,
            verbrauch: latestReading.verbrauch,
          } : null,
          previous_reading: previousReading ? {
            ablese_datum: previousReading.ablese_datum,
            zaehlerstand: previousReading.zaehlerstand,
            verbrauch: previousReading.verbrauch,
          } : null,
        };
      });

      setMeterList(meterInfoList);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Fehler",
        description: "Die Daten konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAblesenModal = (meter: MeterInfo) => {
    openAblesungenModal(
      meter.zaehler_id,
      meter.wohnung_name,
      meter.custom_id || undefined,
      meter.zaehler_typ,
      meter.einheit
    );
  };

  const groupedEntries = useMemo(() => {
    const filteredData = meterList.filter(entry => {
      const matchesSearch = searchQuery === "" ||
        entry.wohnung_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.mieter_name && entry.mieter_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (entry.custom_id && entry.custom_id.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    });

    const groups: { [key: string]: typeof filteredData } = {};
    filteredData.forEach(entry => {
      const key = entry.wohnung_name;
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    });

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [meterList, searchQuery]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[650px] md:max-w-[750px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Zähler für {hausName} - {isoToGermanDate(startdatum)} bis {isoToGermanDate(enddatum)}
            </DialogTitle>
            <DialogDescription>
              Verwalten Sie die Zählerstände für alle Zählertypen.
              {filteredOutCount > 0 && (
                <span className="block mt-2 text-amber-600 dark:text-amber-500 font-medium">
                  ⚠️ {filteredOutCount} Zähler ausgeblendet (Eichungsdatum abgelaufen).
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 py-4">
            {meterList.length > 0 && (
              <div className="flex gap-2 items-center">
                <SearchInput
                  placeholder="Suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClear={() => setSearchQuery("")}
                  mode="modal"
                  className="flex-1"
                />
                <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
              </div>
            )}

            {isLoading ? (
              <div className="flex flex-col justify-center items-center h-40 gap-4">
                <WaterDropletLoader size="md" />
                <p className="text-sm text-muted-foreground animate-pulse">Lade Zählerdaten...</p>
              </div>
            ) : meterList.length > 0 ? (
              groupedEntries.map(([wohnungName, entries]) => (
                <Card key={wohnungName} className="rounded-[2rem] overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-5 bg-gradient-to-r from-gray-50 to-transparent dark:from-zinc-800/50">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <Home className="h-5 w-5 text-muted-foreground" />
                          <h3 className="font-semibold">{wohnungName}</h3>
                        </div>
                        <Badge variant="secondary">{entries.length} Zähler</Badge>
                      </div>
                    </div>
                    <div className="p-5 space-y-3">
                      {entries.map((entry) => (
                        <Card key={entry.zaehler_id} className="rounded-[1.5rem] hover:shadow-md transition-all">
                          <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${getMeterBgColor(entry.zaehler_typ)}`}>
                                {getMeterIcon(entry.zaehler_typ, "h-6 w-6")}
                              </div>
                              <div>
                                <h4 className="font-semibold">{entry.custom_id || 'Unbenannt'}</h4>
                                <div className="flex gap-2 text-xs text-muted-foreground">
                                  <span>{ZAEHLER_CONFIG[entry.zaehler_typ]?.label}</span>
                                  {entry.mieter_name && <span>• {entry.mieter_name}</span>}
                                </div>
                              </div>
                            </div>
                            <Button size="sm" onClick={() => handleOpenAblesenModal(entry)}>Verwalten</Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-center py-10 text-muted-foreground">Keine Zähler gefunden.</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Schließen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MeterImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={loadData}
        meters={rawMeters}
        readings={rawReadings}
      />
    </>
  );
}
