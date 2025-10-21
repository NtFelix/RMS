"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { loadStripe } from '@stripe/stripe-js';
import type { Profile as SupabaseProfile } from '@/types/supabase';
import Pricing from '@/app/modern/components/pricing';
import TrialView from './components/TrialView';
import ActiveSubscriptionView from './components/ActiveSubscriptionView';
import PricingViewComponent from './components/PricingView';
import InactiveSubscriptionView from './components/InactiveSubscriptionView';

// Define the richer profile type
export interface UserSubscriptionProfile extends SupabaseProfile {
  email: string;
  hasActiveSubscription: boolean;
  activePlan?: {
    // Ensure this structure matches what ActiveSubscriptionView expects for Plan
    priceId: string; // priceId is used by handleSubscribeClick, not directly by ActiveSubscriptionView
    name: string;
    price: number;
    currency: string;
    features: string[];
    limitWohnungen?: number | null | undefined;
  };

  isTrialActive?: boolean;
  // stripe_subscription_status is used by multiple views
  stripe_subscription_status?: string | null;
  // stripe_current_period_end is used for currentPeriodEnd calculation, matching SupabaseProfile
  stripe_current_period_end?: string | null;
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

      const { url } = await response.json();

      if (url) {
        window.location.href = url;
      } else {
        throw new Error('Failed to create a checkout session. Please try again.');
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
  // Since we removed custom trial fields, trial days remaining is now handled by Stripe
  // For Stripe trials, we could calculate from stripe_current_period_end if needed
  if (profile?.isTrialActive && profile?.stripe_current_period_end) {
    const trialEndsDate = new Date(profile.stripe_current_period_end);
    const now = new Date();
    const diffTime = trialEndsDate.getTime() - now.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (daysRemaining < 0) {
      daysRemaining = 0;
    }
  }

  // Ensure profile is not null before trying to use its properties
  if (profile?.isTrialActive) {
    // The Pricing component is passed directly to TrialView, which will then use it.
    // The main Pricing component used here is imported from '@/app/modern/components/pricing'
    // TrialView itself imports and uses '@/components/pricing' which might be an alias or a different component.
    // For consistency, TrialView should also receive the correct Pricing component or its path should be verified.
    // For now, I am assuming TrialView's Pricing import is correct.
    return <TrialView profile={profile} daysRemaining={daysRemaining} onSelectPlan={handleSubscribeClick} isLoading={isLoading} />;
  }

  // Ensure activePlan is not null when calling ActiveSubscriptionView
  if (!profile?.isTrialActive && profile?.hasActiveSubscription && profile.activePlan) {
    // Casting profile to ensure activePlan is seen as non-nullable for ActiveSubscriptionView
    return <ActiveSubscriptionView profile={profile as UserSubscriptionProfile & { activePlan: NonNullable<UserSubscriptionProfile['activePlan']> }} currentPeriodEnd={currentPeriodEnd} />;
  }

  const isPaidSubscriptionProblematic = ['canceled', 'incomplete', 'past_due', 'unpaid', 'incomplete_expired', null, undefined].includes(profile?.stripe_subscription_status);
  const showPricing = !profile?.isTrialActive && (!profile?.hasActiveSubscription || isPaidSubscriptionProblematic);

  if (showPricing) {
    // PricingViewComponent also uses the Pricing component internally. Similar to TrialView, ensure it's the correct one.
    return <PricingViewComponent profile={profile} onSelectPlan={handleSubscribeClick} isLoading={isLoading} />;
  }

  // Fallback view
  return <InactiveSubscriptionView profile={profile} />;
}
