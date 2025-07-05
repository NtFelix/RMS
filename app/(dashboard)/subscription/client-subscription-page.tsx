"use client";

import { useState, useEffect } from 'react';
// Button removed as it's not directly used here, Pricing component handles its own button.
// If other buttons are needed, Button can be re-imported.
import { useToast } from '@/hooks/use-toast'; // Assuming useToast is compatible or updated for server components context if needed
import { loadStripe } from '@stripe/stripe-js';
import type { Profile as SupabaseProfile } from '@/types/supabase';
import Pricing from '@/app/modern/components/pricing';

// This is the type definition for the data coming from the server action
// It should match UserSubscriptionData from subscription-actions.ts
interface UserSubscriptionData extends SupabaseProfile {
  email: string;
  hasActiveSubscription: boolean;
  activePlan?: {
    priceId: string;
    name: string;
    price: number | null;
    currency: string;
    features: string[];
    limitWohnungen?: number | null;
  } | null;
  trial_starts_at?: string | null;
  trial_ends_at?: string | null;
  isTrialActive?: boolean;
  // Add other fields from SupabaseProfile that are used
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_subscription_status?: string | null;
  stripe_price_id?: string | null;
  stripe_current_period_end?: string | null;
}

interface ClientSubscriptionPageProps {
  initialProfile: UserSubscriptionData;
}

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export default function ClientSubscriptionPage({ initialProfile }: ClientSubscriptionPageProps) {
  // Initialize profile state with server-fetched data
  // No need for a separate isFetchingStatus for initial load, as data is pre-fetched.
  const [profile, setProfile] = useState<UserSubscriptionData | null>(initialProfile);
  const [isLoading, setIsLoading] = useState(false); // For checkout redirection loading state
  const { toast } = useToast();

  // If initialProfile indicates an error or is null (though error is handled in parent server component)
  // This useEffect is to handle updates or re-sync if needed, but initial load is covered.
  // For this refactor, we primarily rely on initialProfile.
  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile);
    }
    // If initialProfile had an error status (e.g. profile.stripe_subscription_status === 'error')
    // it would be passed directly. The parent server component already handles the main error display.
    // This component assumes initialProfile is valid data or a specific error structure it can handle.
  }, [initialProfile]);


  const handleSubscribeClick = async (priceId: string) => {
    setIsLoading(true);
    try {
      if (!profile || !profile.email || !profile.id) {
        toast({ title: 'Error', description: 'User information not available. Cannot proceed with subscription.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/stripe/checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: priceId,
          customerEmail: profile.email,
          userId: profile.id,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to create checkout session: ${errorBody}`);
      }

      const { sessionId, url } = await response.json();

      if (url) {
        window.location.href = url; // Redirect to Stripe-hosted checkout page
      } else { // Fallback to client-side Stripe.js redirect if URL not provided (less common)
        const stripe = await stripePromise;
        if (stripe && sessionId) {
          const { error } = await stripe.redirectToCheckout({ sessionId });
          if (error) {
            console.error('Stripe redirectToCheckout error:', error);
            toast({ title: 'Error', description: error.message || 'Failed to redirect to Stripe.', variant: 'destructive' });
          }
        } else {
          throw new Error('Stripe.js not loaded or session ID missing.');
        }
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast({ title: 'Subscription Error', description: (error as Error).message || 'Could not initiate subscription.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Initial loading state is handled by the parent Server Component (Suspense if needed)
  // This component renders immediately with initialProfile.
  // If initialProfile itself represents a "loading" or "error" state passed from server, handle here.

  // Error state based on profile data (e.g. if server action returned a profile with an error status)
  if (profile?.stripe_subscription_status === 'error' || !profile?.id) {
    return (
      <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Subscription Management</h1>
        <p className="mb-4 text-red-500">Could not load your subscription details. Please refresh the page or try again later.</p>
      </div>
    );
  }

  // If profile is null after initial setup (should ideally be handled by server component, but as a fallback)
  if (!profile) {
      return (
          <div className="container mx-auto p-4 text-center">
              <h1 className="text-2xl font-bold mb-4">Subscription Management</h1>
              <p className="mb-4">Loading your subscription details...</p>
          </div>
      );
  }

  const currentPeriodEnd = profile.stripe_current_period_end
    ? new Date(profile.stripe_current_period_end).toLocaleDateString()
    : null;

  let daysRemaining = 0;
  if (profile.isTrialActive && profile.trial_ends_at) {
    const trialEndsDate = new Date(profile.trial_ends_at);
    const now = new Date();
    const diffTime = Math.abs(trialEndsDate.getTime() - now.getTime());
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  if (profile.isTrialActive) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6 text-center">Subscription Management</h1>
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3">Your Free Trial</h2>
          <p className="mb-2">
            You are currently on a free trial.
          </p>
          {profile.trial_ends_at && (
            <p className="mb-2">
              Your trial ends on: <strong>{new Date(profile.trial_ends_at).toLocaleDateString()}</strong> ({daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining).
            </p>
          )}
          {/* TODO: The limit of 5 Wohnungen seems hardcoded, consider making it dynamic if it varies by trial type */}
          <p className="mb-2">You can create up to <strong>5 Wohnungen</strong> during your trial.</p>
          <p className="mt-4">To continue using the service with more features and higher limits after your trial, please choose a subscription plan.</p>
        </div>
        <h2 className="text-xl font-bold mb-6 text-center">Choose a Plan to Activate After Trial</h2>
        <Pricing onSelectPlan={handleSubscribeClick} isLoading={isLoading} />
      </div>
    );
  }

  if (!profile.isTrialActive && profile.hasActiveSubscription && profile.activePlan) {
    const { activePlan } = profile;
    const featuresList = activePlan.features || [];

    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6 text-center">Subscription Management</h1>
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3">Your Current Plan</h2>
          <p className="mb-2">
            You are currently subscribed to the <strong>{activePlan.name}</strong> plan.
          </p>
          {activePlan.price && activePlan.currency && (
             <p className="mb-2">Price: <strong>{(activePlan.price / 100).toFixed(2)} {activePlan.currency.toUpperCase()}</strong> / month</p>
          )}
          {currentPeriodEnd && (
            <p className="mb-2">
              Your subscription is active until: <strong>{currentPeriodEnd}</strong>
            </p>
          )}
           {profile.stripe_subscription_status && (
            <p className="mb-2">Status: <span className={`font-semibold ${profile.stripe_subscription_status === 'active' || profile.stripe_subscription_status === 'trialing' ? 'text-green-600' : 'text-orange-500'}`}>{profile.stripe_subscription_status}</span></p>
          )}
          {featuresList.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold">Plan Features:</h3>
              <ul className="list-disc list-inside pl-4">
                {featuresList.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>
          )}
          {activePlan.limitWohnungen && ( // Check if limitWohnungen exists and is not null/undefined
            <p className="mt-2">
              Wohnungen Limit: <strong>{activePlan.limitWohnungen}</strong>
            </p>
          )}
        </div>
        {/* TODO: Add button to manage subscription (portal) - This should ideally be part of settings or a dedicated button */}
      </div>
    );
  }

  const isPaidSubscriptionProblematic = ['canceled', 'incomplete', 'past_due', 'unpaid', 'incomplete_expired', null, undefined].includes(profile.stripe_subscription_status);
  const showPricing = !profile.isTrialActive && (!profile.hasActiveSubscription || isPaidSubscriptionProblematic);

  if (showPricing) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6 text-center">Choose Your Plan</h1>
        {profile.stripe_subscription_status && profile.stripe_subscription_status !== 'canceled' && (
            <p className="mb-4 text-center text-orange-500">
                Your current subscription status is: <strong>{profile.stripe_subscription_status}</strong>. You can choose a new plan below.
            </p>
        )}
        {profile.stripe_subscription_status === 'canceled' && (
             <p className="mb-4 text-center">Your previous subscription was canceled. You can subscribe to a new plan below.</p>
        )}
        {!profile.stripe_subscription_status && ( // User has no stripe subscription status at all
            <p className="mb-4 text-center">You are not currently subscribed. Choose a plan to get started!</p>
        )}
        <Pricing onSelectPlan={handleSubscribeClick} isLoading={isLoading} />
      </div>
    );
  }

  // Fallback for any other states
  return (
    <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Subscription Management</h1>
        <p>Your subscription status: <strong>{profile.stripe_subscription_status || 'Unknown'}</strong>.</p>
        <p>If you believe this is an error, please contact support.</p>
    </div>
  );
}
