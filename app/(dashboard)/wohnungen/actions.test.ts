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
    (createClient as jest.Mock).mockResolvedValue(mockSupabaseClient);
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
      stripe_subscription_status: 'active',
      stripe_price_id: 'price_pro'
    });
    (getPlanDetails as jest.Mock).mockResolvedValueOnce({ limitWohnungen: 5 });
    // Mock count of existing Wohnungen
    mockSupabaseClient.select.mockResolvedValueOnce({ count: 2, error: null });

    const result = await speichereWohnung(mockFormData);

    expect(getPlanDetails).toHaveBeenCalledWith('price_pro');
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('Wohnungen');
    expect(mockSupabaseClient.insert).toHaveBeenCalledWith(expect.objectContaining({
      name: mockFormData.name,
      user_id: mockUserId,
    }));
    expect(result.success).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith('/wohnungen');
  });

  it('should return error if plan limit is reached', async () => {
    (fetchUserProfile as jest.Mock).mockResolvedValueOnce({
      id: mockUserId,
      stripe_subscription_status: 'active',
      stripe_price_id: 'price_basic'
    });
    (getPlanDetails as jest.Mock).mockResolvedValueOnce({ limitWohnungen: 3 });
    mockSupabaseClient.select.mockResolvedValueOnce({ count: 3, error: null }); // At limit

    const result = await speichereWohnung(mockFormData);

    expect(result.error).toBe('Maximale Anzahl an Wohnungen (3) für Ihr Abonnement erreicht.');
    expect(mockSupabaseClient.insert).not.toHaveBeenCalled();
  });

  it('should allow creation if plan has no limit (limitWohnungen is null)', async () => {
    (fetchUserProfile as jest.Mock).mockResolvedValueOnce({
      id: mockUserId,
      stripe_subscription_status: 'active',
      stripe_price_id: 'price_unlimited'
    });
    (getPlanDetails as jest.Mock).mockResolvedValueOnce({ limitWohnungen: null }); // No limit
    mockSupabaseClient.select.mockResolvedValueOnce({ count: 10, error: null }); // User has 10, but plan is unlimited

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

  it('should handle error when fetching plan details (e.g. bypass limit or deny based on chosen strategy)', async () => {
    // Current strategy in actions.ts: bypasses limit if getPlanDetails fails
    (fetchUserProfile as jest.Mock).mockResolvedValueOnce({
      id: mockUserId,
      stripe_subscription_status: 'active',
      stripe_price_id: 'price_error_case'
    });
    (getPlanDetails as jest.Mock).mockRejectedValueOnce(new Error('Stripe API flaky'));
    mockSupabaseClient.select.mockResolvedValueOnce({ count: 1, error: null });

    const result = await speichereWohnung(mockFormData);
    // Based on current code, it should succeed as currentApartmentLimit would be null, bypassing check.
    // If a stricter policy (fail-closed) was implemented, this test would change.
    expect(result.success).toBe(true);
    expect(mockSupabaseClient.insert).toHaveBeenCalled();
    // Add a console.error check if important
    // expect(console.error).toHaveBeenCalledWith("Error fetching plan details for limit enforcement:", expect.any(Error));
  });

   it('should return error if counting apartments fails', async () => {
    (fetchUserProfile as jest.Mock).mockResolvedValueOnce({
      id: mockUserId,
      stripe_subscription_status: 'active',
      stripe_price_id: 'price_valid'
    });
    (getPlanDetails as jest.Mock).mockResolvedValueOnce({ limitWohnungen: 5 });
    mockSupabaseClient.select.mockResolvedValueOnce({ count: null, error: { message: 'DB count error' } });

    const result = await speichereWohnung(mockFormData);
    expect(result.error).toBe('Fehler beim Zählen der Wohnungen.');
  });

  it('should return error if database insertion fails', async () => {
    (fetchUserProfile as jest.Mock).mockResolvedValueOnce({
      id: mockUserId,
      stripe_subscription_status: 'active',
      stripe_price_id: 'price_valid'
    });
    (getPlanDetails as jest.Mock).mockResolvedValueOnce({ limitWohnungen: 5 });
    mockSupabaseClient.select.mockResolvedValueOnce({ count: 2, error: null });
    mockSupabaseClient.insert.mockResolvedValueOnce({ error: { message: 'Insert failed' } });

    const result = await speichereWohnung(mockFormData);
    expect(result.error).toBe('Insert failed');
  });
});
