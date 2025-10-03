/**
 * @jest-environment node
 */

// Mock dependencies first
jest.mock('@/lib/supabase-server');
jest.mock('@/lib/stripe-server');
jest.mock('@/lib/data-fetching');
jest.mock('stripe');

import Stripe from 'stripe';
import {
  getUserProfileForSettings,
  getBillingAddress,
  updateBillingAddress,
} from './user-profile-actions';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getPlanDetails } from '@/lib/stripe-server';
import { getCurrentWohnungenCount } from '@/lib/data-fetching';

const mockCreateSupabaseServerClient = createSupabaseServerClient as jest.MockedFunction<
  typeof createSupabaseServerClient
>;
const mockGetPlanDetails = getPlanDetails as jest.MockedFunction<typeof getPlanDetails>;
const mockGetCurrentWohnungenCount = getCurrentWohnungenCount as jest.MockedFunction<
  typeof getCurrentWohnungenCount
>;
const mockedStripe = Stripe as jest.MockedClass<typeof Stripe>;

describe('User Profile Actions', () => {
  let mockSupabase: any;
  const mockStripeInstance = {
    customers: {
      retrieve: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedStripe.mockImplementation(() => mockStripeInstance as any);

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ error: null, data: null }),
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
    };

    mockCreateSupabaseServerClient.mockReturnValue(mockSupabase as any);
    mockGetCurrentWohnungenCount.mockResolvedValue(5);
    mockGetPlanDetails.mockResolvedValue({
      priceId: 'price_123',
      name: 'Premium Plan',
      price: 2999,
      currency: 'eur',
      features: ['Feature 1', 'Feature 2'],
      limitWohnungen: 10,
    });
  });

  describe('getUserProfileForSettings', () => {
    const mockProfile = {
      id: 'user-123',
      email: 'test@example.com',
      full_name: 'Test User',
      stripe_customer_id: 'cus_123',
      stripe_subscription_id: 'sub_123',
      stripe_subscription_status: 'active',
      stripe_price_id: 'price_123',
      subscription_tier: 'premium',
      trial_ends_at: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      currentWohnungenCount: [{ count: 5 }],
    };

    it('should successfully fetch user profile', async () => {
      // Mock profile fetch
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              error: null,
              data: mockProfile,
            }),
          };
        }
        if (table === 'subscriptions') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              error: null,
              data: {
                id: 'sub_123',
                customer_id: 'cus_123',
                status: 'active',
                price_id: 'price_123',
                cancel_at_period_end: false,
                current_period_end: '2025-12-31T23:59:59.000Z',
              },
            }),
          };
        }
        return mockSupabase;
      });

      const result = await getUserProfileForSettings();

      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabase.from).toHaveBeenCalledWith('subscriptions');

      expect(result).toEqual({
        ...mockProfile,
        email: 'test@example.com',
        currentWohnungenCount: 5,
        activePlan: {
          priceId: 'price_123',
          name: 'Premium Plan',
          price: 2999,
          currency: 'eur',
          features: ['Feature 1', 'Feature 2'],
          limitWohnungen: 10,
        },
        stripe_customer_id: 'cus_123',
        stripe_subscription_id: 'sub_123',
        stripe_subscription_status: 'active',
        stripe_cancel_at_period_end: false,
        stripe_current_period_end: '2025-12-31T23:59:59.000Z',
      });
    });

    it('should handle authentication errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const result = await getUserProfileForSettings();

      expect(result).toEqual({
        error: 'Benutzer nicht authentifiziert',
        details: 'Not authenticated',
      });
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should handle missing user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await getUserProfileForSettings();

      expect(result).toEqual({
        error: 'Benutzer nicht authentifiziert',
        details: 'Kein Benutzerobjekt vorhanden',
      });
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should handle profile fetch errors', async () => {
      mockSupabase.single.mockResolvedValue({
        error: { message: 'Profile not found', code: 'PGRST116' },
        data: null,
      });

      const result = await getUserProfileForSettings();

      expect(result).toEqual({
        error: 'Profil nicht gefunden',
        details: 'Profile not found',
      });
    });

    it('should handle null profile data', async () => {
      mockSupabase.single.mockResolvedValue({
        error: null,
        data: null,
      });

      const result = await getUserProfileForSettings();

      expect(result).toEqual({
        error: 'Profil nicht gefunden',
        details: 'Kein Profil in der Datenbank gefunden',
      });
    });

    it('should handle database connection errors', async () => {
      const dbError = new Error('Database connection failed');
      mockSupabase.from.mockImplementation(() => {
        throw dbError;
      });

      await expect(getUserProfileForSettings()).rejects.toThrow(dbError);
    });

    it('should handle partial profile data', async () => {
      const partialProfile = {
        id: 'user-123',
        email: 'test@example.com',
        full_name: null,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        stripe_subscription_status: null,
        stripe_price_id: null,
        subscription_tier: null,
        trial_ends_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        currentWohnungenCount: [{ count: 0 }],
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              error: null,
              data: partialProfile,
            }),
          };
        }
        if (table === 'subscriptions') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              error: null,
              data: null, // No active subscription
            }),
          };
        }
        return mockSupabase;
      });

      const result = await getUserProfileForSettings();

      expect(result).toEqual({
        ...partialProfile,
        email: 'test@example.com',
        activePlan: null,
        currentWohnungenCount: 0,
        stripe_customer_id: undefined,
        stripe_subscription_id: undefined,
        stripe_subscription_status: undefined,
        stripe_cancel_at_period_end: undefined,
        stripe_current_period_end: undefined,
      });
    });

    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('Network timeout');
      timeoutError.name = 'TimeoutError';

      mockSupabase.from.mockImplementation(() => {
        throw timeoutError;
      });

      await expect(getUserProfileForSettings()).rejects.toThrow(timeoutError);
    });
  });

  describe('getBillingAddress', () => {
    const customerId = 'cus_123';

    beforeEach(() => {
      process.env.STRIPE_SECRET_KEY = 'test_secret_key';
    });

    afterEach(() => {
      delete process.env.STRIPE_SECRET_KEY;
    });

    it('should return billing address for a valid customer', async () => {
      const mockAddress = {
        line1: '123 Main St',
        city: 'Anytown',
        postal_code: '12345',
        country: 'US',
      };
      mockStripeInstance.customers.retrieve.mockResolvedValue({
        id: customerId,
        address: mockAddress,
        deleted: false,
      });

      const address = await getBillingAddress(customerId);

      expect(mockStripeInstance.customers.retrieve).toHaveBeenCalledWith(customerId);
      expect(address).toEqual(mockAddress);
    });

    it('should return null if customer is deleted', async () => {
      mockStripeInstance.customers.retrieve.mockResolvedValue({
        id: customerId,
        address: null,
        deleted: true,
      });

      const address = await getBillingAddress(customerId);
      expect(address).toBeNull();
    });

    it('should return null on stripe error', async () => {
      mockStripeInstance.customers.retrieve.mockRejectedValue(new Error('Stripe error'));
      const address = await getBillingAddress(customerId);
      expect(address).toBeNull();
    });

    it('should throw an error if STRIPE_SECRET_KEY is not set', async () => {
      delete process.env.STRIPE_SECRET_KEY;
      await expect(getBillingAddress(customerId)).rejects.toThrow(
        'STRIPE_SECRET_KEY is not set'
      );
    });
  });

  describe('updateBillingAddress', () => {
    const customerId = 'cus_123';
    const newAddress = {
      line1: '456 New St',
      city: 'Newville',
      postal_code: '54321',
      country: 'US',
    };

    beforeEach(() => {
      process.env.STRIPE_SECRET_KEY = 'test_secret_key';
    });

    afterEach(() => {
      delete process.env.STRIPE_SECRET_KEY;
    });

    it('should update and return the new billing address', async () => {
      mockStripeInstance.customers.update.mockResolvedValue({
        id: customerId,
        address: newAddress,
      });

      const result = await updateBillingAddress(customerId, newAddress);

      expect(mockStripeInstance.customers.update).toHaveBeenCalledWith(customerId, {
        address: newAddress,
      });
      expect(result).toEqual({ success: true, address: newAddress });
    });

    it('should return an error on stripe failure', async () => {
      mockStripeInstance.customers.update.mockRejectedValue(new Error('Stripe error'));
      const result = await updateBillingAddress(customerId, newAddress);
      expect(result).toEqual({
        success: false,
        error: 'Failed to update billing address.',
      });
    });

    it('should throw an error if STRIPE_SECRET_KEY is not set', async () => {
      delete process.env.STRIPE_SECRET_KEY;
      await expect(updateBillingAddress(customerId, newAddress)).rejects.toThrow(
        'STRIPE_SECRET_KEY is not set'
      );
    });
  });
});