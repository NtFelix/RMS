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
import { Input } from "@/components/ui/input";
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
  X,
  Loader2,
  Calendar as CalendarIcon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface WasserZaehler {
  id: string;
  custom_id: string | null;
  wohnung_id: string;
  erstellungsdatum: string;
  eichungsdatum: string | null;
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
      // Fetch all apartments in this house
      const wohnungenResponse = await fetch(`/api/wohnungen`);
      if (!wohnungenResponse.ok) throw new Error("Failed to fetch apartments");
      const allWohnungen: Wohnung[] = await wohnungenResponse.json();
      const wohnungen = allWohnungen.filter((w: any) => w.haus_id === hausId);

      // Fetch all water meters for these apartments
      const zaehlerPromises = wohnungen.map(w => 
        fetch(`/api/wasser-zaehler?wohnung_id=${w.id}`).then(r => r.json())
      );
      const zaehlerResults = await Promise.all(zaehlerPromises);
      const allZaehler: (WasserZaehler & { wohnung: Wohnung })[] = [];
      
      zaehlerResults.forEach((zaehlerList, index) => {
        zaehlerList.forEach((z: WasserZaehler) => {
          allZaehler.push({ ...z, wohnung: wohnungen[index] });
        });
      });

      // Fetch tenants for these apartments
      const mieterResponse = await fetch(`/api/mieter`);
      if (!mieterResponse.ok) throw new Error("Failed to fetch tenants");
      const allMieter: Mieter[] = await mieterResponse.json();
      
      // Fetch existing readings for these meters
      const readingsPromises = allZaehler.map(z =>
        fetch(`/api/wasser-ablesungen?wasser_zaehler_id=${z.id}`).then(r => r.json())
      );
      const readingsResults = await Promise.all(readingsPromises);

      // Build zaehler info list
      const zaehlerInfoList: WasserZaehlerInfo[] = allZaehler.map((zaehler, index) => {
        const readings = readingsResults[index] || [];
        const mieter = allMieter.find(m => m.wohnung_id === zaehler.wohnung_id);
        
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] md:max-w-[750px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Wasserzählerstände für {hausName} - {isoToGermanDate(startdatum)} bis {isoToGermanDate(enddatum)}
          </DialogTitle>
          <DialogDescription>
            Geben Sie die Zählerstände für jeden Wasserzähler ein. Der Verbrauch wird automatisch berechnet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 py-4">
          {/* Search */}
          {zaehlerList.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Wohnung, Mieter oder Zähler-ID suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col justify-center items-center h-40 gap-3">
              <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              <p className="text-muted-foreground">Lade Wasserzählerdaten...</p>
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
                <div key={wohnungName} className="space-y-3">
                  {/* Apartment Group Header */}
                  <div className="p-4 border rounded-3xl mb-4 bg-white dark:bg-zinc-900 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground mt-1" />
                        <div>
                          <h3 className="font-semibold">{wohnungName}</h3>
                        </div>
                      </div>
                      <Badge 
                        variant="secondary" 
                        className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium"
                      >
                        <Droplet className="h-3 w-3" />
                        <span>{entries.length} {entries.length === 1 ? 'Zähler' : 'Zähler'}</span>
                      </Badge>
                    </div>
                  </div>

                  {/* Water meters in this apartment */}
                  {entries.map((entry) => {
                    const consumptionChange = entry.latest_reading && entry.previous_reading
                      ? ((entry.latest_reading.verbrauch - entry.previous_reading.verbrauch) / entry.previous_reading.verbrauch) * 100
                      : null;
                    
                    return (
                      <Card 
                        key={entry.zaehler_id} 
                        className="ml-4 bg-gray-50 dark:bg-[#22272e] border border-gray-200 dark:border-[#3C4251] shadow-sm rounded-3xl overflow-hidden hover:shadow-md transition-all duration-300"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <Gauge className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-semibold text-base">
                                    {entry.custom_id ? `Zähler ${entry.custom_id}` : 'Unbenannter Zähler'}
                                  </h4>
                                  {entry.mieter_name && (
                                    <Badge variant="outline" className="text-xs">
                                      <User className="h-3 w-3 mr-1" />
                                      {entry.mieter_name}
                                    </Badge>
                                  )}
                                  <Badge variant="secondary" className="text-xs">
                                    {entry.wohnung_groesse} m²
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <Badge variant="outline" className="text-xs gap-1">
                                    <Activity className="h-3 w-3" />
                                    {entry.reading_count} {entry.reading_count === 1 ? 'Ablesung' : 'Ablesungen'}
                                  </Badge>
                                  {entry.latest_reading && (
                                    <>
                                      <Badge variant="outline" className="text-xs gap-1">
                                        <CalendarIcon className="h-3 w-3" />
                                        {isoToGermanDate(entry.latest_reading.ablese_datum)}
                                      </Badge>
                                      <Badge variant="outline" className="text-xs gap-1">
                                        <Gauge className="h-3 w-3" />
                                        {entry.latest_reading.zaehlerstand} m³
                                      </Badge>
                                      <Badge variant="outline" className="text-xs gap-1">
                                        <Droplet className="h-3 w-3" />
                                        {entry.latest_reading.verbrauch} m³
                                      </Badge>
                                    </>
                                  )}
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
                                      {consumptionChange > 0 ? '+' : ''}{consumptionChange.toFixed(1)}%
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleOpenAblesenModal(entry)}
                              className="gap-2 ml-4"
                            >
                              <Droplet className="h-4 w-4" />
                              Ablesungen verwalten
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ))
            )
          ) : (
            <div className="flex flex-col justify-center items-center h-40 gap-3">
              <Building2 className="h-12 w-12 text-muted-foreground/50" />
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
  );
}
