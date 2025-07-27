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

  const handleAccept = (level: 'none' | 'necessary' | 'all') => {
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
    <div className="fixed bottom-4 right-4 max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Cookie-Einstellungen</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Wir verwenden Cookies, um Ihnen die beste Erfahrung auf unserer Website zu bieten. 
          Sie können Ihre Einstellungen jederzeit ändern. Weitere Informationen finden Sie in unserer{' '}
          <Link href="/datenschutz" className="text-primary hover:underline">
            Datenschutzerklärung
          </Link>.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleAccept('none')}
          >
            Ablehnen
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleAccept('necessary')}
          >
            Nur notwendige akzeptieren
          </Button>
          <Button 
            variant="default" 
            size="sm"
            onClick={() => handleAccept('all')}
          >
            Alle akzeptieren
          </Button>
        </div>
      </div>
    </div>
  );
}
