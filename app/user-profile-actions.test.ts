
import { getUserProfileForSettings, getBillingAddress, updateBillingAddress, createSetupIntent } from '@/app/user-profile-actions';
import { getCurrentWohnungenCount } from '@/lib/data-fetching';
import { getPlanDetails } from '@/lib/stripe-server';
import Stripe from 'stripe';

// Mock dependencies
jest.mock('@/lib/data-fetching', () => ({
  getCurrentWohnungenCount: jest.fn(),
}));

jest.mock('@/lib/stripe-server', () => ({
  getPlanDetails: jest.fn(),
}));

// Mock Supabase
const mockSingle = jest.fn();
const mockSelect = jest.fn();
const mockSupabase = {
  from: jest.fn(() => ({
    select: mockSelect,
  })),
  auth: {
    getUser: jest.fn(),
  },
};

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => mockSupabase),
}));

// Mock Stripe
const mockStripeCustomersRetrieve = jest.fn();
const mockStripeCustomersUpdate = jest.fn();
const mockStripeSetupIntentsCreate = jest.fn();

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      retrieve: mockStripeCustomersRetrieve,
      update: mockStripeCustomersUpdate,
    },
    setupIntents: {
      create: mockStripeSetupIntentsCreate,
    },
  }));
});

describe('User Profile Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';

    // Default Supabase mocks
    mockSelect.mockReturnValue({
        eq: jest.fn().mockReturnValue({
            single: mockSingle
        })
    });

    mockSingle.mockResolvedValue({ data: { id: 'user-1', stripe_customer_id: 'cus_123' }, error: null });

    // Default Stripe mocks
    mockStripeCustomersRetrieve.mockResolvedValue({
        id: 'cus_123',
        name: 'John Doe',
        email: 'john@example.com',
        deleted: false,
        address: {
            line1: '123 Main St',
            city: 'Berlin',
            country: 'DE',
            postal_code: '10115'
        }
    });

    mockStripeCustomersUpdate.mockResolvedValue({});

    mockStripeSetupIntentsCreate.mockResolvedValue({
        client_secret: 'seti_secret_123'
    });
  });

  describe('getUserProfileForSettings', () => {
    it('should return user profile with subscription details', async () => {
        // Mock auth user
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@test.com' } }, error: null });

        // Mock profile
        mockSingle.mockResolvedValue({
            data: {
                id: 'user-1',
                stripe_price_id: 'price_123',
                stripe_subscription_status: 'active'
            },
            error: null
        });

        // Mock helpers
        (getCurrentWohnungenCount as jest.Mock).mockResolvedValue(5);
        (getPlanDetails as jest.Mock).mockResolvedValue({ name: 'Pro Plan' });

        const result = await getUserProfileForSettings();

        if ('error' in result) throw new Error(result.error);

        expect(result.email).toBe('test@test.com');
        expect(result.currentWohnungenCount).toBe(5);
        expect(result.activePlan?.name).toBe('Pro Plan');
        expect(result.hasActiveSubscription).toBe(true);
    });

    it('should return error if not authenticated', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'No auth' } });

        const result = await getUserProfileForSettings();

        expect('error' in result).toBe(true);
        if('error' in result) expect(result.error).toBe('Not authenticated');
    });
  });

  describe('getBillingAddress', () => {
      it('should return billing address', async () => {
          const result = await getBillingAddress('cus_123');

          if ('error' in result) throw new Error(result.error);

          expect(result.name).toBe('John Doe');
          expect(result.address.city).toBe('Berlin');
      });

      it('should handle missing secret key', async () => {
          delete process.env.STRIPE_SECRET_KEY;
          const result = await getBillingAddress('cus_123');
          expect('error' in result).toBe(true);
      });
  });

  describe('updateBillingAddress', () => {
      it('should update address successfully', async () => {
          const result = await updateBillingAddress('cus_123', {
              name: 'New Name',
              address: {
                  line1: 'New St',
                  city: 'New City',
                  postal_code: '12345',
                  country: 'DE'
              }
          });

          expect(mockStripeCustomersUpdate).toHaveBeenCalledWith('cus_123', expect.objectContaining({
              name: 'New Name'
          }));
          expect(result.success).toBe(true);
      });
  });

  describe('createSetupIntent', () => {
      it('should create setup intent', async () => {
          const result = await createSetupIntent('cus_123');

          if ('error' in result) throw new Error(result.error);

          expect(result.clientSecret).toBe('seti_secret_123');
      });
  });
});
