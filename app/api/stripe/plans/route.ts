import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Define the Plan interface that will be returned by the API
interface Plan {
  id: string; // Stripe Price ID
  name: string;
  price: number; // unit_amount in cents
  currency: string;
  interval: string | null; // e.g., 'month', 'year'
  interval_count: number | null;
  features: string[];
  limit_wohnungen?: number;
  // priceId is the same as id, kept for consistency if frontend expects it explicitly
  priceId: string;
}

export async function GET() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('Stripe secret key not configured');
    return NextResponse.json({ error: 'Stripe secret key not configured.' }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-05-28.basil', // Use your desired API version
  });

  try {
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product'], // Expand product data for each price
    });

    const plans: Plan[] = prices.data.map(price => {
      const product = price.product as Stripe.Product; // Type assertion after expansion

      let featuresArray: string[] = [];
      if (price.metadata.features) {
        featuresArray = price.metadata.features.split(',').map(f => f.trim());
      } else if (product.metadata.features) {
        // Fallback to product metadata if price metadata is missing
        featuresArray = product.metadata.features.split(',').map(f => f.trim());
      }

      let limitWohnungen: number | undefined = undefined;
      if (price.metadata.limit_wohnungen) {
        limitWohnungen = parseInt(price.metadata.limit_wohnungen, 10);
      } else if (product.metadata.limit_wohnungen) {
        // Fallback to product metadata
        limitWohnungen = parseInt(product.metadata.limit_wohnungen, 10);
      }
      if (isNaN(limitWohnungen!)) { // Check if parsing resulted in NaN
          limitWohnungen = undefined;
      }


      return {
        id: price.id,
        priceId: price.id,
        name: price.nickname || product.name,
        price: price.unit_amount || 0, // Default to 0 if null
        currency: price.currency,
        interval: price.recurring?.interval || null,
        interval_count: price.recurring?.interval_count || null,
        features: featuresArray,
        limit_wohnungen: limitWohnungen,
      };
    });

    return NextResponse.json(plans);

  } catch (error) {
    let errorMessage = 'An unknown error occurred while fetching plans.';
    if (error instanceof Stripe.errors.StripeError) {
      console.error('Stripe API Error Details:', {
        type: error.type,
        code: error.code,
        statusCode: error.statusCode,
        message: error.message,
        param: error.param,
        requestId: error.requestId,
        raw: error.raw // Contains the full raw error
      });
      errorMessage = error.message; // Keep a user-friendly message for the client
    } else if (error instanceof Error) {
      console.error('Generic Error when fetching plans:', error.message, error.stack);
      errorMessage = error.message;
    } else {
      console.error('Unknown error object when fetching plans:', error);
    }
    return NextResponse.json({ error: 'Failed to fetch plans from Stripe.', details: errorMessage }, { status: 500 });
  }
}
