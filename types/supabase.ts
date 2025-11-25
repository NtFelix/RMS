// types/supabase.ts
export interface Profile {
  id: string;
  email?: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_subscription_status?: string | null;
  stripe_price_id?: string | null;
  stripe_current_period_end?: string | null;
  onboarding_completed?: boolean;
}
