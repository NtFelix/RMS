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
  metadata?: Record<string, string>;
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

interface PricingProps {
  onSelectPlan: (priceId: string) => void;
  userProfile: Profile | null;
  isLoading?: boolean; // This is isProcessingCheckout from LandingPage
  // currentPlanId is now derived from userProfile.stripe_price_id
  showComparison?: boolean;
  showViewAllButton?: boolean;
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

// Configuration for the comparison table mapping features to Stripe metadata keys
interface FeatureConfig {
  name: string;
  key: string;
  type?: 'boolean' | 'string';
  tooltip?: string;
}

interface CategoryConfig {
  category: string;
  features: FeatureConfig[];
}

const comparisonConfig: CategoryConfig[] = [
  {
    category: "Allgemeine Funktionen",
    features: [
      { name: "Anzahl Einheiten", key: "feat_units", tooltip: "Die maximale Anzahl an verwaltbaren Wohneinheiten." },
      { name: "Benutzerzugänge", key: "feat_users", tooltip: "Anzahl der Mitarbeiter, die Zugriff auf das System haben." },
      { name: "Dokumentenspeicher", key: "feat_storage", tooltip: "Verfügbarer Speicherplatz für Dokumente und Belege." },
      { name: "Mobile App", key: "feat_mobile_app", type: "boolean", tooltip: "Zugriff über iOS und Android App." },
    ]
  },
  {
    category: "Verwaltung & Organisation",
    features: [
      { name: "Digitale Mieterakte", key: "feat_tenant_files", type: "boolean" },
      { name: "Vertragsmanagement", key: "feat_contracts", type: "boolean" },
      { name: "Aufgabenmanagement", key: "feat_tasks", type: "boolean" },
      { name: "Wartungsplaner", key: "feat_maintenance", type: "boolean" },
    ]
  },
  {
    category: "Finanzen & Buchhaltung",
    features: [
      { name: "Mieteingangskontrolle", key: "feat_rent_check", type: "boolean" },
      { name: "Nebenkostenabrechnung", key: "feat_utility_costs" },
      { name: "Automatische Mahnungen", key: "feat_dunning", type: "boolean" },
      { name: "DATEV Export", key: "feat_datev", type: "boolean" },
      { name: "Bankintegration", key: "feat_banking", type: "boolean" },
    ]
  },
  {
    category: "Support & Service",
    features: [
      { name: "Support-Level", key: "feat_support" },
      { name: "Onboarding-Hilfe", key: "feat_onboarding", type: "boolean" },
      { name: "Dedizierter Ansprechpartner", key: "feat_account_manager", type: "boolean" },
    ]
  }
];

interface ComparisonTableProps {
  plans: GroupedPlan[];
  billingCycle: "monthly" | "yearly";
  onSelectPlan: (priceId: string) => void;
  getButtonTextAndState: (priceId: string) => { text: string; disabled: boolean };
}

function ComparisonTable({ plans, billingCycle, onSelectPlan, getButtonTextAndState }: ComparisonTableProps) {
  // Filter configuration to only include features that have data in at least one plan
  const filteredConfig = useMemo(() => {
    return comparisonConfig.map(category => {
      const activeFeatures = category.features.filter(feature => {
        // Check if any plan has a value for this feature key
        return plans.some(plan => {
          const metadata = plan.monthly?.metadata || plan.annually?.metadata || {};
          return metadata && metadata[feature.key] !== undefined;
        });
      });

      return {
        ...category,
        features: activeFeatures
      };
    }).filter(category => category.features.length > 0); // Remove empty categories
  }, [plans]);

  // Calculate total rows for the grid-row span: 1 header row + category rows + feature rows
  const totalRows = 1 + filteredConfig.length + filteredConfig.reduce((acc, cat) => acc + cat.features.length, 0);

  // If no plans are available or no features to show, don't render the table
  if (plans.length === 0 || filteredConfig.length === 0) return null;

  // Define grid columns dynamically based on number of plans
  // First column is feature name (min 200px), then 1 column per plan
  const gridTemplateColumns = `minmax(200px, 1.5fr) repeat(${plans.length}, minmax(180px, 1fr))`;

  return (
    <div className="mt-24 max-w-7xl mx-auto px-4">
      <div className="text-center mb-16">
        <h3 className="text-2xl font-bold mb-4">Funktionen im Vergleich</h3>
        <p className="text-muted-foreground">Detaillierte Übersicht aller Features und Limits.</p>
      </div>

      {/* Container with padding to prevent shadow clipping */}
      <div className="overflow-x-auto pb-12 pt-4 -mx-4 px-4">
        {/* Grid Container */}
        <div
          className="grid relative min-w-[900px] isolate"
          style={{ gridTemplateColumns }}
        >

          {/* Header Row - Titles */}
          <div className="p-6 flex items-end font-bold text-xl pb-6">Vergleich</div>
          {plans.map((plan, index) => (
            <div key={plan.productName} className="p-6 text-center flex flex-col justify-end pb-6">
              <span className={`font-bold text-2xl ${plan.popular ? 'text-primary' : ''}`}>{plan.productName}</span>
            </div>
          ))}

          {/* Price Row */}
          <div className="p-4 pl-6 min-h-[60px]"></div> {/* Empty cell for left column */}
          {plans.map((plan, index) => {
            const planVariant = billingCycle === 'monthly' ? plan.monthly : plan.annually;
            return (
              <div key={`${plan.productName}-price`} className="p-4 flex justify-center items-center min-h-[60px]">
                {planVariant ? (
                  <span className="text-xl font-semibold text-muted-foreground">
                    {formatDisplayPrice(planVariant.price, planVariant.currency, planVariant.interval)}
                    <span className="text-sm font-normal ml-1">
                      {billingCycle === "monthly" ? "/Monat" : "/Jahr"}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </div>
            );
          })}

          {/* Button Row */}
          <div className="p-4 pl-6 min-h-[60px]"></div> {/* Empty cell for left column */}
          {plans.map((plan) => {
            const planVariant = billingCycle === 'monthly' ? plan.monthly : plan.annually;
            if (!planVariant) return <div key={`${plan.productName}-btn-top`} className="p-4"></div>;

            const { text, disabled } = getButtonTextAndState(planVariant.priceId);

            return (
              <div key={`${plan.productName}-btn-top`} className="p-4 flex justify-center items-center min-h-[60px] pb-6">
                <Button
                  onClick={() => onSelectPlan(planVariant.priceId)}
                  className="w-full rounded-xl"
                  variant={plan.popular ? "default" : "outline"}
                  size="lg"
                  disabled={disabled}
                >
                  {text}
                </Button>
              </div>
            );
          })}

          {/* Data Rows */}
          {filteredConfig.map((category, catIndex) => (
            <Fragment key={catIndex}>
              {/* Category Header */}
              <div
                className="p-4 pl-6 font-semibold text-sm text-muted-foreground uppercase tracking-wider mt-2 mb-2 flex items-center after:content-[''] after:flex-1 after:h-px after:bg-border after:ml-4"
                style={{ gridColumn: `1 / span ${plans.length + 1}` }}
              >
                {category.category}
              </div>

              {/* Features */}
              {category.features.map((feature, featIndex) => (
                <Fragment key={`${catIndex}-${featIndex}`}>
                  <div className="p-4 pl-6 flex items-center gap-2 border-b border-border/40 min-h-[60px]">
                    <span className="font-medium text-sm sm:text-base">{feature.name}</span>
                    {feature.tooltip && (
                      <div className="group relative">
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        <div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 hidden group-hover:block w-56 p-3 bg-popover text-popover-foreground text-xs rounded-lg shadow-lg z-50 border border-border">
                          {feature.tooltip}
                        </div>
                      </div>
                    )}
                  </div>

                  {plans.map((plan, planIndex) => {
                    // Get metadata from either monthly or annually plan (they share the same product metadata)
                    const metadata = plan.monthly?.metadata || plan.annually?.metadata || {};
                    const rawValue = metadata[feature.key];

                    // Determine value to render
                    let valueToRender: string | boolean = rawValue || false;

                    if (feature.type === 'boolean') {
                      // Only check for "true" string value (as per STRIPE_METADATA_GUIDE.md)
                      valueToRender = rawValue === 'true';
                    }

                    return (
                      <div key={`${plan.productName}-${feature.key}`} className="p-4 flex justify-center items-center border-b border-border/40 min-h-[60px]">
                        {renderFeatureValue(valueToRender)}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </Fragment>
          ))}


        </div>
      </div>
    </div>
  );
}

function renderFeatureValue(value: boolean | string) {
  if (typeof value === 'boolean') {
    return value ? (
      <div className="flex justify-center">
        <div className="rounded-full bg-green-500/10 p-1">
          <Check className="h-4 w-4 text-green-500" />
        </div>
      </div>
    ) : (
      <div className="flex justify-center">
        <Minus className="h-4 w-4 text-muted-foreground/30" />
      </div>
    );
  }
  return <span className="text-sm font-medium">{value}</span>;
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
                key={i}
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
                      <div key={j} className="flex items-center gap-3">
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

          <PreviewLimitNoticeBanner />

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
            {groupedPlans.filter(group => group.position !== 0).map((group) => {
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
                  className={`relative flex flex-col rounded-[2.5rem] ${group.popular ? "border-primary shadow-lg scale-105" : "border-border"}`}
                >
                  {group.popular && (
                    <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2">Am beliebtesten</Badge>
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
                      onClick={() => {
                        trackPricingPlanSelected(
                          group.productName,
                          planToDisplay.priceId,
                          billingCycle,
                          planToDisplay.price / 100,
                          planToDisplay.currency
                        )
                        onSelectPlan(planToDisplay.priceId)
                      }}
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
