// types/supabase.ts
export interface Profile {
  id: string; // Or user_id, depending on your schema
  email?: string;
  // ... other existing profile fields
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_subscription_status?: string | null;
  stripe_price_id?: string | null;
  stripe_current_period_end?: string | null; // Or Date
  onboarding_completed?: boolean;
}
