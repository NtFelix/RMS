/**
 * @jest-environment node
 */

// Mock dependencies first
jest.mock('@/lib/supabase-server');
jest.mock('@/lib/stripe-server');
jest.mock('@/lib/data-fetching');

import { getUserProfileForSettings } from './user-profile-actions';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getPlanDetails } from '@/lib/stripe-server';
import { getCurrentWohnungenCount } from '@/lib/data-fetching';

const mockCreateClient = createSupabaseServerClient as jest.MockedFunction<typeof createSupabaseServerClient>;
const mockGetPlanDetails = getPlanDetails as jest.MockedFunction<typeof getPlanDetails>;
const mockGetCurrentWohnungenCount = getCurrentWohnungenCount as jest.MockedFunction<typeof getCurrentWohnungenCount>;

describe('User Profile Actions', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ error: null, data: null }),
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null
        })
      },
    };

    mockCreateClient.mockResolvedValue(mockSupabase);
    mockGetCurrentWohnungenCount.mockResolvedValue(5);
    mockGetPlanDetails.mockResolvedValue({
      priceId: 'price_123',
      name: 'Premium Plan',
      price: 2999,
      currency: 'eur',
      features: ['Feature 1', 'Feature 2'],
      limitWohnungen: 10
    });
  });

  describe('getUserProfileForSettings', () => {
    const mockProfile = {
      id: 'user-123',
      email: 'test@example.com',
      full_name: 'Test User',
      stripe_customer_id: 'cus_123',
      stripe_subscription_id: 'sub_123',
      stripe_subscription_status: 'active',
      stripe_price_id: 'price_123',
      subscription_tier: 'premium',
      trial_ends_at: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    it('should successfully fetch user profile', async () => {
      mockSupabase.single.mockResolvedValue({
        error: null,
        data: mockProfile
      });

      const result = await getUserProfileForSettings();

      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'user-123');
      
      expect(result).toEqual({
        ...mockProfile,
        email: 'test@example.com',
        activePlan: {
          priceId: 'price_123',
          name: 'Premium Plan',
          price: 2999,
          currency: 'eur',
          features: ['Feature 1', 'Feature 2'],
          limitWohnungen: 10
        },
        hasActiveSubscription: true,
        currentWohnungenCount: 5
      });
    });

    it('should handle authentication errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' }
      });

      const result = await getUserProfileForSettings();

      expect(result).toEqual({
        error: 'Not authenticated',
        details: 'Not authenticated'
      });
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should handle missing user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });

      const result = await getUserProfileForSettings();

      expect(result).toEqual({
        error: 'Not authenticated',
        details: undefined
      });
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should handle profile fetch errors', async () => {
      mockSupabase.single.mockResolvedValue({
        error: { message: 'Profile not found', code: 'PGRST116' },
        data: null
      });

      const result = await getUserProfileForSettings();

      expect(result).toEqual({
        error: 'Profile not found',
        details: 'Profile not found'
      });
    });

    it('should handle null profile data', async () => {
      mockSupabase.single.mockResolvedValue({
        error: null,
        data: null
      });

      const result = await getUserProfileForSettings();

      expect(result).toEqual({
        error: 'Profile not found',
        details: undefined
      });
    });

    it('should handle database connection errors', async () => {
      mockSupabase.single.mockRejectedValue(new Error('Database connection failed'));

      const result = await getUserProfileForSettings();

      expect(result).toEqual({
        error: 'Internal server error',
        details: 'Database connection failed'
      });
    });

    it('should handle partial profile data', async () => {
      const partialProfile = {
        id: 'user-123',
        email: 'test@example.com',
        full_name: null,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        stripe_subscription_status: null,
        stripe_price_id: null,
        subscription_tier: null,
        trial_ends_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockSupabase.single.mockResolvedValue({
        error: null,
        data: partialProfile
      });

      const result = await getUserProfileForSettings();

      expect(result).toEqual({
        ...partialProfile,
        email: 'test@example.com',
        activePlan: null,
        hasActiveSubscription: false,
        currentWohnungenCount: 5
      });
    });

    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('Network timeout');
      timeoutError.name = 'TimeoutError';
      
      mockSupabase.single.mockRejectedValue(timeoutError);

      const result = await getUserProfileForSettings();

      expect(result).toEqual({
        error: 'Internal server error',
        details: 'Network timeout'
      });
    });
  });
});