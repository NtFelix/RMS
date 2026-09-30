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
  /** Storage limit in bytes, 0 = no storage included, null/undefined = unlimited */
  storageLimit?: number | null;
}

export interface UserProfileWithSubscription extends SupabaseProfile {
  currentWohnungenCount?: number;
  /** Pre-computed storage usage of the organisation in bytes */
  storageUsedBytes?: number;
  /** Pre-computed number of documents of the organisation */
  documentCount?: number;
  activePlan?: SubscriptionPlan | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_cancel_at_period_end?: boolean | null;
}
