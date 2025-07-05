"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { loadStripe } from '@stripe/stripe-js';
import type { Profile as SupabaseProfile } from '@/types/supabase';
import Pricing from '@/app/modern/components/pricing';

// Define the richer profile type
export interface UserSubscriptionProfile extends SupabaseProfile {
  email: string;
  hasActiveSubscription: boolean;
  activePlan?: {
    priceId: string;
    name: string;
    price: number;
    currency: string;
    features: string[];
    limitWohnungen?: number | null | undefined;
  };
  trial_starts_at?: string | null;
  trial_ends_at?: string | null;
  isTrialActive?: boolean;
}

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

interface SubscriptionClientPageProps {
  initialProfile: UserSubscriptionProfile | null;
  error?: string;
}

export default function SubscriptionClientPage({ initialProfile, error: initialError }: SubscriptionClientPageProps) {
  const [profile, setProfile] = useState<UserSubscriptionProfile | null>(initialProfile);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);
  const { toast } = useToast();

  useEffect(() => {
    if (initialError) {
      toast({ title: 'Error', description: `Could not load your subscription details. ${initialError}`, variant: 'destructive' });
    }
  }, [initialError, toast]);

  const handleSubscribeClick = async (priceId: string) => {
    setIsLoading(true);
    setError(null);
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
        window.location.href = url;
      } else {
        const stripe = await stripePromise;
        if (stripe && sessionId) {
          const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });
          if (stripeError) {
            console.error('Stripe redirectToCheckout error:', stripeError);
            toast({ title: 'Error', description: stripeError.message || 'Failed to redirect to Stripe.', variant: 'destructive' });
          }
        } else {
          throw new Error('Stripe.js not loaded or session ID missing.');
        }
      }
    } catch (err) {
      console.error('Subscription error:', err);
      const errorMessage = (err instanceof Error) ? err.message : 'Could not initiate subscription.';
      setError(errorMessage);
      toast({ title: 'Subscription Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const currentPeriodEnd = profile?.stripe_current_period_end
    ? new Date(profile.stripe_current_period_end).toLocaleDateString()
    : null;

  if (error && !profile) { // If there was an initial error and no profile data
    return (
      <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Subscription Management</h1>
        <p className="mb-4 text-red-500">Could not load your subscription details. {error}</p>
      </div>
    );
  }

  if (!profile) { // Handles cases where profile is null without a specific initial error (e.g. user not found server-side)
    return (
      <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Subscription Management</h1>
        <p className="mb-4">Loading your subscription details...</p>
        {/* Or a more specific message if applicable */}
      </div>
    );
  }


  let daysRemaining = 0;
  if (profile?.isTrialActive && profile?.trial_ends_at) {
    const trialEndsDate = new Date(profile.trial_ends_at);
    const now = new Date();
    const diffTime = Math.abs(trialEndsDate.getTime() - now.getTime());
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  if (profile?.isTrialActive) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6 text-center">Subscription Management</h1>
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3">Your Free Trial</h2>
          <p className="mb-2">
            You are currently on a free trial.
          </p>
          {profile?.trial_ends_at && (
            <p className="mb-2">
              Your trial ends on: <strong>{new Date(profile.trial_ends_at).toLocaleDateString()}</strong> ({daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining).
            </p>
          )}
          <p className="mb-2">You can create up to <strong>5 Wohnungen</strong> during your trial.</p>
          <p className="mt-4">To continue using the service with more features and higher limits after your trial, please choose a subscription plan.</p>
        </div>
        <h2 className="text-xl font-bold mb-6 text-center">Choose a Plan to Activate After Trial</h2>
        <Pricing onSelectPlan={handleSubscribeClick} isLoading={isLoading} />
      </div>
    );
  }

  if (!profile?.isTrialActive && profile?.hasActiveSubscription && profile.activePlan) {
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
          {activePlan.limitWohnungen && (
            <p className="mt-2">
              Wohnungen Limit: <strong>{activePlan.limitWohnungen}</strong>
            </p>
          )}
        </div>
        {/* TODO: Add button to manage subscription (portal) */}
      </div>
    );
  }

  const isPaidSubscriptionProblematic = ['canceled', 'incomplete', 'past_due', 'unpaid', 'incomplete_expired', null, undefined].includes(profile?.stripe_subscription_status);
  const showPricing = !profile?.isTrialActive && (!profile?.hasActiveSubscription || isPaidSubscriptionProblematic);

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
        {!profile.stripe_subscription_status && (
            <p className="mb-4 text-center">You are not currently subscribed. Choose a plan to get started!</p>
        )}
        <Pricing onSelectPlan={handleSubscribeClick} isLoading={isLoading} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Subscription Management</h1>
        <p>Your subscription status: <strong>{profile?.stripe_subscription_status || 'Unknown'}</strong>.</p>
        <p>If you believe this is an error, please contact support.</p>
    </div>
  );
}
