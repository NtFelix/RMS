'use client';

import React from 'react';
import { Check } from "lucide-react";
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
import { type Plan, type GroupedPlan } from './pricing-comparison';
import { trackPricingPlanSelected } from '@/lib/posthog-landing-events';

interface PricingCardProps {
  group: GroupedPlan;
  billingCycle: 'monthly' | 'yearly';
  getButtonTextAndState: (priceId: string) => { text: string; disabled: boolean };
  onSelectPlan: (priceId: string) => void;
  formatDisplayPrice: (amount: number, currency: string, interval: string | null) => string;
}

export function PricingCard({
  group,
  billingCycle,
  getButtonTextAndState,
  onSelectPlan,
  formatDisplayPrice
}: PricingCardProps) {
  const planToDisplay = billingCycle === 'monthly' ? group.monthly : group.annually;
  
  if (!planToDisplay) return null;

  return (
    <Card
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
        <CardDescription className="mt-2 h-12 overflow-hidden">
          {group.description || `Unser ${group.productName} Plan.`}
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
}
