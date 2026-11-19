/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET } from './route';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { checkPermission } from '@/lib/permissions';

/**
 * GET /api/search: jede Kategorie braucht das ansehen-Recht ihres Moduls. Ohne das Recht wird die Kategorie
 * uebersprungen (leeres Ergebnis, keine Abfrage, kein Fehler). Alle Daten sind synthetisch.
 */

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

const ALL_CATEGORIES = 'tenant,house,apartment,finance,task';

/** Synthetische Zeile je Tabelle */
const tableRows: Record<string, unknown[]> = {
  Mieter: [{ id: 'm1', name: 'Erika Beispiel', email: null, telefonnummer: null, einzug: '2020-01-01', auszug: null, Wohnungen: [] }],
  Haeuser: [{ id: 'h1', name: 'Musterhaus', strasse: 'Beispielweg 1', plz: 12345, ort: 'Beispielstadt', Wohnungen: [] }],
  Wohnungen: [{ id: 'w1', name: 'Musterwohnung', groesse: 50, miete: 500, Haeuser: { name: 'Musterhaus' }, Mieter: [] }],
  Finanzen: [{ id: 'f1', name: 'Musterzahlung', betrag: 10, datum: '2024-01-01', ist_einnahmen: true, notiz: null, Wohnungen: null }],
  Aufgaben: [{ id: 'a1', name: 'Musteraufgabe', beschreibung: null, ist_erledigt: false, erstellungsdatum: '2024-01-01' }],
};

function setup() {
  let wohnungenCalls = 0;
  const from = jest.fn((table: string) => {
    // erste Wohnungs-Abfrage = Namenssuche; die Haus-Namenssuche (zweite) liefert nichts Neues
    if (table === 'Wohnungen') wohnungenCalls += 1;
    const rows = table === 'Wohnungen' && wohnungenCalls > 1 ? [] : (tableRows[table] ?? []);
    const builder: Record<string, unknown> = {};
    for (const method of ['select', 'or', 'order', 'limit', 'not', 'eq', 'in', 'ilike']) {
      builder[method] = jest.fn(() => builder);
    }
    builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve);
    return builder;
  });
  (createSupabaseServerClient as jest.Mock).mockResolvedValue({
    from,
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
  });
  return { from };
}

/** Rechte je Modul: Module in `denied` -> 'denied', in `failing` -> 'error', alle anderen 'allowed'. */
function mockAnsehen({ denied = [], failing = [] }: { denied?: string[]; failing?: string[] } = {}) {
  (checkPermission as jest.Mock).mockImplementation(async (modul: string) => {
    if (failing.includes(modul)) return 'error';
    return denied.includes(modul) ? 'denied' : 'allowed';
  });
}

const search = (categories = ALL_CATEGORIES) =>
  GET(new NextRequest(`http://localhost/api/search?q=Muster&categories=${categories}`));

const CATEGORY_CASES: Array<{ category: string; modul: string; table: string }> = [
  { category: 'tenant', modul: 'mieter', table: 'Mieter' },
  { category: 'house', modul: 'haeuser', table: 'Haeuser' },
  { category: 'apartment', modul: 'wohnungen', table: 'Wohnungen' },
  { category: 'finance', modul: 'finanzen', table: 'Finanzen' },
  { category: 'task', modul: 'aufgaben', table: 'Aufgaben' },
];

describe('GET /api/search: ansehen-Recht je Kategorie', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  it('liefert mit allen ansehen-Rechten alle Kategorien wie bisher', async () => {
    mockAnsehen();
    setup();

    const res = await search();
    const data = await res.json();

    expect(res.status).toBe(200);
    for (const { category } of CATEGORY_CASES) {
      expect(data.results[category]).toHaveLength(1);
    }
    expect(data.totalCount).toBe(5);
  });

  it.each(CATEGORY_CASES)(
    'ueberspringt $category ohne $modul:ansehen (leere Kategorie, keine Abfrage), die anderen bleiben unveraendert',
    async ({ category, modul, table }) => {
      mockAnsehen({ denied: [modul] });
      const { from } = setup();

      const res = await search();
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.results[category]).toEqual([]);
      expect(from).not.toHaveBeenCalledWith(table);
      for (const other of CATEGORY_CASES.filter(c => c.category !== category)) {
        expect(data.results[other.category]).toHaveLength(1);
      }
      expect(JSON.stringify(data)).not.toContain('PERMISSION');
    }
  );

  it('antwortet auch dann 200 mit leeren Kategorien, wenn kein einziges ansehen-Recht vorhanden ist', async () => {
    mockAnsehen({ denied: CATEGORY_CASES.map(c => c.modul) });
    const { from } = setup();

    const res = await search();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.totalCount).toBe(0);
    expect(from).not.toHaveBeenCalled();
  });

  it('liefert Wohnungen mit wohnungen:ansehen, aber ohne mieter:ansehen weiter ohne Mieterdaten (tenant_access: false)', async () => {
    mockAnsehen({ denied: ['mieter'] });
    setup();

    const res = await search('apartment');
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.results.apartment).toHaveLength(1);
    expect(data.results.apartment[0]).toEqual(expect.objectContaining({ tenant_access: false }));
  });

  it('prueft nur die Module der gesuchten Kategorien', async () => {
    mockAnsehen({ failing: ['haeuser', 'finanzen', 'aufgaben'] });
    setup();

    const res = await search('tenant');

    expect(res.status).toBe(200);
    expect(checkPermission).toHaveBeenCalledWith('mieter', 'ansehen');
    expect(checkPermission).not.toHaveBeenCalledWith('haeuser', 'ansehen');
    expect(checkPermission).not.toHaveBeenCalledWith('finanzen', 'ansehen');
    expect(checkPermission).not.toHaveBeenCalledWith('aufgaben', 'ansehen');
  });

  it.each(CATEGORY_CASES)(
    'antwortet 503 PERMISSION_CHECK_FAILED, wenn die Pruefung von $modul:ansehen fehlschlaegt',
    async ({ modul }) => {
      mockAnsehen({ failing: [modul] });
      const { from } = setup();

      const res = await search();

      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ error: 'Permission check failed', code: 'PERMISSION_CHECK_FAILED' });
      expect(from).not.toHaveBeenCalled();
    }
  );
});
