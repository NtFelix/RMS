import { wohnungServerAction } from '../../app/wohnungen-actions';

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

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { fetchUserProfile } from '@/lib/data-fetching';
import { getPlanDetails } from '@/lib/stripe-server';

describe('Wohnungen Actions', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
      },
      from: jest.fn(),
    };
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    jest.spyOn(console, 'error').mockImplementation(() => { });
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  describe('wohnungServerAction (Create/Update)', () => {
    const validData = {
      name: 'Apartment 1',
      groesse: 50,
      miete: 800,
      haus_id: 'haus-1',
    };

    it('returns error if user not logged in', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
      const result = await wohnungServerAction(null, validData);
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Benutzer nicht gefunden');
    });

    it('validates required fields', async () => {
      const invalidData = { ...validData, name: '' };
      const result = await wohnungServerAction(null, invalidData);
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Name ist erforderlich');
    });

    it('creates apartment successfully within limit', async () => {
      // Mock user profile and subscription
      (fetchUserProfile as jest.Mock).mockResolvedValue({
        stripe_subscription_status: 'active',
        stripe_price_id: 'price_123'
      });
      (getPlanDetails as jest.Mock).mockResolvedValue({
        limitWohnungen: 10
      });

      // Mock count check
      // .from('Wohnungen').select(...).eq('user_id', user.id) -> returns count
      // .from('Wohnungen').insert(...).select().single() -> returns data

      mockSupabase.from
        .mockReturnValueOnce({ // For the count query
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 2, error: null }),
          }),
        })
        .mockReturnValueOnce({ // For the insert query
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { id: 'new-apt', ...validData }, error: null }),
            }),
          }),
        });

      const result = await wohnungServerAction(null, validData);

      expect(result.success).toBe(true);
      expect(revalidatePath).toHaveBeenCalled();
    });

    it('updates apartment successfully', async () => {
      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { id: 'apt-1', ...validData }, error: null })
          })
        })
      });

      mockSupabase.from.mockReturnValue({
        update: updateMock,
      });

      const result = await wohnungServerAction('apt-1', validData);
      expect(result.success).toBe(true);
    });

    it('prevents creation if limit reached', async () => {
      (fetchUserProfile as jest.Mock).mockResolvedValue({
        stripe_subscription_status: 'trialing',
        stripe_price_id: null
      });
      // Trial limit is 5 by default in determineApartmentEligibility

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ count: 5, error: null })
        })
      });

      const result = await wohnungServerAction(null, validData);
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Maximale Anzahl an Wohnungen (5)');
    });

    it('prevents creation if no active subscription', async () => {
      (fetchUserProfile as jest.Mock).mockResolvedValue({
        stripe_subscription_status: 'canceled',
        stripe_price_id: null
      });

      const result = await wohnungServerAction(null, validData);
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Ein aktives Abonnement');
    });
  });
});
