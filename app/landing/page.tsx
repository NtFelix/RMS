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

  const proceedToCheckout = async (priceId: string) => {
    if (!currentUser || !currentUser.email || !currentUser.id) {
      toast({ title: 'Error', description: 'User information not available. Please log in again.', variant: 'destructive' });
      setIsAuthModalOpen(true); // Re-open auth modal if user info is somehow lost
      return;
    }
    setIsProcessingCheckout(true);
    try {
      const response = await fetch('/api/stripe/checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: priceId,
          customerEmail: currentUser.email,
          userId: currentUser.id,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to create checkout session: ${errorBody}`);
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

  const handleAuthFlow = (priceId: string) => {
    setSelectedPriceId(priceId);
    if (isLoadingAuth) return; // Do nothing if auth state is still loading

    if (currentUser) {
      proceedToCheckout(priceId);
    } else {
      setAuthModalInitialTab('login'); // Default to login, can be changed by specific triggers
      setIsAuthModalOpen(true);
    }
  };
  
  const handleGetStarted = () => {
    // When "Get Started" is clicked (e.g. from Hero or CTA)
    // Default to selecting the main available plan and opening the auth modal if not logged in.
    // If logged in, it will proceed to checkout for the main plan.
    setSelectedPriceId(MAIN_PLAN_PRICE_ID); // Set the main plan
    if (currentUser) {
      proceedToCheckout(MAIN_PLAN_PRICE_ID);
    } else {
      setAuthModalInitialTab('register'); // Suggest registration for new users from CTA
      setIsAuthModalOpen(true);
    }
  };

  const handleSelectPlan = (priceId: string) => {
    // This is called from the Pricing component when a user clicks "Select Plan"
    handleAuthFlow(priceId);
  };

  const handleAuthenticated = async () => {
    setIsAuthModalOpen(false);
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
    if (user && selectedPriceId) {
      proceedToCheckout(selectedPriceId);
    } else if (!user) {
        toast({ title: 'Authentication Error', description: 'Could not verify user after authentication.', variant: 'destructive'});
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
