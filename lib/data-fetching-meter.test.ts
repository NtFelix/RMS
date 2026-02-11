
import { fetchMeterReadingsByHausAndDateRange } from './data-fetching';
import { createSupabaseServerClient } from './supabase-server';

jest.mock('./supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

describe('fetchMeterReadingsByHausAndDateRange', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn(),
    };

    (createSupabaseServerClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  const createChain = (data: any, error: any = null) => {
    const chain: any = {};
    const methods = ['select', 'eq', 'in', 'lte', 'gte', 'or', 'limit', 'single', 'order'];
    methods.forEach(method => {
      chain[method] = jest.fn().mockReturnThis();
    });
    chain.then = (resolve: any) => resolve({ data, error });
    return chain;
  };

  it('should fetch readings using optimized parallel queries', async () => {
    const hausId = 'haus-1';
    const start = '2024-01-01';
    const end = '2024-12-31';

    // Mock Data
    const mieter = [{ id: 'm1', wohnung_id: 'w1' }, { id: 'm2', wohnung_id: 'w2' }];

    // Readings with joined Zaehler data as returned by Supabase
    const readings = [
      {
        id: 'r1',
        zaehler_id: 'z1',
        ablese_datum: '2024-06-01',
        zaehlerstand: 100,
        verbrauch: 10,
        user_id: 'u1',
        Zaehler: { id: 'z1', wohnung_id: 'w1', Wohnungen: { id: 'w1' } }
      },
      {
        id: 'r2',
        zaehler_id: 'z2',
        ablese_datum: '2024-06-01',
        zaehlerstand: 200,
        verbrauch: 20,
        user_id: 'u1',
        Zaehler: { id: 'z2', wohnung_id: 'w2', Wohnungen: { id: 'w2' } }
      }
    ];

    const mieterChain = createChain(mieter);
    const readingsChain = createChain(readings);

    mockSupabase.from.mockImplementation((table: string) => {
      switch (table) {
        case 'Mieter': return mieterChain;
        case 'Zaehler_Ablesungen': return readingsChain;
        default: return createChain([]);
      }
    });

    const result = await fetchMeterReadingsByHausAndDateRange(hausId, start, end);

    // Verify Data Integrity
    expect(result.mieterList).toHaveLength(2);
    expect(result.existingReadings).toHaveLength(2);

    // Check mapping logic (mieter_id should be resolved correctly via wohnung_id)
    expect(result.existingReadings[0].mieter_id).toBe('m1');
    expect(result.existingReadings[1].mieter_id).toBe('m2');

    // Verify Call Count (Optimized)
    expect(mockSupabase.from).toHaveBeenCalledWith('Mieter');
    expect(mockSupabase.from).toHaveBeenCalledWith('Zaehler_Ablesungen');

    // Should NOT call these individually anymore
    expect(mockSupabase.from).not.toHaveBeenCalledWith('Wohnungen');
    expect(mockSupabase.from).not.toHaveBeenCalledWith('Zaehler');

    // Total calls should be 2
    expect(mockSupabase.from).toHaveBeenCalledTimes(2);

    // Verify Query Structure (Joins)
    const mieterSelect = mieterChain.select.mock.calls[0][0];
    expect(mieterSelect).toContain('Wohnungen!inner(id)');

    const readingsSelect = readingsChain.select.mock.calls[0][0];
    expect(readingsSelect).toContain('Zaehler!inner');
  });

  it('should handle Mieter fetch errors by returning empty lists', async () => {
    const hausId = 'haus-error';
    const start = '2024-01-01';
    const end = '2024-12-31';

    const errorChain = createChain(null, { message: 'DB Error' });

    mockSupabase.from.mockReturnValue(errorChain);

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

    const result = await fetchMeterReadingsByHausAndDateRange(hausId, start, end);

    expect(result.mieterList).toEqual([]);
    expect(result.existingReadings).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should return Mieter list even if Readings fetch fails', async () => {
    const hausId = 'haus-partial';
    const start = '2024-01-01';
    const end = '2024-12-31';

    const mieterData = [{ id: 'm1', wohnung_id: 'w1' }];

    const mieterChain = createChain(mieterData);
    const readingsErrorChain = createChain(null, { message: 'Readings Error' });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'Mieter') return mieterChain;
      if (table === 'Zaehler_Ablesungen') return readingsErrorChain;
      return createChain([]);
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

    const result = await fetchMeterReadingsByHausAndDateRange(hausId, start, end);

    expect(result.mieterList).toHaveLength(1);
    expect(result.mieterList[0].id).toBe('m1');
    expect(result.existingReadings).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error fetching Zaehler_Ablesungen'), expect.anything(), expect.anything(), expect.anything(), expect.anything());

    consoleSpy.mockRestore();
  });
});
