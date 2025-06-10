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

interface Plan {
  id: string;
  name: string;
  price: string;
  features: string[];
  priceId: string;
}

const plans: Plan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: '$9/mo',
    features: ['Feature A', 'Feature B'],
    priceId: 'price_basic_monthly_placeholder',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$29/mo',
    features: ['Feature A', 'Feature B', 'Feature C'],
    priceId: 'price_pro_monthly_placeholder',
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$99/mo',
    features: ['Feature A', 'Feature B', 'Feature C', 'Feature D'],
    priceId: 'price_premium_monthly_placeholder',
  },
];

interface PricingProps {
  onSelectPlan: (priceId: string) => void;
}

export default function Pricing({ onSelectPlan }: PricingProps) {
  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-8">
          Choose Your Plan
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <Card key={plan.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.price}</CardDescription>
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
                >
                  Select Plan
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
