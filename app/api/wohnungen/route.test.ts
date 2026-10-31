/**
 * @jest-environment node
 */
import { GET } from './route';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { hasPermission } from '@/lib/permissions';

/**
 * GET /api/wohnungen: Wohnungsnamen (und die eingebetteten Mieterdaten) nur mit wohnungen:ansehen.
 * Alle Daten sind synthetisch.
 */

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

type Result = { data: unknown; error: { message: string } | null };

/** Verkettbarer Query-Builder; `then` liefert das Ergebnis (wie PostgREST). */
function createBuilder(result: Result) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'in', 'eq']) {
    builder[method] = jest.fn(() => builder);
  }
  builder.then = (resolve: (v: Result) => unknown) => Promise.resolve(result).then(resolve);
  return builder as Record<string, jest.Mock>;
}

describe('GET /api/wohnungen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (hasPermission as jest.Mock).mockResolvedValue(true);
  });

  it('liefert mit wohnungen:ansehen die Wohnungen', async () => {
    const wohnungen = createBuilder({ data: [{ id: 'a1', name: 'Wohnung 1', haus_id: 'h1' }], error: null });
    const mieter = createBuilder({ data: [], error: null });
    const from = jest.fn((table: string) => (table === 'Wohnungen' ? wohnungen : mieter));
    (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from });

    const res = await GET();

    expect(res.status).toBe(200);
    expect(hasPermission).toHaveBeenCalledWith('wohnungen', 'ansehen');
    expect(await res.json()).toEqual([expect.objectContaining({ id: 'a1', name: 'Wohnung 1', status: 'frei' })]);
  });

  it('antwortet ohne wohnungen:ansehen mit 403 und fragt weder Wohnungen noch Mieter ab', async () => {
    (hasPermission as jest.Mock).mockImplementation(async (modul: string) => modul !== 'wohnungen');
    const from = jest.fn();
    (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from });

    const res = await GET();

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Verboten' });
    expect(from).not.toHaveBeenCalled();
  });
});
