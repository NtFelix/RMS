'use client';

import { Suspense, useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import { Profile } from '@/types/supabase';
import Pricing from '@/app/modern/components/pricing';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import posthog from 'posthog-js';
import {
    trackOnboardingStarted,
    trackOnboardingPlanSelected,
    AuthProvider,
    PlanSelectionDetails
} from '@/lib/posthog-auth-events';

/**
 * Plan interface matching the API response from /api/stripe/plans
 */
interface StripePlan {
    id: string;
    name: string;
    price: number; // in cents
    currency: string;
    interval: string | null; // 'month' or 'year'
    priceId: string;
    position?: number;
    productName: string;
}

function SubscriptionPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const supabase = createClient();

    const [sessionUser, setSessionUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
    const [plans, setPlans] = useState<StripePlan[]>([]);

    // Create a map for quick priceId -> plan lookup
    const plansByPriceId = useMemo(() => {
        const map = new Map<string, StripePlan>();
        plans.forEach(plan => {
            map.set(plan.priceId, plan);
        });
        return map;
    }, [plans]);

    const fetchUserProfile = useCallback(async (userId: string) => {
        try {
            // Retry logic could be added here as the profile might not be created immediately after registration
            let attempts = 0;
            const maxAttempts = 5;

            while (attempts < maxAttempts) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, stripe_customer_id, stripe_subscription_id, stripe_subscription_status, stripe_price_id')
                    .eq('id', userId)
                    .single();

                if (data) {
                    setUserProfile(data as Profile);
                    return;
                }

                if (error && error.code !== 'PGRST116') {
                    console.error('Error fetching profile:', error);
                    break;
                }

                // Wait before retrying (backoff)
                await new Promise(r => setTimeout(r, 1000));
                attempts++;
            }

            console.warn('Profile not found after retries');
        } catch (error) {
            console.error('Error in fetchUserProfile:', error);
        }
    }, [supabase]);

    // Fetch Stripe plans for accurate tracking
    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const response = await fetch('/api/stripe/plans');
                if (response.ok) {
                    const data: StripePlan[] = await response.json();
                    setPlans(data);
                }
            } catch (error) {
                console.error('Error fetching plans:', error);
                // Non-critical - tracking will fallback to basic info
            }
        };
        fetchPlans();
    }, []);

    useEffect(() => {
        const initUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.replace('/auth/login');
                    return;
                }
                setSessionUser(user);
                await fetchUserProfile(user.id);

                // Check URL params for OAuth success tracking
                const loginSuccess = searchParams.get('login_success');
                const provider = searchParams.get('provider') as AuthProvider | null;
                const isNewUser = searchParams.get('is_new_user') === 'true';

                // If coming from OAuth callback, identify user (auth success is tracked server-side)
                if (loginSuccess === 'true' && provider) {
                    // GDPR: Only identify if user has consented
                    if (posthog.has_opted_in_capturing?.()) {
                        posthog.identify(user.id, {
                            email: user.email,
                            name: user.user_metadata?.name || user.user_metadata?.full_name || '',
                            last_sign_in: user.last_sign_in_at,
                            user_type: 'authenticated',
                            is_anonymous: false,
                            auth_provider: provider,
                        });
                    }

                    // Clear URL params after identification (clean URL)
                    const cleanUrl = new URL(window.location.href);
                    cleanUrl.searchParams.delete('login_success');
                    cleanUrl.searchParams.delete('provider');
                    cleanUrl.searchParams.delete('is_new_user');
                    window.history.replaceState({}, '', cleanUrl.toString());
                }

                // Track onboarding started (GDPR-compliant)
                const authProvider = user.app_metadata?.provider || 'email';
                trackOnboardingStarted(authProvider as AuthProvider);

            } catch (error) {
                console.error('Error initializing user:', error);
            } finally {
                setIsLoading(false);
            }
        };

        initUser();
    }, [supabase, router, fetchUserProfile, searchParams]);

    const handleSelectPlan = async (priceId: string) => {
        if (isProcessingCheckout) return;
        setIsProcessingCheckout(true);

        if (!sessionUser || !sessionUser.email || !sessionUser.id) {
            toast({ title: 'Error', description: 'Benutzerinformationen fehlen. Bitte melden Sie sich erneut an.', variant: 'destructive' });
            setIsProcessingCheckout(false);
            return;
        }

        // Get the actual plan details from the fetched plans
        const selectedPlan = plansByPriceId.get(priceId);

        // Build tracking details with real plan data
        const trackingDetails: PlanSelectionDetails = {
            planName: selectedPlan?.productName || 'Unknown',
            priceId: priceId,
            billingCycle: selectedPlan?.interval === 'year' ? 'yearly' : 'monthly',
            priceAmount: selectedPlan ? selectedPlan.price / 100 : undefined, // Convert cents to base currency
            currency: selectedPlan?.currency,
            position: selectedPlan?.position,
        };

        // Track plan selection with full details (GDPR-compliant)
        trackOnboardingPlanSelected(trackingDetails);

        // Check if user has active subscription -> Portal
        if (userProfile && (userProfile.stripe_subscription_status === 'active' || userProfile.stripe_subscription_status === 'trialing')) {
            await redirectToCustomerPortal();
            return;
        }

        // Create Checkout Session
        try {
            const response = await fetch('/api/stripe/checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    priceId,
                    customerEmail: sessionUser.email,
                    userId: sessionUser.id,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || errorData.error || 'Fehler beim Starten des Bezahlvorgangs.');
            }

            const { url } = await response.json();
            if (url) {
                router.push(url);
            } else {
                throw new Error('Keine Weiterleitungs-URL empfangen.');
            }

        } catch (error) {
            console.error('Checkout error:', error);
            toast({
                title: 'Fehler',
                description: (error instanceof Error ? error.message : 'Ein unerwarteter Fehler ist aufgetreten.'),
                variant: 'destructive'
            });
            setIsProcessingCheckout(false);
        }
    };

    const redirectToCustomerPortal = async () => {
        if (!sessionUser) return;
        try {
            const response = await fetch('/api/stripe/customer-portal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: sessionUser.id }),
            });

            if (!response.ok) throw new Error('Portal session failed');
            const { url } = await response.json();
            if (url) {
                window.location.href = url;
            } else {
                throw new Error('Kundenportal-URL nicht gefunden.');
            }
        } catch (error) {
            toast({ title: 'Fehler', description: 'Kundenportal konnte nicht geöffnet werden.', variant: 'destructive' });
            setIsProcessingCheckout(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pt-20">
            <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-4">
                        Wählen Sie Ihren Plan
                    </h1>
                    <p className="max-w-xl mx-auto text-xl text-muted-foreground">
                        Starten Sie mit unserer kostenlosen Testphase. Jederzeit kündbar.
                    </p>
                </div>

                <Pricing
                    onSelectPlan={handleSelectPlan}
                    userProfile={userProfile}
                    isLoading={isProcessingCheckout}
                    showComparison={true}
                />
            </div>
        </div>
    );
}

export default function SubscriptionPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <SubscriptionPageContent />
        </Suspense>
    );
}


