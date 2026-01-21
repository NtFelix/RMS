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
import type { Zaehler as SharedMeter, ZaehlerAblesung } from "@/lib/types";
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
function isCalibrationValid(eichungsdatum: string | null, abrechnungEnddatum: string): boolean {
  if (!eichungsdatum) return true;

  const calibrationDate = new Date(eichungsdatum);
  const abrechnungEnd = new Date(abrechnungEnddatum);

  calibrationDate.setHours(0, 0, 0, 0);
  abrechnungEnd.setHours(0, 0, 0, 0);

  return calibrationDate > abrechnungEnd;
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

  // Store raw data for import modal
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

      const allZaehler: (Meter & { wohnung: Wohnung })[] = (meters as any[])
        .filter((z: Meter) => isCalibrationValid(z.eichungsdatum, enddatum))
        .map((z: Meter) => ({
          ...z,
          wohnung: wohnungen.find((w: any) => w.id === z.wohnung_id)!
        }));

      const filteredCount = totalMetersCount - allZaehler.length;
      setFilteredOutCount(filteredCount);

      const meterInfoList: MeterInfo[] = allZaehler.map((meter) => {
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

  const handleImportSuccess = () => {
    loadData();
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
      if (!groups[key]) {
        groups[key] = [];
      }
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
              Verwalten Sie die Zählerstände für alle Zählertypen. Der Verbrauch wird automatisch berechnet.
              {filteredOutCount > 0 && (
                <span className="block mt-2 text-amber-600 dark:text-amber-500 font-medium">
                  ⚠️ {filteredOutCount} Zähler {filteredOutCount === 1 ? 'wurde' : 'wurden'} ausgeblendet, da das Eichungsdatum vor dem Abrechnungszeitraum liegt.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 py-4">
            {meterList.length > 0 && (
              <div className="flex gap-2 items-center">
                <SearchInput
                  placeholder="Wohnung, Mieter, Zähler-ID oder Typ suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClear={() => setSearchQuery("")}
                  mode="modal"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  className="gap-2 flex-shrink-0"
                  onClick={() => setIsImportModalOpen(true)}
                >
                  <Upload className="h-4 w-4" />
                  Importieren
                </Button>
              </div>
            )}

            {isLoading ? (
              <div className="flex flex-col justify-center items-center h-40 gap-4">
                <WaterDropletLoader size="md" />
                <p className="text-sm text-muted-foreground animate-pulse">Lade Zählerdaten...</p>
              </div>
            ) : meterList.length > 0 ? (
              groupedEntries.length === 0 ? (
                <div className="flex flex-col justify-center items-center h-40 gap-3 border-2 border-dashed border-gray-100 dark:border-zinc-800/50 rounded-[2.5rem]">
                  <Search className="h-10 w-10 text-muted-foreground/30" />
                  <p className="text-muted-foreground text-sm font-medium">Keine Ergebnisse für Ihre Suche</p>
                  <Button variant="link" size="sm" onClick={() => setSearchQuery("")}>Suche zurücksetzen</Button>
                </div>
              ) : (
                groupedEntries.map(([wohnungName, entries]) => (
                  <Card key={wohnungName} className="border border-gray-100 dark:border-[#3C4251] shadow-sm rounded-3xl overflow-hidden bg-white dark:bg-[#22272e]">
                    <div className="p-5 bg-gray-50/50 dark:bg-zinc-800/30 border-b border-gray-100 dark:border-zinc-800/50">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            <Home className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-base">{wohnungName}</h3>
                            <p className="text-xs text-muted-foreground">
                              {entries.length} {entries.length === 1 ? 'Zähler' : 'Zähler'}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className="flex items-center gap-1.5 px-3 py-1.5"
                        >
                          <Gauge className="h-3.5 w-3.5" />
                          <span className="font-medium">{entries.length}</span>
                        </Badge>
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      {entries.map((entry) => {
                        const consumptionChange = entry.latest_reading && entry.previous_reading
                          ? ((entry.latest_reading.verbrauch - entry.previous_reading.verbrauch) / entry.previous_reading.verbrauch) * 100
                          : null;

                        return (
                          <Card
                            key={entry.zaehler_id}
                            className="bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-zinc-800/50 dark:to-zinc-900/50 border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-[1.5rem] overflow-hidden hover:shadow-md hover:border-primary/50 transition-all duration-300"
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 border border-primary/10 ${getMeterBgColor(entry.zaehler_typ)}`}>
                                    {getMeterIcon(entry.zaehler_typ, "h-6 w-6")}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-2">
                                      <h4 className="font-semibold text-base">
                                        {entry.custom_id ? `${entry.custom_id}` : 'Unbenannter Zähler'}
                                      </h4>
                                      <Badge variant="outline" className="text-xs bg-white dark:bg-zinc-900">
                                        {ZAEHLER_CONFIG[entry.zaehler_typ]?.label || 'Zähler'}
                                      </Badge>
                                      {entry.mieter_name && (
                                        <Badge variant="outline" className="text-xs">
                                          <User className="h-3 w-3 mr-1" />
                                          {entry.mieter_name}
                                        </Badge>
                                      )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                      <div className="flex items-center gap-1.5">
                                        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">
                                          {entry.reading_count} {entry.reading_count === 1 ? 'Ablesung' : 'Ablesungen'}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">
                                          {entry.wohnung_groesse} m²
                                        </span>
                                      </div>
                                    </div>

                                    {entry.latest_reading ? (
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="outline" className="text-xs gap-1 bg-white dark:bg-zinc-900">
                                          <CalendarIcon className="h-3 w-3" />
                                          {isoToGermanDate(entry.latest_reading.ablese_datum)}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs gap-1 bg-white dark:bg-zinc-900">
                                          <Gauge className="h-3 w-3" />
                                          {formatNumber(entry.latest_reading.zaehlerstand)} {entry.einheit}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs gap-1 bg-white dark:bg-zinc-900">
                                          {getMeterIcon(entry.zaehler_typ, "h-3 w-3")}
                                          {formatNumber(entry.latest_reading.verbrauch)} {entry.einheit}
                                        </Badge>
                                        {consumptionChange !== null && !isNaN(consumptionChange) && (
                                          <Badge
                                            variant={consumptionChange > 20 ? "destructive" : consumptionChange < -10 ? "default" : "secondary"}
                                            className="text-xs gap-1"
                                          >
                                            {consumptionChange > 0 ? (
                                              <TrendingUp className="h-3 w-3" />
                                            ) : (
                                              <TrendingDown className="h-3 w-3" />
                                            )}
                                            {consumptionChange > 0 ? '+' : ''}{formatNumber(consumptionChange, 1)}%
                                          </Badge>
                                        )}
                                      </div>
                                    ) : (
                                      <Badge variant="secondary" className="text-xs">
                                        Keine Ablesungen vorhanden
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                <Button
                                  size="sm"
                                  onClick={() => handleOpenAblesenModal(entry)}
                                  className="gap-2 flex-shrink-0"
                                >
                                  {getMeterIcon(entry.zaehler_typ, "h-4 w-4")}
                                  <span className="hidden sm:inline">Verwalten</span>
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </Card>
                ))
              )
            ) : (
              <div className="flex flex-col justify-center items-center h-40 gap-3">
                <Gauge className="h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">Keine Zähler für dieses Haus gefunden.</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MeterImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={handleImportSuccess}
        meters={rawMeters}
        readings={rawReadings}
      />
    </>
  );
}
