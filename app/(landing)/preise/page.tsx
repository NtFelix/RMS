'use client';

import { Suspense } from 'react';

import Pricing from '@/app/modern/components/pricing';
import { useStripeIntegration } from '@/hooks/use-stripe-integration';
import { usePlanSelectionRedirect } from '@/hooks/use-plan-selection-redirect';
import { useLandingRedirects } from '@/hooks/use-landing-redirects';

// Main content component that uses the auth modal context
function PricingPageContent() {
    const {
        sessionUser,
        userProfile,
        isProcessingCheckout,
        isLoadingProfile,
        handleAuthFlow
    } = useStripeIntegration();

    usePlanSelectionRedirect(sessionUser, userProfile, isProcessingCheckout, handleAuthFlow);
    useLandingRedirects(sessionUser, isLoadingProfile, '/preise');

    const handleSelectPlan = async (priceId: string) => {
        await handleAuthFlow(priceId, window.location.pathname);
    };

    return (
        <div className="min-h-screen overflow-x-hidden pt-20">
            <div id="pricing">
                <Pricing
                    onSelectPlan={handleSelectPlan}
                    userProfile={userProfile}
                    isLoading={isProcessingCheckout}
                />
            </div>
        </div>
    );
}

export default function PricingPage() {
    return (
        <Suspense fallback={null}>
            <PricingPageContent />
        </Suspense>
    );
}
