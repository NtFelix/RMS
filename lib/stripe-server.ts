import Stripe from 'stripe';
import { STRIPE_CONFIG } from './constants/stripe';
import { isTestEnv, isStripeMocked } from './test-utils';

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

export interface PlanDetails {
  priceId: string;
  name: string;
  productName: string;
  description: string | null;
  price: number | null;
  currency: string;
  interval: string | null;
  interval_count: number | null;
  features: string[];
  limit_wohnungen: number | null;
  storageLimit: number; // bytes, 0 for no storage
}

// Simple in-memory cache. Stored on globalThis so it survives module re-evaluation (HMR in dev).
// In serverless/edge environments it is per isolate/container, so it is best-effort only.
interface CacheEntry {
  data: PlanDetails | null; // null = price not found (negative cache)
  expiresAt: number;
}

const globalForCache = globalThis as unknown as {
  __planDetailsCache?: Map<string, CacheEntry>;
  __planDetailsInflight?: Map<string, Promise<PlanDetails | null>>;
};
const planCache = (globalForCache.__planDetailsCache ??= new Map<string, CacheEntry>());
const inflight = (globalForCache.__planDetailsInflight ??= new Map<string, Promise<PlanDetails | null>>());
const CACHE_TTL_MS = 3600 * 1000; // 1 hour
const NEGATIVE_CACHE_TTL_MS = 60 * 1000; // 1 minute

const planCacheKey = (priceId: string) => `plan-details-${priceId}`;

/**
 * Drops cached plan details for one price (or all prices when omitted).
 * Call this e.g. from a Stripe webhook on price.updated / product.updated.
 */
export function clearPlanDetailsCache(priceId?: string) {
  if (priceId === undefined) {
    planCache.clear();
    inflight.clear();
    return;
  }
  planCache.delete(planCacheKey(priceId));
  inflight.delete(planCacheKey(priceId));
}

export async function getPlanDetails(priceId: string): Promise<PlanDetails | null> {
  if (isStripeMocked() || (isTestEnv() && (priceId?.includes('mock') ?? false))) {
    if (isTestEnv()) {
      console.warn(`STRIPE_SECRET_KEY is not set or mock ID detected (${priceId}), using mock plan details`);
      return {
        priceId: priceId,
        name: 'Test Plan',
        productName: 'Test Product',
        description: 'Mock plan for testing',
        price: 0,
        currency: 'eur',
        interval: 'month',
        interval_count: 1,
        features: [],
        limit_wohnungen: 100,
        storageLimit: 1024 * 1024 * 1024,
      };
    }
    throw new Error('STRIPE_SECRET_KEY is not set');
  }

  // Check cache (mock responses above are intentionally never cached)
  const cacheKey = planCacheKey(priceId);
  const cached = planCache.get(cacheKey);
  if (cached) {
    if (Date.now() < cached.expiresAt) {
      // Return a copy so callers can't mutate the shared cache entry
      return cached.data && structuredClone(cached.data);
    }
    planCache.delete(cacheKey);
  }

  // Collapse concurrent cache misses for the same price into one Stripe request
  let request = inflight.get(cacheKey);
  if (!request) {
    const created: Promise<PlanDetails | null> = fetchPlanDetails(priceId)
      .then((data) => {
        if (inflight.get(cacheKey) === created) {
          planCache.set(cacheKey, {
            data,
            expiresAt: Date.now() + (data ? CACHE_TTL_MS : NEGATIVE_CACHE_TTL_MS),
          });
        }
        return data;
      })
      .finally(() => {
        if (inflight.get(cacheKey) === created) {
          inflight.delete(cacheKey);
        }
      });
    inflight.set(cacheKey, created);
    request = created;
  }

  const data = await request;
  return data && structuredClone(data);
}

async function fetchPlanDetails(priceId: string): Promise<PlanDetails | null> {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, STRIPE_CONFIG);

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

    const planDetails: PlanDetails = {
      priceId: price.id,
      name: price.nickname || product.name,
      productName: product.name,
      description: product.description,
      price: price.unit_amount,
      currency: price.currency,
      interval: price.recurring?.interval || null,
      interval_count: price.recurring?.interval_count || null,
      features: featuresArray, // Now a string[]
      limit_wohnungen: limitWohnungenValue, // Now a number or null
      storageLimit: storageLimitValue, // Storage limit in bytes or null for unlimited
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
