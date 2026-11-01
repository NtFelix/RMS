/**
 * @jest-environment node
 */
import { GET } from './route';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { checkPermission } from '@/lib/permissions';

/**
 * GET /api/wohnungen/[id]/overview braucht wohnungen:ansehen (Modulrecht der Route).
 * Alle Daten sind synthetisch.
 */

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

const wohnungId = '550e8400-e29b-41d4-a716-446655440000';

function setup(wohnungResult: { data: unknown; error: unknown } = {
  data: { id: wohnungId, name: 'Wohnung 1', groesse: 50, miete: 800, haus_id: null, Haeuser: [{ name: 'Musterhaus' }] },
  error: null,
}) {
  const wohnungBuilder: Record<string, jest.Mock> = {};
  wohnungBuilder.select = jest.fn(() => wohnungBuilder);
  wohnungBuilder.eq = jest.fn(() => wohnungBuilder);
  wohnungBuilder.single = jest.fn(async () => wohnungResult);
  const mieterBuilder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'order']) {
    mieterBuilder[method] = jest.fn(() => mieterBuilder);
  }
  mieterBuilder.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve);
  const from = jest.fn((table: string) => (table === 'Wohnungen' ? wohnungBuilder : mieterBuilder));
  (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from });
  return { from };
}

function mockWohnungenAnsehen(result: 'allowed' | 'denied' | 'error') {
  (checkPermission as jest.Mock).mockImplementation(async (modul: string) => (modul === 'wohnungen' ? result : 'allowed'));
}

const call = () =>
  GET(new Request(`http://localhost/api/wohnungen/${wohnungId}/overview`), { params: Promise.resolve({ id: wohnungId }) });

describe('GET /api/wohnungen/[id]/overview: wohnungen:ansehen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation();
  });

  it('liefert mit wohnungen:ansehen die Uebersicht wie bisher', async () => {
    mockWohnungenAnsehen('allowed');
    setup();

    const res = await call();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(checkPermission).toHaveBeenCalledWith('wohnungen', 'ansehen');
    expect(body).toEqual(expect.objectContaining({ id: wohnungId, name: 'Wohnung 1', hausName: 'Musterhaus' }));
  });

  it('antwortet ohne wohnungen:ansehen mit 403 PERMISSION_DENIED und liefert keine Wohnungsdaten', async () => {
    mockWohnungenAnsehen('denied');
    const { from } = setup();

    const res = await call();
    const text = await res.text();

    expect(res.status).toBe(403);
    expect(JSON.parse(text)).toEqual({ error: 'Permission denied', code: 'PERMISSION_DENIED' });
    expect(text).not.toContain('Wohnung 1');
    expect(from).not.toHaveBeenCalledWith('Mieter');
  });

  it('antwortet ohne wohnungen:ansehen auch bei unbekannter Wohnung mit 403 statt 404 (kein Existenz-Hinweis)', async () => {
    mockWohnungenAnsehen('denied');
    setup({ data: null, error: { code: 'PGRST116', message: 'No rows returned' } });

    const res = await call();

    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('PERMISSION_DENIED');
  });

  it('antwortet 503 PERMISSION_CHECK_FAILED, wenn die Pruefung von wohnungen:ansehen fehlschlaegt', async () => {
    mockWohnungenAnsehen('error');
    const { from } = setup();

    const res = await call();

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'Permission check failed', code: 'PERMISSION_CHECK_FAILED' });
    expect(from).not.toHaveBeenCalledWith('Mieter');
  });
});
