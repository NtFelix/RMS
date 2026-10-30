import { fetchMieter } from './data-fetching';
import { createSupabaseServerClient } from './supabase-server';

jest.mock('./supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

describe('fetchMieter', () => {
  let chain: any;

  beforeEach(() => {
    jest.clearAllMocks();

    chain = {};
    for (const method of ['select', 'in']) {
      chain[method] = jest.fn().mockReturnValue(chain);
    }
    chain.then = (resolve: any) => resolve({ data: [{ id: 'm1', name: 'Beispiel Mieter' }], error: null });

    (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from: jest.fn().mockReturnValue(chain) });
  });

  it('liest die Mieter mit expliziter Spaltenliste ohne das Altfeld "kaution" (kein Wildcard-Select)', async () => {
    const mieter = await fetchMieter();

    expect(mieter).toHaveLength(1);
    expect(chain.select).toHaveBeenCalledTimes(1);

    const selectArg: string = chain.select.mock.calls[0][0];
    expect(selectArg).not.toMatch(/\*|kaution/i);
    expect(selectArg).toContain('Wohnungen(name, groesse, miete)');
    expect(selectArg).toEqual(expect.stringContaining('wohnung_id'));
  });
});
