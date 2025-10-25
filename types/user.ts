import type { Profile as SupabaseProfile } from './supabase';

export interface SubscriptionPlan {
  priceId: string;
  name: string;
  productName?: string;
  description?: string;
  price: number | null;
  currency: string;
  interval?: string | null;
  interval_count?: number | null;
  features: string[];
  limitWohnungen: number | null;
}

export interface UserProfileWithSubscription extends SupabaseProfile {
  currentWohnungenCount?: number;
  activePlan?: SubscriptionPlan | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_cancel_at_period_end?: boolean | null;
}
