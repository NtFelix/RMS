// app/(dashboard)/subscription/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { loadStripe } from '@stripe/stripe-js';
import type { Profile as SupabaseProfile } from '@/types/supabase'; // Renamed to avoid conflict
import Pricing from '@/app/modern/components/pricing'; // Import Pricing component as default

// Define the richer profile type
interface UserSubscriptionProfile extends SupabaseProfile {
  email: string;
  hasActiveSubscription: boolean;
  activePlan?: { // Renamed from 'plan' to 'activePlan' to match API response
    priceId: string; // priceId from Stripe Price object
    name: string;
    price: number; // unit_amount from Stripe Price object
    currency: string;
    features: string[]; // Changed from string to string[]
    limitWohnungen?: number | null | undefined; // Changed type
  };
  // stripe_current_period_end is already in SupabaseProfile
  // stripe_subscription_status is already in SupabaseProfile
}

// Make sure to call `loadStripe` outside of a component’s render to avoid
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export default function SubscriptionPage() {
  const [profile, setProfile] = useState<UserSubscriptionProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false); // For checkout redirection
  const [isFetchingStatus, setIsFetchingStatus] = useState(true); // For initial profile load
  const { toast } = useToast();

  useEffect(() => {
    const getProfile = async () => {
      setIsFetchingStatus(true);
      try {
        // This fetchUserProfile is a server-side function.
        // We need an API route to call it from the client.
        const response = await fetch('/api/user/profile'); // This API route needs to be created
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Failed to fetch profile:", response.status, errorText);
          throw new Error(`Failed to fetch profile: ${response.status} ${errorText}`);
        }
        const userProfile: UserSubscriptionProfile = await response.json();
        if (!userProfile) {
            throw new Error('User profile not found or is empty.');
        }
        // The 'features' field is now expected to be a string[] directly from the API response.
        // The UserSubscriptionProfile interface defines activePlan.features as string[].
        // The parsing from string to string[] is handled by lib/stripe-server.ts.
        setProfile(userProfile);
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        toast({ title: 'Error', description: `Could not load your subscription details. ${(error as Error).message}`, variant: 'destructive' });
        // Set a minimal profile for error display, ensuring email is not lost if previously available
        // This part might need adjustment based on how you want to handle partial errors
        setProfile(prevProfile => ({
          ...(prevProfile || {}), // Keep existing profile info if any
          id: prevProfile?.id || '', // Ensure id is always a string
          email: prevProfile?.email || '', // Ensure email is always a string
          hasActiveSubscription: false,
          stripe_subscription_status: 'error',
        } as UserSubscriptionProfile));
      } finally {
        setIsFetchingStatus(false);
      }
    };
    getProfile();
  }, [toast]);

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
          priceId: priceId, // Use the function argument here
          customerEmail: profile.email, // Use fetched profile email
          userId: profile.id, // Use fetched profile ID
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

  const currentPeriodEnd = profile?.stripe_current_period_end
    ? new Date(profile.stripe_current_period_end).toLocaleDateString()
    : null;

  if (isFetchingStatus) {
    return (
      <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Subscription Management</h1>
        <p className="mb-4">Loading your subscription details...</p>
        {/* You could add a spinner here */}
      </div>
    );
  }

  if (profile?.stripe_subscription_status === 'error' || !profile?.id) {
    return (
      <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Subscription Management</h1>
        <p className="mb-4 text-red-500">Could not load your subscription details. Please refresh the page or try again later.</p>
      </div>
    );
  }

  // User has an active subscription
  if (profile.hasActiveSubscription && profile.activePlan) {
    const { activePlan } = profile;
    // activePlan.features is now guaranteed to be a string[] by the API and type definition.
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
            <p className="mb-2">Status: <span className={`font-semibold ${profile.stripe_subscription_status === 'active' ? 'text-green-600' : 'text-orange-500'}`}>{profile.stripe_subscription_status}</span></p>
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
        {/* <Button disabled>Manage Subscription (Coming Soon)</Button> */}
      </div>
    );
  }

  // User does not have an active subscription or it's in a state where they can choose a new one
  // (e.g., 'canceled', 'incomplete', 'past_due', 'unpaid', 'incomplete_expired')
  const showPricing = !profile.hasActiveSubscription ||
                      ['canceled', 'incomplete', 'past_due', 'unpaid', 'incomplete_expired', null, undefined].includes(profile.stripe_subscription_status);

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

  // Fallback for any other states, though ideally covered above
  return (
    <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Subscription Management</h1>
        <p>Your subscription status: <strong>{profile.stripe_subscription_status || 'Unknown'}</strong>.</p>
        <p>If you believe this is an error, please contact support.</p>
    </div>
  );
}
