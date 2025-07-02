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
  monthlyPriceId: string;
  yearlyPriceId: string;
  description: string;
  features: string[];
  popular: boolean;
}

interface PricingProps {
  onSelectPlan: (priceId: string) => void;
}

export default function Pricing({ onSelectPlan }: PricingProps) {
  const [billingCycle, setBillingCycle] = useState("monthly")

  const plans: Plan[] = [
    {
      name: "Starter",
      monthlyPrice: 9,
      yearlyPrice: 90,
      monthlyPriceId: "price_starter_monthly",
      yearlyPriceId: "price_starter_yearly",
      description: "Perfect for individuals getting started",
      features: ["Up to 5 projects", "10GB storage", "Basic support", "Standard templates", "Mobile app access"],
      popular: false,
    },
    {
      name: "Professional",
      monthlyPrice: 29,
      yearlyPrice: 290,
      monthlyPriceId: "price_professional_monthly",
      yearlyPriceId: "price_professional_yearly",
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
      yearlyPrice: 990,
      monthlyPriceId: "price_enterprise_monthly",
      yearlyPriceId: "price_enterprise_yearly",
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
    <section className="w-full py-16 md:py-24 lg:py-32 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-6 text-center mb-12">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">Simple, Transparent Pricing</h1>
            <p className="max-w-[900px] text-muted-foreground text-lg md:text-xl lg:text-lg xl:text-xl">
              Choose the perfect plan for your needs. Upgrade or downgrade at any time.
            </p>
          </div>
        </div>

        {/* Billing cycle selector */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center rounded-full bg-muted p-1 shadow-sm">
            <Button
              variant={billingCycle === "monthly" ? "primary" : "ghost"}
              onClick={() => setBillingCycle("monthly")}
              className={`rounded-full px-6 py-2 text-base font-semibold transition-all duration-300 ease-in-out ${
                billingCycle === "monthly" ? "text-primary-foreground bg-primary shadow-md" : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              Monthly
            </Button>
            <Button
              variant={billingCycle === "yearly" ? "primary" : "ghost"}
              onClick={() => setBillingCycle("yearly")}
              className={`rounded-full px-6 py-2 text-base font-semibold transition-all duration-300 ease-in-out ${
                billingCycle === "yearly" ? "text-primary-foreground bg-primary shadow-md" : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              Yearly (Save 20%)
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 items-stretch">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`flex flex-col rounded-xl shadow-lg transition-all duration-300 ease-in-out hover:shadow-2xl ${
                plan.popular ? "border-2 border-primary ring-2 ring-primary/50 relative" : "border border-border/50"
              } bg-card`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3.5 right-6 px-3 py-1 text-sm font-semibold bg-primary text-primary-foreground rounded-full shadow-md">
                  Most Popular
                </Badge>
              )}

              <CardHeader className="pb-6 pt-8">
                <CardTitle className="text-3xl font-extrabold mb-2">{plan.name}</CardTitle>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold tracking-tight">
                    ${billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice}
                  </span>
                  <span className="text-lg text-muted-foreground">
                    {billingCycle === "monthly" ? "/month" : "/year"}
                  </span>
                </div>
                <CardDescription className="text-base text-muted-foreground pt-3 min-h-[40px]">{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-grow pt-0 pb-8">
                <ul className="grid gap-3 text-base">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-card-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pt-2 pb-8">
                <Button
                  size="lg"
                  className={`w-full text-lg font-semibold py-3 rounded-lg shadow-md transition-all duration-300 ease-in-out hover:scale-105 ${
                    plan.popular ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                  onClick={() => onSelectPlan(billingCycle === "monthly" ? plan.monthlyPriceId : plan.yearlyPriceId)}
                >
                  Get Started
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center text-base text-muted-foreground">
          All plans include a 14-day free trial. No credit card required.
        </div>
      </div>
    </section>
  )
}
