/**
 * @jest-environment node
 */
import { POST } from './route';
import { requireApiPermission } from '@/lib/api-permissions';
import { getAccessibleHaeuserIds } from '@/lib/object-scope';
import { createDeleteError } from '@/lib/bulk-delete-summary';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { softDeleteEntryAction } from '@/lib/papierkorb/utils';

/**
 * POST /api/apartments/bulk-delete (GH-6, Kautionsmanagement): Die Kaskade Wohnung -> Mieter kann von der
 * Löschsperre der Datenbank (hinterlegte Kaution, SQLSTATE KA009) abgelehnt werden. Die Route wartet alle
 * Löschungen ab, meldet Teilerfolge mit den Gründen (ohne technisches Präfix) und antwortet nur ohne jeden Erfolg
 * mit 409 bzw. 500. Alle Kennungen und Meldungen sind fiktiv.
 */

jest.mock('@/lib/api-permissions', () => ({
  requireApiPermission: jest.fn(),
}));

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

jest.mock('@/lib/papierkorb/utils', () => ({
  softDeleteEntryAction: jest.fn(),
}));

const KAUTION_TEXT = 'Der Mieter hat eine hinterlegte Kaution und kann nicht gelöscht werden. Die Wohnung wurde nicht gelöscht.';
const kautionSperre = () => createDeleteError(`KAUT_GESPERRT: ${KAUTION_TEXT}`, 'KA009');

function jsonRequest(body: unknown): Request {
  return { json: jest.fn().mockResolvedValue(body) } as unknown as Request;
}

/** Supabase-Client für die Vorabprüfung: `from('Wohnungen').select('haus_id').in(...)`. */
function mockClient(hausIds: (string | null)[] = [null]) {
  const result = { data: hausIds.map((haus_id) => ({ haus_id })), error: null };
  const builder: Record<string, unknown> = {};
  builder.select = jest.fn(() => builder);
  builder.in = jest.fn(() => builder);
  builder.then = (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve);
  (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from: jest.fn(() => builder) });
}

describe('POST /api/apartments/bulk-delete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    (requireApiPermission as jest.Mock).mockResolvedValue(undefined);
    (getAccessibleHaeuserIds as jest.Mock).mockResolvedValue(null);
    mockClient();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('lehnt eine Anfrage ohne IDs ab (400)', async () => {
    const response = await POST(jsonRequest({ ids: [] }));

    expect(response.status).toBe(400);
    expect(softDeleteEntryAction).not.toHaveBeenCalled();
  });

  it('antwortet mit 403 und löscht nichts, wenn eine Wohnung außerhalb des Objektzugriffs liegt', async () => {
    mockClient(['haus-fremd']);
    (getAccessibleHaeuserIds as jest.Mock).mockResolvedValue(['haus-erlaubt']);

    const response = await POST(jsonRequest({ ids: ['w1'] }));

    expect(response.status).toBe(403);
    expect(softDeleteEntryAction).not.toHaveBeenCalled();
  });

  it('löscht jede Wohnung über softDeleteEntryAction und meldet die Anzahl', async () => {
    (softDeleteEntryAction as jest.Mock).mockResolvedValue(undefined);

    const response = await POST(jsonRequest({ ids: ['w1', 'w2'] }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ successCount: 2, errorCount: 0, reasons: [] });
    expect(softDeleteEntryAction).toHaveBeenNthCalledWith(1, 'Wohnungen', 'w1');
    expect(softDeleteEntryAction).toHaveBeenNthCalledWith(2, 'Wohnungen', 'w2');
  });

  it('meldet einen Teilerfolg mit 200, den Zahlen und dem Grund ohne Präfix (alle Wohnungen werden abgearbeitet)', async () => {
    (softDeleteEntryAction as jest.Mock).mockImplementation(async (_table: string, id: string) => {
      if (id === 'w2') throw kautionSperre();
    });

    const response = await POST(jsonRequest({ ids: ['w1', 'w2', 'w3'] }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ successCount: 2, errorCount: 1, reasons: [KAUTION_TEXT] });
    expect(JSON.stringify(body)).not.toContain('KAUT_GESPERRT');
    expect(softDeleteEntryAction).toHaveBeenCalledTimes(3);
  });

  it('antwortet mit 409 statt 500, wenn alle Wohnungen von der Löschsperre abgelehnt werden', async () => {
    (softDeleteEntryAction as jest.Mock).mockRejectedValue(kautionSperre());

    const response = await POST(jsonRequest({ ids: ['w1'] }));

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe(KAUTION_TEXT);
    expect(body.successCount).toBe(0);
  });

  it('antwortet mit 500 bei einem technischen Fehler ohne Erfolg', async () => {
    (softDeleteEntryAction as jest.Mock).mockRejectedValue(new Error('Database error'));

    const response = await POST(jsonRequest({ ids: ['w1'] }));

    expect(response.status).toBe(500);
    expect((await response.json()).error).toBe('Database error');
  });
});
