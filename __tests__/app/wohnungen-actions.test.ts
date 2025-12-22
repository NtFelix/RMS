
import { wohnungServerAction } from '@/app/wohnungen-actions';
import { revalidatePath } from 'next/cache';
import { fetchUserProfile } from '@/lib/data-fetching';
import { getPlanDetails } from '@/lib/stripe-server';

// Mock dependencies
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

// Mock Supabase
const mockSelectEq = jest.fn();
const mockUpdateEq = jest.fn();
const mockInsert = jest.fn();
const mockSingle = jest.fn();
const mockSelect = jest.fn();

const mockSupabase = {
  from: jest.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: jest.fn().mockReturnValue({
        eq: mockUpdateEq,
    }),
  })),
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
  },
};

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => mockSupabase),
}));

describe('Wohnungen Server Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockSelect.mockReturnThis();
    mockInsert.mockReturnThis();
    mockUpdateEq.mockReturnThis();
    mockSelectEq.mockReturnThis();
    mockSingle.mockReturnThis();

    // Setup select chain
    mockSelect.mockReturnValue({
        eq: mockSelectEq,
        single: mockSingle,
    });

    // Setup insert chain
    mockInsert.mockReturnValue({
        select: jest.fn().mockReturnValue({
            single: mockSingle
        })
    });

    // Setup update chain
    mockUpdateEq.mockReturnValue({
        select: jest.fn().mockReturnValue({
            single: mockSingle
        })
    });

    // Default responses
    mockSingle.mockResolvedValue({ data: { id: 'w1', name: 'Test Apt' }, error: null });
    mockSelectEq.mockResolvedValue({ count: 0, error: null });
  });

  describe('wohnungServerAction', () => {
    const validData = {
      name: 'Test Apartment',
      groesse: 50,
      miete: 500,
      haus_id: 'haus-1'
    };

    it('should create an apartment if user is eligible (Trial)', async () => {
      // Mock user profile
      (fetchUserProfile as jest.Mock).mockResolvedValue({
        stripe_subscription_status: 'trialing',
        stripe_price_id: null,
      });

      // Mock current count
      mockSelectEq.mockResolvedValue({ count: 2, error: null });

      const result = await wohnungServerAction(null, validData);

      expect(mockSupabase.from).toHaveBeenCalledWith('Wohnungen');
      expect(mockInsert).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should fail if trial limit reached', async () => {
       // Mock user profile
      (fetchUserProfile as jest.Mock).mockResolvedValue({
        stripe_subscription_status: 'trialing',
        stripe_price_id: null,
      });

      // Mock count >= 5
      mockSelectEq.mockResolvedValue({ count: 5, error: null });

      const result = await wohnungServerAction(null, validData);

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Maximale Anzahl an Wohnungen');
    });

    it('should create an apartment if user is eligible (Active Subscription)', async () => {
      // Mock user profile
      (fetchUserProfile as jest.Mock).mockResolvedValue({
        stripe_subscription_status: 'active',
        stripe_price_id: 'price_123',
      });

      // Mock plan details
      (getPlanDetails as jest.Mock).mockResolvedValue({
        limitWohnungen: 10,
      });

      mockSelectEq.mockResolvedValue({ count: 2, error: null });

      const result = await wohnungServerAction(null, validData);

      expect(result.success).toBe(true);
    });

    it('should fail if subscription limit reached', async () => {
      // Mock user profile
      (fetchUserProfile as jest.Mock).mockResolvedValue({
        stripe_subscription_status: 'active',
        stripe_price_id: 'price_123',
      });

      // Mock plan details
      (getPlanDetails as jest.Mock).mockResolvedValue({
        limitWohnungen: 10,
      });

      mockSelectEq.mockResolvedValue({ count: 10, error: null });

      const result = await wohnungServerAction(null, validData);

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('maximale Anzahl an Wohnungen');
    });

    it('should fail if user has no subscription and no trial', async () => {
      // Mock user profile
      (fetchUserProfile as jest.Mock).mockResolvedValue({
        stripe_subscription_status: 'unpaid',
      });

      const result = await wohnungServerAction(null, validData);

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Abonnement oder eine gültige Testphase ist erforderlich');
    });

    it('should update an existing apartment without checking limits', async () => {
      const result = await wohnungServerAction('apt-123', validData);

      expect(mockUpdateEq).toHaveBeenCalledWith('id', 'apt-123');
      expect(result.success).toBe(true);
      // Ensure fetchUserProfile was NOT called for updates
      expect(fetchUserProfile).not.toHaveBeenCalled();
    });

    it('should validate inputs', async () => {
      const invalidData = { ...validData, name: '' };
      const result = await wohnungServerAction(null, invalidData);
      expect(result.success).toBe(false);
      expect(result.error.message).toBe('Name ist erforderlich.');

      const invalidSize = { ...validData, groesse: -10 };
      const result2 = await wohnungServerAction(null, invalidSize);
      expect(result2.success).toBe(false);
      expect(result2.error.message).toBe('Größe muss eine positive Zahl sein.');
    });
  });
});
