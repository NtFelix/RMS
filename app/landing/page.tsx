'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Hero from '../modern/components/hero';
import FeatureSections from '../modern/components/feature-sections';
import FinanceShowcase from '../modern/components/finance-showcase';
import MoreFeatures from '../modern/components/more-features';
import CTA from '../modern/components/cta';
import Footer from '../modern/components/footer';
import Navigation from '../modern/components/navigation';
import Pricing from '../modern/components/pricing';
import AuthModalProvider, { useAuthModal } from '@/components/auth-modal-provider';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import { Profile } from '@/types/supabase';
import { useToast } from '@/hooks/use-toast';
import { loadStripe } from '@stripe/stripe-js';

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
      router.replace('/landing', { scroll: false });
    }
  }, [searchParams, router, toast]);

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
  }, [supabase]);

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

      const { sessionId, url } = await response.json();

      if (url) {
        window.location.href = url;
      } else if (sessionId) {
        const stripe = await stripePromise;
        if (stripe) {
          const { error } = await stripe.redirectToCheckout({ sessionId });
          if (error) {
            console.error('Stripe redirectToCheckout error:', error);
            toast({ title: 'Error', description: error.message || 'Failed to redirect to Stripe.', variant: 'destructive' });
          }
        } else {
          throw new Error('Stripe.js not loaded.');
        }
      } else {
        throw new Error('Session ID or URL missing from checkout session response.');
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
        router.push('/home');
    } else {
        openAuthModal('login');
    }
  };

  const handleSelectPlan = async (priceId: string) => {
    if (sessionUser) {
      await handleAuthFlow(priceId);
    } else {
      openAuthModal('login');
    }
  };

  const handleAuthenticated = () => {
    // This can be used for any logic that needs to run after authentication is successful
    // For example, refetching data or redirecting.
    // The onAuthStateChange listener already handles the main logic of fetching the user profile.
    router.refresh();
  };


  return (
    <>
      <Suspense fallback={null}>
        <ProfileErrorToastHandler />
      </Suspense>
      <Navigation onLogin={() => openAuthModal('login')} />
      <main className="min-h-screen overflow-x-hidden">
        <div id="hero">
          <Hero onGetStarted={handleGetStarted} />
        </div>
        <div id="features">
          <FeatureSections />
        </div>
        <div id="more-features">
          <MoreFeatures />
        </div>
        <div id="pricing">
          <Pricing
            onSelectPlan={handleSelectPlan}
            userProfile={userProfile}
            isLoading={isProcessingCheckout}
          />
        </div>
        
        <div id="cta">
          <CTA onGetStarted={handleGetStarted} />
        </div>
        <Footer />
      </main>
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
