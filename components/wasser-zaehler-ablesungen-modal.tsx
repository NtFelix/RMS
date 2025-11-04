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
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { 
  Droplet, 
  Building2, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  User,
  Gauge,
  Activity,
  Search,
  X,
  Hash
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

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

interface WasserZaehlerAblesung {
  zaehler_id: string;
  custom_id: string | null;
  wohnung_name: string;
  wohnung_groesse: number;
  mieter_id: string | null;
  mieter_name: string | null;
  ablese_datum: string;
  zaehlerstand: string;
  verbrauch: string;
  previous_reading: {
    ablese_datum: string;
    zaehlerstand: number;
    verbrauch: number;
  } | null;
  warning?: string;
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
  const [formData, setFormData] = useState<WasserZaehlerAblesung[]>([]);
  const [initialFormData, setInitialFormData] = useState<WasserZaehlerAblesung[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generalDate, setGeneralDate] = useState<Date | undefined>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState<string>("all");
  const { toast } = useToast();

  const HIGH_CONSUMPTION_INCREASE_THRESHOLD = 1.5;

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

      // Build form data
      const newFormData: WasserZaehlerAblesung[] = allZaehler.map((zaehler, index) => {
        const readings = readingsResults[index] || [];
        const currentReading = readings.find((r: any) => r.nebenkosten_id === nebenkostenId);
        const mieter = allMieter.find(m => m.wohnung_id === zaehler.wohnung_id);
        
        // Find previous reading (most recent one that's not the current one)
        const previousReading = readings
          .filter((r: any) => r.id !== currentReading?.id)
          .sort((a: any, b: any) => new Date(b.ablese_datum).getTime() - new Date(a.ablese_datum).getTime())[0];

        return {
          zaehler_id: zaehler.id,
          custom_id: zaehler.custom_id,
          wohnung_name: zaehler.wohnung.name,
          wohnung_groesse: zaehler.wohnung.groesse,
          mieter_id: mieter?.id || null,
          mieter_name: mieter?.name || null,
          ablese_datum: currentReading?.ablese_datum || '',
          zaehlerstand: currentReading?.zaehlerstand?.toString() || '',
          verbrauch: currentReading?.verbrauch?.toString() || '',
          previous_reading: previousReading ? {
            ablese_datum: previousReading.ablese_datum,
            zaehlerstand: previousReading.zaehlerstand,
            verbrauch: previousReading.verbrauch,
          } : null,
          warning: '',
        };
      });

      setFormData(newFormData);
      setInitialFormData(JSON.parse(JSON.stringify(newFormData)));
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

  const handleInputChange = (index: number, field: 'ablese_datum' | 'zaehlerstand' | 'verbrauch', value: string) => {
    const newFormData = [...formData];
    const entry = newFormData[index];
    entry[field] = value;

    if (field === 'zaehlerstand') {
      const currentReading = parseFloat(value);
      const previousReadingValue = entry.previous_reading?.zaehlerstand;

      if (!isNaN(currentReading) && previousReadingValue !== null && previousReadingValue !== undefined) {
        const consumption = currentReading - previousReadingValue;
        entry.verbrauch = consumption.toString();
        if (consumption < 0) {
          entry.warning = "Verbrauch ist negativ.";
        } else if (entry.previous_reading?.verbrauch !== undefined && entry.previous_reading.verbrauch > 0) {
          const previousConsumption = entry.previous_reading.verbrauch;
          if (consumption > previousConsumption * HIGH_CONSUMPTION_INCREASE_THRESHOLD) {
            entry.warning = `Achtung: Verbrauch (${consumption}) ist mehr als ${Math.round((HIGH_CONSUMPTION_INCREASE_THRESHOLD - 1) * 100)}% höher als im Vorjahr (${previousConsumption}).`;
          } else {
            entry.warning = '';
          }
        } else if (consumption > 1000) {
          entry.warning = "Verbrauch ist ungewöhnlich hoch.";
        } else {
          entry.warning = '';
        }
      } else {
        entry.verbrauch = '';
        entry.warning = '';
      }
    }
    setFormData(newFormData);
  };

  const handleDateChangeRow = (index: number, date: Date | undefined) => {
    const newFormData = [...formData];
    const entry = newFormData[index];
    entry.ablese_datum = date ? format(date, "yyyy-MM-dd") : "";
    setFormData(newFormData);
  };

  const applyGeneralDateToAll = () => {
    if (!generalDate) return;
    
    const newFormData = [...formData];
    const formattedDate = format(generalDate, "yyyy-MM-dd");
    
    newFormData.forEach(entry => {
      entry.ablese_datum = formattedDate;
    });
    setFormData(newFormData);
    
    toast({
      title: "Datum übernommen",
      description: `Das Datum wurde für alle ${newFormData.length} Zähler übernommen.`,
    });
  };

  const handleSubmit = async () => {
    setIsSaving(true);

    const entriesToSave = formData
      .filter(e => {
        const zaehlerstand = parseFloat(e.zaehlerstand);
        if (isNaN(zaehlerstand)) {
          console.warn('Skipping entry with invalid zaehlerstand:', e);
          return false;
        }
        return true;
      });

    if (entriesToSave.length === 0) {
      setIsSaving(false);
      toast({
        title: "Keine gültigen Daten",
        description: "Bitte überprüfen Sie Ihre Eingaben.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Save each reading
      const savePromises = entriesToSave.map(entry => 
        fetch('/api/wasser-ablesungen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ablese_datum: entry.ablese_datum || null,
            mieter_id: entry.mieter_id,
            zaehlerstand: parseFloat(entry.zaehlerstand),
            verbrauch: parseFloat(entry.verbrauch) || 0,
            nebenkosten_id: nebenkostenId,
            wasser_zaehler_id: entry.zaehler_id,
          }),
        })
      );

      const results = await Promise.all(savePromises);
      const allSuccessful = results.every(r => r.ok);

      if (allSuccessful) {
        toast({
          title: "Erfolgreich gespeichert",
          description: `Die Wasserzählerstände für ${entriesToSave.length} Zähler wurden erfolgreich aktualisiert.`,
          variant: "success"
        });
        
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        throw new Error('Einige Ablesungen konnten nicht gespeichert werden.');
      }
    } catch (error) {
      console.error("Error saving readings:", error);
      toast({
        title: "Fehler beim Speichern",
        description: error instanceof Error ? error.message : "Die Wasserzählerstände konnten nicht gespeichert werden.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Filter and group entries by apartment
  const groupedEntries = useMemo(() => {
    const augmentedData = formData.map((entry, index) => {
      const consumptionChange = entry.previous_reading?.verbrauch 
        ? ((parseFloat(entry.verbrauch) || 0) - entry.previous_reading.verbrauch) / entry.previous_reading.verbrauch * 100
        : null;
      return { 
        ...entry, 
        originalIndex: index, 
        consumptionChange 
      };
    });

    let filteredData = augmentedData.filter(entry => {
      const matchesSearch = searchQuery === "" || 
        entry.wohnung_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.mieter_name && entry.mieter_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (entry.custom_id && entry.custom_id.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterTag === "all") return true;
      if (filterTag === "high-increase" && entry.consumptionChange !== null && entry.consumptionChange > 20) return true;
      if (filterTag === "decrease" && entry.consumptionChange !== null && entry.consumptionChange < -10) return true;
      if (filterTag === "no-data" && !entry.previous_reading) return true;
      if (filterTag === "warnings" && entry.warning) return true;
      if (filterTag === "incomplete" && (!entry.zaehlerstand || !entry.ablese_datum)) return true;
      
      return false;
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
  }, [formData, searchQuery, filterTag]);

  const filterOptions = [
    { value: 'all', label: 'Alle anzeigen' },
    { value: 'high-increase', label: 'Hoher Anstieg (>20%)' },
    { value: 'decrease', label: 'Rückgang (>10%)' },
    { value: 'warnings', label: 'Mit Warnungen' },
    { value: 'incomplete', label: 'Unvollständig' },
    { value: 'no-data', label: 'Keine Vorjahresdaten' },
  ];

  const filterTagLabels: Record<string, string> = {
    'high-increase': 'Hoher Anstieg',
    'decrease': 'Rückgang',
    'warnings': 'Mit Warnungen',
    'incomplete': 'Unvollständig',
    'no-data': 'Keine Vorjahresdaten',
  };

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
          {/* General Date Picker */}
          {formData.length > 0 && (
            <div className="p-4 border rounded-3xl space-y-3 bg-white dark:bg-zinc-900 shadow-sm">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="general-date-picker" className="text-sm font-medium">
                  Gemeinsames Ablesedatum für alle Zähler
                </Label>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <DatePicker
                    id="general-date-picker"
                    value={generalDate}
                    onChange={(date) => setGeneralDate(date || new Date())}
                    placeholder="Datum für alle Zähler auswählen"
                  />
                </div>
                <Button 
                  type="button" 
                  onClick={applyGeneralDateToAll} 
                  variant="outline" 
                  className="whitespace-nowrap"
                >
                  Auf alle Zähler anwenden
                </Button>
              </div>
            </div>
          )}

          {/* Search and Filter */}
          {formData.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
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
                <Select value={filterTag} onValueChange={setFilterTag}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    {filterOptions.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {(searchQuery || filterTag !== "all") && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">Aktive Filter:</span>
                  {searchQuery && (
                    <Badge variant="secondary" className="gap-1">
                      Suche: {searchQuery}
                      <button onClick={() => setSearchQuery("")} className="ml-1 hover:text-foreground">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {filterTag !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      {filterTagLabels[filterTag]}
                      <button onClick={() => setFilterTag("all")} className="ml-1 hover:text-foreground">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setFilterTag("all");
                    }}
                    className="h-6 text-xs"
                  >
                    Alle Filter zurücksetzen
                  </Button>
                </div>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col justify-center items-center h-40 gap-3">
              <Droplet className="h-8 w-8 text-muted-foreground animate-pulse" />
              <p className="text-muted-foreground">Lade Wasserzählerdaten...</p>
            </div>
          ) : formData.length > 0 ? (
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
                    const index = entry.originalIndex;
                    const consumptionChange = entry.consumptionChange;
                    
                    return (
                      <div key={entry.zaehler_id} className="ml-4 p-4 border rounded-3xl space-y-3 bg-gray-50 dark:bg-zinc-900/50">
                        <div className="flex justify-between items-start">
                          <div className="flex items-start gap-2">
                            <Gauge className="h-4 w-4 text-muted-foreground mt-1" />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">
                                  {entry.custom_id ? `Zähler ${entry.custom_id}` : 'Unbenannter Zähler'}
                                </p>
                                {entry.mieter_name && (
                                  <Badge variant="outline" className="text-xs">
                                    <User className="h-3 w-3 mr-1" />
                                    {entry.mieter_name}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {entry.wohnung_groesse} m²
                              </p>
                            </div>
                          </div>
                          {consumptionChange !== null && !isNaN(consumptionChange) && (
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                              consumptionChange > 20 
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                                : consumptionChange < -10
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {consumptionChange > 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {consumptionChange > 0 ? '+' : ''}{consumptionChange.toFixed(1)}%
                            </div>
                          )}
                        </div>

                        {entry.previous_reading ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="gap-1.5">
                              <Activity className="h-3 w-3" />
                              <span>Vorjahr: {entry.previous_reading.ablese_datum ? isoToGermanDate(entry.previous_reading.ablese_datum) : 'Datum unbekannt'}</span>
                            </Badge>
                            <Badge variant="outline" className="gap-1.5">
                              <Gauge className="h-3 w-3" />
                              <span>Stand: {entry.previous_reading.zaehlerstand} m³</span>
                            </Badge>
                            <Badge variant="outline" className="gap-1.5">
                              <Droplet className="h-3 w-3" />
                              <span>Verbrauch: {entry.previous_reading.verbrauch} m³</span>
                            </Badge>
                          </div>
                        ) : (
                          <Badge variant="secondary" className="gap-1.5 w-fit">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Keine Vorjahres-Ablesung vorhanden</span>
                          </Badge>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`ablesedatum-${entry.zaehler_id}`}>
                              Ablesedatum
                            </Label>
                            <DatePicker
                              id={`ablesedatum-${entry.zaehler_id}`}
                              value={entry.ablese_datum}
                              onChange={(date) => handleDateChangeRow(index, date)}
                              placeholder="Datum auswählen"
                              disabled={isLoading || isSaving}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`zaehlerstand-${entry.zaehler_id}`}>
                              Neuer Zählerstand (m³)
                            </Label>
                            <Input
                              id={`zaehlerstand-${entry.zaehler_id}`}
                              type="number"
                              step="0.01"
                              value={entry.zaehlerstand}
                              onChange={(e) => handleInputChange(index, 'zaehlerstand', e.target.value)}
                              placeholder="z.B. 123.45"
                              disabled={isLoading || isSaving}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`verbrauch-${entry.zaehler_id}`}>
                              Verbrauch (m³)
                            </Label>
                            <Input
                              id={`verbrauch-${entry.zaehler_id}`}
                              type="number"
                              step="0.01"
                              value={entry.verbrauch}
                              onChange={(e) => handleInputChange(index, 'verbrauch', e.target.value)}
                              placeholder="wird berechnet"
                              disabled={isLoading || isSaving}
                              className={entry.warning ? "border-red-500 focus-visible:ring-red-500" : ""}
                            />
                          </div>
                        </div>
                        
                        {entry.warning && (
                          <Badge variant="destructive" className="gap-1.5 w-fit">
                            <AlertTriangle className="h-3 w-3" />
                            <span>{entry.warning}</span>
                          </Badge>
                        )}
                      </div>
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
            disabled={isSaving}
          >
            Abbrechen
          </Button>
          <Button 
            type="button" 
            onClick={handleSubmit} 
            disabled={isLoading || isSaving || formData.length === 0}
          >
            {isSaving ? "Speichern..." : "Änderungen speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
