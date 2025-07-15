import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Appended to lib/utils.ts



/**
 * Calculates the overall subscription activity status for a user,
 * considering Stripe subscription status only.
 * @param profile - User profile object containing subscription status.
 * @returns boolean - True if the user has an active subscription.
 */
export function calculateOverallSubscriptionActivity(profile: {
  stripe_subscription_status?: string | null;
}): boolean {
  const hasActiveStripeSubscription =
    profile.stripe_subscription_status === 'active' ||
    profile.stripe_subscription_status === 'trialing';

  return hasActiveStripeSubscription;
}
