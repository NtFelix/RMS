/**
 * @jest-environment node
 */
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { isOrgAdminOrOwner } from '@/lib/permissions';
import { permanentlyDeleteEntryAction, restoreEntryAction } from './actions';

/**
 * Papierkorb (GH-6, Kautionsmanagement): Die Datenbank sperrt das Wiederherstellen und das endgültige Löschen in
 * bestimmten Fällen (z. B. Kaution, solange der Mieter gelöscht ist; Mieter mit Kaution) mit
 * "<CODE>: <deutsche Meldung>". Die Aktionen geben nur die Meldung ohne technisches Präfix weiter.
 * Alle Kennungen und Meldungen sind fiktiv.
 */

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

jest.mock('@/lib/permissions', () => ({
  isOrgAdminOrOwner: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

const SPERRE_TEXT = 'Die Kaution kann nicht wiederhergestellt werden, solange der Mieter gelöscht ist.';

function mockRpcError(error: { message: string; code?: string } | null) {
  const rpc = jest.fn().mockResolvedValue({ data: null, error });
  (createSupabaseServerClient as jest.Mock).mockResolvedValue({ rpc });
  return rpc;
}

describe('Papierkorb-Aktionen: Meldungen der Datenbank', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    (isOrgAdminOrOwner as jest.Mock).mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('restoreEntryAction wirft die Sperrmeldung ohne technisches Präfix und behält den SQLSTATE', async () => {
    mockRpcError({ message: `KAUT_GESPERRT: ${SPERRE_TEXT}`, code: 'KA009' });

    const error = await restoreEntryAction('Kautionen', 'k-1').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(SPERRE_TEXT);
    expect((error as Error & { code?: string }).code).toBe('KA009');
  });

  it('permanentlyDeleteEntryAction wirft die Sperrmeldung ohne technisches Präfix', async () => {
    mockRpcError({ message: 'KAUT_GESPERRT: Der Mieter hat eine hinterlegte Kaution.', code: 'KA009' });

    await expect(permanentlyDeleteEntryAction('Mieter', 'm-1')).rejects.toThrow(/^Der Mieter hat eine hinterlegte Kaution\.$/);
  });

  it('lässt Meldungen ohne Präfix unverändert', async () => {
    mockRpcError({ message: 'Record not found' });

    await expect(restoreEntryAction('Mieter', 'm-1')).rejects.toThrow(/^Record not found$/);
  });

  it('ruft die Datenbank ohne Admin-Recht nicht auf', async () => {
    (isOrgAdminOrOwner as jest.Mock).mockResolvedValue(false);
    const rpc = mockRpcError(null);

    await expect(restoreEntryAction('Kautionen', 'k-1')).rejects.toThrow('Zugriff verweigert.');
    await expect(permanentlyDeleteEntryAction('Kautionen', 'k-1')).rejects.toThrow('Zugriff verweigert.');
    expect(rpc).not.toHaveBeenCalled();
  });
});
