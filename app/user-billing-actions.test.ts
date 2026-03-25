import {
  getBillingAddress,
  updateBillingAddress,
  createSetupIntent,
} from './user-billing-actions';
import { isTestEnv, isStripeMocked } from '@/lib/test-utils';
import Stripe from 'stripe';

jest.mock('stripe');
jest.mock('@/lib/test-utils', () => ({
  isTestEnv: jest.fn(),
  isStripeMocked: jest.fn(),
}));
jest.mock('@/lib/constants/stripe', () => ({
  STRIPE_CONFIG: { apiVersion: '2023-10-16' },
}));

const MockedStripe = Stripe as jest.MockedClass<typeof Stripe>;

const mockCustomersRetrieve = jest.fn();
const mockCustomersUpdate = jest.fn();
const mockSetupIntentsCreate = jest.fn();

MockedStripe.mockImplementation(() => ({
  customers: {
    retrieve: mockCustomersRetrieve,
    update: mockCustomersUpdate,
  },
  setupIntents: {
    create: mockSetupIntentsCreate,
  },
} as any));

describe('user-billing-actions', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'test_secret_key';
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    consoleErrorSpy.mockRestore();
  });

  describe('getBillingAddress', () => {
    it('returns mocked address when isStripeMocked and isTestEnv are true', async () => {
      (isStripeMocked as jest.Mock).mockReturnValue(true);
      (isTestEnv as jest.Mock).mockReturnValue(true);

      const result = await getBillingAddress('cus_123');
      expect(result).toEqual(
        expect.objectContaining({
          name: 'Max Mustermann',
          companyName: 'Muster GmbH',
          email: 'test@example.com',
        })
      );
    });

    it('returns error when isStripeMocked is true but isTestEnv is false', async () => {
      (isStripeMocked as jest.Mock).mockReturnValue(true);
      (isTestEnv as jest.Mock).mockReturnValue(false);

      const result = await getBillingAddress('cus_123');
      expect(result).toEqual({ error: 'Stripe secret key is not configured' });
    });

    it('returns error if stripeCustomerId is missing', async () => {
      (isStripeMocked as jest.Mock).mockReturnValue(false);
      const result = await getBillingAddress('');
      expect(result).toEqual({ error: 'Stripe customer ID is required' });
    });

    it('fetches customer and returns billing address', async () => {
      (isStripeMocked as jest.Mock).mockReturnValue(false);
      mockCustomersRetrieve.mockResolvedValue({
        id: 'cus_123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123456',
        metadata: { company_name: 'Doe Inc' },
        address: {
          line1: '123 Main St',
          line2: 'Apt 4B',
          city: 'New York',
          state: 'NY',
          postal_code: '10001',
          country: 'US',
        },
      });

      const result = await getBillingAddress('cus_123');
      expect(result).toEqual({
        name: 'John Doe',
        companyName: 'Doe Inc',
        address: {
          line1: '123 Main St',
          line2: 'Apt 4B',
          city: 'New York',
          state: 'NY',
          postal_code: '10001',
          country: 'US',
        },
        email: 'john@example.com',
        phone: '123456',
      });
      expect(mockCustomersRetrieve).toHaveBeenCalledWith('cus_123');
    });

    it('fetches customer and handles fallback business_name', async () => {
      (isStripeMocked as jest.Mock).mockReturnValue(false);
      mockCustomersRetrieve.mockResolvedValue({
        id: 'cus_123',
        name: 'John Doe',
        email: 'john@example.com',
        business_name: 'Legacy Inc',
        address: {
          line1: '123 Main St',
          city: 'New York',
          postal_code: '10001',
          country: 'US',
        },
      });

      const result = await getBillingAddress('cus_123');
      expect(result).toEqual(
        expect.objectContaining({
          companyName: 'Legacy Inc',
        })
      );
    });

    it('handles deleted customer', async () => {
      (isStripeMocked as jest.Mock).mockReturnValue(false);
      mockCustomersRetrieve.mockResolvedValue({
        id: 'cus_123',
        deleted: true,
      });

      const result = await getBillingAddress('cus_123');
      expect(result).toEqual({ error: 'Customer not found' });
    });

    it('handles customer without address', async () => {
      (isStripeMocked as jest.Mock).mockReturnValue(false);
      mockCustomersRetrieve.mockResolvedValue({
        id: 'cus_123',
        name: 'Jane Doe',
        email: 'jane@example.com',
      });

      const result = await getBillingAddress('cus_123');
      expect(result).toEqual({
        name: 'Jane Doe',
        companyName: '',
        address: {
          line1: '',
          line2: null,
          city: '',
          state: null,
          postal_code: '',
          country: 'DE',
        },
        email: 'jane@example.com',
        phone: null,
      });
    });

    it('handles fetch error', async () => {
      (isStripeMocked as jest.Mock).mockReturnValue(false);
      mockCustomersRetrieve.mockRejectedValue(new Error('Network error'));

      const result = await getBillingAddress('cus_123');
      expect(result).toEqual({
        error: 'Failed to fetch billing address',
        details: 'Network error',
      });
    });

    it('handles fetch non-error object', async () => {
      (isStripeMocked as jest.Mock).mockReturnValue(false);
      mockCustomersRetrieve.mockRejectedValue('String error');

      const result = await getBillingAddress('cus_123');
      expect(result).toEqual({
        error: 'Failed to fetch billing address',
        details: 'Unknown error',
      });
    });
  });

  describe('updateBillingAddress', () => {
    it('returns success when isStripeMocked and isTestEnv are true', async () => {
      (isStripeMocked as jest.Mock).mockReturnValue(true);
      (isTestEnv as jest.Mock).mockReturnValue(true);

      const result = await updateBillingAddress('cus_123', {
        name: 'Test',
        address: { line1: '', city: '', postal_code: '', country: '' },
      });
      expect(result).toEqual({ success: true });
    });

    it('returns error when isStripeMocked is true but isTestEnv is false', async () => {
      (isStripeMocked as jest.Mock).mockReturnValue(true);
      (isTestEnv as jest.Mock).mockReturnValue(false);

      const result = await updateBillingAddress('cus_123', {
        name: 'Test',
        address: { line1: '', city: '', postal_code: '', country: '' },
      });
      expect(result).toEqual({ success: false, error: 'Stripe secret key is not configured' });
    });

    it('returns error if stripeCustomerId is missing', async () => {
      (isStripeMocked as jest.Mock).mockReturnValue(false);
      const result = await updateBillingAddress('', {
        name: 'Test',
        address: { line1: '', city: '', postal_code: '', country: '' },
      });
      expect(result).toEqual({ success: false, error: 'Stripe customer ID is required' });
    });

    it('updates customer and returns success', async () => {
      (isStripeMocked as jest.Mock).mockReturnValue(false);
      mockCustomersUpdate.mockResolvedValue({});

      const details = {
        name: 'Updated Name',
        companyName: 'Updated Inc',
        address: {
          line1: '456 New St',
          line2: 'Suite 1',
          city: 'Boston',
          state: 'MA',
          postal_code: '02108',
          country: 'US',
        },
      };

      const result = await updateBillingAddress('cus_123', details);
      expect(result).toEqual({ success: true });
      expect(mockCustomersUpdate).toHaveBeenCalledWith('cus_123', {
        name: 'Updated Name',
        metadata: {
          company_name: 'Updated Inc',
        },
        address: {
          line1: '456 New St',
          line2: 'Suite 1',
          city: 'Boston',
          state: 'MA',
          postal_code: '02108',
          country: 'US',
        },
      });
    });

    it('updates customer without companyName', async () => {
      (isStripeMocked as jest.Mock).mockReturnValue(false);
      mockCustomersUpdate.mockResolvedValue({});

      const details = {
        name: 'Updated Name',
        address: {
          line1: '456 New St',
          city: 'Boston',
          postal_code: '02108',
          country: 'US',
        },
      };

      const result = await updateBillingAddress('cus_123', details);
      expect(result).toEqual({ success: true });
      expect(mockCustomersUpdate).toHaveBeenCalledWith('cus_123', {
        name: 'Updated Name',
        address: {
          line1: '456 New St',
          city: 'Boston',
          postal_code: '02108',
          country: 'US',
        },
      });
    });

    it('handles update error', async () => {
      (isStripeMocked as jest.Mock).mockReturnValue(false);
      mockCustomersUpdate.mockRejectedValue(new Error('Update failed'));

      const result = await updateBillingAddress('cus_123', {
        name: 'Test',
        address: { line1: '', city: '', postal_code: '', country: '' },
      });
      expect(result).toEqual({ success: false, error: 'Update failed' });
    });
  });

  describe('createSetupIntent', () => {
    it('returns mocked client secret when isStripeMocked and isTestEnv are true', async () => {
      (isStripeMocked as jest.Mock).mockReturnValue(true);
      (isTestEnv as jest.Mock).mockReturnValue(true);

      const result = await createSetupIntent('cus_123');
      expect(result).toEqual({ clientSecret: 'seti_mock_secret_123' });
    });

    it('returns error when isStripeMocked is true but isTestEnv is false', async () => {
      (isStripeMocked as jest.Mock).mockReturnValue(true);
      (isTestEnv as jest.Mock).mockReturnValue(false);

      const result = await createSetupIntent('cus_123');
      expect(result).toEqual({ error: 'Stripe secret key is not configured' });
    });

    it('returns error if stripeCustomerId is missing', async () => {
      (isStripeMocked as jest.Mock).mockReturnValue(false);
      const result = await createSetupIntent('');
      expect(result).toEqual({ error: 'Stripe customer ID is required' });
    });

    it('creates setup intent and returns client secret', async () => {
      (isStripeMocked as jest.Mock).mockReturnValue(false);
      mockSetupIntentsCreate.mockResolvedValue({
        client_secret: 'secret_456',
      });

      const result = await createSetupIntent('cus_123');
      expect(result).toEqual({ clientSecret: 'secret_456' });
      expect(mockSetupIntentsCreate).toHaveBeenCalledWith({
        customer: 'cus_123',
        payment_method_types: ['card'],
        usage: 'on_session',
      });
    });

    it('returns error if client_secret is null', async () => {
      (isStripeMocked as jest.Mock).mockReturnValue(false);
      mockSetupIntentsCreate.mockResolvedValue({
        client_secret: null,
      });

      const result = await createSetupIntent('cus_123');
      expect(result).toEqual({ error: 'Failed to create SetupIntent: client_secret is null' });
    });

    it('handles create setup intent error', async () => {
      (isStripeMocked as jest.Mock).mockReturnValue(false);
      mockSetupIntentsCreate.mockRejectedValue(new Error('Create intent failed'));

      const result = await createSetupIntent('cus_123');
      expect(result).toEqual({ error: 'Create intent failed' });
    });
  });
});
