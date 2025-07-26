'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import posthog from 'posthog-js';

const CookieBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'true');
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie_consent', 'false');
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-4 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <p className="text-sm">
          Wir verwenden Cookies, um Ihr Erlebnis auf unserer Website zu verbessern.
        </p>
        <div className="flex gap-4">
          <Button variant="secondary" onClick={handleDecline}>
            Ablehnen
          </Button>
          <Button onClick={handleAccept}>
            Akzeptieren
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
