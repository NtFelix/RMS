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

/**
 * Natural sort function that handles numeric prefixes correctly.
 * Sorts "1. First", "2. Second", "10. Tenth" in the correct order.
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns number - Comparison result for sorting
 */
export function naturalSort(a: string, b: string): number {
  // Extract numeric prefix and remaining text
  const extractParts = (str: string) => {
    const match = str.match(/^(\d+)\.?\s*(.*)/);
    if (match) {
      return {
        number: parseInt(match[1], 10),
        text: match[2] || str
      };
    }
    return {
      number: null,
      text: str
    };
  };

  const partsA = extractParts(a);
  const partsB = extractParts(b);

  // If both have numeric prefixes, sort by number first
  if (partsA.number !== null && partsB.number !== null) {
    if (partsA.number !== partsB.number) {
      return partsA.number - partsB.number;
    }
    // If numbers are equal, sort by remaining text
    return partsA.text.localeCompare(partsB.text);
  }

  // If only one has a numeric prefix, put numbered items first
  if (partsA.number !== null && partsB.number === null) {
    return -1;
  }
  if (partsA.number === null && partsB.number !== null) {
    return 1;
  }

  // If neither has numeric prefix, use regular string comparison
  return a.localeCompare(b);
}

/**
 * Rounds a number to the nearest 5 euros.
 * Used for calculating recommended prepayment amounts.
 * @param value - The value to round
 * @returns number - The value rounded to the nearest 5
 */
export function roundToNearest5(value: number): number {
  return Math.round(value / 5) * 5;
}
