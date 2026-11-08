import { getBillingAddress, updateBillingAddress, createSetupIntent } from './user-billing-actions';
import { ensureAuth } from '@/lib/auth-utils';
import { isTestEnv, isStripeMocked } from '@/lib/test-utils';
import Stripe from 'stripe';
import { STRIPE_CONFIG } from '@/lib/constants/stripe';

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn()
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

  let consoleErrorSpy: jest.SpyInstance | undefined;

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
    consoleErrorSpy = undefined;
  });

  const fullAddress = {
    line1: 'Musterstraße 1',
    city: 'Musterstadt',
    postal_code: '12345',
    country: 'DE',
  };

  const baseUpdateDetails = {
    name: 'Jane Doe',
    address: { line1: '456 Side St', city: 'Munich', postal_code: '80331', country: 'DE' },
  };

  function silenceConsoleError() {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  }

  // Loads a fresh module instance, because getStripe() caches the client at module level.
  function loadFreshModule(): any {
    let loaded: any;
    jest.isolateModules(() => {
      loaded = {
        actions: require('./user-billing-actions'),
        ensureAuth: require('@/lib/auth-utils').ensureAuth,
        testUtils: require('@/lib/test-utils'),
        StripeCtor: require('stripe'),
      };
    });
    loaded.ensureAuth.mockResolvedValue({ user: { id: 'test-user-id' }, supabase: mockSupabase });
    loaded.testUtils.isTestEnv.mockReturnValue(false);
    loaded.testUtils.isStripeMocked.mockReturnValue(false);
    return loaded;
  }

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

    it('should fail if not authenticated', async () => {
      (ensureAuth as jest.Mock).mockRejectedValue(new Error('Nicht authentifiziert'));
      const result = await getBillingAddress('cus_123');
      expect(result).toEqual({ error: 'Nicht authentifiziert' });
    });

    it('should return the ensureAuth error message when authentication throws an Error', async () => {
      (ensureAuth as jest.Mock).mockRejectedValue(new Error('Session abgelaufen'));
      const result = await getBillingAddress('cus_123');
      expect(result).toEqual({ error: 'Session abgelaufen' });
      expect(mockStripeCustomersRetrieve).not.toHaveBeenCalled();
    });

    it('should fall back to "Nicht authentifiziert" when ensureAuth throws a non-Error value', async () => {
      (ensureAuth as jest.Mock).mockRejectedValue('boom');
      const result = await getBillingAddress('cus_123');
      expect(result).toEqual({ error: 'Nicht authentifiziert' });
    });

    it('should return "Nicht autorisiert" without calling Stripe when no profile is found', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: null });
      const result = await getBillingAddress('cus_123');
      expect(result).toEqual({ error: 'Nicht autorisiert' });
      expect(mockStripeCustomersRetrieve).not.toHaveBeenCalled();
    });

    it('should check ownership via the profile of the authenticated user before calling Stripe', async () => {
      mockSupabase.single.mockResolvedValue({ data: { stripe_customer_id: 'cus_other' }, error: null });
      const result = await getBillingAddress('cus_123');
      expect(result).toEqual({ error: 'Nicht autorisiert' });
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabase.select).toHaveBeenCalledWith('stripe_customer_id');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'test-user-id');
      expect(mockStripeCustomersRetrieve).not.toHaveBeenCalled();
    });

    it('should return fixed sample data without calling Stripe when Stripe is mocked in test env', async () => {
      (isStripeMocked as jest.Mock).mockReturnValue(true);
      (isTestEnv as jest.Mock).mockReturnValue(true);
      const result = await getBillingAddress('cus_123');
      expect(result).not.toHaveProperty('error');
      expect(result).toMatchObject({
        companyName: 'Muster GmbH',
        address: expect.objectContaining({ country: 'DE' }),
        email: 'test@example.com',
      });
      expect(mockStripeCustomersRetrieve).not.toHaveBeenCalled();
    });

    it('should return an error without calling Stripe when Stripe is mocked outside test env', async () => {
      (isStripeMocked as jest.Mock).mockReturnValue(true);
      const result = await getBillingAddress('cus_123');
      expect(result).toEqual({ error: 'Stripe secret key is not configured' });
      expect(mockStripeCustomersRetrieve).not.toHaveBeenCalled();
    });

    it('should return an error without calling Stripe for an empty customer id', async () => {
      mockSupabase.single.mockResolvedValue({ data: { stripe_customer_id: '' }, error: null });
      const result = await getBillingAddress('');
      expect(result).toEqual({ error: 'Stripe customer ID is required' });
      expect(mockStripeCustomersRetrieve).not.toHaveBeenCalled();
    });

    it('should return "Customer not found" for a deleted customer', async () => {
      mockStripeCustomersRetrieve.mockResolvedValue({ id: 'cus_123', deleted: true });
      const result = await getBillingAddress('cus_123');
      expect(result).toEqual({ error: 'Customer not found' });
    });

    it('should use default address values when the customer has no address', async () => {
      mockStripeCustomersRetrieve.mockResolvedValue({
        id: 'cus_123',
        name: 'Max Mustermann',
        email: 'max@example.com',
        metadata: { company_name: 'Muster GmbH' },
      });
      const result = await getBillingAddress('cus_123');
      expect(result).toEqual({
        name: 'Max Mustermann',
        companyName: 'Muster GmbH',
        address: { line1: '', line2: null, city: '', state: null, postal_code: '', country: 'DE' },
        email: 'max@example.com',
        phone: null,
      });
    });

    it('should fall back to empty strings and null when name, email, company and address are missing', async () => {
      mockStripeCustomersRetrieve.mockResolvedValue({ id: 'cus_123' });
      const result = await getBillingAddress('cus_123');
      expect(result).toEqual({
        name: '',
        companyName: '',
        address: { line1: '', line2: null, city: '', state: null, postal_code: '', country: 'DE' },
        email: '',
        phone: null,
      });
    });

    it('should prefer metadata.company_name over the legacy business_name', async () => {
      mockStripeCustomersRetrieve.mockResolvedValue({
        id: 'cus_123',
        metadata: { company_name: 'Neu GmbH' },
        business_name: 'Alt GmbH',
        address: fullAddress,
      });
      const result = await getBillingAddress('cus_123');
      expect(result).toMatchObject({ companyName: 'Neu GmbH' });
    });

    it('should use the legacy business_name when metadata.company_name is missing', async () => {
      mockStripeCustomersRetrieve.mockResolvedValue({
        id: 'cus_123',
        metadata: {},
        business_name: 'Alt GmbH',
        address: fullAddress,
      });
      const result = await getBillingAddress('cus_123');
      expect(result).toMatchObject({ companyName: 'Alt GmbH' });
    });

    it('should pass through all present address values including line2, state and phone', async () => {
      mockStripeCustomersRetrieve.mockResolvedValue({
        id: 'cus_123',
        name: 'Max Mustermann',
        email: 'max@example.com',
        phone: '+49 123 456789',
        address: {
          line1: 'Musterstraße 1',
          line2: 'Hinterhof 2',
          city: 'Musterstadt',
          state: 'Bayern',
          postal_code: '12345',
          country: 'AT',
        },
      });
      const result = await getBillingAddress('cus_123');
      expect(result).toEqual({
        name: 'Max Mustermann',
        companyName: '',
        address: {
          line1: 'Musterstraße 1',
          line2: 'Hinterhof 2',
          city: 'Musterstadt',
          state: 'Bayern',
          postal_code: '12345',
          country: 'AT',
        },
        email: 'max@example.com',
        phone: '+49 123 456789',
      });
    });

    it('should map missing address fields to null or defaults when the address is partial', async () => {
      mockStripeCustomersRetrieve.mockResolvedValue({
        id: 'cus_123',
        name: 'Max Mustermann',
        address: { line1: 'Musterstraße 1', postal_code: '12345' },
      });
      const result = await getBillingAddress('cus_123');
      expect(result).toEqual({
        name: 'Max Mustermann',
        companyName: '',
        address: {
          line1: 'Musterstraße 1',
          line2: null,
          city: '',
          state: null,
          postal_code: '12345',
          country: 'DE',
        },
        email: '',
        phone: null,
      });
    });

    it('should default line1 and postal_code to empty strings when an address object lacks them', async () => {
      mockStripeCustomersRetrieve.mockResolvedValue({
        id: 'cus_123',
        address: { city: 'Musterstadt', country: 'AT' },
      });
      const result = await getBillingAddress('cus_123');
      expect(result).toMatchObject({
        address: { line1: '', city: 'Musterstadt', postal_code: '', country: 'AT' },
      });
    });

    it('should return a fetch error with details when Stripe throws an Error', async () => {
      silenceConsoleError();
      mockStripeCustomersRetrieve.mockRejectedValue(new Error('boom'));
      const result = await getBillingAddress('cus_123');
      expect(result).toEqual({ error: 'Failed to fetch billing address', details: 'boom' });
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should use "Unknown error" details when Stripe throws a non-Error value', async () => {
      silenceConsoleError();
      mockStripeCustomersRetrieve.mockRejectedValue('boom');
      const result = await getBillingAddress('cus_123');
      expect(result).toEqual({ error: 'Failed to fetch billing address', details: 'Unknown error' });
    });

    it('should report a missing STRIPE_SECRET_KEY as a fetch error without calling Stripe', async () => {
      silenceConsoleError();
      delete process.env.STRIPE_SECRET_KEY;
      const { actions } = loadFreshModule();
      const result = await actions.getBillingAddress('cus_123');
      expect(result).toEqual({
        error: 'Failed to fetch billing address',
        details: 'STRIPE_SECRET_KEY is not configured',
      });
      expect(mockStripeCustomersRetrieve).not.toHaveBeenCalled();
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

    it('should fail if unauthorized', async () => {
      mockSupabase.single.mockResolvedValue({ data: { stripe_customer_id: 'cus_other' }, error: null });
      const result = await updateBillingAddress('cus_123', { name: 'Jane Doe', address: { line1: '123 St', city: 'Berlin', postal_code: '10115', country: 'DE' } });
      expect(result).toEqual({ success: false, error: 'Nicht autorisiert' });
    });

    it('should return the ensureAuth error message when authentication throws an Error', async () => {
      (ensureAuth as jest.Mock).mockRejectedValue(new Error('Session abgelaufen'));
      const result = await updateBillingAddress('cus_123', baseUpdateDetails);
      expect(result).toEqual({ success: false, error: 'Session abgelaufen' });
      expect(mockStripeCustomersUpdate).not.toHaveBeenCalled();
    });

    it('should fall back to "Nicht authentifiziert" when ensureAuth throws a non-Error value', async () => {
      (ensureAuth as jest.Mock).mockRejectedValue('boom');
      const result = await updateBillingAddress('cus_123', baseUpdateDetails);
      expect(result).toEqual({ success: false, error: 'Nicht authentifiziert' });
    });

    it('should return "Nicht autorisiert" without calling Stripe when no profile is found', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: null });
      const result = await updateBillingAddress('cus_123', baseUpdateDetails);
      expect(result).toEqual({ success: false, error: 'Nicht autorisiert' });
      expect(mockStripeCustomersUpdate).not.toHaveBeenCalled();
    });

    it('should check ownership via the profile of the authenticated user before updating', async () => {
      mockSupabase.single.mockResolvedValue({ data: { stripe_customer_id: 'cus_other' }, error: null });
      const result = await updateBillingAddress('cus_123', baseUpdateDetails);
      expect(result).toEqual({ success: false, error: 'Nicht autorisiert' });
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabase.select).toHaveBeenCalledWith('stripe_customer_id');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'test-user-id');
      expect(mockStripeCustomersUpdate).not.toHaveBeenCalled();
    });

    it('should return success without calling Stripe when Stripe is mocked in test env', async () => {
      (isStripeMocked as jest.Mock).mockReturnValue(true);
      (isTestEnv as jest.Mock).mockReturnValue(true);
      const result = await updateBillingAddress('cus_123', baseUpdateDetails);
      expect(result).toEqual({ success: true });
      expect(mockStripeCustomersUpdate).not.toHaveBeenCalled();
    });

    it('should return an error without calling Stripe when Stripe is mocked outside test env', async () => {
      (isStripeMocked as jest.Mock).mockReturnValue(true);
      const result = await updateBillingAddress('cus_123', baseUpdateDetails);
      expect(result).toEqual({ success: false, error: 'Stripe secret key is not configured' });
      expect(mockStripeCustomersUpdate).not.toHaveBeenCalled();
    });

    it('should return an error without calling Stripe for an empty customer id', async () => {
      mockSupabase.single.mockResolvedValue({ data: { stripe_customer_id: '' }, error: null });
      const result = await updateBillingAddress('', baseUpdateDetails);
      expect(result).toEqual({ success: false, error: 'Stripe customer ID is required' });
      expect(mockStripeCustomersUpdate).not.toHaveBeenCalled();
    });

    it('should not send a metadata field when companyName is undefined', async () => {
      mockStripeCustomersUpdate.mockResolvedValue({ id: 'cus_123' });
      await updateBillingAddress('cus_123', baseUpdateDetails);
      const payload = mockStripeCustomersUpdate.mock.calls[0][1];
      expect(Object.keys(payload)).not.toContain('metadata');
    });

    it('should clear company_name in metadata when companyName is an empty string', async () => {
      mockStripeCustomersUpdate.mockResolvedValue({ id: 'cus_123' });
      await updateBillingAddress('cus_123', { ...baseUpdateDetails, companyName: '' });
      expect(mockStripeCustomersUpdate).toHaveBeenCalledWith(
        'cus_123',
        expect.objectContaining({ metadata: { company_name: null } }),
      );
    });

    it('should store a non-empty companyName in metadata.company_name', async () => {
      mockStripeCustomersUpdate.mockResolvedValue({ id: 'cus_123' });
      await updateBillingAddress('cus_123', { ...baseUpdateDetails, companyName: 'Muster GmbH' });
      expect(mockStripeCustomersUpdate).toHaveBeenCalledWith(
        'cus_123',
        expect.objectContaining({ name: 'Jane Doe', metadata: { company_name: 'Muster GmbH' } }),
      );
    });

    it.each([
      ['empty strings', { line2: '', state: '' }],
      ['null values', { line2: null, state: null }],
      ['omitted values', {}],
    ])('should omit line2 and state from the Stripe payload for %s', async (_label, extraAddress) => {
      mockStripeCustomersUpdate.mockResolvedValue({ id: 'cus_123' });
      await updateBillingAddress('cus_123', {
        ...baseUpdateDetails,
        address: { ...baseUpdateDetails.address, ...extraAddress },
      });
      const payload = mockStripeCustomersUpdate.mock.calls[0][1];
      expect(Object.keys(payload.address)).not.toContain('line2');
      expect(Object.keys(payload.address)).not.toContain('state');
    });

    it('should include line2 and state in the Stripe payload when they have values', async () => {
      mockStripeCustomersUpdate.mockResolvedValue({ id: 'cus_123' });
      await updateBillingAddress('cus_123', {
        ...baseUpdateDetails,
        address: { ...baseUpdateDetails.address, line2: 'Hinterhof 2', state: 'Bayern' },
      });
      expect(mockStripeCustomersUpdate).toHaveBeenCalledWith('cus_123', {
        name: 'Jane Doe',
        address: {
          line1: '456 Side St',
          line2: 'Hinterhof 2',
          city: 'Munich',
          state: 'Bayern',
          postal_code: '80331',
          country: 'DE',
        },
      });
    });

    it('should return the Stripe error message when the update fails with an Error', async () => {
      silenceConsoleError();
      mockStripeCustomersUpdate.mockRejectedValue(new Error('denied'));
      const result = await updateBillingAddress('cus_123', baseUpdateDetails);
      expect(result).toEqual({ success: false, error: 'denied' });
    });

    it('should fall back to a generic message when the update fails with a non-Error value', async () => {
      silenceConsoleError();
      mockStripeCustomersUpdate.mockRejectedValue('boom');
      const result = await updateBillingAddress('cus_123', baseUpdateDetails);
      expect(result).toEqual({ success: false, error: 'Failed to update billing address' });
    });

    it('should report a missing STRIPE_SECRET_KEY without calling Stripe', async () => {
      silenceConsoleError();
      delete process.env.STRIPE_SECRET_KEY;
      const { actions, StripeCtor } = loadFreshModule();
      const result = await actions.updateBillingAddress('cus_123', baseUpdateDetails);
      expect(result).toEqual({ success: false, error: 'STRIPE_SECRET_KEY is not configured' });
      expect(StripeCtor).not.toHaveBeenCalled();
      expect(mockStripeCustomersUpdate).not.toHaveBeenCalled();
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

    it('should fail if unauthorized', async () => {
      mockSupabase.single.mockResolvedValue({ data: { stripe_customer_id: 'cus_other' }, error: null });
      const result = await createSetupIntent('cus_123');
      expect(result).toEqual({ error: 'Nicht autorisiert' });
    });

    it('should return the ensureAuth error message when authentication throws an Error', async () => {
      (ensureAuth as jest.Mock).mockRejectedValue(new Error('Session abgelaufen'));
      const result = await createSetupIntent('cus_123');
      expect(result).toEqual({ error: 'Session abgelaufen' });
      expect(mockStripeSetupIntentsCreate).not.toHaveBeenCalled();
    });

    it('should fall back to "Nicht authentifiziert" when ensureAuth throws a non-Error value', async () => {
      (ensureAuth as jest.Mock).mockRejectedValue('boom');
      const result = await createSetupIntent('cus_123');
      expect(result).toEqual({ error: 'Nicht authentifiziert' });
    });

    it('should return "Nicht autorisiert" without calling Stripe when no profile is found', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: null });
      const result = await createSetupIntent('cus_123');
      expect(result).toEqual({ error: 'Nicht autorisiert' });
      expect(mockStripeSetupIntentsCreate).not.toHaveBeenCalled();
    });

    it('should check ownership via the profile of the authenticated user before creating a SetupIntent', async () => {
      mockSupabase.single.mockResolvedValue({ data: { stripe_customer_id: 'cus_other' }, error: null });
      await createSetupIntent('cus_123');
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabase.select).toHaveBeenCalledWith('stripe_customer_id');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'test-user-id');
      expect(mockStripeSetupIntentsCreate).not.toHaveBeenCalled();
    });

    it('should return a mock client secret without calling Stripe when Stripe is mocked in test env', async () => {
      (isStripeMocked as jest.Mock).mockReturnValue(true);
      (isTestEnv as jest.Mock).mockReturnValue(true);
      const result = await createSetupIntent('cus_123');
      expect(result).toEqual({ clientSecret: 'seti_mock_secret_123' });
      expect(mockStripeSetupIntentsCreate).not.toHaveBeenCalled();
    });

    it('should return an error without calling Stripe when Stripe is mocked outside test env', async () => {
      (isStripeMocked as jest.Mock).mockReturnValue(true);
      const result = await createSetupIntent('cus_123');
      expect(result).toEqual({ error: 'Stripe secret key is not configured' });
      expect(mockStripeSetupIntentsCreate).not.toHaveBeenCalled();
    });

    it('should return an error without calling Stripe for an empty customer id', async () => {
      mockSupabase.single.mockResolvedValue({ data: { stripe_customer_id: '' }, error: null });
      const result = await createSetupIntent('');
      expect(result).toEqual({ error: 'Stripe customer ID is required' });
      expect(mockStripeSetupIntentsCreate).not.toHaveBeenCalled();
    });

    it('should return an error when Stripe returns a SetupIntent without client_secret', async () => {
      silenceConsoleError();
      mockStripeSetupIntentsCreate.mockResolvedValue({ client_secret: null });
      const result = await createSetupIntent('cus_123');
      expect(result).toEqual({ error: 'Failed to create SetupIntent: client_secret is null' });
    });

    it('should return the Stripe error message when SetupIntent creation fails with an Error', async () => {
      silenceConsoleError();
      mockStripeSetupIntentsCreate.mockRejectedValue(new Error('Card declined'));
      const result = await createSetupIntent('cus_123');
      expect(result).toEqual({ error: 'Card declined' });
    });

    it('should fall back to a generic message when SetupIntent creation fails with a non-Error value', async () => {
      silenceConsoleError();
      mockStripeSetupIntentsCreate.mockRejectedValue('boom');
      const result = await createSetupIntent('cus_123');
      expect(result).toEqual({ error: 'Failed to create SetupIntent' });
    });

    it('should report a missing STRIPE_SECRET_KEY without calling Stripe', async () => {
      silenceConsoleError();
      delete process.env.STRIPE_SECRET_KEY;
      const { actions, StripeCtor } = loadFreshModule();
      const result = await actions.createSetupIntent('cus_123');
      expect(result).toEqual({ error: 'STRIPE_SECRET_KEY is not configured' });
      expect(StripeCtor).not.toHaveBeenCalled();
      expect(mockStripeSetupIntentsCreate).not.toHaveBeenCalled();
    });

    it('should create the Stripe client once with the env key and reuse it across calls', async () => {
      mockStripeSetupIntentsCreate.mockResolvedValue({ client_secret: 'seti_1_secret' });
      const { actions, StripeCtor } = loadFreshModule();
      await actions.createSetupIntent('cus_123');
      await actions.createSetupIntent('cus_123');
      expect(StripeCtor).toHaveBeenCalledTimes(1);
      expect(StripeCtor).toHaveBeenCalledWith('sk_test_123', STRIPE_CONFIG);
      expect(mockStripeSetupIntentsCreate).toHaveBeenCalledTimes(2);
    });
  });
});
