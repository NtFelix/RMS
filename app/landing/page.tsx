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
import PricingSection from '../modern/components/pricing'; // Renamed import
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { loadStripe } from '@stripe/stripe-js';

// Stripe Promise for client-side redirection
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

// Use the new environment variable for the main available plan, with a fallback.
const MAIN_PLAN_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MAIN || 'price_basic_monthly_placeholder';

import { PlanData } from '../modern/components/pricing'; // Import the PlanData interface

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
  const supabase = createClient();
  // searchParams and the useEffect for profile_fetch_failed are moved to ProfileErrorToastHandler

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
    setSelectedPriceId(priceId);

    if (isProcessingCheckout) return;

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
  
  // useEffect for profile_fetch_failed has been moved to ProfileErrorToastHandler

  const handleGetStarted = async () => {
    router.push('/home');
  };

  const handleSelectPlan = async (priceId: string) => {
    await handleAuthFlow(priceId);
  };

  // Define the plans data that will be passed to PricingSection
  // User will need to replace placeholder price IDs
  const plansData: PlanData[] = [
    {
      name: "Starter",
      monthlyPrice: 9,
      yearlyPrice: 9 * 10,
      monthlyPriceId: "price_starter_monthly_placeholder", // Placeholder
      yearlyPriceId: "price_starter_yearly_placeholder",   // Placeholder
      description: "Perfect for individuals getting started",
      features: ["Up to 5 projects", "10GB storage", "Basic support", "Standard templates", "Mobile app access"],
      popular: false,
    },
    {
      name: "Professional",
      monthlyPrice: 29,
      yearlyPrice: 29 * 10,
      monthlyPriceId: "price_professional_monthly_placeholder", // Placeholder
      yearlyPriceId: "price_professional_yearly_placeholder",   // Placeholder
      description: "Best for growing teams and businesses",
      features: [
        "Unlimited projects",
        "100GB storage",
        "Priority support",
        "Premium templates",
        "Advanced analytics",
        "Team collaboration",
        "Custom integrations",
      ],
      popular: true,
    },
    {
      name: "Enterprise",
      monthlyPrice: 99,
      yearlyPrice: 99 * 10,
      monthlyPriceId: "price_enterprise_monthly_placeholder", // Placeholder
      yearlyPriceId: "price_enterprise_yearly_placeholder",   // Placeholder
      description: "For large organizations with advanced needs",
      features: [
        "Everything in Professional",
        "Unlimited storage",
        "24/7 dedicated support",
        "Custom development",
        "Advanced security",
        "SSO integration",
        "API access",
        "White-label options",
      ],
      popular: false,
    },
  ];

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
          <PricingSection plans={plansData} onSelectPlan={handleSelectPlan} />
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
