/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST } from './route';
import { POST as GENEHMIGEN } from './[id]/genehmigen/route';

/**
 * R2: Das Modul "kautionen" darf API-Schlüsseln nie zugewiesen werden. Die Oberfläche führt das Modul nicht in
 * ihrer Auswahl, die Routen validierten Modulschlüssel bisher aber nicht. Diese Tests sichern die serverseitige
 * Ablehnung ab (Anfrage und Genehmigung), bevor ein RPC aufgerufen oder ein Schlüssel erzeugt wird.
 */

const mockRpc = jest.fn();
const mockGetUser = jest.fn();

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(() =>
    Promise.resolve({ auth: { getUser: mockGetUser }, rpc: mockRpc })
  ),
}));

const mockGenerateApiKeySecret = jest.fn(() => ({
  plaintext: 'fake-plaintext-for-test',
  key_hash: 'fake-hash',
  key_prefix: 'fake-prefix',
}));

jest.mock('@/lib/api-keys', () => ({
  generateApiKeySecret: (...args: unknown[]) => (mockGenerateApiKeySecret as (...a: unknown[]) => unknown)(...args),
}));

function createRequest(url: string, body: unknown): NextRequest {
  const req = new NextRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  req.json = async () => body;
  return req;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
});

describe('POST /api/einstellungen/api-keys (Schlüssel beantragen)', () => {
  const url = 'http://localhost/api/einstellungen/api-keys';

  it('lehnt eine Anfrage mit dem Modul "kautionen" ab (400), ohne den RPC aufzurufen', async () => {
    const res = await POST(
      createRequest(url, {
        name: 'Test-Schlüssel',
        angefragte_berechtigungen: { module: { mieter: { ansehen: true }, kautionen: { ansehen: true } }, haeuser: null },
      })
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Kautionen');
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('lehnt das Modul auch mit Aktionsliste (Array) und bei abweichender Schreibweise ab', async () => {
    const res = await POST(
      createRequest(url, {
        name: 'Test-Schlüssel',
        angefragte_berechtigungen: { module: { KAUTIONEN: ['ansehen'] } },
      })
    );

    expect(res.status).toBe(400);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('beantragt einen Schlüssel ohne "kautionen" unverändert weiterhin', async () => {
    mockRpc.mockResolvedValueOnce({ data: 'key-1', error: null });
    const angefragte = { module: { mieter: { ansehen: true } }, haeuser: null };

    const res = await POST(createRequest(url, { name: 'Test-Schlüssel', angefragte_berechtigungen: angefragte }));

    expect(res.status).toBe(201);
    expect(mockRpc).toHaveBeenCalledWith(
      'api_key_anfragen',
      expect.objectContaining({ p_name: 'Test-Schlüssel', p_angefragte_berechtigungen: angefragte })
    );
  });

  it('beantragt einen Schlüssel ohne Berechtigungsangabe weiterhin', async () => {
    mockRpc.mockResolvedValueOnce({ data: 'key-2', error: null });

    const res = await POST(createRequest(url, { name: 'Test-Schlüssel' }));

    expect(res.status).toBe(201);
    expect(mockRpc).toHaveBeenCalledWith(
      'api_key_anfragen',
      expect.objectContaining({ p_angefragte_berechtigungen: null })
    );
  });
});

describe('POST /api/einstellungen/api-keys/[id]/genehmigen (Schlüssel genehmigen)', () => {
  const url = 'http://localhost/api/einstellungen/api-keys/key-1/genehmigen';
  const params = Promise.resolve({ id: 'key-1' });

  it('lehnt eine Genehmigung mit dem Modul "kautionen" ab (400), ohne Schlüssel zu erzeugen oder den RPC aufzurufen', async () => {
    const res = await GENEHMIGEN(
      createRequest(url, {
        berechtigungen: { module: { mieter: { ansehen: true }, kautionen: { ansehen: true, erstellen: true } }, haeuser: null },
        environment: 'live',
      }),
      { params }
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Kautionen');
    expect(mockGenerateApiKeySecret).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('genehmigt einen Schlüssel ohne "kautionen" weiterhin und gibt den Klartext einmalig zurück', async () => {
    mockRpc.mockResolvedValueOnce({ data: { id: 'key-1', status: 'aktiv' }, error: null });
    const berechtigungen = { module: { mieter: { ansehen: true } }, haeuser: null };

    const res = await GENEHMIGEN(createRequest(url, { berechtigungen, environment: 'live' }), { params });

    expect(res.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith(
      'api_key_genehmigen',
      expect.objectContaining({ p_key_id: 'key-1', p_berechtigungen: berechtigungen })
    );
    const json = await res.json();
    expect(json.plaintext).toBe('fake-plaintext-for-test');
  });
});
