'use client';

import { useState, useEffect, Suspense } from 'react'; // Added Suspense
import { useRouter, useSearchParams } from 'next/navigation'; // useSearchParams will be used by the new component
import Hero from '../modern/components/hero';
import Features from '../modern/components/features';
import Services from '../modern/components/services';
import Testimonials from '../modern/components/testimonials';
import CTA from '../modern/components/cta';
import Footer from '../modern/components/footer';
import Navigation from '../modern/components/navigation';
import Pricing from '../modern/components/pricing';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js'; // Import User type
import { Profile } from '@/types/supabase';
import { useToast } from '@/hooks/use-toast';
import { loadStripe } from '@stripe/stripe-js';

// Stripe Promise for client-side redirection
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

// Use the new environment variable for the main available plan, with a fallback.
const MAIN_PLAN_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MAIN || 'price_basic_monthly_placeholder';

// Internal Client Component for Handling Profile Fetch Error Toast
function ProfileErrorToastHandler() {
  // Hooks specific to this error handling logic
  const searchParams = useSearchParams();
  const router = useRouter(); // Gets its own instance of router
  const { toast } = useToast(); // Gets its own instance of toast

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'profile_fetch_failed') {
      toast({
        title: "Error",
        description: "Could not retrieve your user details. Please try logging in again or contact support if the issue persists.",
        variant: "destructive",
      });
      // Remove the error query parameter from the URL without adding to history
      router.replace('/landing', { scroll: false });
    }
  }, [searchParams, router, toast]);

  return null; // This component does not render anything visible
}

export default function LandingPage() {
  // router and toast are still needed here for other functionalities
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient(); // Rely on type inference for supabase client

  // Define UserProfile interface based on expected fields
  

  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [sessionUser, setSessionUser] = useState<User | null>(null); // To store the auth user object

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
        .select('id, trial_starts_at, trial_ends_at, stripe_customer_id, stripe_subscription_id, stripe_subscription_status, stripe_price_id')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no row found, which is fine (profile might not exist)
        throw error;
      }
      setUserProfile(data as Profile | null);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Optionally show a toast error, but avoid if it's just profile not found for a new user
      // toast({ title: 'Error', description: 'Could not fetch your profile details.', variant: 'destructive' });
      setUserProfile(null); // Ensure profile is null on error
    }
  };

  const proceedToCheckout = async (priceId: string) => {
    setIsProcessingCheckout(true);
    // sessionUser is now derived from onAuthStateChange and initial load
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

    // User is available from sessionUser state
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
    setSelectedPriceId(priceId); // Keep track of which plan button was clicked, though not strictly needed for manage flow

    if (isProcessingCheckout) return;

    // sessionUser is already available in the component's state
    // const { data: { user } } = await supabase.auth.getUser(); // Not needed, use sessionUser

    if (sessionUser && userProfile) { // Check both sessionUser and that userProfile is loaded
      const hasActiveSubscription = userProfile.stripe_subscription_status === 'active' || userProfile.stripe_subscription_status === 'trialing';
      if (hasActiveSubscription) {
        await redirectToCustomerPortal();
      } else {
        await proceedToCheckout(priceId);
      }
    } else if (sessionUser && !userProfile) {
      // Profile is still loading or failed to load, user is logged in.
      // Potentially show a loading state or a message if profile fetch failed earlier.
      // For now, let's assume profile will eventually load or an error toast is shown by fetchUserProfile/ProfileErrorToastHandler
      toast({
        title: 'Please wait',
        description: 'User details are still loading. Please try again shortly.',
        variant: 'default',
      });
    }
     else { // No sessionUser (user not logged in)
      toast({
        title: 'Login Required',
        description: 'Please log in via the navigation bar to select a plan.',
        variant: 'default',
      });
    }
  };

  const redirectToCustomerPortal = async () => {
    setIsProcessingCheckout(true); // Use the same loading state
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
          // customerEmail: sessionUser.email // Email might not be needed if backend uses userId to get stripe_customer_id
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
  
  // useEffect for profile_fetch_failed has been moved to ProfileErrorToastHandler

  const handleGetStarted = async () => {
    router.push('/home');
  };

  const handleSelectPlan = async (priceId: string) => {
    await handleAuthFlow(priceId);
  };

  return (
    <>
      <Suspense fallback={null}>
        <ProfileErrorToastHandler />
      </Suspense>
      <Navigation />
      <main className="min-h-screen overflow-x-hidden">
        <div id="hero">
          <Hero onGetStarted={handleGetStarted} />
        </div>
        <div id="features">
          <Features />
        </div>
        <div id="services">
          <Services />
        </div>
        <div id="pricing">
          <Pricing
            onSelectPlan={handleSelectPlan}
            userProfile={userProfile}
            isLoading={isProcessingCheckout}
            // currentPlanId is implicitly handled by userProfile.stripe_price_id if needed by Pricing
            // For button state like "Current Plan", Pricing will use userProfile.stripe_price_id
          />
        </div>
        <div id="testimonials">
          <Testimonials />
        </div>
        <div id="cta">
          <CTA onGetStarted={handleGetStarted} />
        </div>
        <Footer />
      </main>
    </>
  );
}
