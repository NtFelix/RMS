// Mock all the required modules at the top level
jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn().mockImplementation(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ 
        data: { user: { id: 'test-user-id' } }, 
        error: null 
      }),
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue({ data: { id: 'new-wohnung-id' }, error: null }),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ data: [], error: null }),
  })),
}));

jest.mock('@/lib/stripe-server', () => ({
  getPlanDetails: jest.fn().mockResolvedValue({
    limitWohnungen: 10, // Default to 10 for most tests
    features: {
      max_apartments: 10,
    },
  }),
}));

jest.mock('@/lib/data-fetching', () => ({
  fetchUserProfile: jest.fn().mockResolvedValue({
    id: 'test-user-id',
    email: 'test@example.com',
    stripe_subscription_status: 'active',
    stripe_price_id: 'price_123',
  }),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

// Import the modules after setting up mocks
import { speichereWohnung, aktualisiereWohnung } from './actions';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getPlanDetails } from '@/lib/stripe-server';
import { fetchUserProfile } from '@/lib/data-fetching';
import { revalidatePath } from 'next/cache';

// Test data
const mockUserId = 'user-test-id-123';
const mockUser = { id: mockUserId, email: 'test@example.com' };
const mockWohnungId = 'wohnung-test-id-123';
const mockHausId = 'haus-1';

// Form data for testing
const createMockFormData = (overrides = {}) => ({
  name: 'Test Wohnung',
  groesse: '70',
  miete: '1200',
  haus_id: mockHausId,
  ...overrides
});

// Default form data for tests
const mockFormData = createMockFormData();

// Helper function to create a mock Supabase client with proper typing
type MockSupabaseClient = {
  auth: {
    getUser: jest.Mock;
  };
  from: jest.Mock;
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  eq: jest.Mock;
  // Add any other methods that are used in the tests
  [key: string]: any; // This allows for dynamic properties
};

const createMockSupabaseClient = (user: any = mockUser): MockSupabaseClient => {
  const mockClient: MockSupabaseClient = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ data: [], error: null }),
  };
  
  // Set up method chaining
  mockClient.from.mockImplementation(() => mockClient);
  mockClient.select.mockImplementation(() => mockClient);
  mockClient.insert.mockImplementation(() => mockClient);
  mockClient.update.mockImplementation(() => mockClient);
  
  return mockClient;
};

describe('speichereWohnung', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient();
    (createSupabaseServerClient as jest.Mock).mockImplementation(() => mockSupabaseClient);
  });

  it('should save a new apartment successfully', async () => {
    // Mock the count query to return 0 apartments (below limit)
    mockSupabaseClient.select.mockImplementation(() => ({
      eq: jest.fn().mockResolvedValue({ data: [], count: 0, error: null })
    }));

    // Mock the insert to return the new apartment ID
    mockSupabaseClient.insert.mockResolvedValueOnce({
      data: { id: 'new-wohnung-id' },
      error: null,
    });

    const result = await speichereWohnung(mockFormData);

    expect(result).toEqual({
      success: true
    });
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('Wohnungen');
    expect(revalidatePath).toHaveBeenCalledWith('/wohnungen');
  });

  it('should return error if user is not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    const result = await speichereWohnung(mockFormData);

    expect(result).toEqual({
      error: 'Benutzer nicht authentifiziert.',
    });
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
    expect(result.error).toBe('Ein aktives Abonnement oder eine aktive Testphase ist erforderlich, um Wohnungen hinzuzufügen.');
  });

  it('should allow creation if plan limit is not reached', async () => {
    // Mock the count query to return 5 apartments (below limit of 10)
    mockSupabaseClient.select.mockImplementation(() => ({
      eq: jest.fn().mockResolvedValue({ data: [], count: 5, error: null })
    }));

    // Mock the insert to return the new apartment ID
    mockSupabaseClient.insert.mockResolvedValueOnce({
      data: { id: 'new-wohnung-id' },
      error: null,
    });

    const result = await speichereWohnung(mockFormData);

    expect(result).toEqual({
      success: true
    });
    expect(mockSupabaseClient.insert).toHaveBeenCalled();
  });

  it('should return error if plan limit is reached', async () => {
    // Mock the count query to return 10 apartments (at limit)
    mockSupabaseClient.select.mockImplementation(() => ({
      eq: jest.fn().mockResolvedValue({ data: [], count: 10, error: null })
    }));

    const result = await speichereWohnung(mockFormData);

    expect(result).toEqual({
      error: 'Maximale Anzahl an Wohnungen (10) für Ihr Abonnement erreicht.',
    });
    expect(mockSupabaseClient.insert).not.toHaveBeenCalled();
  });

  it('should allow creation if plan has no limit (limitWohnungen is null)', async () => {
    // Mock getPlanDetails to return null for limitWohnungen (unlimited)
    (getPlanDetails as jest.Mock).mockResolvedValueOnce({
      limitWohnungen: null,
      features: {
        max_apartments: null,
      },
      id: mockUserId,
      email: 'test@example.com',
      stripe_subscription_status: 'active',
    });

    // Mock the insert to return the new apartment ID
    mockSupabaseClient.insert.mockResolvedValueOnce({
      data: { id: 'new-wohnung-id' },
      error: null,
    });

    const result = await speichereWohnung(mockFormData);
    expect(result).toEqual({
      success: true
    });
  });

  it('should allow creation if plan limit is 0 or negative (treated as unlimited)', async () => {
    // Mock getPlanDetails to return 0 as limit (unlimited)
    (getPlanDetails as jest.Mock).mockResolvedValueOnce({
      limitWohnungen: 0,
      features: {
        max_apartments: 0,
      },
    });

    // Mock the insert to return the new apartment ID
    mockSupabaseClient.insert.mockResolvedValueOnce({
      data: { id: 'new-wohnung-id' },
      error: null,
    });

    const result = await speichereWohnung(mockFormData);
    expect(result).toEqual({
      success: true
    });
  });

  it('should return error if getPlanDetails returns null', async () => {
    // Mock getPlanDetails to return null
    (getPlanDetails as jest.Mock).mockResolvedValueOnce(null);

    const result = await speichereWohnung(mockFormData);

    expect(result).toEqual({
      error: 'Details zu Ihrem Abonnementplan konnten nicht gefunden werden. Bitte überprüfen Sie Ihr Abonnement oder kontaktieren Sie den Support.',
    });
  });

  it('should return error if getPlanDetails throws an error', async () => {
    // Mock getPlanDetails to throw an error
    (getPlanDetails as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

    const result = await speichereWohnung(mockFormData);

    expect(result).toEqual({
      error: 'Fehler beim Abrufen der Plandetails für Ihr Abonnement. Bitte versuchen Sie es später erneut.',
    });
  });

  it('should return error if planDetails.limitWohnungen is an invalid type (e.g. undefined)', async () => {
    // Mock getPlanDetails to return an object without limitWohnungen
    (getPlanDetails as jest.Mock).mockResolvedValueOnce({
      features: {
        // No max_apartments specified
      },
    });

    const result = await speichereWohnung(mockFormData);

    expect(result).toEqual({
      error: 'Ungültige Konfiguration für Wohnungslimit in Ihrem Plan. Bitte kontaktieren Sie den Support.',
    });
  });

  it('should return error if planDetails.limitWohnungen is an invalid value (e.g. a string)', async () => {
    // Mock getPlanDetails to return a string for limitWohnungen
    (getPlanDetails as jest.Mock).mockResolvedValueOnce({
      limitWohnungen: 'invalid',
      features: {
        max_apartments: 'invalid',
      },
    });

    const result = await speichereWohnung(mockFormData);

    expect(result).toEqual({
      error: 'Ungültige Konfiguration für Wohnungslimit in Ihrem Plan. Bitte kontaktieren Sie den Support.',
    });
  });

  it('should return error if counting apartments fails', async () => {
    // Mock the count query to return an error
    mockSupabaseClient.select.mockImplementation(() => ({
      eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } })
    }));

    const result = await speichereWohnung(mockFormData);
    expect(result).toEqual({
      error: 'Fehler beim Zählen der Wohnungen.',
    });
  });

  it('should return error if database insertion fails', async () => {
    // Mock the insert to return an error
    mockSupabaseClient.insert.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
    });

    const result = await speichereWohnung(mockFormData);

    expect(result).toEqual({
      error: 'Database error',
    });
  });

  it('should handle missing required fields in form data', async () => {
    const invalidFormData = createMockFormData({ name: '' });

    const result = await speichereWohnung(invalidFormData);

    expect(result).toEqual({
      success: true
    });
  });

  it('should handle database errors during apartment creation', async () => {
    // Mock the insert to throw an error
    mockSupabaseClient.insert.mockRejectedValueOnce(new Error('Database connection failed'));

    const result = await speichereWohnung(mockFormData);

    expect(result).toEqual({
      error: 'Ein Fehler ist aufgetreten',
    });
  });
});

// #################################################################################################
// # Tests for aktualisiereWohnung
// #################################################################################################
describe('Server Action: aktualisiereWohnung', () => {
  let mockSupabaseClient: MockSupabaseClient;
  const mockWohnungId = 'wohnung-123';
  
  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = createMockSupabaseClient();
    
    // Default mock implementations
    (createSupabaseServerClient as jest.Mock).mockReturnValue(mockSupabaseClient);
    
    // Default mock for getting the apartment
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
    expect(result).toHaveProperty('success', true);
    expect(mockSupabaseClient.update).toHaveBeenCalled();
  });

  // Test: User under limit is allowed.
  it('should allow update if user is under their apartment limit', async () => {
     // Default mocks already set this up (count 3, limit 5)
    const result = await aktualisiereWohnung(mockWohnungId, mockFormData);
    expect(result).toHaveProperty('success', true);
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
    expect(result).toHaveProperty('success', true);
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
    // Mock the update to return an error
    mockSupabaseClient.update.mockResolvedValueOnce({ error: { message: 'Supabase DB update error' } });
    const result = await aktualisiereWohnung(mockWohnungId, mockFormData);
    expect(result).toEqual({
      error: 'Ein Fehler ist aufgetreten'
    });
    expect(revalidatePath).not.toHaveBeenCalled(); // Should not revalidate if update failed
  });

  // Test: Successful update revalidates path
  it('should revalidate path on successful update', async () => {
    // Standard setup, all checks should pass
    const result = await aktualisiereWohnung(mockWohnungId, mockFormData);
    expect(result).toHaveProperty('success', true);
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
