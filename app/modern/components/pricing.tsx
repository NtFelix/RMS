'use client';

import { useRouter } from 'next/navigation';
import { usePostHog, useFeatureFlagEnabled } from 'posthog-js/react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Minus, HelpCircle, ArrowRight, SquareArrowOutUpRight, Sparkles } from "lucide-react";
import { useEffect, useState, useMemo, Fragment, useRef } from 'react';
import { WaitlistButton } from './waitlist-button';
import { FAQ } from './faq';
import { PreviewLimitNoticeBanner } from './preview-limit-notice-banner';
import { Profile } from '@/types/supabase';
import { POSTHOG_FEATURE_FLAGS, BRAND_NAME } from '@/lib/constants';
import { trackBillingCycleChanged, trackPricingPlanSelected, trackPricingViewAllClicked, type BillingCycle } from '@/lib/posthog-landing-events';
import { getStripePlans } from '@/app/actions/stripe-actions';
import { ComparisonTable, type Plan, type GroupedPlan } from './pricing-comparison';
import { PricingCard } from './pricing-card';

// Helper function to format price for display
const formatDisplayPrice = (amount: number, currency: string, interval: string | null): string => {
  const price = (amount / 100).toLocaleString('de-DE', { // Using de-DE for Euro formatting
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  });
  // The interval text like "/month" or "/year" will be part of the tab/description, not the price itself
  return price;
};

interface PricingProps {
  onSelectPlan: (priceId: string) => void;
  userProfile: Profile | null;
  isLoading?: boolean; // This is isProcessingCheckout from LandingPage
  // currentPlanId is now derived from userProfile.stripe_price_id
  showComparison?: boolean;
  showViewAllButton?: boolean;
}

export default function Pricing({
  onSelectPlan,
  userProfile,
  isLoading: isCheckoutProcessing,
  showComparison = true,
  showViewAllButton = false
}: PricingProps) {
  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const posthog = usePostHog();
  const router = useRouter();
  const showWaitlistMode = useFeatureFlagEnabled(POSTHOG_FEATURE_FLAGS.SHOW_WAITLIST_BUTTON);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const fetchPlans = async () => {
      setIsLoadingPlans(true);
      setError(null);
      try {
        const result = await getStripePlans();
        if (result.success && result.data) {
          setAllPlans(result.data as Plan[]);
        } else {
          throw new Error(result.error || 'Failed to fetch plans');
        }
      } catch (err) {
        console.error(err);
        setError((err as Error).message || 'An unexpected error occurred');
      } finally {
        setIsLoadingPlans(false);
      }
    };

    fetchPlans();
  }, []);

  const groupedPlans = useMemo(() => {
    const groups: Record<string, GroupedPlan> = {};
    allPlans.forEach(plan => {
      const productName = plan.productName; // Use the new productName field
      if (!groups[productName]) {
        groups[productName] = {
          productName: productName,
          features: plan.features, // Assume features are the same for monthly/annual versions of the same product
          // Use description from the plan (product description from API). Features and description are product-level.
          description: plan.description,
          monthly: null,
          annually: null,
          position: plan.position,
          popular: false, // Default to false
        };
      }

      // Check if this plan has the highlighted metadata
      if (plan.metadata?.highlighted === 'true') {
        groups[productName].popular = true;
      }

      if (plan.interval === 'month') {
        groups[productName].monthly = plan;
      } else if (plan.interval === 'year') {
        groups[productName].annually = plan;
      }
    });

    const sortedGroups = Object.values(groups).sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity));

    return sortedGroups;
  }, [allPlans]);

  // Find the free plan (position 0) for the PreviewLimitNoticeBanner
  const freePlan = useMemo(() => {
    const freePlanGroup = groupedPlans.find(group => group.position === 0);
    if (!freePlanGroup) return null;
    // Prefer monthly, but fall back to annually if not available
    return freePlanGroup.monthly ?? freePlanGroup.annually;
  }, [groupedPlans]);

  // Handler for the PreviewLimitNoticeBanner "Get Started" button
  const handleFreePlanGetStarted = () => {
    if (freePlan) {
      onSelectPlan(freePlan.priceId);
    }
  };

  // Determine trial eligibility and button text/state based on userProfile
  const isTrialEligible = useMemo(() => {
    if (!userProfile) return true; // Logged out users see trial message
    // A user is eligible for a trial if they have no subscription history.
    // The presence of a `stripe_price_id` indicates a past or present subscription.
    return !userProfile.stripe_price_id;
  }, [userProfile]);

  const getButtonTextAndState = (planPriceId: string) => {
    let text = 'Loslegen';
    let disabled = false;

    if (isCheckoutProcessing) { // isLoading prop from LandingPage
      text = 'Wird verarbeitet...';
      disabled = true;
      return { text, disabled };
    }

    if (userProfile) {
      const hasActiveSubscription = userProfile.stripe_subscription_status === 'active' || userProfile.stripe_subscription_status === 'trialing';
      const isCurrentPlan = planPriceId === userProfile.stripe_price_id;

      if (hasActiveSubscription) {
        if (isCurrentPlan) {
          text = 'Abonnement verwalten';
        } else {
          text = 'Plan wechseln';
        }
        // Keep button enabled for both cases to allow navigation to customer portal
        disabled = false;
      } else {

        // User has no active subscription.
        // The isTrialEligible flag, which is now more accurate, determines the button text.
        if (isTrialEligible) {
          text = 'Kostenlos testen'; // Corrected German text for "Start Free Trial"
        } else {
          text = 'Abo auswählen'; // "Select Subscription" for users who are not eligible for a trial
        }
      }
    } else {
      // Default for logged-out users, implies trial eligibility.
      text = 'Kostenlos testen';
    }

    return { text, disabled };
  };


  if (isMounted && showWaitlistMode) {
    return (
      <section className="py-24 px-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl -z-10" />

        <div className="max-w-3xl mx-auto">
          <Card className="border-primary/20 shadow-2xl bg-card/50 backdrop-blur-sm relative overflow-hidden rounded-[2.5rem]">

            <CardContent className="flex flex-col items-center text-center p-12 space-y-8">
              <div className="rounded-full bg-primary/10 p-4 ring-1 ring-primary/20">
                <Sparkles className="w-12 h-12 text-primary" />
              </div>

              <div className="space-y-4 max-w-xl">
                <h2 className="text-4xl font-bold tracking-tight">
                  Exklusiver Zugang
                </h2>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Wir rollen {BRAND_NAME} schrittweise aus, um die beste Erfahrung für alle zu gewährleisten.
                  Sichern Sie sich Ihren Platz auf der Warteliste.
                </p>
              </div>

              <div className="w-full flex justify-center pt-4">
                <WaitlistButton />
              </div>

              <p className="text-sm text-muted-foreground/60">
                Limitierte Plätze verfügbar • Unverbindliche Anmeldung
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  if (isLoadingPlans) {
    return (
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Skeleton className="h-10 w-64 mx-auto mb-4" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>

          <div className="flex justify-center mb-12">
            <Skeleton className="h-10 w-64 rounded-full" />
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[0, 1, 2].map((i) => (
              <Card
                key={`pricing-skeleton-card-${i}`}
                className={`relative flex flex-col rounded-[2.5rem] ${i === 1 ? "border-primary shadow-lg scale-105" : "border-border"
                  }`}
              >
                {i === 1 && (
                  <Skeleton className="absolute -top-3 left-1/2 transform -translate-x-1/2 h-6 w-32 rounded-full" />
                )}

                <CardHeader className="text-center pb-8">
                  <Skeleton className="h-8 w-32 mx-auto mb-4" />
                  <div className="mt-4 flex justify-center items-baseline gap-1">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <Skeleton className="h-4 w-48 mx-auto mt-4" />
                </CardHeader>

                <CardContent className="flex-grow">
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={`pricing-skeleton-line-${i}-${j}`} className="flex items-center gap-3">
                        <Skeleton className="h-4 w-4 rounded-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ))}
                  </div>
                </CardContent>

                <CardFooter className="mt-auto py-6">
                  <Skeleton className="h-12 w-full rounded-xl" />
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 px-4 text-foreground">
        <div className="max-w-6xl mx-auto text-center text-destructive">
          <p>Error loading plans: {error}</p>
        </div>
      </section>
    );
  }

  if (groupedPlans.length === 0 && !isLoadingPlans) {
    return (
      <section className="py-16 px-4 text-foreground">
        <div className="max-w-6xl mx-auto text-center">
          <p>No subscription plans are currently available. Please check back later.</p>
        </div>
      </section>
    );
  }


  return (
    <>
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Einfache, transparente Preise</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Wählen Sie den perfekten Plan für Ihre Bedürfnisse. Jederzeit erweiter- oder herabstufbar.
            </p>
          </div>

          <PreviewLimitNoticeBanner
            onGetStarted={handleFreePlanGetStarted}
            isSignedIn={!!userProfile}
          />

          <div className="flex justify-center mb-12">
            <div className="inline-flex items-center rounded-full bg-muted p-1">
              <Button
                variant={billingCycle === "monthly" ? "default" : "ghost"}
                onClick={() => {
                  if (billingCycle !== "monthly") {
                    trackBillingCycleChanged(billingCycle, "monthly")
                    setBillingCycle("monthly")
                  }
                }}
                className="rounded-full px-4 py-2 text-sm font-medium transition-colors"
              >
                Monatlich
              </Button>
              <Button
                variant={billingCycle === "yearly" ? "default" : "ghost"}
                onClick={() => {
                  if (billingCycle !== "yearly") {
                    trackBillingCycleChanged(billingCycle, "yearly")
                    setBillingCycle("yearly")
                  }
                }}
                className="rounded-full px-4 py-2 text-sm font-medium transition-colors"
              >
                Jährlich (20% Rabatt)
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {groupedPlans.filter(group => group.position !== 0).map((group) => (
              <PricingCard
                key={group.productName}
                group={group}
                billingCycle={billingCycle}
                getButtonTextAndState={getButtonTextAndState}
                onSelectPlan={onSelectPlan}
                formatDisplayPrice={formatDisplayPrice}
              />
            ))}
          </div>

          {isTrialEligible && (
            <div className="text-center mt-12">
              <p className="text-muted-foreground">Alle Pläne beinhalten eine 14-tägige kostenlose Testversion. Keine Kreditkarte erforderlich.</p>
            </div>
          )}

          {showComparison && <ComparisonTable
            plans={groupedPlans}
            billingCycle={billingCycle}
            onSelectPlan={onSelectPlan}
            getButtonTextAndState={getButtonTextAndState}
          />}

          {showViewAllButton && (
            <div className="text-center mt-16">
              <Button
                size="lg"
                variant="outline"
                className="px-12 py-6 text-xl font-semibold group text-foreground hover:bg-muted hover:text-foreground transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg rounded-full"
                onClick={() => {
                  trackPricingViewAllClicked()
                  router.push('/preise')
                }}
              >
                <span className="flex items-center gap-2">
                  Alle Preise und Pläne ansehen
                  <SquareArrowOutUpRight className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                </span>
              </Button>
            </div>
          )}
        </div>
      </section>
      <FAQ />
    </>
  );
}
