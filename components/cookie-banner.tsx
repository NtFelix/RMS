'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const CookieBanner = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookie-consent', 'true');
    setShowBanner(false);
  };

  const declineCookies = () => {
    localStorage.setItem('cookie-consent', 'false');
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-4 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <p>
          Wir verwenden Cookies, um Ihr Erlebnis zu verbessern. Bitte lesen Sie unsere{' '}
          <Link href="/privacy" className="underline">
            Datenschutzerklärung
          </Link>
          .
        </p>
        <div>
          <button
            onClick={acceptCookies}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded mr-2"
          >
            Akzeptieren
          </button>
          <button
            onClick={declineCookies}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
          >
            Ablehnen
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
