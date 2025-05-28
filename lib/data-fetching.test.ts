// lib/data-fetching.test.ts
import { fetchNebenkosten } from './data-fetching';
import { createSupabaseServerClient } from './supabase-server';

jest.mock('./supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

describe('fetchNebenkosten', () => {
  const mockSupabaseClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn(),
  };

  beforeEach(() => {
    (createSupabaseServerClient as jest.Mock).mockReturnValue(mockSupabaseClient);
    mockSupabaseClient.from.mockClear();
    mockSupabaseClient.select.mockClear();
  });

  it('should fetch and return nebenkosten data with Haeuser name', async () => {
    const mockData = [{ id: '1', jahr: '2023', Haeuser: { name: 'Haus A' } }];
    mockSupabaseClient.select.mockResolvedValueOnce({ data: mockData, error: null });
    
    const result = await fetchNebenkosten();
    
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('Nebenkosten');
    expect(mockSupabaseClient.select).toHaveBeenCalledWith('*, Haeuser(name)');
    expect(result).toEqual(mockData);
  });

  it('should return empty array and log error on failure', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSupabaseClient.select.mockResolvedValueOnce({ data: null, error: new Error('DB Error') });
    
    const result = await fetchNebenkosten();
    
    expect(result).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching Nebenkosten:', expect.any(Error));
    consoleErrorSpy.mockRestore();
  });
});
