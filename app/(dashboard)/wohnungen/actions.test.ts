import { speichereWohnung, aktualisiereWohnung, loescheWohnung } from './actions';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { fetchUserProfile } from '@/lib/data-fetching';
import { getPlanDetails } from '@/lib/stripe-server';

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

const mockUpdateEq = jest.fn().mockResolvedValue({ error: null });
const mockDeleteEq = jest.fn().mockResolvedValue({ error: null });
const mockInsert = jest.fn().mockResolvedValue({ error: null });
const mockSelectEq = jest.fn().mockResolvedValue({ count: 0, error: null });
const mockSelect = jest.fn().mockReturnValue({ eq: mockSelectEq });


const mockFrom = jest.fn().mockReturnValue({
  select: mockSelect,
  insert: mockInsert,
  update: jest.fn().mockReturnValue({ eq: mockUpdateEq }),
  delete: jest.fn().mockReturnValue({ eq: mockDeleteEq }),
});

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: mockFrom,
};

(createClient as jest.Mock).mockReturnValue(mockSupabase);

describe('Wohnungen Server Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('speichereWohnung', () => {
    it('should save a new apartment', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
      (fetchUserProfile as jest.Mock).mockResolvedValue({ stripe_subscription_status: 'active', stripe_price_id: 'price_123' });
      (getPlanDetails as jest.Mock).mockResolvedValue({ limitWohnungen: 10 });

      const formData = { name: 'Test Wohnung', groesse: '100', miete: '1000', haus_id: 'haus-123' };
      const result = await speichereWohnung(formData);

      expect(result).toEqual({ success: true });
      expect(revalidatePath).toHaveBeenCalledWith('/wohnungen');
    });
  });

  describe('aktualisiereWohnung', () => {
    it('should update an apartment', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
      (fetchUserProfile as jest.Mock).mockResolvedValue({ stripe_subscription_status: 'active', stripe_price_id: 'price_123' });
      (getPlanDetails as jest.Mock).mockResolvedValue({ limitWohnungen: 10 });

      const formData = { name: 'Updated Wohnung', groesse: '120', miete: '1200', haus_id: 'haus-123' };
      const result = await aktualisiereWohnung('wohnung-123', formData);

      expect(result).toEqual({ success: true });
      expect(revalidatePath).toHaveBeenCalledWith('/wohnungen');
    });
  });

  describe('loescheWohnung', () => {
    it('should delete an apartment', async () => {
      const result = await loescheWohnung('wohnung-123');

      expect(result).toEqual({ success: true });
      expect(revalidatePath).toHaveBeenCalledWith('/wohnungen');
    });
  });
});
