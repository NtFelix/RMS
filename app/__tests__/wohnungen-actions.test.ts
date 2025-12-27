/**
 * @jest-environment node
 */
import { wohnungServerAction } from '../wohnungen-actions';
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
    flush: jest.fn(),
  })),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/posthog-logger', () => ({
  posthogLogger: {
    flush: jest.fn(),
  },
}));

describe('wohnungServerAction', () => {
  let mockSupabase: any;
  let mockAuth: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAuth = {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    };

    // Helper to allow deep chaining
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    mockSupabase = {
      from: jest.fn().mockReturnValue(mockChain),
      auth: mockAuth,
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('Validation', () => {
    it('requires name', async () => {
      const result = await wohnungServerAction(null, { name: '', groesse: 50, miete: 500 });
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Name ist erforderlich');
    });

    it('requires positive size', async () => {
      const result = await wohnungServerAction(null, { name: 'Test', groesse: -10, miete: 500 });
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Größe muss eine positive Zahl sein');
    });

    it('requires numeric rent', async () => {
      const result = await wohnungServerAction(null, { name: 'Test', groesse: 50, miete: 'invalid' });
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Miete muss eine Zahl sein');
    });
  });

  describe('Creation (New Apartment)', () => {
    beforeEach(() => {
      // Mock successful fetchUserProfile
      (fetchUserProfile as jest.Mock).mockResolvedValue({
        id: 'profile-1',
        stripe_subscription_status: 'active',
        stripe_price_id: 'price-1',
      });
      // Mock successful getPlanDetails
      (getPlanDetails as jest.Mock).mockResolvedValue({
        limitWohnungen: 10,
      });

      // Setup the mock chain to handle specific calls
      const mockChain = mockSupabase.from();

      // Handle count query: select('*', ...).eq('user_id', ...) -> returns { count: 0, error: null }
      mockChain.eq.mockResolvedValue({ count: 0, error: null });

      // Handle insert query: insert(...).select().single() -> returns { data: ..., error: null }
      mockChain.single.mockResolvedValue({ data: { id: 'new-apt-id', name: 'Test' }, error: null });
    });

    it('creates apartment successfully when within limits', async () => {
      const result = await wohnungServerAction(null, { name: 'Test Apt', groesse: 50, miete: 500 });

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('new-apt-id');
      expect(mockSupabase.from).toHaveBeenCalledWith('Wohnungen');
      // Verify insert was called
      const mockChain = mockSupabase.from();
      expect(mockChain.insert).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalled();
    });

    it('fails if user not authenticated', async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
      const result = await wohnungServerAction(null, { name: 'Test Apt', groesse: 50, miete: 500 });
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Benutzer nicht gefunden');
    });

    it('fails if user profile not found', async () => {
      (fetchUserProfile as jest.Mock).mockResolvedValue(null);
      const result = await wohnungServerAction(null, { name: 'Test Apt', groesse: 50, miete: 500 });
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Benutzerprofil nicht gefunden');
    });

    it('fails if user is not eligible (no sub/trial)', async () => {
      (fetchUserProfile as jest.Mock).mockResolvedValue({
        stripe_subscription_status: 'canceled',
        stripe_price_id: null,
      });
      const result = await wohnungServerAction(null, { name: 'Test Apt', groesse: 50, miete: 500 });
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Ein aktives Abonnement');
    });

    it('fails if apartment limit reached', async () => {
      (getPlanDetails as jest.Mock).mockResolvedValue({ limitWohnungen: 2 });

      const mockChain = mockSupabase.from();
      mockChain.eq.mockResolvedValue({ count: 2, error: null }); // Already have 2

      const result = await wohnungServerAction(null, { name: 'Test Apt', groesse: 50, miete: 500 });
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('maximale Anzahl an Wohnungen');
    });

    it('allows creation if limit is Infinity', async () => {
      (getPlanDetails as jest.Mock).mockResolvedValue({ limitWohnungen: null }); // Infinity

      const mockChain = mockSupabase.from();
      mockChain.eq.mockResolvedValue({ count: 100, error: null });

      const result = await wohnungServerAction(null, { name: 'Test Apt', groesse: 50, miete: 500 });
      expect(result.success).toBe(true);
    });
  });

  describe('Update (Existing Apartment)', () => {
    beforeEach(() => {
      const mockChain = mockSupabase.from();
      mockChain.single.mockResolvedValue({ data: { id: 'apt-1', name: 'Updated' }, error: null });
    });

    it('updates apartment successfully (skips limit check)', async () => {
      const result = await wohnungServerAction('apt-1', { name: 'Updated Apt', groesse: 60, miete: 600 });

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('Wohnungen');

      const mockChain = mockSupabase.from();
      expect(mockChain.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'Updated Apt' }));
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'apt-1');
      // Limit check mocks (fetchUserProfile) are not called
      expect(fetchUserProfile).not.toHaveBeenCalled();
    });

    it('handles database update error', async () => {
      const mockChain = mockSupabase.from();
      mockChain.single.mockResolvedValue({ data: null, error: { message: 'Update failed' } });

      const result = await wohnungServerAction('apt-1', { name: 'Updated Apt', groesse: 60, miete: 600 });
      expect(result.success).toBe(false);
      expect(result.error.message).toBe('Update failed');
    });
  });
});
