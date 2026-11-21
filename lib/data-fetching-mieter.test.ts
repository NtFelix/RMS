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
    chain.then = (resolve: any) => resolve({ data: [{ id: 'm1', person_id: 'p1', person: { id: 'p1', anrede: 'herr', vorname: 'Beispiel', nachname: 'Mieter', email: 'beispiel@example.invalid', telefon: '0000' } }], error: null });

    (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from: jest.fn().mockReturnValue(chain) });
  });

  it('liest die Mieter mit expliziter Spaltenliste ohne das Altfeld "kaution" (kein Wildcard-Select)', async () => {
    const mieter = await fetchMieter();

    expect(mieter).toHaveLength(1);
    // Name, E-Mail und Telefon werden aus der eingebetteten Person abgeleitet (GH-30)
    expect(mieter[0]).toEqual(expect.objectContaining({ name: 'Beispiel Mieter', email: 'beispiel@example.invalid', telefonnummer: '0000' }));
    expect(chain.select).toHaveBeenCalledTimes(1);

    const selectArg: string = chain.select.mock.calls[0][0];
    expect(selectArg).not.toMatch(/\*|kaution/i);
    expect(selectArg).toContain('Wohnungen(name, groesse, miete)');
    expect(selectArg).toEqual(expect.stringContaining('wohnung_id'));
    expect(selectArg).toContain('person:Personen!fk_mieter_person(');
  });
});
