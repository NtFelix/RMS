'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleAccept = (level: 'necessary' | 'all') => {
    localStorage.setItem('cookieConsent', level);
    setVisible(false);
    
    // Here you can add additional logic based on the consent level
    // For example, initializing analytics only if 'all' is accepted
    if (level === 'all') {
      // Initialize analytics or other tracking scripts
    }
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 w-full sm:bottom-4 sm:right-4 sm:w-auto sm:max-w-md p-6 bg-white dark:bg-gray-800 rounded-t-lg sm:rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
    >
      <div className="space-y-4">
        <h3 id="cookie-consent-title" className="text-lg font-medium">Cookie-Einstellungen</h3>
        <p id="cookie-consent-description" className="text-sm text-gray-600 dark:text-gray-300">
          Wir verwenden Cookies, um Ihnen die beste Erfahrung auf unserer Website zu bieten. 
          Sie können Ihre Einstellungen jederzeit ändern. Weitere Informationen finden Sie in unserer{' '}
          <Link href="/datenschutz" className="text-primary underline hover:underline">
            Datenschutzerklärung
          </Link>.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1"
            onClick={() => handleAccept('necessary')}
          >
            Nur notwendige
          </Button>
          <Button 
            variant="default" 
            size="sm"
            className="flex-1"
            onClick={() => handleAccept('all')}
          >
            Alle akzeptieren
          </Button>
        </div>
      </div>
    </div>
  );
}
