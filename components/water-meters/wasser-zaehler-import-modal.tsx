"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CustomCombobox } from "@/components/ui/custom-combobox";


import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Upload, Check, AlertTriangle, X, FileSpreadsheet, Loader2, Hash, Calendar, Gauge, Droplets } from "lucide-react";
import { WasserZaehler, WasserAblesung } from "@/lib/data-fetching";
import { bulkCreateWasserAblesungen } from "@/app/wasser-zaehler-actions";
import { isoToGermanDate } from "@/utils/date-calculations";
import { StatCard } from "@/components/common/stat-card";

interface WasserZaehlerImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  waterMeters: WasserZaehler[];
  waterReadings: WasserAblesung[];
}

type ImportStep = "upload" | "mapping" | "preview";

interface ParsedRow {
  [key: string]: string | number | null;
}

interface ColumnMapping {
  custom_id: string;
  ablese_datum: string;
  zaehlerstand: string;
  verbrauch?: string;
}

interface ProcessedReading {
  zaehler_id: string;
  custom_id: string;
  ablese_datum: string;
  zaehlerstand: number;
  verbrauch: number;
  original_row: ParsedRow;
  status: "valid" | "duplicate" | "missing_meter" | "invalid_date" | "invalid_value";
  message?: string;
}

export function WasserZaehlerImportModal({
  isOpen,
  onClose,
  onSuccess,
  waterMeters,
  waterReadings,
}: WasserZaehlerImportModalProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({ custom_id: "", ablese_datum: "", zaehlerstand: "", verbrauch: "" });
  const [processedData, setProcessedData] = useState<ProcessedReading[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    await parseFile(selectedFile);
  };

  const parseFile = async (file: File) => {
    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    if (fileExtension === "csv") {
      const Papa = (await import("papaparse")).default;
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            setParsedData(results.data as ParsedRow[]);
            setColumns(Object.keys(results.data[0] as object));
            setStep("mapping");
          } else {
            toast({ title: "Fehler", description: "Die CSV-Datei ist leer oder ungültig.", variant: "destructive" });
          }
        },
        error: (error: any) => {
          toast({ title: "Fehler", description: `Fehler beim Parsen der CSV: ${error.message}`, variant: "destructive" });
        },
      });
    } else if (fileExtension === "xlsx" || fileExtension === "xls") {
      const XLSX = await import("xlsx");
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet);
          if (jsonData && jsonData.length > 0) {
            setParsedData(jsonData as ParsedRow[]);
            setColumns(Object.keys(jsonData[0] as object));
            setStep("mapping");
          } else {
            toast({ title: "Fehler", description: "Die Excel-Datei ist leer.", variant: "destructive" });
          }
        } catch (error) {
          toast({ title: "Fehler", description: "Fehler beim Parsen der Excel-Datei.", variant: "destructive" });
        }
      };
      reader.readAsBinaryString(file);
    } else {
      toast({ title: "Fehler", description: "Nicht unterstütztes Dateiformat.", variant: "destructive" });
    }
  };

  const handleMappingChange = (field: keyof ColumnMapping, column: string) => {
    setMapping((prev) => ({ ...prev, [field]: column }));
  };

  const columnOptions = columns.map(col => ({ value: col, label: col }));

  const parseDateString = (value: string | number | Date): string | null => {
    if (!value) return null;

    // Handle Excel serial dates
    if (typeof value === 'number') {
      // Excel's epoch starts on 1899-12-30. 25569 is the serial for 1970-01-01, accounting for the 1900 leap year bug.
      const date = new Date((value - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }

    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }

    const strVal = String(value).trim();

    // German format: DD.MM.YYYY
    const germanMatch = strVal.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (germanMatch) {
      const day = germanMatch[1].padStart(2, '0');
      const month = germanMatch[2].padStart(2, '0');
      const year = germanMatch[3];
      return `${year}-${month}-${day}`;
    }

    // Try standard parsing (handles ISO YYYY-MM-DD)
    const date = new Date(strVal);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }

    return null;
  };

  const parseGermanNumber = (value: string | number): number => {
    if (typeof value === 'number') return value;
    if (!value) return 0;

    let strVal = String(value).trim();

    // If it has a comma, assume it is the decimal separator (German)
    if (strVal.includes(',')) {
      // Remove dots (thousands separators)
      strVal = strVal.replace(/\./g, '');
      // Replace comma with dot
      strVal = strVal.replace(',', '.');
    }

    const parsed = parseFloat(strVal);
    return isNaN(parsed) ? 0 : parsed;
  };

  const validateAndProcessData = () => {
    if (!mapping.custom_id || !mapping.ablese_datum || !mapping.zaehlerstand) {
      toast({ title: "Fehler", description: "Bitte ordnen Sie alle Felder zu.", variant: "destructive" });
      return;
    }

    const processed: ProcessedReading[] = parsedData.map((row) => {
      const customIdRaw = row[mapping.custom_id];
      const customId = customIdRaw ? String(customIdRaw).trim() : "";
      const dateRaw = row[mapping.ablese_datum];
      const valueRaw = row[mapping.zaehlerstand];

      const ableseDatum = parseDateString(dateRaw as string | number | Date);
      const zaehlerstand = parseGermanNumber(valueRaw as string | number);

      // Basic Validation
      if (!customId) {
        return {
          zaehler_id: "",
          custom_id: "",
          ablese_datum: ableseDatum || "",
          zaehlerstand: zaehlerstand,
          verbrauch: 0,
          original_row: row,
          status: "missing_meter",
          message: "Keine Zähler-ID",
        };
      }

      // Find Meter
      const meter = waterMeters.find((m) => m.custom_id?.toLowerCase() === customId.toLowerCase());

      if (!meter) {
        return {
          zaehler_id: "",
          custom_id: customId,
          ablese_datum: ableseDatum || "",
          zaehlerstand: zaehlerstand,
          verbrauch: 0,
          original_row: row,
          status: "missing_meter",
          message: `Zähler '${customId}' nicht gefunden`
        };
      }

      if (!ableseDatum) {
        return {
          zaehler_id: meter.id,
          custom_id: customId,
          ablese_datum: "",
          zaehlerstand: zaehlerstand,
          verbrauch: 0,
          original_row: row,
          status: "invalid_date",
          message: "Ungültiges Datum"
        };
      }

      if (isNaN(zaehlerstand)) {
        return {
          zaehler_id: meter.id,
          custom_id: customId,
          ablese_datum: ableseDatum,
          zaehlerstand: 0,
          verbrauch: 0,
          original_row: row,
          status: "invalid_value",
          message: "Ungültiger Zählerstand"
        };
      }

      // Check Duplicate
      const isDuplicate = waterReadings.some(
        (r) => r.zaehler_id === meter.id && r.ablese_datum === ableseDatum
      );

      if (isDuplicate) {
        return {
          zaehler_id: meter.id,
          custom_id: customId,
          ablese_datum: ableseDatum,
          zaehlerstand,
          verbrauch: 0,
          original_row: row,
          status: "duplicate",
          message: "Ablesung existiert bereits"
        };
      }

      // Calculate Consumption
      let verbrauch = 0;

      // If verbrauch column is mapped and has value, use it
      if (mapping.verbrauch && row[mapping.verbrauch]) {
        verbrauch = parseGermanNumber(row[mapping.verbrauch] as string | number);
      } else {
        // Otherwise calculate it
        const meterReadings = waterReadings.filter(r => r.zaehler_id === meter.id);
        const previousReadings = meterReadings.filter(r => r.ablese_datum < ableseDatum);
        previousReadings.sort((a, b) => new Date(b.ablese_datum).getTime() - new Date(a.ablese_datum).getTime());

        const previousReading = previousReadings[0];
        verbrauch = previousReading && previousReading.zaehlerstand !== null
          ? Math.max(0, zaehlerstand - previousReading.zaehlerstand)
          : 0;
      }

      return {
        zaehler_id: meter.id,
        custom_id: customId,
        ablese_datum: ableseDatum,
        zaehlerstand,
        verbrauch,
        original_row: row,
        status: "valid",
      };
    });

    setProcessedData(processed);
    setStep("preview");
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    // Filter valid rows
    const rowsToImport = processedData.filter(row => row.status === "valid");

    if (rowsToImport.length === 0) {
      toast({ title: "Info", description: "Keine gültigen Datensätze zum Importieren.", variant: "default" });
      setIsSubmitting(false);
      return;
    }

    const payload = rowsToImport.map(row => ({
      zaehler_id: row.zaehler_id,
      ablese_datum: row.ablese_datum,
      zaehlerstand: row.zaehlerstand,
      verbrauch: row.verbrauch,
      kommentar: "Importiert"
    }));

    const result = await bulkCreateWasserAblesungen(payload);

    if (result.success) {
      toast({
        title: "Import erfolgreich",
        description: `${payload.length} Ablesungen wurden importiert.`,
        variant: "success"
      });
      onSuccess();
      onClose();
    } else {
      toast({
        title: "Fehler beim Import",
        description: result.message || "Unbekannter Fehler",
        variant: "destructive"
      });
    }
    setIsSubmitting(false);
  };

  const validCount = processedData.filter(d => d.status === "valid").length;
  const duplicateCount = processedData.filter(d => d.status === "duplicate").length;
  const missingCount = processedData.filter(d => d.status === "missing_meter").length;
  const errorCount = processedData.filter(d => d.status === "invalid_date" || d.status === "invalid_value").length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Wasserzähler-Ablesungen importieren</DialogTitle>
          <DialogDescription>
            {step === "upload" && "Laden Sie eine CSV oder Excel Datei hoch."}
            {step === "mapping" && "Ordnen Sie die Spalten aus Ihrer Datei den Feldern zu."}
            {step === "preview" && "Überprüfen Sie die Daten vor dem Import."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {step === "upload" && (
            <div
              className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-3xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
              />
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Datei hierhin ziehen oder klicken</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Unterstützte Formate: .csv, .xlsx, .xls.
                Die Datei sollte Spalten für Zähler-ID, Datum und Zählerstand enthalten.
              </p>
            </div>
          )}

          {step === "mapping" && (
            <div className="space-y-6">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4 items-center">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    Zähler Custom ID Spalte:
                  </label>
                  <CustomCombobox
                    options={columnOptions}
                    value={mapping.custom_id}
                    onChange={(v) => handleMappingChange('custom_id', v || "")}
                    placeholder="Spalte wählen"
                    searchPlaceholder="Spalte suchen..."
                    width="w-full"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 items-center">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Ablesedatum Spalte:
                  </label>
                  <CustomCombobox
                    options={columnOptions}
                    value={mapping.ablese_datum}
                    onChange={(v) => handleMappingChange('ablese_datum', v || "")}
                    placeholder="Spalte wählen"
                    searchPlaceholder="Spalte suchen..."
                    width="w-full"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 items-center">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-muted-foreground" />
                    Zählerstand Spalte:
                  </label>
                  <CustomCombobox
                    options={columnOptions}
                    value={mapping.zaehlerstand}
                    onChange={(v) => handleMappingChange('zaehlerstand', v || "")}
                    placeholder="Spalte wählen"
                    searchPlaceholder="Spalte suchen..."
                    width="w-full"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 items-center">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-muted-foreground" />
                    Verbrauch Spalte (optional):
                  </label>
                  <CustomCombobox
                    options={columnOptions}
                    value={mapping.verbrauch || null}
                    onChange={(v) => handleMappingChange('verbrauch', v || "")}
                    placeholder="Berechnen (Standard)"
                    searchPlaceholder="Spalte suchen..."
                    width="w-full"
                  />
                </div>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard
                  title="Bereit"
                  value={validCount}
                  icon={<Check className="h-4 w-4 text-green-500" />}
                />
                <StatCard
                  title="Duplikate"
                  value={duplicateCount}
                  icon={<FileSpreadsheet className="h-4 w-4 text-yellow-500" />}
                  description="Ignoriert"
                />
                <StatCard
                  title="Fehlende Zähler"
                  value={missingCount}
                  icon={<X className="h-4 w-4 text-red-500" />}
                />
                <StatCard
                  title="Ungültig"
                  value={errorCount}
                  icon={<AlertTriangle className="h-4 w-4 text-orange-500" />}
                />
              </div>

              {missingCount > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Achtung</AlertTitle>
                  <AlertDescription>
                    {missingCount} Datensätze enthalten Zähler-IDs, die im System nicht gefunden wurden. Diese werden beim Import übersprungen.
                  </AlertDescription>
                </Alert>
              )}

              <div className="border border-gray-200 dark:border-[#3C4251] rounded-2xl overflow-hidden bg-white dark:bg-[#22272e] shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 dark:bg-[#22272e] dark:text-[#f3f4f6] hover:bg-gray-50 dark:hover:bg-[#22272e] transition-all duration-200 ease-out transform hover:scale-[1.002] active:scale-[0.998] [&:hover_th]:[&:first-child]:rounded-tl-lg [&:hover_th]:[&:last-child]:rounded-tr-lg">
                      <TableHead>Status</TableHead>
                      <TableHead>Zähler ID</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Stand</TableHead>
                      <TableHead>Verbrauch (ber.)</TableHead>
                      <TableHead>Info</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedData.slice(0, 100).map((row, i) => (
                      <TableRow
                        key={i}
                        className={`hover-desktop hover:bg-gray-50 dark:hover:bg-gray-800/50 ${row.status !== "valid" ? "opacity-70 bg-gray-50 dark:bg-[#1c2128]" : ""
                          }`}
                      >
                        <TableCell>
                          {row.status === "valid" && <Check className="h-4 w-4 text-green-500" />}
                          {row.status === "duplicate" && <FileSpreadsheet className="h-4 w-4 text-yellow-500" />}
                          {row.status === "missing_meter" && <X className="h-4 w-4 text-red-500" />}
                          {(row.status === "invalid_date" || row.status === "invalid_value") && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                        </TableCell>
                        <TableCell>{row.custom_id}</TableCell>
                        <TableCell>{row.ablese_datum ? isoToGermanDate(row.ablese_datum) : "-"}</TableCell>
                        <TableCell>{row.zaehlerstand}</TableCell>
                        <TableCell>{row.verbrauch}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{row.message}</TableCell>
                      </TableRow>
                    ))}
                    {processedData.length > 100 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          ... {processedData.length - 100} weitere Zeilen
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          )}
          {step === "mapping" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>Zurück</Button>
              <Button onClick={validateAndProcessData}>Vorschau anzeigen</Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("mapping")}>Zurück</Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || validCount === 0}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {validCount} Datensätze importieren
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
