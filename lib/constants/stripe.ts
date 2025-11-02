/**
 * Stripe API Configuration
 * 
 * This file contains shared Stripe configuration constants.
 * Update the API version here to apply it across the entire application.
 */

export const STRIPE_API_VERSION = '2025-10-29.clover' as const;
export const STRIPE_CONFIG = {
  apiVersion: STRIPE_API_VERSION,
} as const;
