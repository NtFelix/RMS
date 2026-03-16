"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CustomCombobox } from "@/components/ui/custom-combobox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Upload, Check, AlertTriangle, X, FileSpreadsheet, Loader2, Hash, Calendar, Gauge, Droplets } from "lucide-react";
import type { Zaehler as SharedMeter, ZaehlerAblesung } from "@/lib/types";
import { isoToGermanDate } from "@/utils/date-calculations";
import { formatNumber } from "@/utils/format";
import { StatCard } from "@/components/common/stat-card";

interface MeterImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  meters: SharedMeter[];
  readings: ZaehlerAblesung[];
}

type ImportStep = "upload" | "mapping" | "preview";

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
  status: "valid" | "duplicate" | "missing_meter" | "invalid_date" | "invalid_value";
  message?: string;
  rowIndex?: number;
}

export function MeterImportModal({
  isOpen,
  onClose,
  onSuccess,
  meters,
  readings,
}: MeterImportModalProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [jobId, setJobId] = useState<string | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({ custom_id: "", ablese_datum: "", zaehlerstand: "", verbrauch: "" });
  const [processedData, setProcessedData] = useState<ProcessedReading[]>([]);
  const [totalRowCount, setTotalRowCount] = useState(0);
  const [counts, setCounts] = useState({
    validCount: 0,
    duplicateCount: 0,
    missingCount: 0,
    invalidCount: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setIsSubmitting(true);
    setProcessedData([]);
    setCounts({ validCount: 0, duplicateCount: 0, missingCount: 0, invalidCount: 0 });

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/meter-import/preview", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Datei konnte nicht verarbeitet werden.");
      }

      setJobId(data.jobId);
      setColumns(data.columns || []);
      setTotalRowCount(data.totalRowCount || 0);
      setMapping({ custom_id: "", ablese_datum: "", zaehlerstand: "", verbrauch: "" });
      setStep("mapping");
    } catch (error: unknown) {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Datei konnte nicht verarbeitet werden.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMappingChange = (field: keyof ColumnMapping, column: string) => {
    setMapping((prev) => ({ ...prev, [field]: column }));
  };

  const columnOptions = columns.map(col => ({ value: col, label: col }));

  const resetToUpload = () => {
    setJobId(null);
    setColumns([]);
    setProcessedData([]);
    setTotalRowCount(0);
    setCounts({ validCount: 0, duplicateCount: 0, missingCount: 0, invalidCount: 0 });
    setMapping({ custom_id: "", ablese_datum: "", zaehlerstand: "", verbrauch: "" });
    setStep("upload");
  };

  const validateAndProcessData = async () => {
    if (!mapping.custom_id || !mapping.ablese_datum || !mapping.zaehlerstand) {
      toast({ title: "Fehler", description: "Bitte ordnen Sie alle Felder zu.", variant: "destructive" });
      return;
    }

    if (!jobId) {
      toast({ title: "Fehler", description: "Bitte laden Sie die Datei erneut hoch.", variant: "destructive" });
      resetToUpload();
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/meter-import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, mapping }),
      });

      const data = await response.json();

      if (data?.error === "job_expired") {
        toast({
          title: "Datei abgelaufen",
          description: "Die Datei ist abgelaufen, bitte erneut hochladen.",
          variant: "destructive",
        });
        resetToUpload();
        return;
      }

      if (!response.ok) {
        throw new Error(data?.error || "Fehler bei der Vorschau.");
      }

      setProcessedData(data.previewRows || []);
      setTotalRowCount(data.totalRowCount || (data.previewRows?.length || 0));
      setCounts({
        validCount: data.validCount ?? 0,
        duplicateCount: data.duplicateCount ?? 0,
        missingCount: data.missingCount ?? 0,
        invalidCount: data.invalidCount ?? 0,
      });
      setStep("preview");
    } catch (error: unknown) {
      console.error("Error validating data:", error);
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Fehler bei der Validierung der Daten.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    if (!jobId) {
      toast({ title: "Fehler", description: "Bitte laden Sie die Datei erneut hoch.", variant: "destructive" });
      resetToUpload();
      setIsSubmitting(false);
      return;
    }

    if (counts.validCount === 0) {
      toast({ title: "Info", description: "Keine gültigen Datensätze zum Importieren.", variant: "default" });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/meter-import/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, mapping }),
      });

      const data = await response.json();

      if (data?.error === "job_expired") {
        toast({
          title: "Datei abgelaufen",
          description: "Die Datei ist abgelaufen, bitte erneut hochladen.",
          variant: "destructive",
        });
        resetToUpload();
        return;
      }

      if (!response.ok) {
        throw new Error(data?.error || "Fehler beim Import.");
      }

      if (data.success) {
        toast({
          title: "Import erfolgreich",
          description: `${data.importedCount ?? 0} Ablesungen wurden importiert.`,
          variant: "success",
        });
      } else {
        toast({
          title: "Import abgeschlossen",
          description: `${data.importedCount ?? 0} Ablesungen importiert, ${data.errorCount ?? 0} Fehler.`,
          variant: "default",
        });
      }

      onSuccess();
      onClose();
    } catch (error: unknown) {
      toast({
        title: "Fehler beim Import",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const { validCount, duplicateCount, missingCount, invalidCount } = counts;
  const errorCount = invalidCount;
  const remainingRows = Math.max(0, totalRowCount - processedData.length);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Zähler-Ablesungen importieren</DialogTitle>
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
                        <TableCell>{formatNumber(row.zaehlerstand, 3)}</TableCell>
                        <TableCell>{formatNumber(row.verbrauch, 3)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{row.message}</TableCell>
                      </TableRow>
                    ))}
                    {remainingRows > 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          ... {remainingRows} weitere Zeilen
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
