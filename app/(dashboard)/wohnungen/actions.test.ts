import { speichereWohnung } from './actions'; // Adjust path as necessary
import { createClient } from '@/utils/supabase/server';
import { getPlanDetails } from '@/lib/stripe-server';
import { fetchUserProfile } from '@/lib/data-fetching'; // This is a new mock dependency
import { revalidatePath } from 'next/cache';

// Mock dependencies
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));
jest.mock('@/lib/stripe-server', () => ({
  getPlanDetails: jest.fn(),
}));
jest.mock('@/lib/data-fetching', () => ({ // Mock for fetchUserProfile
  fetchUserProfile: jest.fn(),
}));
jest.mock('next/cache', () => ({ // Mock revalidatePath
  revalidatePath: jest.fn(),
}));

describe('Server Action: speichereWohnung', () => {
  let mockSupabaseClient: any;
  const mockUserId = 'user-test-id-123';
  const mockUser = { id: mockUserId, email: 'test@example.com' };
  const mockFormData = {
    name: 'Test Wohnung',
    groesse: '70',
    miete: '1200',
    haus_id: 'haus-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null }), // Default to successful insert
      // For count:
      // select('*', { count: 'exact', head: true }) can be tricky.
      // Let's assume eq after select for count returns an object with a count property or an error.
      // This might need adjustment based on how Supabase client mock behaves.
      // A simpler way for count mocks: have .select() return an object that then has .eq() which returns the count.
    };
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient); // Use mockReturnValue for non-async functions
  });

  it('should return error if user is not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Auth error' } });
    const result = await speichereWohnung(mockFormData);
    expect(result.error).toBe('Benutzer nicht authentifiziert.');
  });

  it('should return error if user profile is not found', async () => {
    (fetchUserProfile as jest.Mock).mockResolvedValueOnce(null);
    const result = await speichereWohnung(mockFormData);
    expect(result.error).toBe('Benutzerprofil nicht gefunden.');
  });

  it('should return error if subscription is not active', async () => {
    (fetchUserProfile as jest.Mock).mockResolvedValueOnce({
      id: mockUserId,
      stripe_subscription_status: 'canceled',
      stripe_price_id: 'price_123'
    });
    const result = await speichereWohnung(mockFormData);
    expect(result.error).toBe('Ein aktives Abonnement mit einem gültigen Plan ist erforderlich, um Wohnungen hinzuzufügen.');
  });

  it('should allow creation if plan limit is not reached', async () => {
    (fetchUserProfile as jest.Mock).mockResolvedValueOnce({
      id: mockUserId,
      email: 'test@example.com', // Added email as per prompt
      stripe_subscription_status: 'active',
      stripe_price_id: 'price_10_limit' // Specific price_id from prompt
    });
    (getPlanDetails as jest.Mock).mockResolvedValueOnce({ limitWohnungen: 10, name: 'Test Plan', price: 1000, currency: 'usd', features: [] }); // Specific plan details
    // Mock count of existing Wohnungen
    // For this case, we need to ensure the mock for `select().eq()` returns the count
    // The existing mock `mockSupabaseClient.select.mockResolvedValueOnce({ count: 5, error: null });` will be used.
    // We need to ensure `eq` is also part of the chain if the actual implementation uses it before getting the count.
    // The current mock structure is: from(...).select(...).eq(...), where select returns the count object.
    // So, from('Wohnungen').select({ count: 'exact', head: true }).eq('user_id', mockUserId)
    // The .select() part should be mocked to return the count object.
    mockSupabaseClient.from.mockReturnThis(); // ensure 'from' is chainable
    mockSupabaseClient.select.mockImplementationOnce((query, options) => {
      if (options && options.count === 'exact' && options.head === true) {
        return {
          eq: jest.fn().mockResolvedValueOnce({ count: 5, error: null }) // count for this test case
        };
      }
      return mockSupabaseClient; // Default to returning the client for other selects
    });


    const result = await speichereWohnung(mockFormData);

    expect(getPlanDetails).toHaveBeenCalledWith('price_10_limit');
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('Wohnungen');
    // Ensure the select call for counting was made correctly
    expect(mockSupabaseClient.select).toHaveBeenCalledWith({ count: 'exact', head: true });
    expect(mockSupabaseClient.select().eq).toHaveBeenCalledWith('user_id', mockUserId);

    expect(mockSupabaseClient.insert).toHaveBeenCalledWith(expect.objectContaining({
      name: mockFormData.name,
      user_id: mockUserId,
      haus_id: mockFormData.haus_id, // ensure all form data is passed
      groesse: Number(mockFormData.groesse),
      miete: Number(mockFormData.miete),
    }));
    expect(result.success).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith('/wohnungen');
  });

  it('should return error if plan limit is reached', async () => {
    (fetchUserProfile as jest.Mock).mockResolvedValueOnce({
      id: mockUserId,
      email: 'test@example.com',
      stripe_subscription_status: 'active',
      stripe_price_id: 'price_10_limit' // Same plan as case 1 for this test
    });
    (getPlanDetails as jest.Mock).mockResolvedValueOnce({ limitWohnungen: 10, name: 'Test Plan', price: 1000, currency: 'usd', features: [] });
    mockSupabaseClient.from.mockReturnThis();
    mockSupabaseClient.select.mockImplementationOnce((query, options) => {
      if (options && options.count === 'exact' && options.head === true) {
        return {
          eq: jest.fn().mockResolvedValueOnce({ count: 10, error: null }) // At limit for this test case
        };
      }
      return mockSupabaseClient;
    });

    const result = await speichereWohnung(mockFormData);

    expect(result.error).toBe('Maximale Anzahl an Wohnungen (10) für Ihr Abonnement erreicht.');
    expect(mockSupabaseClient.insert).not.toHaveBeenCalled();
  });

  it('should allow creation if plan has no limit (limitWohnungen is null)', async () => {
    (fetchUserProfile as jest.Mock).mockResolvedValueOnce({
      id: mockUserId,
      email: 'test@example.com',
      stripe_subscription_status: 'active',
      stripe_price_id: 'price_null_limit' // Specific price_id for this test
    });
    (getPlanDetails as jest.Mock).mockResolvedValueOnce({ limitWohnungen: null, name: 'Unlimited Plan', price: 2000, currency: 'usd', features: [] }); // Unlimited plan
    mockSupabaseClient.from.mockReturnThis();
    mockSupabaseClient.select.mockImplementationOnce((query, options) => {
      if (options && options.count === 'exact' && options.head === true) {
        return {
          eq: jest.fn().mockResolvedValueOnce({ count: 100, error: null }) // User has 100, but plan is unlimited
        };
      }
      return mockSupabaseClient;
    });

    const result = await speichereWohnung(mockFormData);
    expect(result.success).toBe(true);
    expect(mockSupabaseClient.insert).toHaveBeenCalled();
  });

  it('should allow creation if plan limit is 0 or negative (treated as unlimited)', async () => {
    (fetchUserProfile as jest.Mock).mockResolvedValueOnce({
      id: mockUserId,
      stripe_subscription_status: 'active',
      stripe_price_id: 'price_zero_limit'
    });
    (getPlanDetails as jest.Mock).mockResolvedValueOnce({ limitWohnungen: 0 }); // Zero limit
    mockSupabaseClient.select.mockResolvedValueOnce({ count: 5, error: null });

    const result = await speichereWohnung(mockFormData);
    expect(result.success).toBe(true);
    expect(mockSupabaseClient.insert).toHaveBeenCalled();
  });

  it('should return error if getPlanDetails returns null (Test Case 5)', async () => {
    // Test Case 5: Active subscription, but getPlanDetails returns null.
    (fetchUserProfile as jest.Mock).mockResolvedValueOnce({
      id: mockUserId,
      email: 'test@example.com',
      stripe_subscription_status: 'active',
      stripe_price_id: 'price_plan_not_found'
    });
    (getPlanDetails as jest.Mock).mockResolvedValueOnce(null); // getPlanDetails returns null

    const result = await speichereWohnung(mockFormData);

    expect(result.error).toBe('Details zu Ihrem Abonnementplan konnten nicht gefunden werden. Bitte überprüfen Sie Ihr Abonnement oder kontaktieren Sie den Support.');
    expect(mockSupabaseClient.insert).not.toHaveBeenCalled();
  });

  it('should return error if getPlanDetails throws an error', async () => {
    (fetchUserProfile as jest.Mock).mockResolvedValueOnce({
      id: mockUserId,
      email: 'test@example.com',
      stripe_subscription_status: 'active',
      stripe_price_id: 'price_api_error'
    });
    (getPlanDetails as jest.Mock).mockRejectedValueOnce(new Error('Stripe API down'));

    const result = await speichereWohnung(mockFormData);

    expect(result.error).toBe('Fehler beim Abrufen der Plandetails für Ihr Abonnement. Bitte versuchen Sie es später erneut.');
    expect(mockSupabaseClient.insert).not.toHaveBeenCalled();
  });

  it('should return error if planDetails.limitWohnungen is an invalid type (e.g. undefined)', async () => {
    (fetchUserProfile as jest.Mock).mockResolvedValueOnce({
      id: mockUserId,
      email: 'test@example.com',
      stripe_subscription_status: 'active',
      stripe_price_id: 'price_invalid_limit_type'
    });
    (getPlanDetails as jest.Mock).mockResolvedValueOnce({ name: 'Test Plan', limitWohnungen: undefined });

    const result = await speichereWohnung(mockFormData);

    expect(result.error).toBe('Ungültige Konfiguration für Wohnungslimit in Ihrem Plan. Bitte kontaktieren Sie den Support.');
    expect(mockSupabaseClient.insert).not.toHaveBeenCalled();
  });

  it('should return error if planDetails.limitWohnungen is an invalid value (e.g. a string)', async () => {
    (fetchUserProfile as jest.Mock).mockResolvedValueOnce({
      id: mockUserId,
      email: 'test@example.com',
      stripe_subscription_status: 'active',
      stripe_price_id: 'price_invalid_limit_value'
    });
    (getPlanDetails as jest.Mock).mockResolvedValueOnce({ name: 'Test Plan', limitWohnungen: 'abc' });

    const result = await speichereWohnung(mockFormData);

    expect(result.error).toBe('Ungültige Konfiguration für Wohnungslimit in Ihrem Plan. Bitte kontaktieren Sie den Support.');
    expect(mockSupabaseClient.insert).not.toHaveBeenCalled();
  });

  it('should return error if counting apartments fails', async () => {
    (fetchUserProfile as jest.Mock).mockResolvedValueOnce({
      id: mockUserId,
      email: 'test@example.com', // Added email
      stripe_subscription_status: 'active',
      stripe_price_id: 'price_valid_for_count_error' // Specific price_id
    });
    (getPlanDetails as jest.Mock).mockResolvedValueOnce({ limitWohnungen: 5, name: 'Test Plan', price: 1000, currency: 'usd', features: [] }); // Valid plan
    mockSupabaseClient.from.mockReturnThis();
    mockSupabaseClient.select.mockImplementationOnce((query, options) => {
      if (options && options.count === 'exact' && options.head === true) {
        return { // Simulate error on count
          eq: jest.fn().mockResolvedValueOnce({ count: null, error: { message: 'DB count error' } })
        };
      }
      return mockSupabaseClient;
    });

    const result = await speichereWohnung(mockFormData);
    expect(result.error).toBe('Fehler beim Zählen der Wohnungen.');
  });

  it('should return error if database insertion fails', async () => {
    (fetchUserProfile as jest.Mock).mockResolvedValueOnce({
      id: mockUserId,
      email: 'test@example.com', // Added email
      stripe_subscription_status: 'active',
      stripe_price_id: 'price_valid_for_insert_error' // Specific price_id
    });
    (getPlanDetails as jest.Mock).mockResolvedValueOnce({ limitWohnungen: 5, name: 'Test Plan', price: 1000, currency: 'usd', features: [] }); // Valid plan, limit not reached
    mockSupabaseClient.from.mockReturnThis();
    mockSupabaseClient.select.mockImplementationOnce((query, options) => {
      if (options && options.count === 'exact' && options.head === true) {
        return {
          eq: jest.fn().mockResolvedValueOnce({ count: 1, error: null }) // Limit not reached
        };
      }
      return mockSupabaseClient;
    });
    mockSupabaseClient.insert.mockResolvedValueOnce({ error: { message: 'DB insert error' } }); // Simulate insert error

    const result = await speichereWohnung(mockFormData);
    expect(result.error).toBe('DB insert error'); // As per prompt
  });
});

// #################################################################################################
// # Tests for aktualisiereWohnung
// #################################################################################################
describe('Server Action: aktualisiereWohnung', () => {
  let mockSupabaseClient: any;
  const mockUserId = 'user-test-id-456';
  const mockUser = { id: mockUserId, email: 'updater@example.com' };
  const mockWohnungId = 'wohnung-to-update-123';
  const mockFormData = {
    name: 'Updated Test Wohnung',
    groesse: '80',
    miete: '1300',
    haus_id: 'haus-2',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      update: jest.fn().mockResolvedValue({ error: null }), // Default to successful update
    };
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
    (fetchUserProfile as jest.Mock).mockResolvedValue({ // Default successful profile fetch
      id: mockUserId,
      email: mockUser.email,
      stripe_subscription_status: 'active',
      stripe_price_id: 'price_standard_limit_5'
    });
    (getPlanDetails as jest.Mock).mockResolvedValue({ // Default plan details
      name: 'Standard Plan',
      limitWohnungen: 5,
      price: 1000,
      currency: 'eur',
      features: []
    });
    // Default count mock for .select({ count: 'exact', head: true }).eq(...)
    // Ensure 'from' is chainable and 'select' can handle count queries
    mockSupabaseClient.from.mockImplementation(() => {
      return {
        select: jest.fn((query, options) => {
          if (options && options.count === 'exact' && options.head === true) {
            return {
              eq: jest.fn().mockResolvedValueOnce({ count: 3, error: null }) // Default count, under limit
            };
          }
          return mockSupabaseClient; // Fallback for other select usages if any
        }),
        update: mockSupabaseClient.update, // Ensure update is still available after from
        eq: mockSupabaseClient.eq, // Ensure eq is still available
      };
    });
  });

  // Test: User over limit is blocked.
  it('should block update if user is over their apartment limit', async () => {
    (fetchUserProfile as jest.Mock).mockResolvedValueOnce({
      id: mockUserId, email: mockUser.email, stripe_subscription_status: 'active', stripe_price_id: 'price_limit_5'
    });
    (getPlanDetails as jest.Mock).mockResolvedValueOnce({ limitWohnungen: 5 });
    // Reset from mock to provide a different count for this specific test
    mockSupabaseClient.from.mockImplementation(() => {
      return {
        select: jest.fn((query, options) => {
          if (options && options.count === 'exact' && options.head === true) {
            return { eq: jest.fn().mockResolvedValueOnce({ count: 6, error: null }) }; // User has 6, limit is 5
          }
          return mockSupabaseClient;
        }),
        update: mockSupabaseClient.update,
        eq: mockSupabaseClient.eq,
      };
    });

    const result = await aktualisiereWohnung(mockWohnungId, mockFormData);
    expect(result.error).toBe('Bearbeitung nicht möglich. Sie haben die maximale Anzahl an Wohnungen (5) für Ihr Abonnement überschritten.');
    expect(mockSupabaseClient.update).not.toHaveBeenCalled();
  });

  // Test: User at limit is allowed.
  it('should allow update if user is at their apartment limit', async () => {
    (fetchUserProfile as jest.Mock).mockResolvedValueOnce({
      id: mockUserId, email: mockUser.email, stripe_subscription_status: 'active', stripe_price_id: 'price_limit_5'
    });
    (getPlanDetails as jest.Mock).mockResolvedValueOnce({ limitWohnungen: 5 });
    mockSupabaseClient.from.mockImplementation(() => {
      return {
        select: jest.fn((query, options) => {
          if (options && options.count === 'exact' && options.head === true) {
            return { eq: jest.fn().mockResolvedValueOnce({ count: 5, error: null }) }; // User has 5, limit is 5
          }
          return mockSupabaseClient;
        }),
        update: mockSupabaseClient.update,
        eq: mockSupabaseClient.eq,
      };
    });

    const result = await aktualisiereWohnung(mockWohnungId, mockFormData);
    expect(result.success).toBe(true);
    expect(mockSupabaseClient.update).toHaveBeenCalled();
  });

  // Test: User under limit is allowed.
  it('should allow update if user is under their apartment limit', async () => {
     // Default mocks already set this up (count 3, limit 5)
    const result = await aktualisiereWohnung(mockWohnungId, mockFormData);
    expect(result.success).toBe(true);
    expect(mockSupabaseClient.update).toHaveBeenCalled();
  });

  // Test: User with unlimited plan is allowed
  it('should allow update if user has an unlimited plan', async () => {
    (fetchUserProfile as jest.Mock).mockResolvedValueOnce({
      id: mockUserId, email: mockUser.email, stripe_subscription_status: 'active', stripe_price_id: 'price_unlimited'
    });
    (getPlanDetails as jest.Mock).mockResolvedValueOnce({ limitWohnungen: null }); // Unlimited plan
    // Count mock doesn't need to change, as it should be ignored for unlimited
    mockSupabaseClient.from.mockImplementation(() => {
      return {
        select: jest.fn((query, options) => { // This select for count might not even be called if logic is correct
          if (options && options.count === 'exact' && options.head === true) {
            return { eq: jest.fn().mockResolvedValueOnce({ count: 100, error: null }) };
          }
          return mockSupabaseClient;
        }),
        update: mockSupabaseClient.update,
        eq: mockSupabaseClient.eq,
      };
    });


    const result = await aktualisiereWohnung(mockWohnungId, mockFormData);
    expect(result.success).toBe(true);
    expect(mockSupabaseClient.update).toHaveBeenCalled();
  });

  // Test: getPlanDetails returns null
  it('should return error if getPlanDetails returns null for update', async () => {
    (getPlanDetails as jest.Mock).mockResolvedValueOnce(null);
    const result = await aktualisiereWohnung(mockWohnungId, mockFormData);
    expect(result.error).toBe('Details zu Ihrem Abonnementplan konnten nicht gefunden werden. Bearbeitung nicht möglich.');
    expect(mockSupabaseClient.update).not.toHaveBeenCalled();
  });

  // Test: getPlanDetails throws error
  it('should return error if getPlanDetails throws an error during update', async () => {
    (getPlanDetails as jest.Mock).mockRejectedValueOnce(new Error('Stripe API flaky for update'));
    const result = await aktualisiereWohnung(mockWohnungId, mockFormData);
    expect(result.error).toBe('Fehler beim Abrufen der Plandetails. Bearbeitung nicht möglich.');
    expect(mockSupabaseClient.update).not.toHaveBeenCalled();
  });

  // Test: limitWohnungen is invalid
  it('should return error if limitWohnungen is invalid for update', async () => {
    (getPlanDetails as jest.Mock).mockResolvedValueOnce({ limitWohnungen: undefined });
    const result = await aktualisiereWohnung(mockWohnungId, mockFormData);
    expect(result.error).toBe('Ungültige Konfiguration für Wohnungslimit in Ihrem Plan. Bearbeitung nicht möglich.');
    expect(mockSupabaseClient.update).not.toHaveBeenCalled();
  });

  // Test: No active subscription
  it('should return error if user has no active subscription for update', async () => {
    (fetchUserProfile as jest.Mock).mockResolvedValueOnce({
      id: mockUserId, email: mockUser.email, stripe_subscription_status: 'inactive', stripe_price_id: null
    });
    const result = await aktualisiereWohnung(mockWohnungId, mockFormData);
    expect(result.error).toBe('Ein aktives Abonnement ist für die Bearbeitung erforderlich.');
    expect(mockSupabaseClient.update).not.toHaveBeenCalled();
  });

  // Test: User not authenticated
  it('should return error if user is not authenticated for update', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'No user for update' } });
    const result = await aktualisiereWohnung(mockWohnungId, mockFormData);
    expect(result.error).toBe('Benutzer nicht authentifiziert.');
    expect(mockSupabaseClient.update).not.toHaveBeenCalled();
  });

  // Test: User profile not found
  it('should return error if user profile is not found for update', async () => {
    (fetchUserProfile as jest.Mock).mockResolvedValueOnce(null);
    const result = await aktualisiereWohnung(mockWohnungId, mockFormData);
    expect(result.error).toBe('Benutzerprofil nicht gefunden.');
    expect(mockSupabaseClient.update).not.toHaveBeenCalled();
  });

  // Test: Error counting apartments
  it('should return error if counting apartments fails during update', async () => {
    (fetchUserProfile as jest.Mock).mockResolvedValueOnce({ // Active sub, valid plan
      id: mockUserId, email: mockUser.email, stripe_subscription_status: 'active', stripe_price_id: 'price_limit_5_for_count_error'
    });
    (getPlanDetails as jest.Mock).mockResolvedValueOnce({ limitWohnungen: 5 }); // Plan with a limit
    mockSupabaseClient.from.mockImplementation(() => {
      return {
        select: jest.fn((query, options) => {
          if (options && options.count === 'exact' && options.head === true) {
            return { eq: jest.fn().mockResolvedValueOnce({ count: null, error: { message: 'DB count error for update' } }) };
          }
          return mockSupabaseClient;
        }),
        update: mockSupabaseClient.update,
        eq: mockSupabaseClient.eq,
      };
    });
    const result = await aktualisiereWohnung(mockWohnungId, mockFormData);
    expect(result.error).toBe('Fehler beim Zählen der Wohnungen.');
    expect(mockSupabaseClient.update).not.toHaveBeenCalled();
  });

  // Test: Update fails in Supabase
  it('should propagate error if Supabase update fails', async () => {
    // Standard setup should allow checks to pass (user under limit, active sub etc.)
    // Default count is 3, default limit is 5.
    mockSupabaseClient.update.mockResolvedValueOnce({ error: { message: 'Supabase DB update error' } });
    const result = await aktualisiereWohnung(mockWohnungId, mockFormData);
    expect(result.error).toBe('Supabase DB update error');
    expect(revalidatePath).not.toHaveBeenCalled(); // Should not revalidate if update failed
  });

  // Test: Successful update revalidates path
  it('should revalidate path on successful update', async () => {
    // Standard setup, all checks should pass
    const result = await aktualisiereWohnung(mockWohnungId, mockFormData);
    expect(result.success).toBe(true);
    expect(mockSupabaseClient.update).toHaveBeenCalledWith(expect.objectContaining({
      name: mockFormData.name,
      groesse: parseFloat(mockFormData.groesse),
      miete: parseFloat(mockFormData.miete),
      haus_id: mockFormData.haus_id,
    }));
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', mockWohnungId);
    expect(revalidatePath).toHaveBeenCalledWith('/wohnungen');
  });
});
