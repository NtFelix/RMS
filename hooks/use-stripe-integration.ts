import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';
import { Profile } from '@/types/supabase';
import { useToast } from '@/hooks/use-toast';

export function useStripeIntegration() {
    const router = useRouter();
    const { toast } = useToast();
    const supabase = createClient();

    const [userProfile, setUserProfile] = useState<Profile | null>(null);
    const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
    const [sessionUser, setSessionUser] = useState<User | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);

    const fetchUserProfile = useCallback(async (userId: string) => {
        setIsLoadingProfile(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, stripe_customer_id, stripe_subscription_id, stripe_subscription_status, stripe_price_id')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }
            setUserProfile(data as Profile | null);
        } catch (error) {
            console.error('Error fetching user profile:', error);
            setUserProfile(null);
        } finally {
            setIsLoadingProfile(false);
        }
    }, [supabase]);

    useEffect(() => {
        const fetchInitialUserAndProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setSessionUser(user);
            if (user) {
                await fetchUserProfile(user.id);
            } else {
                setUserProfile(null);
                setIsLoadingProfile(false);
            }
        };

        fetchInitialUserAndProfile();

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            const user = session?.user ?? null;
            setSessionUser(user);
            if (event === 'SIGNED_IN' && user) {
                await fetchUserProfile(user.id);
            } else if (event === 'SIGNED_OUT') {
                setUserProfile(null);
                setIsLoadingProfile(false);
            }
        });

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, [supabase, fetchUserProfile]);

    const redirectToCustomerPortal = useCallback(async (returnPath: string = '/preise') => {
        setIsProcessingCheckout(true);
        if (!sessionUser || !sessionUser.id) {
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
                    userId: sessionUser.id,
                    return_url: `${window.location.origin}${returnPath}`,
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
    }, [sessionUser, toast]);

    const proceedToCheckout = useCallback(async (priceId: string) => {
        setIsProcessingCheckout(true);
        if (!sessionUser) {
            toast({ title: 'Authentication Required', description: 'Please log in to proceed with checkout.', variant: 'default' });
            setIsProcessingCheckout(false);
            return;
        }

        if (!sessionUser.email || !sessionUser.id) {
            toast({ title: 'Error', description: 'User information not fully available. Please try logging in again.', variant: 'destructive' });
            setIsProcessingCheckout(false);
            return;
        }

        try {
            const response = await fetch('/api/stripe/checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    priceId: priceId,
                    customerEmail: sessionUser.email,
                    userId: sessionUser.id,
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
    }, [sessionUser, router, toast]);

    const handleAuthFlow = useCallback(async (priceId: string, currentPath: string) => {
        if (isProcessingCheckout || isLoadingProfile) return;

        if (sessionUser && userProfile) {
            const hasActiveSubscription = userProfile.stripe_subscription_status === 'active' || userProfile.stripe_subscription_status === 'trialing';
            if (hasActiveSubscription) {
                await redirectToCustomerPortal(currentPath);
            } else {
                await proceedToCheckout(priceId);
            }
        } else if (sessionUser && !userProfile) {
            toast({
                title: 'Please wait',
                description: 'User details are still loading. Please try again shortly.',
                variant: 'default',
            });
        } else {
            const redirectPath = `${currentPath}?priceId=${priceId}`;
            router.push(`/auth/login?redirect=${encodeURIComponent(redirectPath)}`);
        }
    }, [isProcessingCheckout, isLoadingProfile, sessionUser, userProfile, redirectToCustomerPortal, proceedToCheckout, router, toast]);

    return {
        sessionUser,
        userProfile,
        isProcessingCheckout,
        isLoadingProfile,
        handleAuthFlow,
        redirectToCustomerPortal,
        proceedToCheckout,
        refreshProfile: () => sessionUser && fetchUserProfile(sessionUser.id)
    };
}
