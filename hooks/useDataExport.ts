import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

export const useDataExport = () => {
  const [isExporting, setIsExporting] = useState(false);

  const handleDataExport = async () => {
    setIsExporting(true);
    toast({
      title: "Export gestartet",
      description: "Datenexport wird vorbereitet...",
      variant: "default"
    });
    try {
      const response = await fetch('/api/export', {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Datenexport fehlgeschlagen.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "datenexport.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({
        title: "Erfolg",
        description: "Daten erfolgreich exportiert und heruntergeladen.",
        variant: "success"
      });

    } catch (error) {
      console.error("Data export error:", error);
      toast({
        title: "Fehler",
        description: (error as Error).message || "Datenexport fehlgeschlagen.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  return { isExporting, handleDataExport };
};
