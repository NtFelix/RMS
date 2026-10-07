/**
 * @jest-environment node
 */
import { POST } from './route';
import { requireApiPermission } from '@/lib/api-permissions';
import { getAccessibleWohnungIds } from '@/lib/object-scope';
import { createSupabaseServerClient } from '@/lib/supabase-server';

/**
 * POST /api/mieter/bulk-delete (GH-6, Kautionsmanagement): Die Datenbank kann einzelne Löschungen ablehnen
 * (Löschsperre bei hinterlegter Kaution, SQLSTATE KA009). Die Route wartet alle Löschungen ab, meldet Teilerfolge
 * mit den Gründen (ohne technisches Präfix) und antwortet nur ohne jeden Erfolg mit 409 bzw. 500.
 *
 * Alle Kennungen und Meldungen sind fiktiv.
 */

jest.mock('@/lib/api-permissions', () => ({
  requireApiPermission: jest.fn(),
}));

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

/** So liefert PostgREST die Löschsperre aus: stabiles Präfix, deutscher Text, SQLSTATE KA009. */
const KAUTION_SPERRE_ROH = {
  message: 'KAUT_GESPERRT: Der Mieter hat eine hinterlegte Kaution und kann nicht gelöscht werden.',
  code: 'KA009',
};
const KAUTION_SPERRE_TEXT = 'Der Mieter hat eine hinterlegte Kaution und kann nicht gelöscht werden.';

type RpcError = { message: string; code?: string };

function jsonRequest(body: unknown): Request {
  const req = new Request('http://localhost/api/mieter/bulk-delete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  (req as { json: () => Promise<unknown> }).json = async () => body;
  return req;
}

/** Supabase-Client: `from('Mieter').select().in()` liefert die Wohnungen, `rpc` löscht (Fehler je Mieter-ID). */
function mockClient(options: { wohnungIds?: (string | null)[]; rpcErrors?: Record<string, RpcError> } = {}) {
  const { wohnungIds = [null], rpcErrors = {} } = options;
  const result = { data: wohnungIds.map((wohnung_id) => ({ wohnung_id })), error: null };
  const builder: Record<string, unknown> = {};
  builder.select = jest.fn(() => builder);
  builder.in = jest.fn(() => builder);
  builder.then = (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve);

  const rpc = jest.fn(async (_name: string, args: { p_record_id: string }) => ({
    data: null,
    error: rpcErrors[args.p_record_id] ?? null,
  }));
  (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from: jest.fn(() => builder), rpc });
  return { rpc };
}

describe('POST /api/mieter/bulk-delete', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (requireApiPermission as jest.Mock).mockResolvedValue(undefined);
    (getAccessibleWohnungIds as jest.Mock).mockResolvedValue(null);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('löscht mit Prüfsumme über soft_delete_mit_kautionen, die übrigen IDs über soft_delete_record', async () => {
    const { rpc } = mockClient({ wohnungIds: [null, null] });
    const pruefsumme = '0123456789abcdef0123456789abcdef';

    const response = await POST(jsonRequest({ ids: ['m1', 'm2'], pruefsummen: { m1: pruefsumme, m2: 'ungueltig' } }));

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('soft_delete_mit_kautionen', { p_table_name: 'Mieter', p_record_id: 'm1', p_pruefsumme: pruefsumme });
    // Eine ungültige Prüfsumme wird ignoriert: Standardweg mit Löschsperre.
    expect(rpc).toHaveBeenCalledWith('soft_delete_record', { p_table_name: 'Mieter', p_record_id: 'm2' });
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it('meldet eine veraltete Prüfsumme (KA016) als Grund der abgelehnten Löschung', async () => {
    const pruefsumme = '0123456789abcdef0123456789abcdef';
    mockClient({
      rpcErrors: { m1: { message: 'KAUT_BESTAETIGUNG: Die Auswirkung hat sich inzwischen geändert.', code: 'KA016' } },
    });

    const response = await POST(jsonRequest({ ids: ['m1'], pruefsummen: { m1: pruefsumme } }));
    const body = await response.json();

    // Eine nicht bestätigte bzw. veraltete Auswirkung ist eine fachliche Ablehnung (409), kein Serverfehler
    expect(response.status).toBe(409);
    expect(body.reasons ?? [body.error]).toEqual(expect.arrayContaining([expect.stringContaining('Die Auswirkung hat sich inzwischen geändert.')]));
  });

  it('lehnt eine Anfrage ohne IDs ab (400)', async () => {
    const { rpc } = mockClient();

    const response = await POST(jsonRequest({ ids: [] }));

    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('antwortet mit 403 ohne Recht und löscht nichts', async () => {
    const { rpc } = mockClient();
    (requireApiPermission as jest.Mock).mockRejectedValue(new Error('Permission denied'));

    const response = await POST(jsonRequest({ ids: ['m1'] }));

    expect(response.status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('antwortet mit 403 und löscht nichts, wenn ein Mieter außerhalb des Objektzugriffs liegt', async () => {
    const { rpc } = mockClient({ wohnungIds: ['wohnung-fremd'] });
    (getAccessibleWohnungIds as jest.Mock).mockResolvedValue(['wohnung-erlaubt']);

    const response = await POST(jsonRequest({ ids: ['m1'] }));

    expect(response.status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('löscht alle Mieter einzeln über soft_delete_record und meldet die Anzahl', async () => {
    const { rpc } = mockClient();

    const response = await POST(jsonRequest({ ids: ['m1', 'm2'] }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ successCount: 2, errorCount: 0, reasons: [] });
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenCalledWith('soft_delete_record', { p_table_name: 'Mieter', p_record_id: 'm1' });
    expect(rpc).toHaveBeenCalledWith('soft_delete_record', { p_table_name: 'Mieter', p_record_id: 'm2' });
  });

  it('meldet einen Teilerfolg mit 200, der Zahl der Erfolge und dem Grund ohne technisches Präfix', async () => {
    // m2 hat eine Kaution: m1 und m3 sind trotzdem gelöscht, die Route darf nicht beim ersten Fehler abbrechen.
    const { rpc } = mockClient({ rpcErrors: { m2: KAUTION_SPERRE_ROH } });

    const response = await POST(jsonRequest({ ids: ['m1', 'm2', 'm3'] }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ successCount: 2, errorCount: 1, reasons: [KAUTION_SPERRE_TEXT] });
    expect(JSON.stringify(body)).not.toContain('KAUT_GESPERRT');
    expect(rpc).toHaveBeenCalledTimes(3);
  });

  it('antwortet mit 409 und dem Grund ohne Präfix, wenn alle Löschungen von der Löschsperre abgelehnt werden', async () => {
    mockClient({ rpcErrors: { m1: KAUTION_SPERRE_ROH, m2: KAUTION_SPERRE_ROH } });

    const response = await POST(jsonRequest({ ids: ['m1', 'm2'] }));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      successCount: 0,
      errorCount: 2,
      reasons: [KAUTION_SPERRE_TEXT],
      error: KAUTION_SPERRE_TEXT,
    });
  });

  it('antwortet mit 500, wenn keine Löschung gelingt und die Fehler technisch sind', async () => {
    mockClient({ rpcErrors: { m1: { message: 'connection reset', code: '08006' } } });

    const response = await POST(jsonRequest({ ids: ['m1'] }));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.successCount).toBe(0);
    expect(body.error).toBe('connection reset');
  });

  it('meldet auch bei gemischten Gründen jeden Grund einmal und ohne Präfix', async () => {
    mockClient({
      rpcErrors: {
        m1: KAUTION_SPERRE_ROH,
        m2: KAUTION_SPERRE_ROH,
        m3: { message: 'Permission denied: record is outside your object scope' },
      },
    });

    const response = await POST(jsonRequest({ ids: ['m1', 'm2', 'm3', 'm4'] }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      successCount: 1,
      errorCount: 3,
      reasons: [KAUTION_SPERRE_TEXT, 'Permission denied: record is outside your object scope'],
    });
  });
});
