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
import { useEffect, useState } from 'react'; // Import useEffect and useState

// Updated Plan interface to match the API response structure
interface Plan {
  id: string; // Stripe Price ID
  name: string;
  price: number; // unit_amount in cents
  currency: string;
  interval: string | null;
  interval_count: number | null;
  features: string[];
  limit_wohnungen?: number; // From API, but not directly displayed in this basic card
  priceId: string; // Stripe Price ID (same as id)
  position?: number;
}

// Helper function to format price
const formatPrice = (amount: number, currency: string, interval: string | null, intervalCount: number | null): string => {
  const price = (amount / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0, // Adjust as needed, e.g. 2 for $10.00
  });
  if (interval && intervalCount) {
    const plural = intervalCount > 1 ? 's' : '';
    if (intervalCount === 1) {
        return `${price}/${interval}`;
    }
    return `${price} / ${intervalCount} ${interval}${plural}`;
  }
  return price; // For one-time payments or if interval info is missing
};


interface PricingProps {
  onSelectPlan: (priceId: string) => void;
  isLoading?: boolean; // Renamed from isSubmitting for clarity, passed from parent
}

export default function Pricing({ onSelectPlan, isLoading: isSubmitting }: PricingProps) {
  const [plansData, setPlansData] = useState<Plan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const data: Plan[] = await response.json();
        setPlansData(data);
      } catch (err) {
        console.error(err);
        setError((err as Error).message || 'An unexpected error occurred');
      } finally {
        setIsLoadingPlans(false);
      }
    };

    fetchPlans();
  }, []);

  if (isLoadingPlans) {
    return (
      <section className="py-12">
        <div className="container mx-auto px-4 text-center">
          <p>Loading plans...</p>
          {/* Optional: Add a spinner here */}
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

  if (plansData.length === 0) {
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
        {/* Title can be kept or removed if parent page provides it */}
        {/* <h2 className="text-3xl font-bold text-center mb-8">
          Choose Your Plan
        </h2> */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {plansData.map((plan) => (
            <Card key={plan.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{formatPrice(plan.price, plan.currency, plan.interval, plan.interval_count)}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
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
                  onClick={() => onSelectPlan(plan.priceId)}
                  className="w-full"
                  disabled={isSubmitting} // Disable button if parent is submitting
                >
                  {isSubmitting ? 'Processing...' : 'Select Plan'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
