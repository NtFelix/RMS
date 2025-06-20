"use client";
import React from 'react';
import { useRouter } from 'next/navigation'; // Imported useRouter
import { Lock, Download, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SubscriptionLockedPage = () => {
  const router = useRouter(); // Instantiated router

  const handleSelectSubscription = () => {
    router.push('/landing#pricing'); // Redirect to pricing section on landing page
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
