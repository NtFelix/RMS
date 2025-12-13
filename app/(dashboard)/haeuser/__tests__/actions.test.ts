/**
 * @jest-environment node
 */

// Mock dependencies first
jest.mock('@/lib/supabase-server');
jest.mock('next/cache');
jest.mock('@/lib/data-fetching');

import { handleSubmit, deleteHouseAction, getWasserzaehlerModalDataLegacyAction } from './actions';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import { fetchWasserzaehlerModalData } from '@/lib/data-fetching';

const mockCreateClient = createSupabaseServerClient as jest.MockedFunction<typeof createSupabaseServerClient>;
const mockRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>;
const mockFetchWasserzaehlerModalData = fetchWasserzaehlerModalData as jest.MockedFunction<typeof fetchWasserzaehlerModalData>;

describe('House Actions', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a comprehensive mock for Supabase
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null }),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
      auth: {
        getUser: jest.fn(),
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

        const result = await handleSubmit(null, formData);

        expect(mockSupabase.from).toHaveBeenCalledWith('Haeuser');
        expect(mockSupabase.insert).toHaveBeenCalledWith({
          name: 'Test House',
          ort: 'Berlin',
          strasse: 'Test Street 1',
          groesse: 150.5,
        });
        expect(mockRevalidatePath).toHaveBeenCalledWith('/haeuser');
        expect(result).toEqual({ success: true });
      });

      it('returns error when insert fails', async () => {
        const errorMessage = 'Database constraint violation';
        mockSupabase.insert.mockResolvedValue({ error: { message: errorMessage } });

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
        const houseId = 'house-123';
        const formData = new FormData();
        formData.append('name', 'Updated House');
        formData.append('ort', 'Hamburg');
        formData.append('strasse', 'Updated Street 2');
        formData.append('groesse', '200');

        const result = await handleSubmit(houseId, formData);

        expect(mockSupabase.from).toHaveBeenCalledWith('Haeuser');
        expect(mockSupabase.update).toHaveBeenCalledWith({
          name: 'Updated House',
          ort: 'Hamburg',
          strasse: 'Updated Street 2',
          groesse: 200,
        });
        expect(mockSupabase.eq).toHaveBeenCalledWith('id', houseId);
        expect(mockRevalidatePath).toHaveBeenCalledWith('/haeuser');
        expect(result).toEqual({ success: true });
      });

      it('returns error when update fails', async () => {
        const errorMessage = 'House not found';
        mockSupabase.eq.mockResolvedValue({ error: { message: errorMessage } });

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

      expect(mockSupabase.from).toHaveBeenCalledWith('Haeuser');
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', houseId);
      expect(mockRevalidatePath).toHaveBeenCalledWith('/haeuser');
      expect(result).toEqual({ success: true });
    });

    it('returns error when delete fails', async () => {
      const errorMessage = 'Cannot delete house with existing apartments';
      mockSupabase.eq.mockResolvedValue({ error: { message: errorMessage } });

      const houseId = 'house-with-apartments';

      const result = await deleteHouseAction(houseId);

      expect(result).toEqual({
        success: false,
        error: { message: errorMessage },
      });
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });

  describe('getWasserzaehlerModalDataLegacyAction', () => {
    it('successfully fetches wasserzaehler modal data', async () => {
      const mockData = {
        mieterList: [
          { id: '1', name: 'Mieter 1' },
          { id: '2', name: 'Mieter 2' },
        ],
        existingReadings: [
          { id: '1', value: 100 },
          { id: '2', value: 200 },
        ],
      };

      mockFetchWasserzaehlerModalData.mockResolvedValue(mockData as any);

      const nebenkostenId = 'nebenkosten-123';
      const result = await getWasserzaehlerModalDataLegacyAction(nebenkostenId);

      expect(mockFetchWasserzaehlerModalData).toHaveBeenCalledWith(nebenkostenId);
      expect(result).toEqual(mockData);
    });

    it('handles errors and returns empty data', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Fetch error');
      mockFetchWasserzaehlerModalData.mockRejectedValue(error);

      const nebenkostenId = 'nebenkosten-123';
      const result = await getWasserzaehlerModalDataLegacyAction(nebenkostenId);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error in getWasserzaehlerModalDataLegacyAction:',
        error
      );
      expect(result).toEqual({
        mieterList: [],
        existingReadings: [],
      });

      consoleErrorSpy.mockRestore();
    });
  });
});