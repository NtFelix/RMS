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

    const retrieveMock = jest.fn().mockResolvedValue(mockPrice);

    const mockStripeInstance = {
      prices: {
        retrieve: retrieveMock
      }
    };

    mockStripe.mockImplementation(() => mockStripeInstance as any);

    // Use a unique ID to avoid interference from other tests
    const uniqueId = 'price_' + Date.now();

    await getPlanDetails(uniqueId);

    // Second call - should be cached
    await getPlanDetails(uniqueId);

    expect(retrieveMock).toHaveBeenCalledTimes(1);
  });
});
