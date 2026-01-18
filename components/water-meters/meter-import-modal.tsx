"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CustomCombobox } from "@/components/ui/custom-combobox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Upload, Check, AlertTriangle, X, FileSpreadsheet, Loader2, Hash, Calendar, Gauge, Droplets } from "lucide-react";
import { Zaehler, ZaehlerAblesung } from "@/lib/data-fetching";
import { bulkCreateAblesungen } from "@/app/meter-actions";
import { isoToGermanDate } from "@/utils/date-calculations";
import { StatCard } from "@/components/common/stat-card";

interface MeterImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  meters: Zaehler[];
  readings: ZaehlerAblesung[];
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

export function MeterImportModal({
  isOpen,
  onClose,
  onSuccess,
  meters,
  readings,
}: MeterImportModalProps) {
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
            toast({ title: "Fehler", description: "CSV leer.", variant: "destructive" });
          }
        },
      });
    } else if (fileExtension === "xlsx" || fileExtension === "xls") {
      const XLSX = await import("xlsx");
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        if (jsonData.length > 0) {
          setParsedData(jsonData as ParsedRow[]);
          setColumns(Object.keys(jsonData[0] as object));
          setStep("mapping");
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const parseDateString = (value: any): string | null => {
    if (!value) return null;
    if (typeof value === 'number') {
      const date = new Date((value - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    const strVal = String(value).trim();
    const germanMatch = strVal.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (germanMatch) return `${germanMatch[3]}-${germanMatch[2].padStart(2, '0')}-${germanMatch[1].padStart(2, '0')}`;
    const date = new Date(strVal);
    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
  };

  const parseGermanNumber = (value: any): number => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    let strVal = String(value).trim().replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(strVal);
    return isNaN(parsed) ? 0 : parsed;
  };

  const validateAndProcessData = () => {
    const processed: ProcessedReading[] = parsedData.map((row) => {
      const customId = String(row[mapping.custom_id] || "").trim();
      const ableseDatum = parseDateString(row[mapping.ablese_datum]);
      const zaehlerstand = parseGermanNumber(row[mapping.zaehlerstand]);

      if (!customId) return { zaehler_id: "", custom_id: "", ablese_datum: ableseDatum || "", zaehlerstand, verbrauch: 0, original_row: row, status: "missing_meter" };

      const meter = meters.find((m) => m.custom_id?.toLowerCase() === customId.toLowerCase());
      if (!meter) return { zaehler_id: "", custom_id: customId, ablese_datum: ableseDatum || "", zaehlerstand, verbrauch: 0, original_row: row, status: "missing_meter" };

      const isDuplicate = readings.some(r => r.zaehler_id === meter.id && r.ablese_datum === ableseDatum);
      if (isDuplicate) return { zaehler_id: meter.id, custom_id: customId, ablese_datum: ableseDatum || "", zaehlerstand, verbrauch: 0, original_row: row, status: "duplicate" };

      return { zaehler_id: meter.id, custom_id: customId, ablese_datum: ableseDatum || "", zaehlerstand, verbrauch: 0, original_row: row, status: "valid" };
    });
    setProcessedData(processed);
    setStep("preview");
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const rowsToImport = processedData.filter(row => row.status === "valid");
    const payload = rowsToImport.map(row => ({
      zaehler_id: row.zaehler_id,
      ablese_datum: row.ablese_datum,
      zaehlerstand: row.zaehlerstand,
      verbrauch: row.verbrauch,
      kommentar: "Importiert"
    }));

    const result = await bulkCreateAblesungen(payload);
    if (result.success) {
      toast({ title: "Erfolg", description: `${payload.length} importiert.`, variant: "success" });
      onSuccess();
      onClose();
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogTitle>Zähler-Import</DialogTitle>
        <div className="py-4">
          {step === "upload" && <div onClick={() => fileInputRef.current?.click()}>Datei hochladen...<input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} /></div>}
          {step === "mapping" && <Button onClick={validateAndProcessData}>Vorschau</Button>}
          {step === "preview" && <Button onClick={handleSubmit} disabled={isSubmitting}>Importieren</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
