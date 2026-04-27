/**
 * Centralized apartment limit normalization logic.
 * 
 * Rule: null, 0, or negative values = unlimited (Infinity)
 * Positive values = actual limit
 * 
 * This ensures consistent behavior across server, client, and API routes.
 */

export type ApartmentLimit = number | typeof Infinity | null;

/**
 * Normalizes a raw apartment limit value from plan details.
 * 
 * @param limit - Raw limit value from plan (limit_wohnungen)
 * @returns Normalized limit: Infinity for unlimited, positive number for actual limit, null if no plan
 * 
 * @example
 * normalizeApartmentLimit(null) // Infinity (unlimited)
 * normalizeApartmentLimit(0) // Infinity (unlimited)
 * normalizeApartmentLimit(-1) // Infinity (unlimited)
 * normalizeApartmentLimit(5) // 5
 * normalizeApartmentLimit(undefined) // null (no plan data)
 */
export function normalizeApartmentLimit(
  limit: number | null | undefined
): number | typeof Infinity | null {
  // Missing/undefined data = couldn't determine limit (caller should handle as error/fallback)
  if (limit === undefined) {
    return null;
  }
  
  // Explicitly null or 0/negative = unlimited
  if (limit === null || limit <= 0) {
    return Infinity;
  }
  
  return limit; // Positive number = actual limit
}

/**
 * Gets the effective apartment limit considering trial status.
 * 
 * For trial users: defaults to 5, but can be higher if plan allows
 * For active subscribers: uses plan limit (normalized)
 * 
 * @param planLimit - Raw limit from plan (limit_wohnungen)
 * @param isTrialing - Whether user is in trial period
 * @param trialDefault - Default limit for trial users (default: 5)
 * @returns Effective limit for the user
 */
export function getEffectiveApartmentLimit(
  planLimit: number | null | undefined,
  isTrialing: boolean,
  trialDefault: number = 5
): number | typeof Infinity {
  const normalizedLimit = normalizeApartmentLimit(planLimit);
  
  // If no plan data, trial users get default, others get 0 (ineligible)
  if (normalizedLimit === null) {
    return isTrialing ? trialDefault : 0;
  }
  
  // For trial users: use max of trial default or plan limit
  // This allows trials with unlimited plans to have unlimited apartments
  if (isTrialing) {
    if (normalizedLimit === Infinity) {
      return Infinity;
    }
    return Math.max(trialDefault, normalizedLimit);
  }
  
  // For active subscribers: use normalized plan limit
  return normalizedLimit;
}

/**
 * Checks if a user is eligible to add apartments based on subscription status.
 * 
 * @param subscriptionStatus - Stripe subscription status
 * @param hasPriceId - Whether user has a stripe_price_id
 * @returns Boolean indicating eligibility
 */
export function isEligibleForApartments(
  subscriptionStatus: string | null | undefined,
  hasPriceId: boolean
): boolean {
  if (subscriptionStatus === 'trialing') {
    return true; // Trial users are eligible
  }
  
  if (subscriptionStatus === 'active' && hasPriceId) {
    return true; // Active subscribers with plan are eligible
  }
  
  return false;
}

/**
 * Determines if user has reached their apartment limit.
 * 
 * @param currentCount - Current number of apartments
 * @param limit - Apartment limit (Infinity = unlimited)
 * @returns Boolean indicating if limit is reached
 */
export function hasReachedApartmentLimit(
  currentCount: number,
  limit: number | typeof Infinity
): boolean {
  if (limit === Infinity) {
    return false; // Unlimited = never reached
  }
  
  return currentCount >= limit;
}
