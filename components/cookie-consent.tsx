"use client";
import React, { useState } from 'react';
import Link from 'next/link';

const CookieConsent = () => {
  const [visible, setVisible] = useState(true);

  if (!visible) {
    return null;
  }

  const handleDeny = () => {
    setVisible(false);
  };

  const handleAcceptNecessary = () => {
    setVisible(false);
  };

  const handleAcceptAll = () => {
    setVisible(false);
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg max-w-sm">
      <p className="text-sm">
        We use cookies to improve your experience. Please read our{' '}
        <Link href="/datenschutzerklaerung" className="underline">
          Datenschutzerklärung
        </Link>
        .
      </p>
      <div className="flex justify-end space-x-2 mt-4">
        <button onClick={handleDeny} className="text-sm text-gray-600 hover:underline">
          Deny
        </button>
        <button onClick={handleAcceptNecessary} className="text-sm text-gray-600 hover:underline">
          Accept only necessary
        </button>
        <button onClick={handleAcceptAll} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm">
          Accept all cookies
        </button>
      </div>
    </div>
  );
};

export default CookieConsent;
