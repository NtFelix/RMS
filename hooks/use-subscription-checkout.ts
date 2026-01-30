import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { Profile } from '@/types/supabase';

export function useSubscriptionCheckout() {
    const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    const proceedToCheckout = async (user: User, priceId: string) => {
        setIsProcessingCheckout(true);
        if (!user) {
            console.error('User not logged in for proceedToCheckout');
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
                    // ignore
                }
                throw new Error(`Failed to create checkout session: ${errorMessage}`);
            }

            const { url } = await response.json();

            if (url) {
                router.push(url);
            } else {
                throw new Error('URL missing from checkout session response.');
            }
        } catch (error) {
            console.error('Subscription error:', error);
            toast({ title: 'Subscription Error', description: (error as Error).message || 'Could not initiate subscription.', variant: 'destructive' });
        } finally {
            setIsProcessingCheckout(false);
        }
    };

    const redirectToCustomerPortal = async (user: User, returnUrl?: string) => {
        setIsProcessingCheckout(true);
        if (!user || !user.id) {
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
                    userId: user.id,
                    return_url: returnUrl,
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

    const handleAuthFlow = async (
        user: User | null,
        profile: Profile | null,
        priceId: string,
        currentPath: string,
        returnUrlForPortal?: string
    ) => {
        if (isProcessingCheckout) return;

        if (user && profile) {
            const hasActiveSubscription =
                profile.stripe_subscription_status === 'active' ||
                profile.stripe_subscription_status === 'trialing';
            if (hasActiveSubscription) {
                await redirectToCustomerPortal(user, returnUrlForPortal);
            } else {
                await proceedToCheckout(user, priceId);
            }
        } else if (user && !profile) {
            toast({
                title: 'Please wait',
                description:
                    'User details are still loading. Please try again shortly.',
                variant: 'default',
            });
        } else {
            // Preserve plan selection for unauthenticated users by redirecting with context.
            const redirectPath = `${currentPath}?priceId=${priceId}`;
            router.push(`/auth/login?redirect=${encodeURIComponent(redirectPath)}`);
        }
    };

    return { isProcessingCheckout, handleAuthFlow, proceedToCheckout, redirectToCustomerPortal };
}
