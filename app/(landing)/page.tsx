'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Hero from '@/app/modern/components/hero';

const FeatureSections = dynamic(() => import('@/app/modern/components/feature-sections'), { ssr: true });
const ProductShowcase = dynamic(() => import('@/app/modern/components/product-showcase'), { ssr: true });
const MoreFeatures = dynamic(() => import('@/app/modern/components/more-features'), { ssr: true });
const CTA = dynamic(() => import('@/app/modern/components/cta'), { ssr: true });
const BottomCTA = dynamic(() => import('@/components/ui/bottom-cta'), { ssr: true });
const Pricing = dynamic(() => import('@/app/modern/components/pricing'), { ssr: true });
const NebenkostenSection = dynamic(() => import('@/app/modern/components/nebenkosten-section'), { ssr: true });
import AuthModalProvider, { useAuthModal } from '@/components/auth/auth-modal-provider';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import { Profile } from '@/types/supabase';
import { useToast } from '@/hooks/use-toast';
import { loadStripe } from '@stripe/stripe-js';
import { trackSectionViewed, type LandingSection } from '@/lib/posthog-landing-events';
import { ROUTES } from '@/lib/constants';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const MAIN_PLAN_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MAIN || 'price_basic_monthly_placeholder';

function ProfileErrorToastHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'profile_fetch_failed') {
      toast({
        title: "Error",
        description: "Could not retrieve your user details. Please try logging in again or contact support if the issue persists.",
        variant: "destructive",
      });
      router.replace('/', { scroll: false });
    }
  }, [searchParams, router, toast]);

  return null;
}

// Component that handles URL parameters
function URLParamHandler() {
  const searchParams = useSearchParams();
  const { openAuthModal } = useAuthModal();
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setSessionUser(user);
      setIsLoadingUser(false);
    };
    fetchUser();
  }, [supabase]);

  // Handle URL parameter for "get started" flow
  useEffect(() => {
    if (isLoadingUser) {
      return; // Wait until we've checked the user's auth status
    }

    const getStarted = searchParams.get('getStarted');
    if (getStarted === 'true' && !sessionUser) {
      try {
        sessionStorage.setItem('authIntent', 'get-started');
      } catch (e) {
        console.warn('SessionStorage not available');
      }
      openAuthModal('login');
    }
  }, [searchParams, sessionUser, openAuthModal, isLoadingUser]);

  return null;
}

// Main content component that uses the auth modal context
function LandingPageContent() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const { openAuthModal } = useAuthModal();

  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [sessionUser, setSessionUser] = useState<User | null>(null);

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

  useEffect(() => {
    const fetchInitialUserAndProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setSessionUser(user);
      if (user) {
        fetchUserProfile(user.id);
      } else {
        setUserProfile(null);
      }
    };

    fetchInitialUserAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSessionUser(session?.user ?? null);
      if (event === 'SIGNED_IN' && session?.user) {
        fetchUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUserProfile(null);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, router]);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, stripe_customer_id, stripe_subscription_id, stripe_subscription_status, stripe_price_id')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      setUserProfile(data as Profile | null);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUserProfile(null);
    }
  };

  const proceedToCheckout = async (priceId: string) => {
    setIsProcessingCheckout(true);
    if (!sessionUser) {
      console.error('User not logged in for proceedToCheckout');
      toast({ title: 'Authentication Required', description: 'Please log in to proceed with checkout.', variant: 'default' });
      setIsProcessingCheckout(false);
      return;
    }

    if (!sessionUser.email || !sessionUser.id) {
      console.error('User details missing in proceedToCheckout');
      toast({ title: 'Error', description: 'User information not fully available. Please try logging in again.', variant: 'destructive' });
      setIsProcessingCheckout(false);
      return;
    }

    const customerEmail = sessionUser.email;
    const userId = sessionUser.id;

    try {
      const response = await fetch('/api/stripe/checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: priceId,
          customerEmail: customerEmail,
          userId: userId,
        }),
      });

      if (response.status === 409) {
        const errorData = await response.json();
        toast({
          title: 'Subscription Information',
          description: errorData.message || 'You are already subscribed.',
          variant: 'default',
        });
        return;
      }

      if (!response.ok) {
        let errorMessage = `HTTP error ${response.status}`;
        try {
          const errorBody = await response.json();
          errorMessage = errorBody.error || errorBody.message || JSON.stringify(errorBody);
        } catch (e) {
          try {
            const textError = await response.text();
            errorMessage = textError.substring(0, 100);
          } catch (textE) {
            errorMessage = response.statusText || `HTTP error ${response.status}`;
          }
        }
        throw new Error(`Failed to create checkout session: ${errorMessage}`);
      }

      const { url } = await response.json();

      if (url) {
        router.push(url);
      } else {
        throw new Error('URL missing from checkout session response.');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast({ title: 'Subscription Error', description: (error as Error).message || 'Could not initiate subscription.', variant: 'destructive' });
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const handleAuthFlow = async (priceId: string) => {
    if (isProcessingCheckout) return;

    if (sessionUser && userProfile) {
      const hasActiveSubscription = userProfile.stripe_subscription_status === 'active' || userProfile.stripe_subscription_status === 'trialing';
      if (hasActiveSubscription) {
        await redirectToCustomerPortal();
      } else {
        await proceedToCheckout(priceId);
      }
    } else if (sessionUser && !userProfile) {
      toast({
        title: 'Please wait',
        description: 'User details are still loading. Please try again shortly.',
        variant: 'default',
      });
    } else {
      openAuthModal('login');
    }
  };

  const redirectToCustomerPortal = async () => {
    setIsProcessingCheckout(true);
    if (!sessionUser || !sessionUser.id) {
      toast({ title: 'Error', description: 'User not found. Please log in again.', variant: 'destructive' });
      setIsProcessingCheckout(false);
      return;
    }

    try {
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: sessionUser.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create customer portal session.');
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('Customer portal URL not found in response.');
      }
    } catch (error) {
      console.error('Error redirecting to customer portal:', error);
      toast({ title: 'Error', description: (error as Error).message || 'Could not redirect to customer portal.', variant: 'destructive' });
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const handleGetStarted = async () => {
    if (sessionUser) {
      router.push(ROUTES.HOME);
    } else {
      // Store intent to redirect to dashboard after login
      try {
        sessionStorage.setItem('authIntent', 'get-started');
      } catch (e) {
        // In browsers without sessionStorage, the redirect intent will be lost
        console.warn('SessionStorage not available. The "get-started" redirect flow will not work as intended.');
      }
      // Redirect to register page as per user request
      router.push('/auth/register');
    }
  };

  const handleSelectPlan = async (priceId: string) => {
    if (sessionUser) {
      await handleAuthFlow(priceId);
    } else {
      router.push('/auth/register');
    }
  };


  return (
    <>
      <Suspense fallback={null}>
        <ProfileErrorToastHandler />
      </Suspense>
      <Suspense fallback={null}>
        <URLParamHandler />
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
            secondaryButtonText="Demo anfordern"
          />
        </div>
      </div>
    </>
  );
}

// Main export component that provides the auth modal context
export default function LandingPage() {
  return (
    <AuthModalProvider>
      <LandingPageContent />
    </AuthModalProvider>
  );
}
