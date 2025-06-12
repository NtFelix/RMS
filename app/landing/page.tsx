'use client';

import { useState, useEffect } from 'react';
import Hero from '../modern/components/hero';
import Features from '../modern/components/features';
import Services from '../modern/components/services';
import Testimonials from '../modern/components/testimonials';
import CTA from '../modern/components/cta';
import Footer from '../modern/components/footer';
import Navigation from '../modern/components/navigation';
import Pricing from '../modern/components/pricing';
import AuthModal from '@/components/auth-modal';
import { createClient } from '@/utils/supabase/client';
import type { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { loadStripe } from '@stripe/stripe-js';

// Stripe Promise for client-side redirection
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

// Use the new environment variable for the main available plan, with a fallback.
const MAIN_PLAN_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MAIN || 'price_basic_monthly_placeholder';

export default function LandingPage() {
  // Removed useRouter as Stripe will handle redirection
  const { toast } = useToast();
  const supabase = createClient();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialTab, setAuthModalInitialTab] = useState<'login' | 'register'>('login');
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  useEffect(() => {
    const getUser = async () => {
      setIsLoadingAuth(true);
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      setIsLoadingAuth(false);
    };
    getUser();
  }, [supabase.auth]);

  const proceedToCheckout = async (priceId: string, user: User | null) => {
    if (!user || !user.email || !user.id) {
      console.error('User object or user details missing in proceedToCheckout');
      toast({ title: 'Error', description: 'User information not available. Please try logging in again.', variant: 'destructive' });
      // setIsAuthModalOpen(true); // Optionally re-open auth modal or guide user
      setIsProcessingCheckout(false);
      return;
    }
    setIsProcessingCheckout(true);
    const customerEmail = user.email;
    const userId = user.id;

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
          variant: 'info', // Or 'default'
        });
        // setIsProcessingCheckout(false) is handled by the finally block
        return;
      }

      if (!response.ok) {
        let errorMessage = `HTTP error ${response.status}`;
        try {
          // Try to parse the response body as JSON for a more specific error
          const errorBody = await response.json();
          errorMessage = errorBody.error || errorBody.message || JSON.stringify(errorBody);
        } catch (e) {
          // If response is not JSON or parsing fails, try to get text
          // Note: response.text() can only be consumed once. If .json() failed, .text() might also have issues
          // or might return an empty string if the body was already read by .json().
          // A more robust way might involve cloning the response if you need to try multiple parsing methods,
          // but for this case, we assume .json() failing means we try .text() on the original response (if available).
          // For simplicity, we'll assume if .json() fails, we might not get a useful .text() either,
          // so we rely on the initial errorMessage or what .json() might have partially provided if it threw an error mid-parse.
          // A safer approach if .text() is needed after a failed .json() is to read it first or clone.
          // However, usually if it's an error, it's either JSON or plain text.
          // Let's try to get text if json parsing failed.
          try {
            const textError = await response.text(); // This might fail if body already read by response.json()
            errorMessage = textError.substring(0, 100); // Limit length
          } catch (textE) {
            // Fallback to statusText if text() also fails
            errorMessage = response.statusText || `HTTP error ${response.status}`;
          }
        }
        throw new Error(`Failed to create checkout session: ${errorMessage}`);
      }

      const { sessionId, url } = await response.json();

      if (url) { // Preferred: Redirect handled by Stripe if URL is provided (e.g. for payment method collection)
        window.location.href = url;
      } else if (sessionId) { // Fallback: Client-side redirect using Stripe.js
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
    setSelectedPriceId(priceId);
    if (isLoadingAuth) return; // Do nothing if auth state is still loading

    if (currentUser) {
      await proceedToCheckout(priceId, currentUser); // Pass current user from state
    } else {
      setAuthModalInitialTab('login'); // Default to login, can be changed by specific triggers
      setIsAuthModalOpen(true);
    }
  };
  
  const handleGetStarted = async () => {
    // When "Get Started" is clicked (e.g. from Hero or CTA)
    // Default to selecting the main available plan and opening the auth modal if not logged in.
    // If logged in, it will proceed to checkout for the main plan.
    setSelectedPriceId(MAIN_PLAN_PRICE_ID); // Set the main plan
    if (currentUser) {
      await proceedToCheckout(MAIN_PLAN_PRICE_ID, currentUser); // Pass current user
    } else {
      setAuthModalInitialTab('register'); // Suggest registration for new users from CTA
      setIsAuthModalOpen(true);
    }
  };

  const handleSelectPlan = async (priceId: string) => {
    // This is called from the Pricing component when a user clicks "Select Plan"
    // Needs to be async if handleAuthFlow is async
    await handleAuthFlow(priceId);
  };

  const handleAuthenticated = async () => {
    setIsAuthModalOpen(false);
    const { data: { user: freshlyFetchedUser } } = await supabase.auth.getUser();
    setCurrentUser(freshlyFetchedUser); // Update state as well

    if (selectedPriceId && freshlyFetchedUser) {
      await proceedToCheckout(selectedPriceId, freshlyFetchedUser); // Pass the freshly fetched user
    } else if (!freshlyFetchedUser) {
        toast({ title: 'Authentication Error', description: 'Could not retrieve user details after authentication.', variant: 'destructive'});
    }
    // selectedPriceId remains set, so if proceedToCheckout wasn't called, it will be tried on next interaction or page load if user is fetched
  };

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">
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
          <Pricing onSelectPlan={handleSelectPlan} />
        </div>
        <div id="testimonials">
          <Testimonials />
        </div>
        <div id="cta">
          <CTA onGetStarted={handleGetStarted} />
        </div>
        <Footer />
      </main>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setSelectedPriceId(null); // Clear selected price ID when modal is closed manually
        }}
        onAuthenticated={handleAuthenticated}
        initialTab={authModalInitialTab}
      />
    </>
  );
}
