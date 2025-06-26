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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs components
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
        };
      }
      if (plan.interval === 'month') {
        groups[productName].monthly = plan;
      } else if (plan.interval === 'year') {
        groups[productName].annually = plan;
      }
    });
    return Object.values(groups).sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity));
  }, [allPlans]);

  if (isLoadingPlans) {
    return (
      <section className="py-12">
        <div className="container mx-auto px-4 text-center">
          <p>Loading plans...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-12">
        <div className="container mx-auto px-4 text-center text-red-500">
          <p>Error loading plans: {error}</p>
        </div>
      </section>
    );
  }

  if (groupedPlans.length === 0) {
    return (
      <section className="py-12">
        <div className="container mx-auto px-4 text-center">
          <p>No subscription plans are currently available. Please check back later.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <Tabs value={selectedInterval} onValueChange={(value) => setSelectedInterval(value as 'monthly' | 'annually')} className="mb-8">
          <TabsList className="grid w-full grid-cols-2 md:w-1/3 mx-auto">
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="annually">Annually</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {groupedPlans.map((group) => {
            const planToDisplay = selectedInterval === 'monthly' ? group.monthly : group.annually;
            if (!planToDisplay) return null; // Skip if this product doesn't have an option for the selected interval

            const yearlySavings = group.monthly && group.annually
              ? (group.monthly.price * 12) - group.annually.price
              : 0;

            return (
              <Card key={group.productName} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{group.productName}</CardTitle>
                  <CardDescription>
                    {formatDisplayPrice(planToDisplay.price, planToDisplay.currency, planToDisplay.interval)}
                    {planToDisplay.interval === 'month' ? ' / month' : ' / year'}
                    {selectedInterval === 'annually' && yearlySavings > 0 && group.monthly && (
                      <span className="block text-sm text-green-600">
                        Save {formatDisplayPrice(yearlySavings, planToDisplay.currency, null)} per year! (vs. monthly)
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-2">
                    {group.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <svg
                          className="w-4 h-4 mr-2 text-green-500"
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
                <CardFooter>
                  <Button
                    onClick={() => onSelectPlan(planToDisplay.priceId)}
                    className="w-full"
                    disabled={isSubmitting || planToDisplay.priceId === currentPlanId}
                    variant={planToDisplay.priceId === currentPlanId ? "outline" : "default"}
                  >
                    {planToDisplay.priceId === currentPlanId
                      ? 'Current Plan'
                      : (isSubmitting ? 'Processing...' : 'Select Plan')}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
