import { updateKautionAction } from './actions';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

jest.mock('@/utils/supabase/server');
jest.mock('next/cache');

const mockCreateClient = createClient as jest.Mock;
const mockRevalidatePath = revalidatePath as jest.Mock;

describe('updateKautionAction', () => {
  const mockUpdate = jest.fn();
  const mockEq = jest.fn();

  beforeEach(() => {
    mockEq.mockReturnValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockCreateClient.mockReturnValue({
      from: () => ({ update: mockUpdate }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should update kaution data successfully', async () => {
    const formData = new FormData();
    formData.append('tenantId', 'tenant-1');
    formData.append('amount', '1500');
    formData.append('status', 'Erhalten');

    const result = await updateKautionAction(formData);

    expect(result).toEqual({ success: true });
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', 'tenant-1');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/mieter');
  });

  it('should return an error if validation fails', async () => {
    const formData = new FormData();
    formData.append('tenantId', 'tenant-1');
    formData.append('amount', '-100'); // Invalid amount
    formData.append('status', 'Erhalten');

    const result = await updateKautionAction(formData);

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('Ungültige Eingabe.');
  });

  it('should return an error if supabase update fails', async () => {
    mockEq.mockReturnValue({ error: { message: 'Supabase error' } });
    const formData = new FormData();
    formData.append('tenantId', 'tenant-1');
    formData.append('amount', '1500');
    formData.append('status', 'Erhalten');

    const result = await updateKautionAction(formData);

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('Kaution konnte nicht gespeichert werden.');
  });
});
