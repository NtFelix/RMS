'use client';

import { useState, useEffect, Suspense, useRef, type MutableRefObject } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { loadStripe } from '@stripe/stripe-js';
import { trackSectionViewed, type LandingSection } from '@/lib/posthog-landing-events';
import { ROUTES, INFO_EMAIL } from '@/lib/constants';

import Hero from '@/app/modern/components/hero';
import FeatureSections from '@/app/modern/components/feature-sections';
import ProductShowcase from '@/app/modern/components/product-showcase';
import MoreFeatures from '@/app/modern/components/more-features';
import BottomCTA from '@/components/ui/bottom-cta';
import Pricing from '@/app/modern/components/pricing';
import NebenkostenSection from '@/app/modern/components/nebenkosten-section';
import { EmailVerificationNotifier } from '@/components/auth/email-verification-notifier';
import { useSubscriptionUser } from '@/hooks/use-subscription-user';
import { useSubscriptionCheckout } from '@/hooks/use-subscription-checkout';
import { useAuthRedirects } from '@/hooks/use-auth-redirect-handler';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);



// Isolate dynamic navigation hooks (useSearchParams, useRouter) so the surrounding landing page renders
// immediately in SSR/static HTML without CLS or CLIENT_HOOK_DYNAMIC prerender errors
function LandingRedirectsHandler({
  sessionUser,
  userProfile,
  isLoadingUser,
  isProcessingCheckout,
  handleAuthFlow,
  routerRef,
}: {
  sessionUser: ReturnType<typeof useSubscriptionUser>['user'];
  userProfile: ReturnType<typeof useSubscriptionUser>['profile'];
  isLoadingUser: boolean;
  isProcessingCheckout: boolean;
  handleAuthFlow: ReturnType<typeof useSubscriptionCheckout>['handleAuthFlow'];
  routerRef: MutableRefObject<ReturnType<typeof useRouter> | null>;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    routerRef.current = router;
  }, [router, routerRef]);

  // Handle redirects and errors
  useAuthRedirects(sessionUser, isLoadingUser);

  // Handle price selection from URL after redirect back from login
  useEffect(() => {
    const priceId = searchParams.get('priceId');
    if (priceId && sessionUser && userProfile && !isProcessingCheckout) {
      // Clear the priceId from URL to prevent re-triggering on refresh
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('priceId');
      const searchStr = newParams.toString();
      const newUrl = `${window.location.pathname}${searchStr ? '?' + searchStr : ''}`;
      window.history.replaceState({}, '', newUrl);

      handleAuthFlow(sessionUser, userProfile, priceId, window.location.pathname);
    }
  }, [searchParams, sessionUser, userProfile, isProcessingCheckout, handleAuthFlow]);

  return null;
}

// Main content component that uses the auth modal context
function LandingPageContent() {
  const routerRef = useRef<ReturnType<typeof useRouter> | null>(null);

  // Use custom hooks
  const { user: sessionUser, profile: userProfile, isLoading: isLoadingUser } = useSubscriptionUser();
  const { isProcessingCheckout, handleAuthFlow } = useSubscriptionCheckout();

  // Scroll-depth tracking
  const pageLoadTimeRef = useRef<number>(0);
  const trackedSectionsRef = useRef<Set<string>>(new Set());

  // Set up scroll-depth tracking
  useEffect(() => {
    pageLoadTimeRef.current = Date.now();
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

  const handleGetStarted = async () => {
    const target = sessionUser ? ROUTES.HOME : '/auth/login';
    if (routerRef.current) {
      routerRef.current.push(target);
    } else {
      window.location.assign(target);
    }
  };

  const handleSelectPlan = async (priceId: string) => {
    await handleAuthFlow(sessionUser, userProfile, priceId, window.location.pathname);
  };

  return (
    <>
      <Suspense fallback={null}>
        <EmailVerificationNotifier />
        <LandingRedirectsHandler
          sessionUser={sessionUser}
          userProfile={userProfile}
          isLoadingUser={isLoadingUser}
          isProcessingCheckout={isProcessingCheckout}
          handleAuthFlow={handleAuthFlow}
          routerRef={routerRef}
        />
      </Suspense>
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
            secondaryButtonText="Kontakt aufnehmen"
            secondaryButtonHref={`mailto:${INFO_EMAIL}`}
          />
        </div>
      </div>
    </>
  );
}

// Main export component that provides the auth modal context
export default function LandingPage() {
  return <LandingPageContent />;
}
