'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

import Pricing from '@/app/modern/components/pricing';
import { EmailVerificationNotifier } from '@/components/auth/email-verification-notifier';
import { useSubscriptionUser } from '@/hooks/use-subscription-user';
import { useSubscriptionCheckout } from '@/hooks/use-subscription-checkout';
import { useAuthRedirects } from '@/hooks/use-auth-redirect-handler';

function PricingPageContent() {
    const searchParams = useSearchParams();

    // Use custom hooks
    const { user: sessionUser, profile: userProfile, isLoading: isLoadingUser } = useSubscriptionUser();
    const { isProcessingCheckout, handleAuthFlow } = useSubscriptionCheckout();

    // Handle redirects and errors
    useAuthRedirects(sessionUser, isLoadingUser);

    // Handle price selection from URL after redirect back from login
    useEffect(() => {
        const priceId = searchParams.get('priceId');
        if (priceId && sessionUser && userProfile && !isProcessingCheckout) {
            // Clear the priceId from URL to prevent re-triggering on refresh
            const newParams = new URLSearchParams(searchParams.toString());
            newParams.delete('priceId');
            const searchStr = newParams.toString();
            const newUrl = `${window.location.pathname}${searchStr ? '?' + searchStr : ''}`;
            window.history.replaceState({}, '', newUrl);

            handleAuthFlow(
                sessionUser,
                userProfile,
                priceId,
                window.location.pathname,
                `${window.location.origin}/preise`
            );
        }
    }, [searchParams, sessionUser, userProfile, isProcessingCheckout, handleAuthFlow]);

    const handleSelectPlan = async (priceId: string) => {
        await handleAuthFlow(
            sessionUser,
            userProfile,
            priceId,
            window.location.pathname,
            `${window.location.origin}/preise`
        );
    };

    return (
        <>
            <Suspense fallback={null}>
                <EmailVerificationNotifier />
            </Suspense>
            <div className="min-h-screen overflow-x-hidden pt-20">
                <div id="pricing">
                    <Pricing
                        onSelectPlan={handleSelectPlan}
                        userProfile={userProfile}
                        isLoading={isProcessingCheckout}
                    />
                </div>
            </div>
        </>
    );
}

export default function PricingPage() {
    return (
        <Suspense fallback={null}>
            <PricingPageContent />
        </Suspense>
    );
}
