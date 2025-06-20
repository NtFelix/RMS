import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Appended to lib/utils.ts

/**
 * Checks if a user is currently within their active trial period.
 * @param trial_starts_at - The start date string of the trial.
 * @param trial_ends_at - The end date string of the trial.
 * @returns boolean - True if the trial is currently active, false otherwise.
 */
export function isUserInActiveTrial(
  trial_starts_at: string | null | undefined,
  trial_ends_at: string | null | undefined
): boolean {
  const now = new Date();
  if (!trial_ends_at || !trial_starts_at) {
    return false;
  }
  const trialEnds = new Date(trial_ends_at);
  const trialStarts = new Date(trial_starts_at);
  return trialEnds > now && trialStarts <= now;
}

/**
 * Calculates the overall subscription activity status for a user,
 * considering both Stripe subscription and custom trial period.
 * @param profile - User profile object containing subscription and trial date strings.
 * @returns boolean - True if the user has an active subscription or is in an active trial.
 */
export function calculateOverallSubscriptionActivity(profile: {
  stripe_subscription_status?: string | null;
  trial_starts_at?: string | null | undefined;
  trial_ends_at?: string | null | undefined;
}): boolean {
  const hasActiveStripeSubscription =
    profile.stripe_subscription_status === 'active' ||
    profile.stripe_subscription_status === 'trialing';

  const isInActiveTrial = isUserInActiveTrial(
    profile.trial_starts_at,
    profile.trial_ends_at
  );

  return hasActiveStripeSubscription || isInActiveTrial;
}
