import * as mieterActions from './mieter-actions';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
};

const mockCreateClient = createClient as jest.Mock;

describe('mieter-actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockReturnValue(mockSupabase);
  });

  describe('updateKautionAction', () => {
    it('should update kaution data successfully', async () => {
      const formData = new FormData();
      formData.append('tenantId', '1');
      formData.append('amount', '1500');
      formData.append('paymentDate', '2023-01-01');
      formData.append('status', 'Erhalten');

      mockSupabase.single.mockResolvedValueOnce({ data: { kaution: {} }, error: null });
      mockSupabase.update.mockResolvedValueOnce({ error: null });

      const result = await mieterActions.updateKautionAction(formData);

      expect(result.success).toBe(true);
      expect(revalidatePath).toHaveBeenCalledWith('/mieter');
    });

    it('should return an error if tenantId is missing', async () => {
      const formData = new FormData();
      const result = await mieterActions.updateKautionAction(formData);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Mieter-ID fehlt.');
    });
  });

  describe('getSuggestedKaution', () => {
    it('should return suggested kaution amount', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: { miete: 500 }, error: null });

      const result = await mieterActions.getSuggestedKaution('1');

      expect(result.success).toBe(true);
      expect(result.suggestedAmount).toBe(1500);
    });

    it('should return 0 if no rent data is available', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });

      const result = await mieterActions.getSuggestedKaution('1');

      expect(result.success).toBe(true);
      expect(result.suggestedAmount).toBe(0);
    });
  });
});
