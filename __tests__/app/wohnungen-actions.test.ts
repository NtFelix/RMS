import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { wohnungServerAction } from "@/app/wohnungen-actions";
import { fetchUserProfile } from '@/lib/data-fetching';
import { getPlanDetails } from '@/lib/stripe-server';

// Unmock module to test
jest.unmock('@/app/wohnungen-actions');

// Mocks
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

jest.mock('@/utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    }
}));

jest.mock('@/app/posthog-server.mjs', () => ({
    getPostHogServer: jest.fn(() => ({
        capture: jest.fn(),
        flush: jest.fn().mockResolvedValue(undefined),
    }))
}));

jest.mock('@/lib/posthog-logger', () => ({
    posthogLogger: {
        flush: jest.fn().mockResolvedValue(undefined),
    }
}));

describe('Wohnungen Actions', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      }),
    };
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  const validPayload = {
    name: 'Top Floor Apt',
    groesse: 80,
    miete: 1200,
    haus_id: 'house-1'
  };

  describe('create (id is null)', () => {
    it('should create apartment successfully if eligible', async () => {
      // Setup eligibility mocks
      (fetchUserProfile as jest.Mock).mockResolvedValue({
        stripe_subscription_status: 'active',
        stripe_price_id: 'price_123'
      });
      (getPlanDetails as jest.Mock).mockResolvedValue({ limitWohnungen: 10 });

      // Setup DB mocks
      const mockChain = mockSupabase.from();
      mockChain.select.mockReturnThis();
      mockChain.eq.mockResolvedValue({ count: 0, error: null }); // check count

      // Insert result
      mockChain.single.mockResolvedValue({
        data: { id: 'new-apt-id', ...validPayload },
        error: null
      });

      const result = await wohnungServerAction(null, validPayload);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(mockSupabase.from).toHaveBeenCalledWith('Wohnungen');
      expect(mockChain.insert).toHaveBeenCalledWith(expect.objectContaining({
          ...validPayload,
          user_id: 'test-user-id'
      }));
      expect(revalidatePath).toHaveBeenCalled();
    });

    it('should fail if limit reached', async () => {
        (fetchUserProfile as jest.Mock).mockResolvedValue({
            stripe_subscription_status: 'active',
            stripe_price_id: 'price_123'
        });
        (getPlanDetails as jest.Mock).mockResolvedValue({ limitWohnungen: 5 });

        const mockChain = mockSupabase.from();
        mockChain.eq.mockResolvedValue({ count: 5, error: null }); // Limit reached

        const result = await wohnungServerAction(null, validPayload);

        expect(result.success).toBe(false);
        expect(result.error.message).toContain('maximale Anzahl');
    });

    it('should fail if validation error (invalid size)', async () => {
        const result = await wohnungServerAction(null, { ...validPayload, groesse: -10 });
        expect(result.success).toBe(false);
        expect(result.error.message).toContain('Größe muss eine positive Zahl sein');
    });
  });

  describe('update (id provided)', () => {
    it('should update successfully', async () => {
        const mockChain = mockSupabase.from();
        mockChain.single.mockResolvedValue({
            data: { id: 'apt-123', ...validPayload },
            error: null
        });

        const result = await wohnungServerAction('apt-123', validPayload);

        expect(result.success).toBe(true);
        expect(mockChain.update).toHaveBeenCalledWith(expect.objectContaining({
            ...validPayload,
            user_id: 'test-user-id'
        }));
        expect(mockChain.eq).toHaveBeenCalledWith('id', 'apt-123');
    });
  });

});
