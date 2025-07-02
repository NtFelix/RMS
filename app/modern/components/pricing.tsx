"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Plan {
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyPriceId: string; // Added
  yearlyPriceId: string; // Added
  description: string;
  features: string[];
  popular: boolean;
}

interface PricingSectionProps {
  onSelectPlan: (priceId: string) => void;
  isLoading?: boolean;
}

export default function PricingSection({ onSelectPlan, isLoading = false }: PricingSectionProps) {
  const [billingCycle, setBillingCycle] = useState("monthly")

  // TODO: User needs to update these placeholder price IDs
  const plans: Plan[] = [
    {
      name: "Starter",
      monthlyPrice: 9,
      yearlyPrice: 9 * 10,
      monthlyPriceId: "price_starter_monthly_placeholder_internal", // Placeholder
      yearlyPriceId: "price_starter_yearly_placeholder_internal",   // Placeholder
      description: "Perfect for individuals getting started",
      features: ["Up to 5 projects", "10GB storage", "Basic support", "Standard templates", "Mobile app access"],
      popular: false,
    },
    {
      name: "Professional",
      monthlyPrice: 29,
      yearlyPrice: 29 * 10,
      monthlyPriceId: "price_professional_monthly_placeholder_internal", // Placeholder
      yearlyPriceId: "price_professional_yearly_placeholder_internal",   // Placeholder
      description: "Best for growing teams and businesses",
      features: [
        "Unlimited projects",
        "100GB storage",
        "Priority support",
        "Premium templates",
        "Advanced analytics",
        "Team collaboration",
        "Custom integrations",
      ],
      popular: true,
    },
    {
      name: "Enterprise",
      monthlyPrice: 99,
      yearlyPrice: 99 * 10,
      monthlyPriceId: "price_enterprise_monthly_placeholder_internal", // Placeholder
      yearlyPriceId: "price_enterprise_yearly_placeholder_internal",   // Placeholder
      description: "For large organizations with advanced needs",
      features: [
        "Everything in Professional",
        "Unlimited storage",
        "24/7 dedicated support",
        "Custom development",
        "Advanced security",
        "SSO integration",
        "API access",
        "White-label options",
      ],
      popular: false,
    },
  ]

  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-100 dark:bg-gray-800">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Simple, Transparent Pricing</h2>
          <p className="max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
            Choose the perfect plan for your needs. Upgrade or downgrade at any time.
          </p>
        </div>

        {/* Add the billing cycle selector here */}
        <div className="mt-8 flex justify-center space-x-2">
          <Button
            onClick={() => setBillingCycle("monthly")}
            variant={billingCycle === "monthly" ? "default" : "outline"}
            className="rounded-full px-4 py-2 text-sm font-medium transition-colors"
            disabled={isLoading}
          >
            Monthly
          </Button>
          <Button
            onClick={() => setBillingCycle("yearly")}
            variant={billingCycle === "yearly" ? "default" : "outline"}
            className="rounded-full px-4 py-2 text-sm font-medium transition-colors"
            disabled={isLoading}
          >
            Yearly (20% off)
          </Button>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`flex flex-col ${plan.popular ? "border-2 border-blue-600 shadow-lg dark:border-blue-500" : "border-gray-200 dark:border-gray-700"}`}
            >
              {plan.popular && (
                <Badge variant="secondary" className="absolute -top-3 -right-3 bg-blue-600 text-white dark:bg-blue-500 dark:text-gray-900">
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
                      <Check className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className={`w-full ${plan.popular ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-50 dark:hover:bg-gray-200 dark:text-gray-900"}`}
                  onClick={() => {
                    const priceIdToUse = billingCycle === "monthly" ? plan.monthlyPriceId : plan.yearlyPriceId;
                    onSelectPlan(priceIdToUse);
                  }}
                  disabled={isLoading}
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
