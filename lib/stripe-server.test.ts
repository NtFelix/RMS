/**
 * @jest-environment node
 */

// Mock Stripe before importing
jest.mock('stripe');

import { getPlanDetails, parseStorageString } from './stripe-server';
import { STRIPE_API_VERSION } from './constants/stripe';
import Stripe from 'stripe';

const mockStripe = Stripe as jest.MockedClass<typeof Stripe>;

describe('lib/stripe-server', () => {
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

  describe('getPlanDetails', () => {
    it('should throw error when STRIPE_SECRET_KEY is not set', async () => {
      // Use a unique ID to avoid cache hit
      const uniqueId = 'price_' + Math.random();
      process.env = { ...originalEnv, STRIPE_SECRET_KEY: undefined };

      await expect(getPlanDetails(uniqueId)).rejects.toThrow('STRIPE_SECRET_KEY is not set');
    });

    it('should retrieve plan details successfully', async () => {
      process.env = { ...originalEnv, STRIPE_SECRET_KEY: 'sk_test_123' };
      const uniqueId = 'price_123_' + Math.random();

      const mockPrice = {
        id: uniqueId,
        nickname: 'Premium Plan',
        unit_amount: 2999,
        currency: 'eur',
        metadata: {
          limit_wohnungen: '10',
          features: 'Feature 1, Feature 2, Feature 3'
        },
        product: {
          id: 'prod_123',
          name: 'Premium Plan',
          description: 'Premium subscription plan',
          metadata: {}
        }
      };

      const mockStripeInstance = {
        prices: {
          retrieve: jest.fn().mockResolvedValue(mockPrice)
        }
      };

      mockStripe.mockImplementation(() => mockStripeInstance as any);

      const result = await getPlanDetails(uniqueId);

      expect(mockStripe).toHaveBeenCalledWith('sk_test_123', {
        apiVersion: STRIPE_API_VERSION
      });
      expect(mockStripeInstance.prices.retrieve).toHaveBeenCalledWith(uniqueId, {
        expand: ['product']
      });

      expect(result).toEqual({
        priceId: uniqueId,
        name: 'Premium Plan',
        productName: 'Premium Plan',
        description: 'Premium subscription plan',
        price: 2999,
        currency: 'eur',
        interval: null,
        interval_count: null,
        features: ['Feature 1', 'Feature 2', 'Feature 3'],
        limitWohnungen: 10,
        storageLimit: 0
      });
    });

    it('should handle Stripe API errors', async () => {
      process.env = { ...originalEnv, STRIPE_SECRET_KEY: 'sk_test_123' };
      const uniqueId = 'invalid_price_' + Math.random();

      const mockError = new Error('Price not found');
      const mockStripeInstance = {
        prices: {
          retrieve: jest.fn().mockRejectedValue(mockError)
        }
      };

      mockStripe.mockImplementation(() => mockStripeInstance as any);

      await expect(getPlanDetails(uniqueId)).rejects.toThrow('Price not found');
    });

    it('should pass correct parameters to Stripe API', async () => {
      process.env = { ...originalEnv, STRIPE_SECRET_KEY: 'sk_test_123' };
      const uniqueId = 'price_456_' + Math.random();

      const mockPrice = {
        id: uniqueId,
        nickname: 'Basic Plan',
        unit_amount: 1999,
        currency: 'eur',
        metadata: {},
        product: {
          id: 'prod_456',
          name: 'Basic Plan',
          metadata: {}
        }
      };

      const mockStripeInstance = {
        prices: {
          retrieve: jest.fn().mockResolvedValue(mockPrice)
        }
      };

      mockStripe.mockImplementation(() => mockStripeInstance as any);

      await getPlanDetails(uniqueId);

      expect(mockStripeInstance.prices.retrieve).toHaveBeenCalledWith(uniqueId, {
        expand: ['product']
      });
    });

    it('should handle empty price ID', async () => {
      // Empty string might be a valid cache key, but let's assume valid ID check comes first or handled by Stripe
      // The original code passed it to Stripe, which would fail.
      // We need to ensure we don't return cached empty result if Stripe throws.
      process.env = { ...originalEnv, STRIPE_SECRET_KEY: 'sk_test_123' };

      const mockStripeInstance = {
        prices: {
          retrieve: jest.fn().mockRejectedValue(new Error('Invalid price ID'))
        }
      };

      mockStripe.mockImplementation(() => mockStripeInstance as any);

      // Unique ID approach doesn't apply to empty string constant, but
      // since the implementation throws, it won't cache the error result.
      await expect(getPlanDetails('')).rejects.toThrow('Invalid price ID');
    });

    it('should handle null price ID', async () => {
      process.env = { ...originalEnv, STRIPE_SECRET_KEY: 'sk_test_123' };

      const mockStripeInstance = {
        prices: {
          retrieve: jest.fn().mockRejectedValue(new Error('Invalid price ID'))
        }
      };

      mockStripe.mockImplementation(() => mockStripeInstance as any);

      await expect(getPlanDetails(null as any)).rejects.toThrow('Invalid price ID');
    });
  });

  describe('parseStorageString', () => {
    it('should parse bytes correctly', () => {
      expect(parseStorageString('100 B')).toBe(100);
      expect(parseStorageString('1B')).toBe(1);
    });

    it('should parse kilobytes correctly', () => {
      expect(parseStorageString('1 KB')).toBe(1024);
      expect(parseStorageString('2KB')).toBe(2048);
    });

    it('should parse megabytes correctly', () => {
      expect(parseStorageString('1 MB')).toBe(1048576);
      expect(parseStorageString('100 MB')).toBe(104857600);
    });

    it('should parse gigabytes correctly', () => {
      expect(parseStorageString('1 GB')).toBe(1073741824);
      expect(parseStorageString('10 GB')).toBe(10737418240);
    });

    it('should parse terabytes correctly', () => {
      expect(parseStorageString('1 TB')).toBe(1099511627776);
    });

    it('should handle decimal values', () => {
      expect(parseStorageString('1.5 GB')).toBe(1610612736);
      expect(parseStorageString('0.5 MB')).toBe(524288);
    });

    it('should be case insensitive', () => {
      expect(parseStorageString('1 gb')).toBe(1073741824);
      expect(parseStorageString('1 Gb')).toBe(1073741824);
      expect(parseStorageString('1 GB')).toBe(1073741824);
    });

    it('should return 0 for missing/null/undefined values (no storage access)', () => {
      expect(parseStorageString('')).toBe(0);
      expect(parseStorageString(null)).toBe(0);
      expect(parseStorageString(undefined)).toBe(0);
    });

    it('should return 0 for invalid formats (no storage access)', () => {
      expect(parseStorageString('invalid')).toBe(0);
      expect(parseStorageString('100')).toBe(0);
      expect(parseStorageString('GB')).toBe(0);
    });

    it('should return 0 for "Nicht enthalten" and similar values', () => {
      expect(parseStorageString('Nicht enthalten')).toBe(0);
      expect(parseStorageString('nicht enthalten')).toBe(0);
      expect(parseStorageString('false')).toBe(0);
      expect(parseStorageString('no')).toBe(0);
      expect(parseStorageString('none')).toBe(0);
      expect(parseStorageString('-')).toBe(0);
      expect(parseStorageString('0')).toBe(0);
    });

    it('should return 0 for negative values', () => {
      expect(parseStorageString('-1 GB')).toBe(0);
    });
  });
});
