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
import { createClient } from '@/utils/supabase/client';
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

  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  const proceedToCheckout = async (priceId: string) => {
    setIsProcessingCheckout(true);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Error fetching user or user not logged in:', userError);
      toast({ title: 'Authentication Required', description: 'Please log in to proceed with checkout.', variant: 'default' });
      setIsProcessingCheckout(false);
      return;
    }

    if (!user.email || !user.id) {
      console.error('User details missing in proceedToCheckout');
      toast({ title: 'Error', description: 'User information not fully available. Please try logging in again.', variant: 'destructive' });
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
          variant: 'default',
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
    setSelectedPriceId(priceId); // Keep track of selected plan

    if (isProcessingCheckout) return; // Prevent multiple submissions

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await proceedToCheckout(priceId);
    } else {
      toast({
        title: 'Login Required',
        description: 'Please log in via the navigation bar to select a plan.',
        variant: 'default',
      });
    }
  };
  
  const handleGetStarted = async () => {
    if (isProcessingCheckout) return;
    setSelectedPriceId(MAIN_PLAN_PRICE_ID); // Set the main plan

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await proceedToCheckout(MAIN_PLAN_PRICE_ID);
    } else {
      toast({
        title: 'Login Required',
        description: 'Please log in via the navigation bar to get started.',
        variant: 'default',
      });
    }
  };

  const handleSelectPlan = async (priceId: string) => {
    // This is called from the Pricing component when a user clicks "Select Plan"
    await handleAuthFlow(priceId); // This will set selectedPriceId and then check auth
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
    </>
  );
}
