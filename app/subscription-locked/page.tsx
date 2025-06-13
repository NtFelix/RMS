import React from 'react';
import { Lock, Download, Package } from 'lucide-react'; // Added Download and Package
import { Button } from '@/components/ui/button';

const SubscriptionLockedPage = () => {
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
          >
            <Package /> {/* Icon added */}
            Abo auswählen
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="w-full sm:w-auto"
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
