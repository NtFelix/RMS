'use client';

import { useState, useEffect } from 'react';
import posthog from 'posthog-js';
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
      // Opt-in PostHog capturing and ensure feature flags are available immediately
      if (posthog?.opt_in_capturing) {
        posthog.opt_in_capturing();
        // Force reload feature flags and record consent
        posthog.reloadFeatureFlags?.();
        posthog.capture('consent_accepted', { level: 'all' });
        console.log('PostHog consent accepted and feature flags reloaded');

        // Dispatch custom event to trigger immediate tracking without page reload
        window.dispatchEvent(new CustomEvent('posthog-consent-granted'));
      }
    } else {
      // Ensure analytics are disabled when only necessary cookies are accepted
      posthog?.opt_out_capturing?.();
      console.log('PostHog tracking disabled - only necessary cookies accepted');
    }
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-4 bottom-4 sm:inset-x-auto sm:right-4 sm:max-w-md p-6 bg-card text-card-foreground rounded-2xl shadow-lg border border-border z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
    >
      <div className="space-y-4">
        <h3 id="cookie-consent-title" className="text-lg font-medium">Cookie-Einstellungen</h3>
        <p id="cookie-consent-description" className="text-sm text-muted-foreground">
          Wir verwenden Cookies, um Ihnen die beste Erfahrung auf unserer Website zu bieten.
          Sie können Ihre Einstellungen jederzeit ändern. Weitere Informationen finden Sie in unserer{' '}
          <Link
            href="/datenschutz"
            className="font-medium underline-offset-4 hover:underline text-primary hover:text-primary/90 dark:text-white dark:hover:text-white/90"
          >
            Datenschutzerklärung
          </Link>.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-auto sm:h-9 px-4 py-2"
            onClick={() => handleAccept('necessary')}
          >
            Nur notwendige
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1 h-auto sm:h-9 px-4 py-2"
            onClick={() => handleAccept('all')}
          >
            Alle akzeptieren
          </Button>
        </div>
      </div>
    </div>
  );
}
