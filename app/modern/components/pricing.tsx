"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// Interface for the structure of a plan, to be potentially passed as props
export interface PlanData { // Added export
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  features: string[];
  popular: boolean;
  // priceId related fields will be determined by how LandingPage passes data
  monthlyPriceId?: string; // Making these optional for now
  yearlyPriceId?: string;  // Making these optional for now
}

// Props for the PricingSection component
interface PricingSectionProps {
  plans: PlanData[];
  onSelectPlan: (priceId: string) => void;
  isLoading?: boolean; // Added isLoading prop
}

export default function PricingSection({ plans, onSelectPlan, isLoading = false }: PricingSectionProps) {
  const [billingCycle, setBillingCycle] = useState("monthly")

  // The actual plan data will now come from props.
  // The static data below is removed as it will be passed via props.
  // const plans = [ ... static plans ... ]

  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-100 dark:bg-gray-800">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Simple, Transparent Pricing</h2>
          <p className="max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
            Choose the perfect plan for your needs. Upgrade or downgrade at any time.
          </p>
        </div>

        <div className="mt-8 flex justify-center space-x-2">
          <Button
            onClick={() => setBillingCycle("monthly")}
            variant={billingCycle === "monthly" ? "default" : "outline"}
            className="rounded-full px-4 py-2 text-sm font-medium transition-colors"
            disabled={isLoading} // Disable if loading
          >
            Monthly
          </Button>
          <Button
            onClick={() => setBillingCycle("yearly")}
            variant={billingCycle === "yearly" ? "default" : "outline"}
            className="rounded-full px-4 py-2 text-sm font-medium transition-colors"
            disabled={isLoading} // Disable if loading
          >
            Yearly (20% off)
          </Button>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`flex flex-col ${plan.popular ? "border-2 border-purple-600 shadow-lg dark:border-purple-400" : "border-gray-200 dark:border-gray-700"}`}
            >
              {plan.popular && (
                <Badge variant="secondary" className="absolute -top-3 -right-3 bg-purple-600 text-white dark:bg-purple-400 dark:text-gray-900">
                  Most Popular
                </Badge>
              )}

              <CardHeader className="items-start">
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight">
                    ${billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice}
                  </span>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {billingCycle === "monthly" ? "/month" : "/year"}
                  </span>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-grow space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className={`w-full ${plan.popular ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}`}
                  onClick={() => {
                    const priceIdToUse = billingCycle === "monthly" ? plan.monthlyPriceId : plan.yearlyPriceId;
                    if (priceIdToUse) {
                      onSelectPlan(priceIdToUse);
                    } else {
                      console.warn("Price ID is undefined for the selected plan and billing cycle.");
                      // Optionally, fall back to a default or show an error
                    }
                  }}
                  // Disable button if priceId is not available OR if overall isLoading is true
                  disabled={isLoading || !(billingCycle === "monthly" ? plan.monthlyPriceId : plan.yearlyPriceId)}
                >
                  Get Started
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
          All plans include a 14-day free trial. No credit card required.
        </div>
      </div>
    </section>
  )
}
