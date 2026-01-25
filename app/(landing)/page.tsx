'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import Hero from '@/app/modern/components/hero';
import FeatureSections from '@/app/modern/components/feature-sections';
import ProductShowcase from '@/app/modern/components/product-showcase';

import MoreFeatures from '@/app/modern/components/more-features';
import CTA from '@/app/modern/components/cta';
import BottomCTA from '@/components/ui/bottom-cta';

import Pricing from '@/app/modern/components/pricing';
import NebenkostenSection from '@/app/modern/components/nebenkosten-section';
import { useStripeIntegration } from '@/hooks/use-stripe-integration';
import { usePlanSelectionRedirect } from '@/hooks/use-plan-selection-redirect';
import { useLandingRedirects } from '@/hooks/use-landing-redirects';
import { trackSectionViewed, type LandingSection } from '@/lib/posthog-landing-events';
import { ROUTES } from '@/lib/constants';

// Main content component that uses the auth modal context
function LandingPageContent() {
  const router = useRouter();
  const {
    sessionUser,
    userProfile,
    isProcessingCheckout,
    isLoadingProfile,
    handleAuthFlow
  } = useStripeIntegration();

  usePlanSelectionRedirect(sessionUser, userProfile, isProcessingCheckout, handleAuthFlow);
  useLandingRedirects(sessionUser, isLoadingProfile, '/');

  // Scroll-depth tracking
  const pageLoadTimeRef = useRef<number>(Date.now());
  const trackedSectionsRef = useRef<Set<string>>(new Set());

  // Set up scroll-depth tracking
  useEffect(() => {
    const sectionIdMap: Record<string, LandingSection> = {
      'hero': 'hero',
      'features': 'features',
      'nebenkosten': 'nebenkosten',
      'more-features': 'more_features',
      'pricing': 'pricing',
      'cta': 'bottom_cta',
      'faq': 'faq',
      'footer': 'footer',
    };
    const sectionIds = Object.keys(sectionIdMap);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !trackedSectionsRef.current.has(entry.target.id)) {
            trackedSectionsRef.current.add(entry.target.id);
            const section = sectionIdMap[entry.target.id];
            if (section) {
              const timeOnPageMs = Date.now() - pageLoadTimeRef.current;
              const scrollPercent = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
              trackSectionViewed(section, timeOnPageMs, scrollPercent);
            }
          }
        });
      },
      { threshold: 0.3 }
    );

    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, []);

  const handleSelectPlan = async (priceId: string) => {
    await handleAuthFlow(priceId, window.location.pathname);
  };

  const handleGetStarted = async () => {
    if (sessionUser) {
      router.push(ROUTES.HOME);
    } else {
      router.push('/auth/login');
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <div id="hero">
        <Hero onGetStarted={handleGetStarted} />
      </div>
      <div id="product-showcase">
        <ProductShowcase />
      </div>
      <div id="features">
        <FeatureSections />
      </div>
      <div id="nebenkosten">
        <NebenkostenSection />
      </div>

      <div id="more-features">
        <MoreFeatures />
      </div>
      <div id="pricing">
        <Pricing
          onSelectPlan={handleSelectPlan}
          userProfile={userProfile}
          isLoading={isProcessingCheckout}
          showComparison={false}
          showViewAllButton={true}
        />
      </div>
      <div id="cta">
        <BottomCTA
          onGetStarted={handleGetStarted}
          theme="city"
          title="Übernehmen Sie die Kontrolle über Ihre"
          subtitle="Immobilien noch heute"
          description="Beginnen Sie noch heute, Ihre Immobilien effizienter zu verwalten und profitieren Sie von einer modernen und benutzerfreundlichen Plattform."
          badgeText="Bereit zur Vereinfachung?"
          primaryButtonText="Jetzt loslegen"
          secondaryButtonText="Demo anfordern"
        />
      </div>
    </div>
  );
}

// Main export component that provides the auth modal context
export default function LandingPage() {
  return (
    <Suspense fallback={null}>
      <LandingPageContent />
    </Suspense>
  );
}
