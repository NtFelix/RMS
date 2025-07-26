'use client';

import { useState, useEffect } from 'react';

export const useCookieConsent = () => {
  const [consent, setConsent] = useState<boolean | null>(null);

  useEffect(() => {
    const storedConsent = localStorage.getItem('cookie-consent');
    if (storedConsent) {
      setConsent(storedConsent === 'true');
    }
  }, []);

  const accept = () => {
    localStorage.setItem('cookie-consent', 'true');
    setConsent(true);
  };

  const decline = () => {
    localStorage.setItem('cookie-consent', 'false');
    setConsent(false);
  };

  return { consent, accept, decline };
};
