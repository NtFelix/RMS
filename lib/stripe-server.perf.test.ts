/**
 * @jest-environment node
 */

// Mock Stripe before importing
jest.mock('stripe');

// Mock next/cache to simulate caching behavior
jest.mock('next/cache', () => {
  const cache = new Map();
  return {
    unstable_cache: jest.fn((fn, keyParts, options) => {
      return async (...args: any[]) => {
        const key = JSON.stringify(args); // Simple cache key based on arguments
        if (cache.has(key)) {
          return cache.get(key);
        }
        const result = await fn(...args);
        cache.set(key, result);
        return result;
      };
    }),
  };
});

import { getPlanDetails } from './stripe-server';
import Stripe from 'stripe';

const mockStripe = Stripe as jest.MockedClass<typeof Stripe>;

describe('lib/stripe-server benchmark', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    // Suppress expected error logs in tests
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    originalEnv = process.env;
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should call Stripe API only once when cached (Optimized)', async () => {
    process.env = { ...originalEnv, STRIPE_SECRET_KEY: 'sk_test_123' };

    const mockPrice = {
      id: 'price_benchmark',
      nickname: 'Benchmark Plan',
      unit_amount: 1000,
      currency: 'eur',
      metadata: {},
      product: {
        id: 'prod_benchmark',
        name: 'Benchmark Plan',
        metadata: {}
      }
    };

    // Simulate delay
    const delayMs = 50;
    const retrieveMock = jest.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return mockPrice;
    });

    const mockStripeInstance = {
      prices: {
        retrieve: retrieveMock
      }
    };

    mockStripe.mockImplementation(() => mockStripeInstance as any);

    const start = Date.now();

    // First call - should hit the "API"
    await getPlanDetails('price_benchmark');

    // Second call - should be cached
    await getPlanDetails('price_benchmark');

    const end = Date.now();
    const duration = end - start;

    console.log(`Optimized Benchmark: Duration=${duration}ms, Calls=${retrieveMock.mock.calls.length}`);

    // Verification
    expect(retrieveMock).toHaveBeenCalledTimes(1);

    // The duration should be close to delayMs (1 call), not 2 * delayMs
    // We allow some overhead, but it should definitely be less than 2 calls
    // E.g. delayMs * 1.5 is a safe upper bound if we account for test overhead
    // But since we want to prove it's NOT 2 calls, expect < 1.8 * delayMs
    expect(duration).toBeLessThan(delayMs * 1.8);
  });
});
