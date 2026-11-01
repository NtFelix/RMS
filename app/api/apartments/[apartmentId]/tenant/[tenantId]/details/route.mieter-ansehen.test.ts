/**
 * @jest-environment node
 */
import { GET } from './route';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { checkPermission } from '@/lib/permissions';

/**
 * GET /api/apartments/[apartmentId]/tenant/[tenantId]/details liefert einen Mieter und braucht daher mieter:ansehen.
 * Alle Daten sind synthetisch.
 */

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

const apartmentId = '550e8400-e29b-41d4-a716-446655440000';
const tenantId = '660e8400-e29b-41d4-a716-446655440000';

function createBuilder(data: unknown) {
  const builder: Record<string, jest.Mock> = {};
  for (const method of ['select', 'eq']) {
    builder[method] = jest.fn(() => builder);
  }
  builder.single = jest.fn(async () => ({ data, error: null }));
  return builder;
}

function setup() {
  const apartment = createBuilder({
    id: apartmentId, name: 'Wohnung 1A', groesse: 80, miete: 1200, haus_id: null,
    Haeuser: { name: 'Musterhaus', strasse: 'Beispielweg 1', plz: 12345, ort: 'Beispielstadt' },
  });
  const tenant = createBuilder({
    id: tenantId, name: 'Erika Beispiel', email: 'erika@example.invalid', telefonnummer: '000',
    einzug: '2023-01-01', auszug: null, notiz: null,
  });
  const from = jest.fn((table: string) => (table === 'Wohnungen' ? apartment : tenant));
  (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from });
  return { from, tenant };
}

function mockMieterAnsehen(result: 'allowed' | 'denied' | 'error') {
  (checkPermission as jest.Mock).mockImplementation(async (modul: string) => (modul === 'mieter' ? result : 'allowed'));
}

const call = () =>
  GET(new Request(`http://localhost/api/apartments/${apartmentId}/tenant/${tenantId}/details`), {
    params: Promise.resolve({ apartmentId, tenantId }),
  });

describe('GET /api/apartments/[apartmentId]/tenant/[tenantId]/details: mieter:ansehen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation();
  });

  it('liefert mit mieter:ansehen die Mieterdetails', async () => {
    mockMieterAnsehen('allowed');
    setup();

    const res = await call();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(checkPermission).toHaveBeenCalledWith('mieter', 'ansehen');
    expect(body.tenant).toEqual(expect.objectContaining({ id: tenantId, name: 'Erika Beispiel' }));
  });

  it('antwortet ohne mieter:ansehen mit 403 PERMISSION_DENIED und liefert keinen Mieter', async () => {
    mockMieterAnsehen('denied');
    const { from, tenant } = setup();

    const res = await call();
    const text = await res.text();

    expect(res.status).toBe(403);
    expect(JSON.parse(text)).toEqual({ error: 'Permission denied', code: 'PERMISSION_DENIED' });
    expect(text).not.toContain('Erika Beispiel');
    expect(from).not.toHaveBeenCalledWith('Mieter');
    expect(tenant.select).not.toHaveBeenCalled();
  });

  it('antwortet 503 PERMISSION_CHECK_FAILED, wenn die Pruefung von mieter:ansehen fehlschlaegt', async () => {
    mockMieterAnsehen('error');
    const { from } = setup();

    const res = await call();

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'Permission check failed', code: 'PERMISSION_CHECK_FAILED' });
    expect(from).not.toHaveBeenCalledWith('Mieter');
  });
});
