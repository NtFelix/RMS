
import { getUserSubscriptionContext, getPlanApartmentLimit, getUserApartmentCount } from '@/app/user-actions';
import { fetchUserProfile, getCurrentWohnungenCount } from '@/lib/data-fetching';
import { getPlanDetails } from '@/lib/stripe-server';
import { createClient } from '@/utils/supabase/server';

// Mock dependencies
jest.mock('@/lib/data-fetching', () => ({
  fetchUserProfile: jest.fn(),
  getCurrentWohnungenCount: jest.fn()
}));

jest.mock('@/lib/stripe-server', () => ({
  getPlanDetails: jest.fn()
}));

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn()
}));

describe('user-actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserSubscriptionContext', () => {
    it('returns subscription data when profile exists', async () => {
      (fetchUserProfile as jest.Mock).mockResolvedValue({
        stripe_price_id: 'price_123',
        stripe_subscription_status: 'active'
      });

      const result = await getUserSubscriptionContext();

      expect(result.stripe_price_id).toBe('price_123');
      expect(result.stripe_subscription_status).toBe('active');
      expect(result.error).toBeUndefined();
    });

    it('returns error if profile not found', async () => {
      (fetchUserProfile as jest.Mock).mockResolvedValue(null);

      const result = await getUserSubscriptionContext();

      expect(result.error).toBe('User profile not found.');
      expect(result.stripe_price_id).toBeNull();
    });

    it('handles exceptions', async () => {
      (fetchUserProfile as jest.Mock).mockRejectedValue(new Error('DB Error'));

      const result = await getUserSubscriptionContext();

      expect(result.error).toContain('Failed to fetch');
    });
  });

  describe('getPlanApartmentLimit', () => {
    it('returns limit from plan details', async () => {
      (getPlanDetails as jest.Mock).mockResolvedValue({ limitWohnungen: 5 });

      const result = await getPlanApartmentLimit('price_123');

      expect(result.limitWohnungen).toBe(5);
    });

    it('handles infinite limits', async () => {
        (getPlanDetails as jest.Mock).mockResolvedValue({ limitWohnungen: -1 });

        const result = await getPlanApartmentLimit('price_unlimited');

        expect(result.limitWohnungen).toBe(Infinity);
      });

    it('returns error if plan not found', async () => {
      (getPlanDetails as jest.Mock).mockResolvedValue(null);

      const result = await getPlanApartmentLimit('price_invalid');

      expect(result.error).toBe('Plan details not found.');
    });
  });

  describe('getUserApartmentCount', () => {
    it('returns count for authenticated user', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
        }
      };
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);
      (getCurrentWohnungenCount as jest.Mock).mockResolvedValue(10);

      const result = await getUserApartmentCount();

      expect(result.count).toBe(10);
      expect(getCurrentWohnungenCount).toHaveBeenCalledWith(mockSupabase, 'u1');
    });

    it('returns error if user not authenticated', async () => {
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: { message: 'No Auth' } })
        }
      };
      (createClient as jest.Mock).mockResolvedValue(mockSupabase);

      const result = await getUserApartmentCount();

      expect(result.error).toContain('User not found');
      expect(result.count).toBe(0);
    });
  });
});
