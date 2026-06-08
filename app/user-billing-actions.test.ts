import { getBillingAddress, updateBillingAddress, createSetupIntent } from './user-billing-actions';
import { ensureAuth } from '@/lib/auth-utils';
import { isTestEnv, isStripeMocked } from '@/lib/test-utils';
import Stripe from 'stripe';

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn()
}));

jest.mock('@/lib/auth-utils', () => ({
  ensureAuth: jest.fn()
}));

jest.mock('@/lib/test-utils', () => ({
  isTestEnv: jest.fn(),
  isStripeMocked: jest.fn()
}));

const mockStripeCustomersRetrieve = jest.fn();
const mockStripeCustomersUpdate = jest.fn();
const mockStripeSetupIntentsCreate = jest.fn();

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      retrieve: mockStripeCustomersRetrieve,
      update: mockStripeCustomersUpdate
    },
    setupIntents: {
      create: mockStripeSetupIntentsCreate
    }
  }));
});

describe('user-billing-actions', () => {
  let mockSupabase: any;
  const originalEnv = { ...process.env };

  afterEach(() => {
    for (const key in process.env) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { stripe_customer_id: 'cus_123' },
        error: null
      })
    };

    (ensureAuth as jest.Mock).mockResolvedValue({ user: { id: 'test-user-id' }, supabase: mockSupabase });
    (isTestEnv as jest.Mock).mockReturnValue(false);
    (isStripeMocked as jest.Mock).mockReturnValue(false);

    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
  });

  describe('getBillingAddress', () => {
    it('should successfully get billing address', async () => {
      mockStripeCustomersRetrieve.mockResolvedValue({
        id: 'cus_123',
        name: 'John Doe',
        email: 'john@example.com',
        address: {
          line1: '123 Main St',
          city: 'Berlin',
          postal_code: '10115',
          country: 'DE'
        }
      });

      const result = await getBillingAddress('cus_123');
      expect(result).toEqual({
        name: 'John Doe',
        companyName: '',
        address: {
          line1: '123 Main St',
          line2: null,
          city: 'Berlin',
          state: null,
          postal_code: '10115',
          country: 'DE'
        },
        email: 'john@example.com',
        phone: null
      });
      expect(mockStripeCustomersRetrieve).toHaveBeenCalledWith('cus_123');
    });

    it('should fail if unauthorized', async () => {
      mockSupabase.single.mockResolvedValue({ data: { stripe_customer_id: 'cus_other' }, error: null });
      const result = await getBillingAddress('cus_123');
      expect(result).toEqual({ error: 'Nicht autorisiert' });
    });
  });

  describe('updateBillingAddress', () => {
    it('should successfully update billing address', async () => {
      mockStripeCustomersUpdate.mockResolvedValue({ id: 'cus_123' });

      const details = {
        name: 'Jane Doe',
        address: {
          line1: '456 Side St',
          city: 'Munich',
          postal_code: '80331',
          country: 'DE'
        }
      };

      const result = await updateBillingAddress('cus_123', details);
      expect(result).toEqual({ success: true });
      expect(mockStripeCustomersUpdate).toHaveBeenCalledWith('cus_123', expect.objectContaining({
        name: 'Jane Doe',
        address: expect.objectContaining({
          line1: '456 Side St',
          city: 'Munich',
          postal_code: '80331',
          country: 'DE'
        })
      }));
    });
  });

  describe('createSetupIntent', () => {
    it('should successfully create setup intent', async () => {
      mockStripeSetupIntentsCreate.mockResolvedValue({
        client_secret: 'seti_123_secret_456'
      });

      const result = await createSetupIntent('cus_123');
      expect(result).toEqual({ clientSecret: 'seti_123_secret_456' });
      expect(mockStripeSetupIntentsCreate).toHaveBeenCalledWith({
        customer: 'cus_123',
        payment_method_types: ['card'],
        usage: 'on_session'
      });
    });
  });
});
