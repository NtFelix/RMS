// Mock dependencies first
jest.mock('@/utils/supabase/server');
jest.mock('next/cache');
jest.mock('@/lib/data-fetching');

import { handleSubmit, deleteHouseAction, getWasserzaehlerModalDataAction } from './actions';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { fetchWasserzaehlerModalData } from '@/lib/data-fetching';

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>;
const mockFetchWasserzaehlerModalData = fetchWasserzaehlerModalData as jest.MockedFunction<typeof fetchWasserzaehlerModalData>;

describe('House Actions', () => {
  const mockSupabase = {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  };

  const mockTable = {
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    eq: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockResolvedValue(mockSupabase as any);
    mockSupabase.from.mockReturnValue(mockTable as any);
    mockTable.eq.mockReturnValue(mockTable as any);
    mockTable.insert.mockResolvedValue({ error: null });
    mockTable.update.mockResolvedValue({ error: null });
    mockTable.delete.mockResolvedValue({ error: null });
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
        expect(mockTable.insert).toHaveBeenCalledWith({
          name: 'Test House',
          ort: 'Berlin',
          strasse: 'Test Street 1',
          groesse: 150.5,
        });
        expect(mockRevalidatePath).toHaveBeenCalledWith('/haeuser');
        expect(result).toEqual({ success: true });
      });

      it('successfully creates a new house with minimal fields', async () => {
        const formData = new FormData();
        formData.append('name', 'Minimal House');
        formData.append('ort', 'Munich');

        const result = await handleSubmit(null, formData);

        expect(mockTable.insert).toHaveBeenCalledWith({
          name: 'Minimal House',
          ort: 'Munich',
          groesse: null,
        });
        expect(result).toEqual({ success: true });
      });

      it('handles empty groesse field correctly', async () => {
        const formData = new FormData();
        formData.append('name', 'Test House');
        formData.append('ort', 'Berlin');
        formData.append('groesse', '');

        const result = await handleSubmit(null, formData);

        expect(mockTable.insert).toHaveBeenCalledWith({
          name: 'Test House',
          ort: 'Berlin',
          groesse: null,
        });
        expect(result).toEqual({ success: true });
      });

      it('handles whitespace-only groesse field correctly', async () => {
        const formData = new FormData();
        formData.append('name', 'Test House');
        formData.append('ort', 'Berlin');
        formData.append('groesse', '   ');

        const result = await handleSubmit(null, formData);

        expect(mockTable.insert).toHaveBeenCalledWith({
          name: 'Test House',
          ort: 'Berlin',
          groesse: null,
        });
        expect(result).toEqual({ success: true });
      });

      it('handles invalid groesse value correctly', async () => {
        const formData = new FormData();
        formData.append('name', 'Test House');
        formData.append('ort', 'Berlin');
        formData.append('groesse', 'invalid');

        const result = await handleSubmit(null, formData);

        expect(mockTable.insert).toHaveBeenCalledWith({
          name: 'Test House',
          ort: 'Berlin',
          groesse: null,
        });
        expect(result).toEqual({ success: true });
      });

      it('handles zero groesse value correctly', async () => {
        const formData = new FormData();
        formData.append('name', 'Test House');
        formData.append('ort', 'Berlin');
        formData.append('groesse', '0');

        const result = await handleSubmit(null, formData);

        expect(mockTable.insert).toHaveBeenCalledWith({
          name: 'Test House',
          ort: 'Berlin',
          groesse: 0,
        });
        expect(result).toEqual({ success: true });
      });

      it('returns error when insert fails', async () => {
        const errorMessage = 'Database constraint violation';
        mockTable.insert.mockResolvedValue({ error: { message: errorMessage } });

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
        expect(mockTable.update).toHaveBeenCalledWith({
          name: 'Updated House',
          ort: 'Hamburg',
          strasse: 'Updated Street 2',
          groesse: 200,
        });
        expect(mockTable.eq).toHaveBeenCalledWith('id', houseId);
        expect(mockRevalidatePath).toHaveBeenCalledWith('/haeuser');
        expect(result).toEqual({ success: true });
      });

      it('successfully updates house with null groesse', async () => {
        const houseId = 'house-123';
        const formData = new FormData();
        formData.append('name', 'Updated House');
        formData.append('ort', 'Hamburg');
        formData.append('groesse', '');

        const result = await handleSubmit(houseId, formData);

        expect(mockTable.update).toHaveBeenCalledWith({
          name: 'Updated House',
          ort: 'Hamburg',
          groesse: null,
        });
        expect(result).toEqual({ success: true });
      });

      it('returns error when update fails', async () => {
        const errorMessage = 'House not found';
        mockTable.update.mockResolvedValue({ error: { message: errorMessage } });

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

    describe('Error handling', () => {
      it('handles unexpected errors during create', async () => {
        const errorMessage = 'Network error';
        mockTable.insert.mockRejectedValue(new Error(errorMessage));

        const formData = new FormData();
        formData.append('name', 'Test House');
        formData.append('ort', 'Berlin');

        const result = await handleSubmit(null, formData);

        expect(result).toEqual({
          success: false,
          error: { message: errorMessage },
        });
      });

      it('handles unexpected errors during update', async () => {
        const errorMessage = 'Connection timeout';
        mockTable.update.mockRejectedValue(new Error(errorMessage));

        const formData = new FormData();
        formData.append('name', 'Updated House');
        formData.append('ort', 'Berlin');

        const result = await handleSubmit('house-123', formData);

        expect(result).toEqual({
          success: false,
          error: { message: errorMessage },
        });
      });

      it('handles non-Error exceptions', async () => {
        mockTable.insert.mockRejectedValue('String error');

        const formData = new FormData();
        formData.append('name', 'Test House');
        formData.append('ort', 'Berlin');

        const result = await handleSubmit(null, formData);

        expect(result).toEqual({
          success: false,
          error: { message: 'An unknown server error occurred' },
        });
      });
    });

    describe('FormData processing', () => {
      it('processes only expected form fields and ignores others', async () => {
        const formData = new FormData();
        formData.append('name', 'Test House');
        formData.append('ort', 'Berlin');
        formData.append('strasse', 'Test Street');
        formData.append('plz', '12345');
        formData.append('groesse', '150');
        // Malicious or unexpected fields that should be ignored
        formData.append('custom_field', 'custom_value');
        formData.append('user_id', 'hacked_user_id');
        formData.append('is_admin', 'true');

        const result = await handleSubmit(null, formData);

        // The test will fail until the action is fixed to be secure.
        // The action should explicitly pick fields, not iterate through FormData.
        expect(mockTable.insert).toHaveBeenCalledWith({
          name: 'Test House',
          ort: 'Berlin',
          strasse: 'Test Street',
          plz: '12345',
          groesse: 150,
        });
        expect(result).toEqual({ success: true });
      });

      it('handles numeric groesse as number type', async () => {
        const formData = new FormData();
        formData.append('name', 'Test House');
        formData.append('ort', 'Berlin');
        // Simulate numeric input (though FormData always returns strings)
        formData.append('groesse', '150.75');

        const result = await handleSubmit(null, formData);

        expect(mockTable.insert).toHaveBeenCalledWith({
          name: 'Test House',
          ort: 'Berlin',
          groesse: 150.75,
        });
        expect(result).toEqual({ success: true });
      });
    });
  });

  describe('deleteHouseAction', () => {
    it('successfully deletes a house', async () => {
      const houseId = 'house-123';

      const result = await deleteHouseAction(houseId);

      expect(mockSupabase.from).toHaveBeenCalledWith('Haeuser');
      expect(mockTable.delete).toHaveBeenCalled();
      expect(mockTable.eq).toHaveBeenCalledWith('id', houseId);
      expect(mockRevalidatePath).toHaveBeenCalledWith('/haeuser');
      expect(result).toEqual({ success: true });
    });

    it('returns error when delete fails', async () => {
      const errorMessage = 'Cannot delete house with existing apartments';
      mockTable.delete.mockResolvedValue({ error: { message: errorMessage } });

      const houseId = 'house-with-apartments';

      const result = await deleteHouseAction(houseId);

      expect(result).toEqual({
        success: false,
        error: { message: errorMessage },
      });
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });

    it('logs error when delete fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const errorMessage = 'Database error';
      mockTable.delete.mockResolvedValue({ error: { message: errorMessage } });

      const houseId = 'house-123';

      await deleteHouseAction(houseId);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error deleting house from Supabase:',
        { message: errorMessage }
      );

      consoleErrorSpy.mockRestore();
    });

    it('handles unexpected errors during deletion', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Network error');
      mockTable.delete.mockRejectedValue(error);

      const houseId = 'house-123';

      const result = await deleteHouseAction(houseId);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Unexpected error in deleteHouseAction:',
        error
      );
      expect(result).toEqual({
        success: false,
        error: { message: 'Network error' },
      });

      consoleErrorSpy.mockRestore();
    });

    it('handles non-Error exceptions', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockTable.delete.mockRejectedValue('String error');

      const houseId = 'house-123';

      const result = await deleteHouseAction(houseId);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Unexpected error in deleteHouseAction:',
        'String error'
      );
      expect(result).toEqual({
        success: false,
        error: { message: 'An unknown server error occurred' },
      });

      consoleErrorSpy.mockRestore();
    });

    it('does not revalidate path when deletion fails', async () => {
      mockTable.delete.mockResolvedValue({ error: { message: 'Error' } });

      const houseId = 'house-123';

      await deleteHouseAction(houseId);

      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });

  describe('getWasserzaehlerModalDataAction', () => {
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
      const result = await getWasserzaehlerModalDataAction(nebenkostenId);

      expect(mockFetchWasserzaehlerModalData).toHaveBeenCalledWith(nebenkostenId);
      expect(result).toEqual(mockData);
    });

    it('handles errors and returns empty data', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Fetch error');
      mockFetchWasserzaehlerModalData.mockRejectedValue(error);

      const nebenkostenId = 'nebenkosten-123';
      const result = await getWasserzaehlerModalDataAction(nebenkostenId);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error in getWasserzaehlerModalDataAction:',
        error
      );
      expect(result).toEqual({
        mieterList: [],
        existingReadings: [],
      });

      consoleErrorSpy.mockRestore();
    });

    it('handles non-Error exceptions', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockFetchWasserzaehlerModalData.mockRejectedValue('String error');

      const nebenkostenId = 'nebenkosten-123';
      const result = await getWasserzaehlerModalDataAction(nebenkostenId);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error in getWasserzaehlerModalDataAction:',
        'String error'
      );
      expect(result).toEqual({
        mieterList: [],
        existingReadings: [],
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Integration', () => {
    it('revalidates path after successful operations', async () => {
      // Test create
      const formData = new FormData();
      formData.append('name', 'Test House');
      formData.append('ort', 'Berlin');

      await handleSubmit(null, formData);
      expect(mockRevalidatePath).toHaveBeenCalledWith('/haeuser');

      mockRevalidatePath.mockClear();

      // Test update
      await handleSubmit('house-123', formData);
      expect(mockRevalidatePath).toHaveBeenCalledWith('/haeuser');

      mockRevalidatePath.mockClear();

      // Test delete
      await deleteHouseAction('house-123');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/haeuser');
    });

    it('does not revalidate path after failed operations', async () => {
      mockTable.insert.mockResolvedValue({ error: { message: 'Error' } });
      mockTable.update.mockResolvedValue({ error: { message: 'Error' } });
      mockTable.delete.mockResolvedValue({ error: { message: 'Error' } });

      const formData = new FormData();
      formData.append('name', 'Test House');
      formData.append('ort', 'Berlin');

      // Test failed create
      await handleSubmit(null, formData);
      expect(mockRevalidatePath).not.toHaveBeenCalled();

      // Test failed update
      await handleSubmit('house-123', formData);
      expect(mockRevalidatePath).not.toHaveBeenCalled();

      // Test failed delete
      await deleteHouseAction('house-123');
      expect(mockRevalidatePath).not.toHaveBeenCalled();
    });
  });
});