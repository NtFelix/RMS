/**
 * @jest-environment node
 */

// Mock Stripe before importing
jest.mock('stripe');

// NO mocking of next/cache needed anymore as we removed it

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
    // Use a unique ID to avoid interference from other tests if any
    const uniqueId = 'price_' + Date.now();

    // Since we can't easily reset the global variable cache without exposing it,
    // we just test the behavior that a second call with same ID hits cache.
    // Ideally we would export a way to clear cache for testing, but for this benchmark
    // using a unique ID is enough to simulate "fresh" state.

    await getPlanDetails(uniqueId);

    // Second call - should be cached
    await getPlanDetails(uniqueId);

    const end = Date.now();
    const duration = end - start;

    console.log(`Optimized Benchmark: Duration=${duration}ms, Calls=${retrieveMock.mock.calls.length}`);

    // Verification
    expect(retrieveMock).toHaveBeenCalledTimes(1);

    // The duration should be close to delayMs (1 call), not 2 * delayMs
    expect(duration).toBeLessThan(delayMs * 1.8);
  });
});
