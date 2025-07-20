import { speichereWohnung, aktualisiereWohnung } from './actions';
import { createClient } from '@/utils/supabase/server';
import { getPlanDetails } from '@/lib/stripe-server';
import { fetchUserProfile } from '@/lib/data-fetching';
import { revalidatePath } from 'next/cache';

// Hoist the variable to be accessible in both describe blocks
const mockWohnungId = 'wohnung-to-update-123';

// Mock dependencies
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));
jest.mock('@/lib/stripe-server', () => ({
  getPlanDetails: jest.fn(),
}));
jest.mock('@/lib/data-fetching', () => ({
  fetchUserProfile: jest.fn(),
}));
jest.mock('next/cache', () => ({
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

    // Setup mocks that can be chained
    const mockUpdateEq = jest.fn().mockResolvedValue({ data: [{ id: mockWohnungId }], error: null });
    const mockUpdate = jest.fn(() => ({ eq: mockUpdateEq }));

    const mockCountEq = jest.fn().mockResolvedValue({ count: 0, error: null });
    const mockSelectCount = jest.fn((columns, options) => {
      if (options?.count === 'exact') {
        return { eq: mockCountEq };
      }
      return { eq: jest.fn().mockResolvedValue({ data: [], error: null }) }; // Default for other selects
    });

    const mockInsert = jest.fn().mockResolvedValue({ data: [{ id: 'new-id' }], error: null });

    mockSupabaseClient = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: jest.fn(() => ({
        select: mockSelectCount,
        insert: mockInsert,
        update: mockUpdate,
      })),
      // For direct assertions in tests
      mockUpdate,
      mockUpdateEq,
      mockSelectCount,
      mockCountEq,
      mockInsert,
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
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
    expect(result.error).toBe('Ein aktives Abonnement oder eine aktive Testphase ist erforderlich, um Wohnungen hinzuzufügen.');
  });

  it('should allow creation if plan limit is not reached', async () => {
    (fetchUserProfile as jest.Mock).mockResolvedValueOnce({
      id: mockUserId,
      email: 'test@example.com',
      stripe_subscription_status: 'active',
      stripe_price_id: 'price_10_limit'
    });
    (getPlanDetails as jest.Mock).mockResolvedValueOnce({ limitWohnungen: 10, name: 'Test Plan', price: 1000, currency: 'usd', features: [] });
    mockSupabaseClient.mockCountEq.mockResolvedValueOnce({ count: 5, error: null }); // For the count query

    const result = await speichereWohnung(mockFormData);

    expect(getPlanDetails).toHaveBeenCalledWith('price_10_limit');
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('Wohnungen');
    expect(mockSupabaseClient.mockSelectCount).toHaveBeenCalledWith('*', { count: 'exact', head: true });
    expect(mockSupabaseClient.mockCountEq).toHaveBeenCalledWith('user_id', mockUserId);

    expect(mockSupabaseClient.mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      name: mockFormData.name,
      user_id: mockUserId,
      haus_id: mockFormData.haus_id,
      groesse: Number(mockFormData.groesse),
      miete: Number(mockFormData.miete),
    }));
    expect(result.success).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith('/wohnungen');
  });
});
describe('Server Action: aktualisiereWohnung', () => {
  let mockSupabaseClient: any;
  const mockUserId = 'user-test-id-456';
  const mockUser = { id: mockUserId, email: 'updater@example.com' };
  const mockFormData = {
    name: 'Updated Test Wohnung',
    groesse: '80',
    miete: '1300',
    haus_id: 'haus-2',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
    const mockUpdate = jest.fn(() => ({ eq: mockUpdateEq }));

    const mockCountEq = jest.fn().mockResolvedValue({ count: 3, error: null }); // Default: under limit
    const mockSelectCount = jest.fn((columns, options) => {
      if (options?.count === 'exact') {
        return { eq: mockCountEq };
      }
      return { eq: jest.fn().mockResolvedValue({ data: [], error: null }) };
    });

    mockSupabaseClient = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: jest.fn(() => ({
        select: mockSelectCount,
        update: mockUpdate,
      })),
      mockUpdate,
      mockUpdateEq,
      mockSelectCount,
      mockCountEq,
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);

    (fetchUserProfile as jest.Mock).mockResolvedValue({
      id: mockUserId,
      email: mockUser.email,
      stripe_subscription_status: 'active',
      stripe_price_id: 'price_standard_limit_5'
    });

    (getPlanDetails as jest.Mock).mockResolvedValue({
      name: 'Standard Plan',
      limitWohnungen: 5,
    });
  });

  it('should block update if user is over their apartment limit', async () => {
    (getPlanDetails as jest.Mock).mockResolvedValueOnce({ limitWohnungen: 5 });
    mockSupabaseClient.mockCountEq.mockResolvedValueOnce({ count: 6, error: null });

    const result = await aktualisiereWohnung(mockWohnungId, mockFormData);
    expect(result.error).toBe('Bearbeitung nicht möglich. Sie haben die maximale Anzahl an Wohnungen (5) für Ihr Abonnement überschritten.');
    expect(mockSupabaseClient.mockUpdate).not.toHaveBeenCalled();
  });
  it('should allow update if user is at their apartment limit', async () => {
    (getPlanDetails as jest.Mock).mockResolvedValueOnce({ limitWohnungen: 5 });
    mockSupabaseClient.mockCountEq.mockResolvedValueOnce({ count: 5, error: null });

    const result = await aktualisiereWohnung(mockWohnungId, mockFormData);
    expect(result.success).toBe(true);
    expect(mockSupabaseClient.mockUpdate).toHaveBeenCalled();
  });

  it('should allow update if user is under their apartment limit', async () => {
    const result = await aktualisiereWohnung(mockWohnungId, mockFormData);
    expect(result.success).toBe(true);
    expect(mockSupabaseClient.mockUpdate).toHaveBeenCalled();
  });

  it('should allow update if user has an unlimited plan', async () => {
    (getPlanDetails as jest.Mock).mockResolvedValueOnce({ limitWohnungen: null });
    mockSupabaseClient.mockCountEq.mockResolvedValueOnce({ count: 100, error: null });

    const result = await aktualisiereWohnung(mockWohnungId, mockFormData);
    expect(result.success).toBe(true);
    expect(mockSupabaseClient.mockUpdate).toHaveBeenCalled();
  });

  it('should return error if getPlanDetails returns null for update', async () => {
    (getPlanDetails as jest.Mock).mockResolvedValueOnce(null);
    const result = await aktualisiereWohnung(mockWohnungId, mockFormData);
    expect(result.error).toBe('Details zu Ihrem Abonnementplan konnten nicht gefunden werden. Bearbeitung nicht möglich.');
    expect(mockSupabaseClient.mockUpdate).not.toHaveBeenCalled();
  });

  it('should return error if getPlanDetails throws an error during update', async () => {
    (getPlanDetails as jest.Mock).mockRejectedValueOnce(new Error('Stripe API flaky for update'));
    const result = await aktualisiereWohnung(mockWohnungId, mockFormData);
    expect(result.error).toBe('Fehler beim Abrufen der Plandetails. Bearbeitung nicht möglich.');
    expect(mockSupabaseClient.mockUpdate).not.toHaveBeenCalled();
  });

  it('should return error if limitWohnungen is invalid for update', async () => {
    (getPlanDetails as jest.Mock).mockResolvedValueOnce({ limitWohnungen: undefined });
    const result = await aktualisiereWohnung(mockWohnungId, mockFormData);
    expect(result.error).toBe('Ungültige Konfiguration für Wohnungslimit in Ihrem Plan. Bearbeitung nicht möglich.');
    expect(mockSupabaseClient.mockUpdate).not.toHaveBeenCalled();
  });

  it('should return error if user has no active subscription for update', async () => {
    (fetchUserProfile as jest.Mock).mockResolvedValueOnce({
      stripe_subscription_status: 'inactive',
    });
    const result = await aktualisiereWohnung(mockWohnungId, mockFormData);
    expect(result.error).toBe('Ein aktives Abonnement ist für die Bearbeitung erforderlich.');
    expect(mockSupabaseClient.mockUpdate).not.toHaveBeenCalled();
  });

  it('should return error if user is not authenticated for update', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'No user for update' } });
    const result = await aktualisiereWohnung(mockWohnungId, mockFormData);
    expect(result.error).toBe('Benutzer nicht authentifiziert.');
    expect(mockSupabaseClient.mockUpdate).not.toHaveBeenCalled();
  });

  it('should return error if user profile is not found for update', async () => {
    (fetchUserProfile as jest.Mock).mockResolvedValueOnce(null);
    const result = await aktualisiereWohnung(mockWohnungId, mockFormData);
    expect(result.error).toBe('Benutzerprofil nicht gefunden.');
    expect(mockSupabaseClient.mockUpdate).not.toHaveBeenCalled();
  });

  it('should return error if counting apartments fails during update', async () => {
    (getPlanDetails as jest.Mock).mockResolvedValueOnce({ limitWohnungen: 5 });
    mockSupabaseClient.mockCountEq.mockResolvedValueOnce({ count: null, error: { message: 'DB count error for update' } });

    const result = await aktualisiereWohnung(mockWohnungId, mockFormData);
    expect(result.error).toBe('Fehler beim Zählen der Wohnungen.');
    expect(mockSupabaseClient.mockUpdate).not.toHaveBeenCalled();
  });

  it('should propagate error if Supabase update fails', async () => {
    mockSupabaseClient.mockUpdateEq.mockResolvedValueOnce({ error: { message: 'Supabase DB update error' } });
    const result = await aktualisiereWohnung(mockWohnungId, mockFormData);
    expect(result.error).toBe('Supabase DB update error');
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('should revalidate path on successful update', async () => {
    const result = await aktualisiereWohnung(mockWohnungId, mockFormData);
    expect(result.success).toBe(true);
    expect(mockSupabaseClient.mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      name: mockFormData.name,
      groesse: parseFloat(mockFormData.groesse),
      miete: parseFloat(mockFormData.miete),
      haus_id: mockFormData.haus_id,
    }));
    expect(mockSupabaseClient.mockUpdateEq).toHaveBeenCalledWith('id', mockWohnungId);
    expect(revalidatePath).toHaveBeenCalledWith('/wohnungen');
  });
});
