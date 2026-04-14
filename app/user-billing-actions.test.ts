import Stripe from 'stripe';
import { isTestEnv, isStripeMocked } from '@/lib/test-utils';

// Mock dependencies
jest.mock('stripe');
jest.mock('@/lib/test-utils');

// Define mock instances outside describe to be accessible in jest.mock factory
const mockRetrieve = jest.fn();
const mockUpdate = jest.fn();
const mockCreateSetupIntent = jest.fn();

const mockStripeInstance = {
  customers: {
    retrieve: mockRetrieve,
    update: mockUpdate,
  },
  setupIntents: {
    create: mockCreateSetupIntent,
  },
};

(Stripe as unknown as jest.Mock).mockImplementation(() => mockStripeInstance);

// Import actions AFTER mocking
import { 
  getBillingAddress, 
  updateBillingAddress, 
  createSetupIntent 
} from './user-billing-actions';

describe('User Billing Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default env mocks
    (isTestEnv as jest.Mock).mockReturnValue(true);
    (isStripeMocked as jest.Mock).mockReturnValue(false);
    
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    
    // Reset mock return values
    mockRetrieve.mockReset();
    mockUpdate.mockReset();
    mockCreateSetupIntent.mockReset();
  });

  describe('getBillingAddress', () => {
    it('returns mock data when Stripe is mocked in test environment', async () => {
      (isStripeMocked as jest.Mock).mockReturnValue(true);
      (isTestEnv as jest.Mock).mockReturnValue(true);

      const result = await getBillingAddress('cus_123') as any;

      expect(result.name).toBe('Max Mustermann');
      expect(result.address.city).toBe('Musterstadt');
    });

    it('returns error if customer ID is missing', async () => {
      const result = await getBillingAddress('') as any;
      expect(result.error).toBe('Stripe customer ID is required');
    });

    it('returns error if customer is deleted', async () => {
      mockRetrieve.mockResolvedValue({ deleted: true });

      const result = await getBillingAddress('cus_123') as any;
      expect(result.error).toBe('Customer not found');
    });

    it('maps customer data correctly with standard address', async () => {
      const mockCustomer = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+49123',
        metadata: { company_name: 'Jane Corp' },
        address: {
          line1: 'Janestraße 1',
          city: 'JaneCity',
          postal_code: '54321',
          country: 'DE',
        }
      };
      mockRetrieve.mockResolvedValue(mockCustomer);

      const result = await getBillingAddress('cus_123') as any;

      expect(result.name).toBe('Jane Doe');
      expect(result.companyName).toBe('Jane Corp');
      expect(result.address.line1).toBe('Janestraße 1');
      expect(result.email).toBe('jane@example.com');
    });

    it('supports legacy business_name mapping', async () => {
      const mockCustomer = {
        name: 'Legacy User',
        business_name: 'Old Corp',
        address: null
      };
      mockRetrieve.mockResolvedValue(mockCustomer);

      const result = await getBillingAddress('cus_123') as any;

      expect(result.companyName).toBe('Old Corp');
      expect(result.address.line1).toBe('');
    });

    it('handles Stripe errors gracefully', async () => {
      mockRetrieve.mockRejectedValue(new Error('Stripe API Error'));

      const result = await getBillingAddress('cus_123') as any;

      expect(result.error).toBe('Failed to fetch billing address');
      expect(result.details).toBe('Stripe API Error');
    });
  });

  describe('updateBillingAddress', () => {
    it('calls stripe.customers.update with correct parameters', async () => {
      mockUpdate.mockResolvedValue({ id: 'cus_123' });
      const updateParams = {
        name: 'New Name',
        companyName: 'New Corp',
        address: {
          line1: 'New Street 1',
          city: 'New City',
          postal_code: '11111',
          country: 'DE'
        }
      };

      await updateBillingAddress('cus_123', updateParams);

      expect(mockUpdate).toHaveBeenCalledWith('cus_123', expect.objectContaining({
        name: 'New Name',
        metadata: { company_name: 'New Corp' },
        address: expect.objectContaining({
          line1: 'New Street 1',
          city: 'New City'
        })
      }));
    });

    it('handles empty company name by setting metadata to null', async () => {
        mockUpdate.mockResolvedValue({ id: 'cus_123' });
        const updateParams = {
          name: 'New Name',
          companyName: '',
          address: {
            line1: 'Street',
            city: 'City',
            postal_code: '1',
            country: 'DE'
          }
        };
  
        await updateBillingAddress('cus_123', updateParams);
  
        expect(mockUpdate).toHaveBeenCalledWith('cus_123', expect.objectContaining({
          metadata: { company_name: null }
        }));
      });

    it('returns success: false on Stripe error', async () => {
      mockUpdate.mockRejectedValue(new Error('Update failed'));

      const result = await updateBillingAddress('cus_123', { name: 'X', address: { line1: 'X', city: 'X', postal_code: 'X', country: 'DE' } });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Update failed');
    });
  });

  describe('createSetupIntent', () => {
    it('creates a setup intent and returns clientSecret', async () => {
      mockCreateSetupIntent.mockResolvedValue({
        client_secret: 'seti_secret_123'
      });

      const result = await createSetupIntent('cus_123') as any;

      expect(mockCreateSetupIntent).toHaveBeenCalledWith({
        customer: 'cus_123',
        payment_method_types: ['card'],
        usage: 'on_session'
      });
      expect(result.clientSecret).toBe('seti_secret_123');
    });

    it('handles missing clientSecret in response', async () => {
      mockCreateSetupIntent.mockResolvedValue({
        client_secret: null
      });

      const result = await createSetupIntent('cus_123') as any;

      expect(result.error).toContain('client_secret is null');
    });
  });
});
