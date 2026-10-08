import { POST } from '@/app/api/haeuser/bulk-delete/route';
import { requireApiPermission } from '@/lib/api-permissions';
import { getAccessibleHaeuserIds } from '@/lib/object-scope';
import { softDeleteEntryAction } from '@/lib/papierkorb/utils';
import { createDeleteError } from '@/lib/bulk-delete-summary';

jest.mock('@/lib/api-permissions', () => ({
  requireApiPermission: jest.fn(),
}));

jest.mock('@/lib/object-scope', () => ({
  getAccessibleHaeuserIds: jest.fn(),
}));

jest.mock('@/lib/papierkorb/utils', () => ({
  softDeleteEntryAction: jest.fn(),
}));

// GH-6 (Kautionsmanagement): Die Kaskade wirft die Löschsperre der Datenbank mit SQLSTATE KA009. Rohmeldung der
// Datenbank mit technischem Präfix: Nutzer dürfen nur den deutschen Text sehen.
const KAUTION_TEXT = 'Der Mieter hat eine hinterlegte Kaution und kann nicht gelöscht werden. Das Haus wurde nicht gelöscht.';
const kautionSperre = () => createDeleteError(`KAUT_GESPERRT: ${KAUTION_TEXT}`, 'KA009');

describe('POST /api/haeuser/bulk-delete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if ids is not an array or empty', async () => {
    const request = {
      json: jest.fn().mockResolvedValue({}),
    } as unknown as Request;

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Mindestens eine Haus-ID ist erforderlich.');
  });

  it('should return 403 if permission check fails', async () => {
    (requireApiPermission as jest.Mock).mockRejectedValue(new Error('Permission denied'));

    const request = {
      json: jest.fn().mockResolvedValue({ ids: ['id-1'] }),
    } as unknown as Request;

    const response = await POST(request);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('Permission denied');
  });

  it('should return 403 if getAccessibleHaeuserIds denies scope', async () => {
    (requireApiPermission as jest.Mock).mockResolvedValue(undefined);
    (getAccessibleHaeuserIds as jest.Mock).mockResolvedValue(['accessible-id-1']);

    const request = {
      json: jest.fn().mockResolvedValue({ ids: ['inaccessible-id'] }),
    } as unknown as Request;

    const response = await POST(request);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('Permission denied');
  });

  it('should call softDeleteEntryAction for each ID and return success', async () => {
    (requireApiPermission as jest.Mock).mockResolvedValue(undefined);
    (getAccessibleHaeuserIds as jest.Mock).mockResolvedValue(null); // unrestricted
    (softDeleteEntryAction as jest.Mock).mockResolvedValue(undefined);

    const request = {
      json: jest.fn().mockResolvedValue({ ids: ['id-1', 'id-2'] }),
    } as unknown as Request;

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.successCount).toBe(2);

    expect(softDeleteEntryAction).toHaveBeenCalledTimes(2);
    expect(softDeleteEntryAction).toHaveBeenNthCalledWith(1, 'Haeuser', 'id-1', { pruefsumme: undefined });
    expect(softDeleteEntryAction).toHaveBeenNthCalledWith(2, 'Haeuser', 'id-2', { pruefsumme: undefined });
  });

  it('should return 500 if softDeleteEntryAction fails', async () => {
    (requireApiPermission as jest.Mock).mockResolvedValue(undefined);
    (getAccessibleHaeuserIds as jest.Mock).mockResolvedValue(null);
    (softDeleteEntryAction as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = {
      json: jest.fn().mockResolvedValue({ ids: ['id-1'] }),
    } as unknown as Request;

    const response = await POST(request);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Database error');
  });
  describe('abgelehnte Löschungen (Löschsperre bei hinterlegter Kaution)', () => {
    beforeEach(() => {
      (requireApiPermission as jest.Mock).mockResolvedValue(undefined);
      (getAccessibleHaeuserIds as jest.Mock).mockResolvedValue(null);
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('meldet einen Teilerfolg mit 200, den Zahlen und dem Grund ohne Präfix (alle Häuser werden abgearbeitet)', async () => {
      (softDeleteEntryAction as jest.Mock).mockImplementation(async (_table: string, id: string) => {
        if (id === 'id-2') throw kautionSperre();
      });

      const request = { json: jest.fn().mockResolvedValue({ ids: ['id-1', 'id-2', 'id-3'] }) } as unknown as Request;
      const response = await POST(request);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ successCount: 2, errorCount: 1, reasons: [KAUTION_TEXT] });
      expect(JSON.stringify(body)).not.toContain('KAUT_GESPERRT');
      expect(softDeleteEntryAction).toHaveBeenCalledTimes(3);
    });

    it('antwortet mit 409 statt 500, wenn alle Häuser von der Löschsperre abgelehnt werden', async () => {
      (softDeleteEntryAction as jest.Mock).mockRejectedValue(kautionSperre());

      const request = { json: jest.fn().mockResolvedValue({ ids: ['id-1'] }) } as unknown as Request;
      const response = await POST(request);

      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body.error).toBe(KAUTION_TEXT);
      expect(body.error).not.toContain('KAUT_GESPERRT');
      expect(body.successCount).toBe(0);
    });

    it('entfernt ein Präfix auch dann, wenn die Meldung roh geworfen wird', async () => {
      (softDeleteEntryAction as jest.Mock).mockRejectedValue(new Error(`KAUT_GESPERRT: ${KAUTION_TEXT}`));

      const request = { json: jest.fn().mockResolvedValue({ ids: ['id-1'] }) } as unknown as Request;
      const response = await POST(request);

      // Ohne SQLSTATE ist es keine erkannte Löschsperre (500), der Text bleibt aber ohne Präfix.
      expect(response.status).toBe(500);
      expect((await response.json()).error).toBe(KAUTION_TEXT);
    });
  });
});
