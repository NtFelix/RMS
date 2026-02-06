import Stripe from 'stripe';
import { STRIPE_CONFIG } from './constants/stripe';

/**
 * Values that indicate no storage is included in the plan.
 * These are treated as 0 bytes (no storage access).
 */
const NO_STORAGE_VALUES = [
  'nicht enthalten',
  'false',
  'no',
  'none',
  '0',
  '-',
];

/**
 * Parses a storage size string (e.g., "1 GB", "10 GB", "1 TB") into bytes.
 * Returns 0 if no storage limit is set or value indicates no storage.
 * Returns the parsed bytes if valid storage string.
 */
export function parseStorageString(storageString: string | undefined | null): number {
  // No metadata = no storage access
  if (!storageString || typeof storageString !== 'string') {
    return 0;
  }

  const trimmed = storageString.trim().toLowerCase();

  // Check for values that explicitly indicate no storage
  if (NO_STORAGE_VALUES.includes(trimmed)) {
    return 0;
  }

  const match = storageString.trim().match(/^([\d.]+)\s*(B|KB|MB|GB|TB)$/i);
  if (!match) {
    // Invalid format = no storage access
    return 0;
  }

  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();

  if (isNaN(value) || value < 0) {
    return 0;
  }

  const multipliers: Record<string, number> = {
    'B': 1,
    'KB': 1024,
    'MB': 1024 * 1024,
    'GB': 1024 * 1024 * 1024,
    'TB': 1024 * 1024 * 1024 * 1024,
  };

  return Math.round(value * multipliers[unit]);
}

// Simple in-memory cache
interface CacheEntry {
  data: any;
  timestamp: number;
}

// Use a global variable to persist cache across module reloads in development
// and across invocations in serverless/edge environments (if container is reused)
const globalCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 3600 * 1000; // 1 hour

export async function getPlanDetails(priceId: string) {
  // Check cache
  const cacheKey = `plan-details-${priceId}`;
  const cached = globalCache.get(cacheKey);

  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

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

    // Parse storage limit from feat_storage metadata
    const featStorageString = price.metadata.feat_storage || product.metadata.feat_storage;
    const storageLimitValue = parseStorageString(featStorageString);

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
      storageLimit: storageLimitValue, // Storage limit in bytes or null for unlimited
    };

    // Set cache
    globalCache.set(cacheKey, {
      data: planDetails,
      timestamp: Date.now(),
    });

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
