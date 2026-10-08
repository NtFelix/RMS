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
  limit_wohnungen: number | null;
}

export interface UserProfileWithSubscription extends SupabaseProfile {
  currentWohnungenCount?: number;
  /** Pre-computed storage usage of the organisation, undefined if not requested or not loadable */
  storage?: { usedBytes: number; documentCount: number };
  /** Plan storage limit in bytes: 0 = no storage included, null = unlimited, undefined = unknown */
  storageLimit?: number | null;
  activePlan?: SubscriptionPlan | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_cancel_at_period_end?: boolean | null;
}
