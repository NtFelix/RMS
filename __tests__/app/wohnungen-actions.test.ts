import { wohnungServerAction } from '../../app/wohnungen-actions';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { fetchUserProfile } from '@/lib/data-fetching';
import { getPlanDetails } from '@/lib/stripe-server';

// Mock dependencies
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/data-fetching', () => ({
  fetchUserProfile: jest.fn(),
}));

jest.mock('@/lib/stripe-server', () => ({
  getPlanDetails: jest.fn(),
}));

jest.mock('@/lib/logging-middleware', () => ({
  logAction: jest.fn(),
}));

jest.mock('@/app/posthog-server.mjs', () => ({
  getPostHogServer: jest.fn(() => ({
    capture: jest.fn(),
    flush: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@/lib/posthog-logger', () => ({
  posthogLogger: {
    flush: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Wohnungen Server Actions', () => {
  let mockSupabase: any;
  const mockUser = { id: 'user-123' };

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('wohnungServerAction (Create/Update)', () => {
    const validPayload = {
      name: 'Test Apartment',
      groesse: 50,
      miete: 1000,
      haus_id: 'haus-1'
    };

    it('should create a new apartment successfully when eligible', async () => {
      // Mock user profile & eligibility
      (fetchUserProfile as jest.Mock).mockResolvedValue({
        stripe_subscription_status: 'active',
        stripe_price_id: 'price_pro'
      });
      (getPlanDetails as jest.Mock).mockResolvedValue({
        limitWohnungen: 10
      });

      // Mock current count
      const mockEqCount = jest.fn().mockResolvedValue({ count: 2, error: null });
      mockSupabase.select.mockReturnValue({ eq: mockEqCount });

      // Mock insert response
      const mockInsertSingle = jest.fn().mockResolvedValue({
        data: { id: 'new-apt-id', ...validPayload, user_id: mockUser.id },
        error: null
      });
      mockSupabase.insert.mockReturnValue({ select: jest.fn().mockReturnValue({ single: mockInsertSingle }) });

      const result = await wohnungServerAction(null, validPayload);

      expect(result.success).toBe(true);
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        ...validPayload,
        user_id: mockUser.id
      }));
      expect(revalidatePath).toHaveBeenCalledWith('/wohnungen');
    });

    it('should fail creation if user is not eligible (no sub)', async () => {
       (fetchUserProfile as jest.Mock).mockResolvedValue({
        stripe_subscription_status: 'none',
        stripe_price_id: null
      });

      const result = await wohnungServerAction(null, validPayload);

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Abonnement');
      expect(mockSupabase.insert).not.toHaveBeenCalled();
    });

    it('should fail creation if limit reached', async () => {
       (fetchUserProfile as jest.Mock).mockResolvedValue({
        stripe_subscription_status: 'trialing',
        stripe_price_id: null
      });
      // Trial limit is 5 by default in code

      const mockEqCount = jest.fn().mockResolvedValue({ count: 5, error: null });
      mockSupabase.select.mockReturnValue({ eq: mockEqCount });

      const result = await wohnungServerAction(null, validPayload);

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Maximale Anzahl');
      expect(mockSupabase.insert).not.toHaveBeenCalled();
    });

    it('should update an existing apartment successfully', async () => {
      // Update does not check limits
      const updatePayload = { ...validPayload, name: 'Updated Name' };

      const mockUpdateSingle = jest.fn().mockResolvedValue({
        data: { id: 'apt-1', ...updatePayload, user_id: mockUser.id },
        error: null
      });
      // Chain: update().eq().select().single()
      const mockSelect = jest.fn().mockReturnValue({ single: mockUpdateSingle });
      const mockEq = jest.fn().mockReturnValue({ select: mockSelect });
      mockSupabase.update.mockReturnValue({ eq: mockEq });

      const result = await wohnungServerAction('apt-1', updatePayload);

      expect(result.success).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
          name: 'Updated Name'
      }));
      expect(mockEq).toHaveBeenCalledWith('id', 'apt-1');
    });

    it('should validate inputs', async () => {
      const invalidPayload = { ...validPayload, name: '' };
      const result = await wohnungServerAction(null, invalidPayload);
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Name');
    });

    it('should handle database errors', async () => {
       (fetchUserProfile as jest.Mock).mockResolvedValue({
        stripe_subscription_status: 'active',
        stripe_price_id: 'price_pro'
      });
      (getPlanDetails as jest.Mock).mockResolvedValue({ limitWohnungen: 10 });
      mockSupabase.select.mockReturnValue({ eq: jest.fn().mockResolvedValue({ count: 0, error: null }) });

      const mockInsertSingle = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'DB Error' }
      });
      mockSupabase.insert.mockReturnValue({ select: jest.fn().mockReturnValue({ single: mockInsertSingle }) });

      const result = await wohnungServerAction(null, validPayload);

      expect(result.success).toBe(false);
      expect(result.error.message).toBe('DB Error');
    });
  });
});
