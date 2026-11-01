/**
 * @jest-environment node
 */
import { GET } from './route';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { checkPermission } from '@/lib/permissions';

/**
 * GET /api/apartments/[apartmentId]/details: der aktuelle Mieter (Name, Kontakt, Ein-/Auszug) nur mit mieter:ansehen.
 * Alle Daten sind synthetisch.
 */

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

const apartmentId = '550e8400-e29b-41d4-a716-446655440000';

function createBuilder(result: { data: unknown; error: null }) {
  const builder: Record<string, jest.Mock> = {};
  for (const method of ['select', 'eq', 'or', 'order', 'limit']) {
    builder[method] = jest.fn(() => builder);
  }
  builder.single = jest.fn(async () => result);
  builder.maybeSingle = jest.fn(async () => result);
  return builder;
}

function setup() {
  const apartmentBuilder = createBuilder({
    data: { id: apartmentId, name: 'Wohnung 1A', groesse: 80, miete: 1200, haus_id: null, Haeuser: { name: 'Musterhaus' } },
    error: null,
  });
  const mieterBuilder = createBuilder({
    data: {
      id: 'm1', name: 'Erika Beispiel', email: 'erika@example.invalid', telefonnummer: '000',
      einzug: '2023-01-01', auszug: null, notiz: 'Beispielnotiz',
    },
    error: null,
  });
  const from = jest.fn((table: string) => (table === 'Wohnungen' ? apartmentBuilder : mieterBuilder));
  (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from });
  return { from, mieterBuilder };
}

function mockMieterAnsehen(result: 'allowed' | 'denied' | 'error') {
  (checkPermission as jest.Mock).mockImplementation(async (modul: string) => (modul === 'mieter' ? result : 'allowed'));
}

const call = () =>
  GET(new Request(`http://localhost/api/apartments/${apartmentId}/details`), { params: Promise.resolve({ apartmentId }) });

describe('GET /api/apartments/[apartmentId]/details: mieter:ansehen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation();
  });

  it('liefert mit mieter:ansehen den aktuellen Mieter wie bisher', async () => {
    mockMieterAnsehen('allowed');
    setup();

    const res = await call();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(checkPermission).toHaveBeenCalledWith('mieter', 'ansehen');
    expect(body.tenant).toEqual(expect.objectContaining({ id: 'm1', name: 'Erika Beispiel', einzug: '2023-01-01' }));
    expect(body).not.toHaveProperty('tenantAccess');
  });

  it('liefert ohne mieter:ansehen keinen Mieter, fragt die Mieter-Tabelle nicht ab und markiert tenantAccess:false', async () => {
    mockMieterAnsehen('denied');
    const { from, mieterBuilder } = setup();

    const res = await call();
    const body = await res.json();
    const text = JSON.stringify(body);

    expect(res.status).toBe(200);
    expect(from).not.toHaveBeenCalledWith('Mieter');
    expect(mieterBuilder.select).not.toHaveBeenCalled();
    expect(body.apartment).toEqual(expect.objectContaining({ id: apartmentId, name: 'Wohnung 1A', hausName: 'Musterhaus' }));
    expect(body).not.toHaveProperty('tenant');
    expect(body.tenantAccess).toBe(false);
    for (const forbidden of ['Erika Beispiel', 'example.invalid', 'Beispielnotiz', '2023-01-01']) {
      expect(text).not.toContain(forbidden);
    }
  });

  it('antwortet 503 PERMISSION_CHECK_FAILED, wenn die Pruefung von mieter:ansehen fehlschlaegt (statt Wohnung ohne Mieter)', async () => {
    mockMieterAnsehen('error');
    const { from } = setup();

    const res = await call();

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'Permission check failed', code: 'PERMISSION_CHECK_FAILED' });
    expect(from).not.toHaveBeenCalledWith('Mieter');
  });
});
