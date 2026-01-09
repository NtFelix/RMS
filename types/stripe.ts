import { Stripe } from 'stripe';

export interface StripePlan {
  id: string;
  name: string;
  productName: string;
  price: number;
  priceId: string;
  interval: Stripe.Price.Recurring.Interval | null;
  interval_count: number | null;
  currency: string;
  limit_wohnungen: number | null;
  features: string[];
  mostPopular?: boolean;
  description: string;
  position?: number;
  metadata?: Record<string, string>;
}
