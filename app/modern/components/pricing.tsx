'use client';

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
import { Check } from "lucide-react";
import { useEffect, useState, useMemo } from 'react';

// Updated Plan interface to match the API response structure
interface Plan {
  id: string; // Stripe Price ID
  name: string; // This should be the common product name, e.g., "Basic Plan"
  price: number; // unit_amount in cents
  currency: string;
  interval: string | null; // 'month' or 'year'
  interval_count: number | null;
  features: string[];
  limit_wohnungen?: number;
  priceId: string; // Stripe Price ID (same as id)
  position?: number;
  productName: string; // A common name for the product, e.g. "Basic", "Pro"
  description?: string; // To hold description from API (Stripe Product description)
}

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


import { Profile } from '@/types/supabase';

interface PricingProps {
  onSelectPlan: (priceId: string) => void;
  userProfile: Profile | null;
  isLoading?: boolean; // This is isProcessingCheckout from LandingPage
  // currentPlanId is now derived from userProfile.stripe_price_id
}

interface GroupedPlan {
  productName: string; // e.g. "Basic", "Pro"
  features: string[];
  description?: string; // Added description
  monthly: Plan | null;
  annually: Plan | null;
  position?: number;
  popular?: boolean; // Added popular flag
}

export default function Pricing({ onSelectPlan, userProfile, isLoading: isCheckoutProcessing }: PricingProps) {
  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    const fetchPlans = async () => {
      setIsLoadingPlans(true);
      setError(null);
      try {
        const response = await fetch('/api/stripe/plans');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to fetch plans: ${response.status}`);
        }
        // productName now comes directly from the API
        const data: Plan[] = await response.json();
        setAllPlans(data);
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
      if (plan.interval === 'month') {
        groups[productName].monthly = plan;
      } else if (plan.interval === 'year') {
        groups[productName].annually = plan;
      }
    });

    const sortedGroups = Object.values(groups).sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity));

    // Mark the first plan (lowest position) as popular if not otherwise set
    // This is a common default, adjust if API provides a specific 'popular' flag
    if (sortedGroups.length > 0) {
      // Find the plan intended to be popular, e.g., by specific name or lowest position.
      // For now, let's assume the API might provide a 'popular' hint via position or a metadata tag in future.
      // Or, we can hardcode based on productName if known.
      // Example: Mark "Professional" as popular if it exists.
      const professionalPlan = sortedGroups.find(p => p.productName.toLowerCase() === "professional");
      if (professionalPlan) {
        professionalPlan.popular = true;
      } else if (sortedGroups.length > 1) { // Fallback: if "Professional" not found, mark the middle one or second one.
        sortedGroups[1].popular = true; // Example: mark the second plan as popular
      } else if (sortedGroups.length === 1) { // If only one plan
        sortedGroups[0].popular = true;
      }
    }
    return sortedGroups;
  }, [allPlans]);

  // Determine trial eligibility and button text/state based on userProfile
  const isTrialEligible = useMemo(() => {
    if (!userProfile) return true; // Logged out users see trial message
    // A user is eligible for a trial if they have no subscription history.
    return !userProfile.stripe_subscription_id;
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


  if (isLoadingPlans) {
    return (
      <section className="py-16 px-4 text-foreground">
        <div className="max-w-6xl mx-auto text-center">
          <p>Loading plans...</p>
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
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Einfache, transparente Preise</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Wählen Sie den perfekten Plan für Ihre Bedürfnisse. Jederzeit erweiter- oder herabstufbar.
          </p>
        </div>

        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center rounded-full bg-muted p-1">
            <Button
              variant={billingCycle === "monthly" ? "default" : "ghost"}
              onClick={() => setBillingCycle("monthly")}
              className="rounded-full px-4 py-2 text-sm font-medium transition-colors"
            >
              Monatlich
            </Button>
            <Button
              variant={billingCycle === "yearly" ? "default" : "ghost"}
              onClick={() => setBillingCycle("yearly")}
              className="rounded-full px-4 py-2 text-sm font-medium transition-colors"
            >
              Jährlich (20% Rabatt)
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {groupedPlans.map((group) => {
            const planToDisplay = billingCycle === 'monthly' ? group.monthly : group.annually;
            if (!planToDisplay) {
              // If the selected cycle isn't available for this group, maybe show a message or skip
              // For now, skipping seems fine as per original logic.
              return null;
            }

            // const yearlySavings = group.monthly && group.annually
            //   ? (group.monthly.price * 12) - group.annually.price
            //   : 0;
            // The example UI doesn't show savings this way, but has a "(20% off)" in the yearly button.
            // We'll stick to the example's UI for now.

            return (
              <Card
                key={group.productName}
                className={`relative flex flex-col rounded-3xl ${group.popular ? "border-primary shadow-lg scale-105" : "border-border"}`}
              >
                {group.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2">Most Popular</Badge>
                )}

                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-xl font-semibold">{group.productName}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">
                      {formatDisplayPrice(planToDisplay.price, planToDisplay.currency, planToDisplay.interval)}
                    </span>
                    <span className="text-muted-foreground">
                      {billingCycle === "monthly" ? "/Monat" : "/Jahr"}
                    </span>
                  </div>
                  <CardDescription className="mt-2 h-12 overflow-hidden"> {/* Added fixed height and overflow for description consistency */}
                    {group.description || `Unser ${group.productName} Plan.`} {/* Use group's description */}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-grow">
                  <ul className="space-y-3">
                    {group.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="mt-auto py-6">
                  <Button
                    onClick={() => onSelectPlan(planToDisplay.priceId)}
                    className="w-full rounded-xl"
                    variant={group.popular ? "default" : "outline"}
                    size="lg"
                    disabled={getButtonTextAndState(planToDisplay.priceId).disabled}
                  >
                    {getButtonTextAndState(planToDisplay.priceId).text}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {isTrialEligible && (
          <div className="text-center mt-12">
            <p className="text-muted-foreground">Alle Pläne beinhalten eine 14-tägige kostenlose Testversion. Keine Kreditkarte erforderlich.</p>
          </div>
        )}
      </div>
    </section>
  );
}
