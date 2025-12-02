"use client";
import React from 'react'; // Removed useState
import { useRouter } from 'next/navigation';
import { Lock, Download, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from "@/hooks/use-toast"; // Using custom toast implementation
import { useDataExport } from '@/hooks/useDataExport'; // Import the custom hook

const SubscriptionLockedPage = () => {
  const router = useRouter();
  const { isExporting, handleDataExport } = useDataExport(); // Use the custom hook

  const handleSelectSubscription = () => {
    router.push('/#pricing');
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
        <p className="text-muted-foreground mb-8">
          Ihr aktuelles Abonnement erlaubt keinen Zugriff auf diese Seite. Bitte aktualisieren Sie Ihr Abonnement oder laden Sie Ihre Daten herunter.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button
            variant="default"
            size="lg"
            className="w-full sm:w-auto"
            onClick={handleSelectSubscription}
          >
            <Package className="mr-2 h-4 w-4" /> {/* Icon added to button */}
            Abo auswählen
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="w-full sm:w-auto"
            onClick={handleDataExport} // Added onClick handler
            disabled={isExporting} // Added disabled state
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
                <Download className="mr-2 h-4 w-4" /> {/* Icon added to button */}
                Daten herunterladen
              </>
            )}
          </Button>
        </div>
        {isExporting && (
          <p className="text-sm text-muted-foreground text-center mt-4">
            Der Export kann je nach Datenmenge einige Augenblicke dauern. Bitte haben Sie Geduld.
          </p>
        )}
      </div>
    </div>
  );
};

export default SubscriptionLockedPage;
