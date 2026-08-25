/**
 * @jest-environment node
 */

// Mock dependencies first
jest.mock('@/lib/supabase-server');
jest.mock('next/cache');
jest.mock('@/lib/data-fetching');
jest.mock('@/lib/papierkorb/utils', () => ({
  softDeleteEntryAction: jest.fn().mockResolvedValue(undefined),
}));

import { handleSubmit, deleteHouseAction } from './actions';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import { softDeleteEntryAction } from '@/lib/papierkorb/utils';

const mockCreateClient = createSupabaseServerClient as jest.MockedFunction<typeof createSupabaseServerClient>;
const mockRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>;
const mockSoftDeleteEntryAction = softDeleteEntryAction as jest.MockedFunction<typeof softDeleteEntryAction>;

// Build a chainable query builder mock
function createQueryBuilder() {
  const builder: any = {
    select: jest.fn(() => builder),
    insert: jest.fn(() => builder),
    update: jest.fn(() => builder),
    delete: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    order: jest.fn(() => builder),
    limit: jest.fn(() => builder),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  };
  // The final resolved value for terminal chain calls
  builder.single.mockResolvedValue({ data: null, error: null });
  builder.eq.mockResolvedValue({ error: null });
  return builder;
}

describe('House Actions', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    const queryBuilder = createQueryBuilder();

    mockSupabase = {
      from: jest.fn(() => queryBuilder),
      rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user1' } }, error: null }),
      },
    };

    mockCreateClient.mockResolvedValue(mockSupabase);
  });

  describe('handleSubmit', () => {
    describe('Creating new house', () => {
      it('successfully creates a new house with all fields', async () => {
        const formData = new FormData();
        formData.append('name', 'Test House');
        formData.append('ort', 'Berlin');
        formData.append('strasse', 'Test Street 1');
        formData.append('groesse', '150.5');

        // Make single() return a new house id so flow continues to rpc call
        const builder = mockSupabase.from();
        builder.single.mockResolvedValue({ data: { id: 'new-uuid' }, error: null });

        const result = await handleSubmit(null, formData);

        expect(mockSupabase.from).toHaveBeenCalledWith('Haeuser');
        expect(builder.insert).toHaveBeenCalledWith({
          name: 'Test House',
          ort: 'Berlin',
          strasse: 'Test Street 1',
          groesse: 150.5,
        });
        expect(builder.select).toHaveBeenCalledWith('id');
        expect(builder.single).toHaveBeenCalled();
        expect(mockRevalidatePath).toHaveBeenCalledWith('/haeuser');
        expect(result).toEqual({ success: true });
      });

      it('returns error when insert fails', async () => {
        const errorMessage = 'Database constraint violation';
        const builder = mockSupabase.from();
        builder.single.mockResolvedValue({ data: null, error: { message: errorMessage } });

        const formData = new FormData();
        formData.append('name', 'Test House');
        formData.append('ort', 'Berlin');

        const result = await handleSubmit(null, formData);

        expect(result).toEqual({
          success: false,
          error: { message: errorMessage },
        });
        expect(mockRevalidatePath).not.toHaveBeenCalled();
      });
    });

    describe('Updating existing house', () => {
      it('successfully updates an existing house', async () => {
        const builder = mockSupabase.from();
        const houseId = 'house-123';
        const formData = new FormData();
        formData.append('name', 'Updated House');
        formData.append('ort', 'Hamburg');
        formData.append('strasse', 'Updated Street 2');
        formData.append('groesse', '200');

        const result = await handleSubmit(houseId, formData);

        expect(mockSupabase.from).toHaveBeenCalledWith('Haeuser');
        expect(builder.update).toHaveBeenCalledWith({
          name: 'Updated House',
          ort: 'Hamburg',
          strasse: 'Updated Street 2',
          groesse: 200,
        });
        expect(builder.eq).toHaveBeenCalledWith('id', houseId);
        expect(mockRevalidatePath).toHaveBeenCalledWith('/haeuser');
        expect(result).toEqual({ success: true });
      });

      it('returns error when update fails', async () => {
        const errorMessage = 'House not found';
        const builder = mockSupabase.from();
        builder.eq.mockResolvedValue({ error: { message: errorMessage } });

        const houseId = 'nonexistent-house';
        const formData = new FormData();
        formData.append('name', 'Updated House');
        formData.append('ort', 'Berlin');

        const result = await handleSubmit(houseId, formData);

        expect(result).toEqual({
          success: false,
          error: { message: errorMessage },
        });
        expect(mockRevalidatePath).not.toHaveBeenCalled();
      });
    });
  });

  describe('deleteHouseAction', () => {
    it('successfully deletes a house', async () => {
      const houseId = 'house-123';

      const result = await deleteHouseAction(houseId);

      expect(mockSoftDeleteEntryAction).toHaveBeenCalledWith('Haeuser', houseId);
      expect(mockRevalidatePath).toHaveBeenCalledWith('/haeuser');
      expect(result).toEqual({ success: true });
    });

    it('returns error when delete fails', async () => {
      const errorMessage = 'Cannot delete house with existing apartments';
      mockSoftDeleteEntryAction.mockRejectedValue(new Error(errorMessage));

      const houseId = 'house-with-apartments';

      const result = await deleteHouseAction(houseId);

      expect(result).toEqual({
        success: false,
        error: { message: errorMessage },
      });
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });
});