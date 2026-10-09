/**
 * @jest-environment node
 */
import { GET } from './route';
import { createSupabaseServerClient } from '@/lib/supabase-server';

/**
 * Leak-Schließung Altfeld "Mieter.kaution" (GH-6): Die Route liest nur die benötigten Mieterspalten.
 */

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

type Result = { data: unknown; error: { message: string; code?: string } | null };

function createBuilder(result: Result) {
  const builder: Record<string, jest.Mock> = {};
  for (const method of ['select', 'eq', 'or', 'order', 'limit']) {
    builder[method] = jest.fn(() => builder);
  }
  builder.single = jest.fn(async () => result);
  builder.maybeSingle = jest.fn(async () => result);
  return builder;
}

describe('GET /api/apartments/[apartmentId]/details', () => {
  const apartmentId = '550e8400-e29b-41d4-a716-446655440000';

  it('liest den aktuellen Mieter mit expliziter Spaltenliste ohne "kaution" und liefert sie nicht aus', async () => {
    const apartmentBuilder = createBuilder({
      data: { id: apartmentId, name: 'Wohnung 1A', groesse: 80, miete: 1200, haus_id: null, Haeuser: { name: 'Musterhaus' } },
      error: null,
    });
    // Selbst wenn die Zeile das Altfeld enthielte, darf es nicht in der Antwort erscheinen
    const mieterBuilder = createBuilder({
      data: {
        id: 'm1', name: 'Beispiel Mieter', email: 'beispiel@example.invalid', telefonnummer: null,
        einzug: '2023-01-01', auszug: null, notiz: null, kaution: { amount: 1500 },
      },
      error: null,
    });
    const from = jest.fn((table: string) => (table === 'Wohnungen' ? apartmentBuilder : mieterBuilder));
    (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from });

    const res = await GET(new Request(`http://localhost/api/apartments/${apartmentId}/details`), {
      params: Promise.resolve({ apartmentId }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(from).toHaveBeenCalledWith('Mieter');
    const selectArg: string = mieterBuilder.select.mock.calls[0][0];
    expect(selectArg).not.toMatch(/\*|kaution/i);
    expect(data.tenant.id).toBe('m1');
    expect(JSON.stringify(data)).not.toMatch(/kaution/i);
  });
});
