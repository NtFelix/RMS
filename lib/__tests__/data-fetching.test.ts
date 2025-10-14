// lib/data-fetching.test.ts
import { getCurrentWohnungenCount, fetchUserProfile } from '../data-fetching';
import { createSupabaseServerClient } from '../supabase-server';

jest.mock('../supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

// Tests for fetchNebenkostenList and getHausGesamtFlaeche removed - functions replaced by optimized versions
// fetchNebenkostenListOptimized in betriebskosten-actions.ts uses get_nebenkosten_with_metrics database function

describe('getCurrentWohnungenCount', () => {
  const mockSupabaseClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn(),
  };
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    (createSupabaseServerClient as jest.Mock).mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.from.mockClear();
    mockSupabaseClient.select.mockClear();
    mockSupabaseClient.eq.mockClear();
    // Spy on console.error before each test and restore it after each test
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should return the count of Wohnungen on successful retrieval', async () => {
    const userId = 'test-user-id';
    const mockCount = 5;
    mockSupabaseClient.eq.mockResolvedValueOnce({ data: [], count: mockCount, error: null });

    const result = await getCurrentWohnungenCount(mockSupabaseClient as any, userId);

    expect(result).toBe(mockCount);
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('Wohnungen');
    expect(mockSupabaseClient.select).toHaveBeenCalledWith('*', { count: 'exact', head: true });
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', userId);
  });

  it('should return 0 and log error if Supabase call fails', async () => {
    const userId = 'test-user-id';
    const dbError = new Error('Supabase DB Error');
    mockSupabaseClient.eq.mockResolvedValueOnce({ data: null, count: null, error: dbError });

    const result = await getCurrentWohnungenCount(mockSupabaseClient as any, userId);

    expect(result).toBe(0);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching Wohnungen count:', dbError);
  });

  it('should return 0 and log error if no userId is provided', async () => {
    const result = await getCurrentWohnungenCount(mockSupabaseClient as any, '');

    expect(result).toBe(0);
    expect(consoleErrorSpy).toHaveBeenCalledWith('getCurrentWohnungenCount: userId is required');
    expect(mockSupabaseClient.from).not.toHaveBeenCalled(); // Ensure DB is not called
  });

  it('should return 0 if Supabase returns null for count (no records found)', async () => {
    const userId = 'test-user-id';
    mockSupabaseClient.eq.mockResolvedValueOnce({ data: [], count: null, error: null });

    const result = await getCurrentWohnungenCount(mockSupabaseClient as any, userId);

    expect(result).toBe(0);
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('Wohnungen');
    expect(mockSupabaseClient.select).toHaveBeenCalledWith('*', { count: 'exact', head: true });
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', userId);
  });
});

describe('fetchUserProfile', () => {
  const mockSupabaseClient = {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
  };
  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    (createSupabaseServerClient as jest.Mock).mockReturnValue(mockSupabaseClient);
    jest.clearAllMocks(); // Clear all mocks before each test
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it('should fetch and return user profile data if user is logged in and profile exists', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockProfile = {
      id: 'user-123',
      stripe_customer_id: 'cust_123',
      stripe_subscription_id: 'sub_123',
      stripe_subscription_status: 'active',
      stripe_price_id: 'price_123',
      stripe_current_period_end: '2023-12-31T23:59:59.000Z',
    };
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({ data: { user: mockUser }, error: null });
    mockSupabaseClient.single.mockResolvedValueOnce({ data: mockProfile, error: null });

    const profile = await fetchUserProfile();

    expect(mockSupabaseClient.auth.getUser).toHaveBeenCalledTimes(1);
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles');
    expect(mockSupabaseClient.select).toHaveBeenCalledWith(`
      id,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_subscription_status,
      stripe_price_id,
      stripe_current_period_end
    `);
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', mockUser.id);
    expect(mockSupabaseClient.single).toHaveBeenCalledTimes(1);
    expect(profile).toEqual({ ...mockProfile, email: mockUser.email });
  });

  it('should return base user profile if profile is not found (PGRST116)', async () => {
    const mockUser = { id: 'user-456', email: 'another@example.com' };
    const profileError = { code: 'PGRST116', message: 'Profile not found' };
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({ data: { user: mockUser }, error: null });
    mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: profileError });

    const profile = await fetchUserProfile();

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching user profile data from profiles table:', profileError.message);
    // Console.log for profile not found was removed as part of cleanup
    expect(profile).toEqual({
      id: mockUser.id,
      email: mockUser.email,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      stripe_subscription_status: null,
      stripe_price_id: null,
      stripe_current_period_end: null,
    });
  });

  it('should return base user profile on other profile fetch errors', async () => {
    const mockUser = { id: 'user-789', email: 'yet_another@example.com' };
    const profileError = { code: 'SOME_OTHER_ERROR', message: 'Some other DB error' };
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({ data: { user: mockUser }, error: null });
    mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: profileError });

    const profile = await fetchUserProfile();

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching user profile data from profiles table:', profileError.message);
    expect(consoleErrorSpy).toHaveBeenCalledWith(`Unhandled error fetching profile data for user ${mockUser.id}:`, profileError);
    expect(profile).toEqual({
      id: mockUser.id,
      email: mockUser.email,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      stripe_subscription_status: null,
      stripe_price_id: null,
      stripe_current_period_end: null,
    });
  });

  it('should return null if user is not logged in', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    const profile = await fetchUserProfile();

    expect(profile).toBeNull();
    expect(mockSupabaseClient.from).not.toHaveBeenCalled();
  });
});
