/**
 * @jest-environment node
 */
import { GET } from './route';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { checkPermission } from '@/lib/permissions';

/**
 * GET /api/haeuser/[id]/overview braucht haeuser:ansehen (Modulrecht der Route).
 * Alle Daten sind synthetisch.
 */

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

const hausId = '550e8400-e29b-41d4-a716-446655440000';

function setup() {
  const builder: Record<string, jest.Mock> = {};
  builder.select = jest.fn(() => builder);
  builder.eq = jest.fn(() => builder);
  builder.single = jest.fn(async () => ({
    data: {
      id: hausId, name: 'Musterhaus', strasse: 'Beispielweg 1', plz: 12345, ort: 'Beispielstadt', groesse: 200,
      Wohnungen: [{ id: 'w1', name: 'Wohnung 1', groesse: 50, miete: 500, Mieter: [] }],
    },
    error: null,
  }));
  const from = jest.fn(() => builder);
  (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from });
  return { from, builder };
}

function mockHaeuserAnsehen(result: 'allowed' | 'denied' | 'error') {
  (checkPermission as jest.Mock).mockImplementation(async (modul: string) => (modul === 'haeuser' ? result : 'allowed'));
}

const call = () =>
  GET(new Request(`http://localhost/api/haeuser/${hausId}/overview`), { params: Promise.resolve({ id: hausId }) });

describe('GET /api/haeuser/[id]/overview: haeuser:ansehen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation();
  });

  it('liefert mit haeuser:ansehen die Hausuebersicht wie bisher', async () => {
    mockHaeuserAnsehen('allowed');
    setup();

    const res = await call();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(checkPermission).toHaveBeenCalledWith('haeuser', 'ansehen');
    expect(body).toEqual(expect.objectContaining({ id: hausId, name: 'Musterhaus', apartmentCount: 1 }));
  });

  it('antwortet ohne haeuser:ansehen mit 403 PERMISSION_DENIED und liest keine Hausdaten', async () => {
    mockHaeuserAnsehen('denied');
    const { from } = setup();

    const res = await call();
    const text = await res.text();

    expect(res.status).toBe(403);
    expect(JSON.parse(text)).toEqual({ error: 'Permission denied', code: 'PERMISSION_DENIED' });
    expect(text).not.toContain('Musterhaus');
    expect(from).not.toHaveBeenCalled();
  });

  it('antwortet 503 PERMISSION_CHECK_FAILED, wenn die Pruefung von haeuser:ansehen fehlschlaegt', async () => {
    mockHaeuserAnsehen('error');
    const { from } = setup();

    const res = await call();

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'Permission check failed', code: 'PERMISSION_CHECK_FAILED' });
    expect(from).not.toHaveBeenCalled();
  });
});
