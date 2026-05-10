import Stripe from 'stripe';
import { STRIPE_CONFIG } from './constants/stripe';

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
    stripeClient = new Stripe(key, STRIPE_CONFIG);
  }
  return stripeClient;
}
