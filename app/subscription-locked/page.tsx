"use client";
import React, { useState } from 'react'; // Added useState
import { useRouter } from 'next/navigation';
import { Lock, Download, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from "sonner"; // Imported toast

const SubscriptionLockedPage = () => {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState<boolean>(false); // State for export button

  const handleSelectSubscription = () => {
    router.push('/landing#pricing');
  };

  const handleExportData = async () => {
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
      a.download = 'datenexport.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Daten erfolgreich exportiert und heruntergeladen.");

    } catch (error) {
      console.error("Export error:", error);
      toast.error((error as Error).message || "Ein Fehler ist beim Exportieren der Daten aufgetreten.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 dark:bg-slate-950 backdrop-blur-md p-4 text-slate-100">
      <div className="bg-card text-card-foreground p-8 rounded-lg shadow-xl text-center max-w-md w-full">
        <div className="mb-6">
          <Lock size={96} className="mx-auto text-slate-400 dark:text-slate-500" />
        </div>
        <h1 className="text-3xl font-bold mb-4">
          Zugriff gesperrt
        </h1>
        <p className="text-muted-foreground mb-8"> {/* Reverted mb-6 to mb-8 as error message is removed */}
          Ihr aktuelles Abonnement erlaubt keinen Zugriff auf diese Seite. Bitte aktualisieren Sie Ihr Abonnement oder laden Sie Ihre Daten herunter.
        </p>
        {/* Removed error display section */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button
            variant="default"
            size="lg"
            className="w-full sm:w-auto"
            onClick={handleSelectSubscription} // Updated onClick handler
            // Removed disabled attribute
          >
            <Package /> {/* Icon added */}
            Abo auswählen {/* Reverted button text */}
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="w-full sm:w-auto"
            onClick={handleExportData}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Exportiere...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" /> {/* Icon added */}
                Daten herunterladen
              </>
            )}
          </Button>
        </div>
        {isExporting && (
          <p className="text-xs text-muted-foreground text-center mt-4">
            Bitte warten Sie, der Download startet automatisch.
          </p>
        )}
      </div>
    </div>
  );
};

export default SubscriptionLockedPage;
