// app/(dashboard)/subscription/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { loadStripe } from '@stripe/stripe-js';
import type { Profile } from '@/types/supabase'; // Import the Profile type

// Make sure to call `loadStripe` outside of a component’s render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export default function SubscriptionPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingStatus, setIsFetchingStatus] = useState(true);
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
        const userProfile = await response.json();
        if (!userProfile) { // Handle case where API returns empty but OK
            throw new Error('User profile not found.');
        }
        setProfile(userProfile);
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        toast({ title: 'Error', description: `Could not load your subscription details. ${(error as Error).message}`, variant: 'destructive' });
        setProfile({ id: '', email: '', stripe_subscription_status: 'error' } as Profile); // Default error state
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

  const subscriptionStatus = profile?.stripe_subscription_status;
  const currentPeriodEnd = profile?.stripe_current_period_end
    ? new Date(profile.stripe_current_period_end).toLocaleDateString()
    : null;

  if (isFetchingStatus) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Subscription Management</h1>
        <p className="mb-4">Loading subscription status...</p>
      </div>
    );
  }

  if (subscriptionStatus === 'error' || !profile) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Subscription Management</h1>
        <p className="mb-4 text-red-500">Could not load your subscription details. Please ensure you are logged in and try again.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Subscription Management</h1>
      <p className="mb-2">Your current subscription status: <strong>{subscriptionStatus || 'Not subscribed'}</strong></p>
      {subscriptionStatus === 'active' && currentPeriodEnd && (
        <p className="mb-4">Your subscription is active until: <strong>{currentPeriodEnd}</strong></p>
      )}
      {subscriptionStatus === 'past_due' && (
        <p className="mb-4 text-orange-500">Your subscription is past due. Please update your payment method.</p>
      )}
      {subscriptionStatus === 'canceled' && (
        <p className="mb-4">Your subscription has been canceled.</p>
      )}

      {(!subscriptionStatus || subscriptionStatus === 'inactive' || subscriptionStatus === 'canceled') && (
        <Button onClick={() => handleSubscribeClick('price_basic_monthly_placeholder')} disabled={isLoading || !profile?.id}>
          {isLoading ? 'Processing...' : 'Subscribe Now (Basic Plan)'}
        </Button>
      )}

      {subscriptionStatus === 'active' && (
        <div>
          <p className="text-green-600 mb-4">You are currently subscribed. Thank you!</p>
          {/* TODO: Add button to manage subscription (portal) */}
          {/* <Button>Manage Subscription</Button> */}
        </div>
      )}
    </div>
  );
}
