'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleDeny = () => {
    localStorage.setItem('cookie-consent', 'denied');
    setVisible(false);
  };

  const handleAcceptNecessary = () => {
    localStorage.setItem('cookie-consent', 'necessary');
    setVisible(false);
  };

  const handleAcceptAll = () => {
    localStorage.setItem('cookie-consent', 'all');
    setVisible(false);
  };

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg">
      <p className="mb-2">
        We use cookies to improve your experience. By using our site, you agree to our{' '}
        <Link href="/datenschutzerklaerung" className="underline">
          Privacy Policy
        </Link>
        .
      </p>
      <div className="flex justify-end gap-2">
        <button onClick={handleDeny} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600">
          Deny
        </button>
        <button onClick={handleAcceptNecessary} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600">
          Accept only necessary
        </button>
        <button onClick={handleAcceptAll} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500">
          Accept all cookies
        </button>
      </div>
    </div>
  );
};

export default CookieConsent;
