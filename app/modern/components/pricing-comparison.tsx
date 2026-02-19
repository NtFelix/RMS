'use client';

import React, { useMemo, Fragment } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Minus, HelpCircle } from "lucide-react";

// Updated Plan interface to match the API response structure
export interface Plan {
  id: string; // Stripe Price ID
  name: string;
  price: number; // unit_amount in cents
  currency: string;
  interval: string | null;
  interval_count: number | null;
  features: string[];
  limit_wohnungen?: number;
  priceId: string;
  position?: number;
  productName: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface GroupedPlan {
  productName: string;
  features: string[];
  description?: string;
  monthly: Plan | null;
  annually: Plan | null;
  position?: number;
  popular?: boolean;
}

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

// Helper function to format price for display
const formatDisplayPrice = (amount: number, currency: string, interval: string | null): string => {
  return (amount / 100).toLocaleString('de-DE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  });
};

function FeatureValue({ value }: { value: boolean | string }) {
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

interface ComparisonTableProps {
  plans: GroupedPlan[];
  billingCycle: "monthly" | "yearly";
  onSelectPlan: (priceId: string) => void;
  getButtonTextAndState: (priceId: string) => { text: string; disabled: boolean };
}

export function ComparisonTable({ plans, billingCycle, onSelectPlan, getButtonTextAndState }: ComparisonTableProps) {
  const filteredConfig = useMemo(() => {
    return comparisonConfig.map(category => {
      const activeFeatures = category.features.filter(feature => {
        return plans.some(plan => {
          const metadata = plan.monthly?.metadata || plan.annually?.metadata || {};
          return metadata && metadata[feature.key] !== undefined;
        });
      });

      return {
        ...category,
        features: activeFeatures
      };
    }).filter(category => category.features.length > 0);
  }, [plans]);

  if (plans.length === 0 || filteredConfig.length === 0) return null;

  const gridTemplateColumns = `minmax(200px, 1.5fr) repeat(${plans.length}, minmax(180px, 1fr))`;

  return (
    <div className="mt-24 max-w-7xl mx-auto px-4">
      <div className="text-center mb-16">
        <h3 className="text-2xl font-bold mb-4">Funktionen im Vergleich</h3>
        <p className="text-muted-foreground">Detaillierte Übersicht aller Features und Limits.</p>
      </div>

      <div className="overflow-x-auto pb-12 pt-4 -mx-4 px-4">
        <div
          className="grid relative min-w-[900px] isolate"
          style={{ gridTemplateColumns }}
        >
          <div className="p-6 flex items-end font-bold text-xl pb-6">Vergleich</div>
          {plans.map((plan) => (
            <div key={plan.productName} className="p-6 text-center flex flex-col justify-end pb-6">
              <span className={`font-bold text-2xl ${plan.popular ? 'text-primary' : ''}`}>{plan.productName}</span>
            </div>
          ))}

          <div className="p-4 pl-6 min-h-[60px]"></div>
          {plans.map((plan) => {
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

          <div className="p-4 pl-6 min-h-[60px]"></div>
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

          {filteredConfig.map((category, catIndex) => (
            <Fragment key={catIndex}>
              <div
                className="p-4 pl-6 font-semibold text-sm text-muted-foreground uppercase tracking-wider mt-2 mb-2 flex items-center after:content-[''] after:flex-1 after:h-px after:bg-border after:ml-4"
                style={{ gridColumn: `1 / span ${plans.length + 1}` }}
              >
                {category.category}
              </div>

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

                  {plans.map((plan) => {
                    const metadata = plan.monthly?.metadata || plan.annually?.metadata || {};
                    const rawValue = metadata[feature.key];
                    let valueToRender: string | boolean = rawValue || false;

                    if (feature.type === 'boolean') {
                      valueToRender = rawValue === 'true';
                    }

                    return (
                      <div key={`${plan.productName}-${feature.key}`} className="p-4 flex justify-center items-center border-b border-border/40 min-h-[60px]">
                        <FeatureValue value={valueToRender} />
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
