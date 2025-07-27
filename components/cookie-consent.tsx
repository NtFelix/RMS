'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const CookieConsent = () => {
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShowConsent(true);
    }
  }, []);

  const handleConsent = (consentType: 'denied' | 'necessary' | 'all') => {
    localStorage.setItem('cookie-consent', consentType);
    setShowConsent(false);
  };

  if (!showConsent) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg max-w-sm z-50">
      <p className="text-sm">
        We use cookies to improve your experience. By using our site, you agree to our use of cookies.
        <Link href="/datenschutzerklaerung" className="text-blue-400 hover:underline ml-1">
          Datenschutzerklärung
        </Link>
      </p>
      <div className="flex justify-end mt-4">
        <button
          onClick={() => handleConsent('denied')}
          className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded mr-2"
        >
          Deny
        </button>
        <button
          onClick={() => handleConsent('necessary')}
          className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded mr-2"
        >
          Accept only necessary
        </button>
        <button
          onClick={() => handleConsent('all')}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Accept all cookies
        </button>
      </div>
    </div>
  );
};

export default CookieConsent;
