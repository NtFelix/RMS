import { useState } from 'react';
import { toast } from 'sonner'; // Assuming sonner is used for toasts

export const useDataExport = () => {
  const [isExporting, setIsExporting] = useState(false);

  const handleDataExport = async () => {
    setIsExporting(true);
    toast.info("Datenexport wird vorbereitet...");
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
      toast.success("Daten erfolgreich exportiert und heruntergeladen.");

    } catch (error) {
      console.error("Data export error:", error);
      toast.error((error as Error).message || "Datenexport fehlgeschlagen.");
    } finally {
      setIsExporting(false);
    }
  };

  return { isExporting, handleDataExport };
};
