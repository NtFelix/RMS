/**
 * @jest-environment node
 */

/**
 * POST /api/finance-files/upload schreibt unter Rechnungen/. Die Storage- und Metadaten-Policies verlangen dort
 * finanzen:ansehen zusätzlich zum Schreibrecht (erstellen), deshalb prüft die Route beide Rechte vor jeder Abfrage.
 * Schlägt das Aufräumen einer verwaisten Datei fehl, wird das Ergebnis von remove() protokolliert statt verschluckt.
 * Alle Daten sind synthetische Platzhalter.
 */

import type { NextRequest } from 'next/server';
import { POST } from '@/app/api/finance-files/upload/route';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getFinanceDocumentPath } from '@/app/finance-file-actions';
import { requireApiPermission } from '@/lib/api-permissions';
import { getAccessibleHaeuserIds } from '@/lib/object-scope';
import { logger } from '@/utils/logger';

jest.mock('@/lib/supabase-server', () => ({ createSupabaseServerClient: jest.fn() }));
jest.mock('@/app/finance-file-actions', () => ({ getFinanceDocumentPath: jest.fn() }));
jest.mock('@/lib/api-permissions', () => ({
  requireApiPermission: jest.fn(),
  verifyWohnungInScope: jest.fn().mockResolvedValue(true),
}));
jest.mock('@/lib/object-scope', () => ({ getAccessibleHaeuserIds: jest.fn() }));
jest.mock('@/utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

const ORG_ID = '00000000-0000-4000-8000-000000000001';
const HOUSE_ID = '00000000-0000-4000-8000-0000000000a1';
const PATH = `org_${ORG_ID}/shared/${HOUSE_ID}/Rechnungen`;

const mockRequire = requireApiPermission as jest.Mock;
const mockCreateClient = createSupabaseServerClient as jest.Mock;
const mockPath = getFinanceDocumentPath as jest.Mock;

const upload = jest.fn();
const remove = jest.fn();
const insertMetadata = jest.fn();

function request(): NextRequest {
  const form = new FormData();
  form.set('file', new File(['x'], 'beleg.pdf', { type: 'application/pdf' }));
  // The route only reads formData(); a plain object avoids the global NextRequest stub of the Jest setup
  return { formData: async () => form } as unknown as NextRequest;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRequire.mockResolvedValue(undefined);
  mockPath.mockResolvedValue({ success: true, path: PATH });
  (getAccessibleHaeuserIds as jest.Mock).mockResolvedValue(null);
  upload.mockResolvedValue({ error: null });
  remove.mockResolvedValue({ error: null });
  insertMetadata.mockReturnValue({ select: () => ({ single: async () => ({ data: null, error: { message: 'policy' } }) }) });
  mockCreateClient.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }) },
    rpc: async () => ({ data: ORG_ID, error: null }),
    storage: { from: () => ({ upload, remove }) },
    from: () => ({ insert: insertMetadata }),
  });
});

describe('POST /api/finance-files/upload: Rechte unter Rechnungen/', () => {
  it('verlangt finanzen:ansehen und finanzen:erstellen, bevor irgendetwas gelesen oder geschrieben wird', async () => {
    mockRequire.mockImplementation(async (modul: string, aktion: string) => {
      if (modul === 'finanzen' && aktion === 'ansehen') throw new Error('Permission denied');
    });

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(mockRequire).toHaveBeenCalledWith('finanzen', 'ansehen');
    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });

  it('prüft beide Rechte (ansehen und erstellen), wenn sie vorhanden sind', async () => {
    await POST(request());

    expect(mockRequire).toHaveBeenCalledWith('finanzen', 'ansehen');
    expect(mockRequire).toHaveBeenCalledWith('finanzen', 'erstellen');
  });

  it('protokolliert ein fehlgeschlagenes Aufräumen (remove() liefert einen Fehler, wirft aber nicht)', async () => {
    // The Supabase StorageError is an Error
    remove.mockResolvedValue({ error: new Error('new row violates row-level security policy') });

    const response = await POST(request());

    expect(response.status).toBe(500);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to cleanup orphaned file after metadata insert error',
      expect.any(Error),
      expect.objectContaining({ fullPath: expect.stringContaining(PATH) })
    );
  });

  it('protokolliert das Aufräumen nicht als Fehler, wenn es gelingt', async () => {
    await POST(request());

    expect(remove).toHaveBeenCalledTimes(1);
    expect(logger.error).not.toHaveBeenCalledWith(
      'Failed to cleanup orphaned file after metadata insert error',
      expect.anything(),
      expect.anything()
    );
  });
});
