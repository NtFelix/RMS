
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

describe('app/wohnungen-actions', () => {
  const mockEq = jest.fn();
  const mockInsert = jest.fn();
  const mockUpdate = jest.fn();
  const mockSelect = jest.fn();
  const mockFrom = jest.fn();
  const mockSingle = jest.fn();
  const mockAuthGetUser = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // The Action chains:
    // Insert: from().insert().select().single()
    // Update: from().update().eq().select().single()

    // Final result object with single()
    const singleResult = { data: { id: 'w1', name: 'Test' }, error: null };
    mockSingle.mockResolvedValue(singleResult);

    // Select object that has single()
    const selectObject = { single: mockSingle };

    // Update chain needs to handle .eq() first
    // update() -> { eq }
    // eq() -> { select }
    // select() -> { single }

    const eqObject = { select: jest.fn().mockReturnValue(selectObject) };
    mockEq.mockReturnValue(eqObject);

    // If update calls eq directly, update needs to return { eq }
    mockUpdate.mockReturnValue({ eq: mockEq });

    // Insert chain
    // insert() -> { select }
    // select() -> { single }
    mockInsert.mockReturnValue({ select: jest.fn().mockReturnValue(selectObject) });

    // Select chain (for limit check)
    // select() -> { eq } -> result
    mockSelect.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
        single: mockSingle // In case select is used otherwise
    });

    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: jest.fn(),
    });

    (createClient as jest.Mock).mockResolvedValue({
      from: mockFrom,
      auth: {
        getUser: mockAuthGetUser,
      },
    });

    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'user1' } },
      error: null,
    });
  });

  describe('wohnungServerAction', () => {
    it('creates a new apartment successfully when eligible', async () => {
      // Mock eligibility
      (fetchUserProfile as jest.Mock).mockResolvedValue({
        stripe_subscription_status: 'trialing',
      });
      // Mock existing count (limit check)
      // The implementation of mockSelect above handles .eq().

      const payload = {
        name: 'New Apt',
        groesse: 60,
        miete: 1000,
        haus_id: 'h1',
      };

      const result = await wohnungServerAction(null, payload);

      expect(result.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New Apt',
        user_id: 'user1',
      }));
      expect(revalidatePath).toHaveBeenCalledWith('/wohnungen');
    });

    it('updates an existing apartment successfully', async () => {
      const payload = {
        name: 'Updated Apt',
        groesse: 60,
        miete: 1000,
        haus_id: 'h1',
      };

      const result = await wohnungServerAction('w1', payload);

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Updated Apt',
      }));
      expect(mockEq).toHaveBeenCalledWith('id', 'w1');
    });

    it('fails if user is not authenticated', async () => {
      mockAuthGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const payload = { name: 'Test', groesse: 10, miete: 100 };
      const result = await wohnungServerAction(null, payload);

      expect(result.success).toBe(false);
      expect(result.error?.message).toMatch(/Benutzer nicht gefunden/);
    });

    it('validates input', async () => {
      const result = await wohnungServerAction(null, { name: '', groesse: 10, miete: 100 });
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Name ist erforderlich');
    });

    it('enforces limits for trial users', async () => {
       (fetchUserProfile as jest.Mock).mockResolvedValue({
        stripe_subscription_status: 'trialing',
      });

      // We need to override the select mock for this specific test to return count=5
      mockSelect.mockReturnValue({
         eq: jest.fn().mockResolvedValue({ count: 5, error: null }),
         single: mockSingle
      });

      const payload = { name: 'Test', groesse: 10, miete: 100 };
      const result = await wohnungServerAction(null, payload);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Maximale Anzahl');
    });
  });
});
