"use client";
import React from 'react';
import { useRouter } from 'next/navigation'; // Imported useRouter
import { Lock, Download, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
// import { exportDataAsCsv } from '@/lib/export-data'; // No longer needed directly
import { generateCsvExportDataAction } from '@/app/actions/export-actions';
import { toast } from 'sonner';
import JSZip from 'jszip'; // Import JSZip

const SubscriptionLockedPage = () => {
  const router = useRouter(); // Instantiated router

  const handleSelectSubscription = () => {
    router.push('/landing#pricing'); // Redirect to pricing section on landing page
  };

  const handleDownloadData = async () => {
    console.log("Exporting data from subscription locked page as ZIP via server action...");
    toast.info("Datenexport wird gestartet und als ZIP-Datei verpackt...");
    try {
      const csvData = await generateCsvExportDataAction();

      if (Object.keys(csvData).length === 0) {
        toast.info("Keine Daten zum Exportieren vorhanden."); // Changed from warn
        return;
      }

      const zip = new JSZip();
      for (const filename in csvData) {
        if (csvData.hasOwnProperty(filename)) {
          const csvString = csvData[filename];
          if (csvString) { // Ensure csvString is not empty
            zip.file(filename, csvString);
          } else {
            console.info(`No data for ${filename}, skipping add to zip.`);
          }
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(zipBlob);
      link.setAttribute("href", url);
      link.setAttribute("download", "datenexport.zip"); // Fixed filename
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Daten erfolgreich als ZIP-Datei exportiert und heruntergeladen.");
    } catch (error) {
      console.error("Error exporting data from subscription locked page as ZIP:", error);
      toast.error("Fehler beim Exportieren der Daten als ZIP: " + (error as Error).message);
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
            onClick={handleDownloadData} // Use the new handler
            // Removed disabled attribute from this button as well for consistency
          >
            <Download /> {/* Icon added */}
            Daten herunterladen
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionLockedPage;
