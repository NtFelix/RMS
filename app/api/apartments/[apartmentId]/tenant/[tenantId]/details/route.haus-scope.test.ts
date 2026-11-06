/**
 * @jest-environment node
 */
import { GET } from './route';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getAccessibleHaeuserIds } from '@/lib/object-scope';

/**
 * GET /api/apartments/[apartmentId]/tenant/[tenantId]/details: die Wohnung muss in einem Haus liegen, auf das der
 * Nutzer per Objekt-Scope zugreifen darf. Alle Daten sind synthetisch.
 */

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

const apartmentId = '550e8400-e29b-41d4-a716-446655440000';
const tenantId = '660e8400-e29b-41d4-a716-446655440000';
const hausId = '770e8400-e29b-41d4-a716-446655440000';
const otherHausId = '880e8400-e29b-41d4-a716-446655440000';

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
    id: apartmentId, name: 'Wohnung 1A', groesse: 80, miete: 1200, haus_id: hausId,
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

const call = () =>
  GET(new Request(`http://localhost/api/apartments/${apartmentId}/tenant/${tenantId}/details`), {
    params: Promise.resolve({ apartmentId, tenantId }),
  });

describe('GET /api/apartments/[apartmentId]/tenant/[tenantId]/details: Haus-Scope', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation();
    (getAccessibleHaeuserIds as jest.Mock).mockResolvedValue(null);
  });

  it('liefert die Mieterdetails ohne Scope-Einschraenkung (alle Haeuser)', async () => {
    setup();

    const res = await call();

    expect(res.status).toBe(200);
    expect((await res.json()).tenant).toEqual(expect.objectContaining({ id: tenantId, name: 'Erika Beispiel' }));
  });

  it('liefert die Mieterdetails, wenn das Haus der Wohnung im Scope liegt', async () => {
    (getAccessibleHaeuserIds as jest.Mock).mockResolvedValue([hausId]);
    setup();

    const res = await call();

    expect(res.status).toBe(200);
  });

  it('antwortet mit 403 und liest keinen Mieter, wenn das Haus der Wohnung ausserhalb des Scopes liegt', async () => {
    (getAccessibleHaeuserIds as jest.Mock).mockResolvedValue([otherHausId]);
    const { from, tenant } = setup();

    const res = await call();
    const text = await res.text();

    expect(res.status).toBe(403);
    expect(JSON.parse(text)).toEqual({ error: 'Permission denied' });
    expect(text).not.toContain('Erika Beispiel');
    expect(from).not.toHaveBeenCalledWith('Mieter');
    expect(tenant.select).not.toHaveBeenCalled();
  });

  it('antwortet mit 403, wenn der Scope leer ist (kein Haus zugreifbar)', async () => {
    (getAccessibleHaeuserIds as jest.Mock).mockResolvedValue([]);
    const { from } = setup();

    const res = await call();

    expect(res.status).toBe(403);
    expect(from).not.toHaveBeenCalledWith('Mieter');
  });
});
