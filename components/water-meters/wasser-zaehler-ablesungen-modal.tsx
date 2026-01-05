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
  Droplet,
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
import { WasserZaehlerImportModal } from "./wasser-zaehler-import-modal";
import { WasserZaehler as SharedWasserZaehler, WasserAblesung } from "@/lib/data-fetching";
import { formatNumber } from "@/utils/format";

// Local interface for UI presentation, compatible with SharedWasserZaehler
interface WasserZaehler {
  id: string;
  custom_id: string | null;
  wohnung_id: string; // In UI we expect it to be present if we display it
  erstellungsdatum: string;
  eichungsdatum: string | null;
}

/**
 * Check if a water meter's calibration date is valid for the given Abrechnung period
 * A meter is valid if its Eichungsdatum is AFTER the end date of the Abrechnung
 * (i.e., the calibration is still valid during the entire Abrechnung period)
 */
function isCalibrationValid(eichungsdatum: string | null, abrechnungEnddatum: string): boolean {
  // If no calibration date is set, consider it valid (no expiration)
  if (!eichungsdatum) return true;

  // Parse dates
  const calibrationDate = new Date(eichungsdatum);
  const abrechnungEnd = new Date(abrechnungEnddatum);

  // Reset time to compare only dates
  calibrationDate.setHours(0, 0, 0, 0);
  abrechnungEnd.setHours(0, 0, 0, 0);

  // Meter is valid if calibration date is AFTER the Abrechnung end date
  // This means the meter was still calibrated during the entire Abrechnung period
  return calibrationDate > abrechnungEnd;
}

interface Wohnung {
  id: string;
  name: string;
  groesse: number;
}

interface Mieter {
  id: string;
  name: string;
  wohnung_id: string;
}

interface WasserZaehlerInfo {
  zaehler_id: string;
  custom_id: string | null;
  wohnung_name: string;
  wohnung_groesse: number;
  mieter_id: string | null;
  mieter_name: string | null;
  reading_count: number;
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

interface WasserZaehlerAblesenModalProps {
  isOpen: boolean;
  onClose: () => void;
  hausId: string;
  hausName: string;
  startdatum: string;
  enddatum: string;
  nebenkostenId: string;
}

export function WasserZaehlerAblesenModal({
  isOpen,
  onClose,
  hausId,
  hausName,
  startdatum,
  enddatum,
  nebenkostenId,
}: WasserZaehlerAblesenModalProps) {
  const [zaehlerList, setZaehlerList] = useState<WasserZaehlerInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredOutCount, setFilteredOutCount] = useState(0);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Store raw data for import modal
  const [rawWaterMeters, setRawWaterMeters] = useState<SharedWasserZaehler[]>([]);
  const [rawWaterReadings, setRawWaterReadings] = useState<WasserAblesung[]>([]);

  const { toast } = useToast();
  const { openWasserAblesenModal } = useModalStore();

  useEffect(() => {
    if (isOpen && hausId) {
      loadData();
    }
  }, [isOpen, hausId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Use optimized server action to fetch all data in one call
      const { getWasserZaehlerForHausAction } = await import('@/app/wasser-zaehler-actions');
      const result = await getWasserZaehlerForHausAction(hausId);

      if (!result.success || !('data' in result) || !result.data) {
        throw new Error(result.message || "Failed to fetch data");
      }

      const { wohnungen, waterMeters, waterReadings, mieter: allMieter } = result.data;

      // Store raw data for import functionality
      setRawWaterMeters(waterMeters as unknown as SharedWasserZaehler[]);
      setRawWaterReadings(waterReadings as unknown as WasserAblesung[]);

      // Count total meters before filtering
      const totalMetersCount = waterMeters.length;

      // Map meters with their apartment info and filter by calibration date
      const allZaehler: (WasserZaehler & { wohnung: Wohnung })[] = waterMeters
        .filter((z: WasserZaehler) => isCalibrationValid(z.eichungsdatum, enddatum))
        .map((z: WasserZaehler) => ({
          ...z,
          wohnung: wohnungen.find((w: any) => w.id === z.wohnung_id)!
        }));

      // Track how many meters were filtered out
      const filteredCount = totalMetersCount - allZaehler.length;
      setFilteredOutCount(filteredCount);

      // Group readings by meter
      const readingsResults = allZaehler.map(zaehler =>
        waterReadings.filter((r: any) => r.zaehler_id === zaehler.id)
      );

      // Build zaehler info list
      const zaehlerInfoList: WasserZaehlerInfo[] = allZaehler.map((zaehler, index) => {
        const readings = readingsResults[index] || [];
        const mieter = allMieter.find((m: any) => m.wohnung_id === zaehler.wohnung_id);

        // Sort readings by date descending
        const sortedReadings = readings.sort((a: any, b: any) =>
          new Date(b.ablese_datum).getTime() - new Date(a.ablese_datum).getTime()
        );

        const latestReading = sortedReadings[0];
        const previousReading = sortedReadings[1];

        return {
          zaehler_id: zaehler.id,
          custom_id: zaehler.custom_id,
          wohnung_name: zaehler.wohnung.name,
          wohnung_groesse: zaehler.wohnung.groesse,
          mieter_id: mieter?.id || null,
          mieter_name: mieter?.name || null,
          reading_count: readings.length,
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

      setZaehlerList(zaehlerInfoList);
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

  const handleOpenAblesenModal = (zaehler: WasserZaehlerInfo) => {
    openWasserAblesenModal(
      zaehler.zaehler_id,
      zaehler.wohnung_name,
      zaehler.custom_id || undefined
    );
  };

  const handleImportSuccess = () => {
    loadData();
  };

  // Filter and group entries by apartment
  const groupedEntries = useMemo(() => {
    const filteredData = zaehlerList.filter(entry => {
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
  }, [zaehlerList, searchQuery]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[650px] md:max-w-[750px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Wasserzählerstände für {hausName} - {isoToGermanDate(startdatum)} bis {isoToGermanDate(enddatum)}
            </DialogTitle>
            <DialogDescription>
              Geben Sie die Zählerstände für jeden Wasserzähler ein. Der Verbrauch wird automatisch berechnet.
              {filteredOutCount > 0 && (
                <span className="block mt-2 text-amber-600 dark:text-amber-500 font-medium">
                  ⚠️ {filteredOutCount} Wasserzähler {filteredOutCount === 1 ? 'wurde' : 'wurden'} ausgeblendet, da das Eichungsdatum vor dem Abrechnungszeitraum liegt.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 py-4">
            {/* Search and Import */}
            {zaehlerList.length > 0 && (
              <div className="flex gap-2 items-center">
                <SearchInput
                  placeholder="Wohnung, Mieter oder Zähler-ID suchen..."
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
                <p className="text-sm text-muted-foreground animate-pulse">Lade Wasserzählerdaten...</p>
              </div>
            ) : zaehlerList.length > 0 ? (
              groupedEntries.length === 0 ? (
                <div className="flex flex-col justify-center items-center h-40 gap-3">
                  <Search className="h-12 w-12 text-muted-foreground/50" />
                  <div className="text-center">
                    <p className="text-muted-foreground font-medium">Keine Ergebnisse gefunden</p>
                    <p className="text-sm text-muted-foreground">Versuchen Sie, Ihre Suchkriterien anzupassen</p>
                  </div>
                </div>
              ) : (
                groupedEntries.map(([wohnungName, entries]) => (
                  <Card
                    key={wohnungName}
                    className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-[2rem] overflow-hidden"
                  >
                    <CardContent className="p-0">
                      {/* Apartment Group Header */}
                      <div className="p-5 border-b border-gray-200 dark:border-[#3C4251] bg-gradient-to-r from-gray-50 to-transparent dark:from-zinc-800/50 dark:to-transparent">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                              <Home className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-base">{wohnungName}</h3>
                              <p className="text-xs text-muted-foreground">
                                {entries.length} {entries.length === 1 ? 'Wasserzähler' : 'Wasserzähler'}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant="secondary"
                            className="flex items-center gap-1.5 px-3 py-1.5"
                          >
                            <Droplet className="h-3.5 w-3.5" />
                            <span className="font-medium">{entries.length}</span>
                          </Badge>
                        </div>
                      </div>

                      {/* Water meters in this apartment */}
                      <div className="p-5 space-y-3">
                        {entries.map((entry, index) => {
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
                                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0 border border-primary/10">
                                      <Gauge className="h-6 w-6 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap mb-2">
                                        <h4 className="font-semibold text-base">
                                          {entry.custom_id ? `Zähler ${entry.custom_id}` : 'Unbenannter Zähler'}
                                        </h4>
                                        {entry.mieter_name && (
                                          <Badge variant="outline" className="text-xs">
                                            <User className="h-3 w-3 mr-1" />
                                            {entry.mieter_name}
                                          </Badge>
                                        )}
                                      </div>

                                      {/* Meter Statistics */}
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

                                      {/* Latest Reading Info */}
                                      {entry.latest_reading ? (
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <Badge variant="outline" className="text-xs gap-1 bg-white dark:bg-zinc-900">
                                            <CalendarIcon className="h-3 w-3" />
                                            {isoToGermanDate(entry.latest_reading.ablese_datum)}
                                          </Badge>
                                          <Badge variant="outline" className="text-xs gap-1 bg-white dark:bg-zinc-900">
                                            <Gauge className="h-3 w-3" />
                                            {formatNumber(entry.latest_reading.zaehlerstand)} m³
                                          </Badge>
                                          <Badge variant="outline" className="text-xs gap-1 bg-white dark:bg-zinc-900">
                                            <Droplet className="h-3 w-3" />
                                            {formatNumber(entry.latest_reading.verbrauch)} m³
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
                                    <Droplet className="h-4 w-4" />
                                    <span className="hidden sm:inline">Verwalten</span>
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )
            ) : (
              <div className="flex flex-col justify-center items-center h-40 gap-3">
                <Home className="h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">Keine Wasserzähler für dieses Haus gefunden.</p>
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

      {/* Import Modal */}
      <WasserZaehlerImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={handleImportSuccess}
        waterMeters={rawWaterMeters}
        waterReadings={rawWaterReadings}
      />
    </>
  );
}
