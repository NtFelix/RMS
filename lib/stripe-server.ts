import Stripe from 'stripe';
import { STRIPE_CONFIG } from './constants/stripe';

export async function getPlanDetails(priceId: string) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, STRIPE_CONFIG);

  try {
    const price = await stripe.prices.retrieve(priceId, {
      expand: ['product'],
    });

    if (!price || !price.product || typeof price.product === 'string') {
      // Check if product is not a string, meaning it's an expanded Product object
      throw new Error('Price or product not found or product not expanded');
    }

    const product = price.product as Stripe.Product; // Type assertion

    let limitWohnungenValue: number | null = null;
    const limitWohnungenString = price.metadata.limit_wohnungen || product.metadata.limit_wohnungen;
    if (limitWohnungenString) {
      const parsedLimit = parseInt(limitWohnungenString, 10);
      if (!isNaN(parsedLimit)) {
        limitWohnungenValue = parsedLimit;
      }
    }

    let featuresArray: string[] = [];
    const featuresString = price.metadata.features || product.metadata.features;
    if (featuresString && typeof featuresString === 'string') {
      featuresArray = featuresString.split(',').map(f => f.trim()).filter(f => f); // filter empty strings
    }

    const planDetails = {
      priceId: price.id,
      name: price.nickname || product.name,
      productName: product.name,
      description: product.description,
      price: price.unit_amount,
      currency: price.currency,
      interval: price.recurring?.interval || null,
      interval_count: price.recurring?.interval_count || null,
      features: featuresArray, // Now a string[]
      limitWohnungen: limitWohnungenValue, // Now a number or null
    };

    return planDetails;
  } catch (error) {
    console.error('Error fetching plan details from Stripe:', error);
    // Handle specific Stripe errors if needed, e.g., 'resource_missing'
    if (error instanceof Stripe.errors.StripeError && error.code === 'resource_missing') {
      return null; // Or throw a custom error indicating priceId not found
    }
    throw error; // Re-throw other errors
  }
}