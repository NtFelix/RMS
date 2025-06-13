import React from 'react';
import { Lock } from 'lucide-react';

const SubscriptionLockedPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 backdrop-blur-md p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl text-center max-w-md w-full">
        <div className="mb-6">
          <Lock size={96} className="mx-auto text-red-500 dark:text-red-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-4">
          Zugriff gesperrt
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          Ihr aktuelles Abonnement erlaubt keinen Zugriff auf diese Seite. Bitte aktualisieren Sie Ihr Abonnement oder laden Sie Ihre Daten herunter.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-150 ease-in-out w-full sm:w-auto"
          >
            Abo auswählen
          </button>
          <button
            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-150 ease-in-out w-full sm:w-auto"
          >
            Daten herunterladen
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionLockedPage;
