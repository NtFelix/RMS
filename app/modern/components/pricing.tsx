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
import { Badge } from '@/components/ui/badge'; // Import Badge component
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Removed TabsContent
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
  isMostPopular?: boolean; // Added for "Most Popular" badge
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
  isLoading?: boolean;
  currentPlanId?: string | null;
}

interface GroupedPlan {
  productName: string; // e.g. "Basic", "Pro"
  features: string[];
  monthly: Plan | null;
  annually: Plan | null;
  position?: number;
  isMostPopular?: boolean; // Added for "Most Popular" badge
}

export default function Pricing({ onSelectPlan, isLoading: isSubmitting, currentPlanId }: PricingProps) {
  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<'monthly' | 'annually'>('monthly');

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
          monthly: null,
          annually: null,
          position: plan.position,
          // Simulate "Pro" plan as "Most Popular" for demonstration
          // In a real app, this would come from the API or a more robust logic
          isMostPopular: productName.toLowerCase() === 'pro' || plan.isMostPopular,
        };
      }
      if (plan.interval === 'month') {
        groups[productName].monthly = plan;
        if (plan.isMostPopular) groups[productName].isMostPopular = true;
      } else if (plan.interval === 'year') {
        groups[productName].annually = plan;
        if (plan.isMostPopular) groups[productName].isMostPopular = true;
      }
    });
    return Object.values(groups).sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity));
  }, [allPlans]);

  if (isLoadingPlans) {
    return (
      <section className="py-12 bg-background text-foreground">
        <div className="container mx-auto px-4 text-center">
          <p>Loading plans...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-12 bg-background text-foreground">
        <div className="container mx-auto px-4 text-center text-destructive">
          <p>Error loading plans: {error}</p>
        </div>
      </section>
    );
  }

  if (groupedPlans.length === 0) {
    return (
      <section className="py-12 bg-background text-foreground">
        <div className="container mx-auto px-4 text-center">
          <p>No subscription plans are currently available. Please check back later.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 bg-background text-foreground">
      <div className="container mx-auto px-4">
        <Tabs value={selectedInterval} onValueChange={(value) => setSelectedInterval(value as 'monthly' | 'annually')} className="mb-8">
          <TabsList className="grid w-full grid-cols-2 md:w-1/3 mx-auto bg-muted p-1 rounded-lg">
            <TabsTrigger
              value="monthly"
              className="px-3 py-1.5 text-sm font-medium transition-colors rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-accent data-[state=inactive]:hover:text-accent-foreground data-[state=inactive]:hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Monthly
            </TabsTrigger>
            <TabsTrigger
              value="annually"
              className="px-3 py-1.5 text-sm font-medium transition-colors rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-accent data-[state=inactive]:hover:text-accent-foreground data-[state=inactive]:hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Annually
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {groupedPlans.map((group) => {
            const planToDisplay = selectedInterval === 'monthly' ? group.monthly : group.annually;
            if (!planToDisplay) return null;

            const yearlySavings = group.monthly && group.annually
              ? (group.monthly.price * 12) - group.annually.price
              : 0;

            // Determine if the currently displayed plan (monthly/annually) for the group is "Most Popular"
            // This uses the isMostPopular flag from the group, which was set based on productName or specific plan flags
            const displayIsMostPopular = group.isMostPopular;

            return (
              <Card
                key={group.productName}
                className={`flex flex-col bg-card border backdrop-blur-sm transition-all duration-300 relative overflow-hidden shadow-lg group ${
                  displayIsMostPopular ? 'border-primary hover:border-primary/80' : 'border-border hover:border-primary/70'
                } hover:shadow-2xl rounded-lg`}
              >
                <CardHeader className="p-6 relative z-10">
                  {displayIsMostPopular && (
                    <Badge
                      variant="destructive" // Or use "default" with primary colors: className="bg-primary text-primary-foreground"
                      className="absolute top-0 right-0 m-4 px-3 py-1 text-xs font-semibold tracking-wider shadow-md"
                    >
                      MOST POPULAR
                    </Badge>
                  )}
                  <CardTitle className="text-2xl font-bold text-card-foreground group-hover:text-primary transition-colors mb-1">
                    {group.productName}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground text-base"> {/* Adjusted text size */}
                    {formatDisplayPrice(planToDisplay.price, planToDisplay.currency, planToDisplay.interval)}
                    <span className="text-xs">{planToDisplay.interval === 'month' ? ' / month' : ' / year'}</span>
                    {selectedInterval === 'annually' && yearlySavings > 0 && group.monthly && (
                      <span className="mt-1 block text-sm text-green-600 dark:text-green-500 font-medium">
                        Save {formatDisplayPrice(yearlySavings, planToDisplay.currency, null)} per year!
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 flex-grow relative z-10">
                  <ul className="space-y-2"> {/* Adjusted spacing from space-y-3 to space-y-2 */}
                    {group.features.map((feature, index) => (
                      <li key={index} className="flex items-start text-sm text-foreground/80"> {/* Changed text color, items-start for longer text wrapping */}
                        <svg
                          className="w-4 h-4 mr-2 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" // Slightly smaller icon, added mt-0.5 for alignment with text baseline
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M5 13l4 4L19 7"
                          ></path>
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="p-6 bg-transparent mt-auto"> {/* Ensure footer is at the bottom */}
                  {(() => {
                    const isCurrent = planToDisplay.priceId === currentPlanId;
                    const isPopularAndCanBeSelected = displayIsMostPopular && !isCurrent && !isSubmitting;

                    let buttonVariant: "default" | "outline" = isCurrent ? "outline" : "default";
                    let buttonClasses = `w-full text-base py-3 transition-all duration-200 ease-in-out`;
                    let buttonText = isSubmitting ? 'Processing...' : 'Select Plan';

                    if (isCurrent) {
                      buttonText = 'Current Plan';
                      // For current plan, ensure outline variant is visually distinct and less prominent
                      // Disabled state will further style it.
                      buttonClasses += ` border-primary/50 text-primary/70`;
                    } else if (isPopularAndCanBeSelected) {
                      // Prominent styling for "Most Popular" available plans
                      buttonClasses += ` bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-md`;
                      // variant="default" will be used, but these classes effectively define its look
                    } else if (!isSubmitting) {
                      // Standard button for non-popular, available plans
                      // Uses default variant. Add hover effect for consistency if needed.
                      buttonClasses += ` hover:bg-primary/10 hover:text-primary shadow-sm hover:shadow-md`;
                    }
                    // Disabled state is handled by the <Button> component itself based on the `disabled` prop

                    return (
                      <Button
                        onClick={() => !isCurrent && !isSubmitting && onSelectPlan(planToDisplay.priceId)}
                        className={buttonClasses}
                        disabled={isSubmitting || isCurrent}
                        variant={buttonVariant}
                      >
                        {buttonText}
                      </Button>
                    );
                  })()}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
