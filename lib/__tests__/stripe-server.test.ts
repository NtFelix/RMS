/**
 * @jest-environment node
 */

// Mock Stripe before importing
jest.mock('stripe');

import { getPlanDetails } from '../stripe-server';
import { STRIPE_API_VERSION } from '../constants/stripe';
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
      process.env = { ...originalEnv, STRIPE_SECRET_KEY: undefined };

      await expect(getPlanDetails('price_123')).rejects.toThrow('STRIPE_SECRET_KEY is not set');
    });

    it('should retrieve plan details successfully', async () => {
      process.env = { ...originalEnv, STRIPE_SECRET_KEY: 'sk_test_123' };

      const mockPrice = {
        id: 'price_123',
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

      const result = await getPlanDetails('price_123');

      expect(mockStripe).toHaveBeenCalledWith('sk_test_123', {
        apiVersion: STRIPE_API_VERSION
      });
      expect(mockStripeInstance.prices.retrieve).toHaveBeenCalledWith('price_123', {
        expand: ['product']
      });

      expect(result).toEqual({
        priceId: 'price_123',
        name: 'Premium Plan',
        productName: 'Premium Plan',
        description: 'Premium subscription plan',
        price: 2999,
        currency: 'eur',
        interval: null,
        interval_count: null,
        features: ['Feature 1', 'Feature 2', 'Feature 3'],
        limitWohnungen: 10
      });
    });

    it('should handle Stripe API errors', async () => {
      process.env = { ...originalEnv, STRIPE_SECRET_KEY: 'sk_test_123' };

      const mockError = new Error('Price not found');
      const mockStripeInstance = {
        prices: {
          retrieve: jest.fn().mockRejectedValue(mockError)
        }
      };

      mockStripe.mockImplementation(() => mockStripeInstance as any);

      await expect(getPlanDetails('invalid_price')).rejects.toThrow('Price not found');
    });

    it('should pass correct parameters to Stripe API', async () => {
      process.env = { ...originalEnv, STRIPE_SECRET_KEY: 'sk_test_123' };

      const mockPrice = {
        id: 'price_456',
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

      await getPlanDetails('price_456');

      expect(mockStripeInstance.prices.retrieve).toHaveBeenCalledWith('price_456', {
        expand: ['product']
      });
    });

    it('should handle empty price ID', async () => {
      process.env = { ...originalEnv, STRIPE_SECRET_KEY: 'sk_test_123' };

      const mockStripeInstance = {
        prices: {
          retrieve: jest.fn().mockRejectedValue(new Error('Invalid price ID'))
        }
      };

      mockStripe.mockImplementation(() => mockStripeInstance as any);

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
});