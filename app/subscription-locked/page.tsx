import React from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button'; // Import the Button component

const SubscriptionLockedPage = () => {
  return (
    // Using slate for a deep blue, primary could also be an option if defined as dark blue
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 dark:bg-slate-950 backdrop-blur-md p-4 text-slate-100">
      {/* Using bg-card and text-card-foreground for the card itself */}
      <div className="bg-card text-card-foreground p-8 rounded-lg shadow-xl text-center max-w-md w-full">
        <div className="mb-6">
          {/* Icon color adjusted for dark theme visibility */}
          <Lock size={96} className="mx-auto text-slate-400 dark:text-slate-500" />
        </div>
        {/* Text colors adjusted for dark theme */}
        <h1 className="text-3xl font-bold mb-4"> {/* text-card-foreground is inherited */}
          Zugriff gesperrt
        </h1>
        {/* Using text-muted-foreground for less emphasis */}
        <p className="text-muted-foreground mb-8">
          Ihr aktuelles Abonnement erlaubt keinen Zugriff auf diese Seite. Bitte aktualisieren Sie Ihr Abonnement oder laden Sie Ihre Daten herunter.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          {/* Using the project's Button component with variants */}
          <Button
            variant="default" // bg-primary, text-primary-foreground
            size="lg"
            className="w-full sm:w-auto"
          >
            Abo auswählen
          </Button>
          <Button
            variant="secondary" // bg-secondary, text-secondary-foreground
            size="lg"
            className="w-full sm:w-auto"
          >
            Daten herunterladen
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionLockedPage;
