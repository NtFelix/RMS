export const runtime = 'edge';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { STRIPE_CONFIG } from '@/lib/constants/stripe';
import { StripePlan } from '@/types/stripe';
import { parseStorageString } from '@/lib/stripe-server';

import { isTestEnv, isStripeMocked } from '@/lib/test-utils';

export async function GET() {
  if (isStripeMocked()) {
    // Only log in non-CI environments to avoid cluttering test output
    if (process.env.CI !== 'true' && !process.env.STRIPE_SECRET_KEY?.startsWith('mock-')) {
      console.error('Stripe secret key not configured or is a mock key');
    }

    if (isTestEnv() || isStripeMocked()) {
      return NextResponse.json([{
        id: 'price_mock_starter',
        priceId: 'price_mock_starter',
        name: 'Starter Plan (Mock)',
        productName: 'Starter',
        price: 990,
        currency: 'eur',
        interval: 'month',
        interval_count: 1,
        features: ['Up to 5 units', 'Basic support'],
        limit_wohnungen: 5,
        storage_limit: 1024 * 1024 * 1024,
        position: 1,
        description: 'Mock starter plan for testing',
        metadata: { feat_units: '5', feat_storage: '1 GB' }
      }, {
        id: 'price_mock_pro',
        priceId: 'price_mock_pro',
        name: 'Pro Plan (Mock)',
        productName: 'Pro',
        price: 2990,
        currency: 'eur',
        interval: 'month',
        interval_count: 1,
        features: ['Up to 50 units', 'Priority support'],
        limit_wohnungen: 50,
        storage_limit: 10 * 1024 * 1024 * 1024,
        position: 2,
        description: 'Mock pro plan for testing',
        metadata: { feat_units: '50', feat_storage: '10 GB' }
      }]);
    }

    return NextResponse.json({ error: 'Stripe secret key not configured.' }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, STRIPE_CONFIG);

  try {
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product'], // Expand product data for each price
    });

    const plans: StripePlan[] = prices.data.map(price => {
      const product = price.product as Stripe.Product; // Type assertion after expansion

      let featuresArray: string[] = [];
      // Prefer features from Price metadata, then Product metadata
      const featuresMetadata = price.metadata.features || product.metadata.features;
      if (featuresMetadata) {
        featuresArray = featuresMetadata.split(',').map(f => f.trim());
      }

      let limitWohnungen: number | undefined = undefined;
      const limitWohnungenMetadata = price.metadata.limit_wohnungen || product.metadata.limit_wohnungen;
      if (limitWohnungenMetadata) {
        const parsedLimit = parseInt(limitWohnungenMetadata, 10);
        if (!isNaN(parsedLimit)) {
          limitWohnungen = parsedLimit;
        }
      }

      // Parse storage limit from feat_storage metadata (e.g., "10 GB" -> bytes)
      const storageLimitMetadata = price.metadata.feat_storage || product.metadata.feat_storage;
      const storageLimit = parseStorageString(storageLimitMetadata);


      // Position should ideally be on the Product, as it defines the display order of products.
      // If plans within a product need specific ordering beyond monthly/annual, that's a different case.
      let position: number | undefined = undefined;
      const positionMetadata = product.metadata.position || price.metadata.position; // Prefer product position
      if (positionMetadata) {
        const parsedPosition = parseInt(positionMetadata, 10);
        if (!isNaN(parsedPosition)) {
          position = parsedPosition;
        }
      }

      // productName is the underlying Stripe Product's name.
      // name can be the Price's nickname (e.g., "Monthly Plan", "Annual Plan") or fallback to Product's name.
      const productName = product.name;
      const displayName = price.nickname || product.name; // This is what was 'name' before

      return {
        id: price.id,
        priceId: price.id,
        name: displayName, // e.g., "Monthly Subscription" or "Pro Plan" if nickname is not set
        productName: productName, // e.g., "Pro Plan" - used for grouping
        price: price.unit_amount || 0,
        currency: price.currency,
        interval: price.recurring?.interval || null,
        interval_count: price.recurring?.interval_count || null,
        features: featuresArray,
        limit_wohnungen: limitWohnungen ?? null,
        storage_limit: storageLimit, // Storage limit in bytes, 0 means no storage access
        position: position, // This position is used to sort products
        description: product.description || '',
        metadata: product.metadata, // Pass all metadata to frontend
      };
    });

    // Sort plans primarily by product position, then by interval (e.g., monthly before yearly if positions are same)
    plans.sort((a, b) => {
      const posA = a.position ?? Infinity;
      const posB = b.position ?? Infinity;
      if (posA !== posB) {
        return posA - posB;
      }
      // Optional: if product positions are the same, you might want a secondary sort
      // For example, by interval (month before year) or price
      if (a.interval === 'month' && b.interval === 'year') return -1;
      if (a.interval === 'year' && b.interval === 'month') return 1;
      return 0;
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
        raw: error.raw
      });
      errorMessage = error.message;
    } else if (error instanceof Error) {
      console.error('Generic Error when fetching plans:', error.message, error.stack);
      errorMessage = error.message;
    } else {
      console.error('Unknown error object when fetching plans:', error);
    }
    return NextResponse.json({ error: 'Failed to fetch plans from Stripe.', details: errorMessage }, { status: 500 });
  }
}
