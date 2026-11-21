/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET } from './route';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { checkPermission } from '@/lib/permissions';

/**
 * GET /api/search, Kategorie "tenant" (GH-30): Name, E-Mail und Telefon stehen in "Personen". Die Suche findet Personen
 * und ordnet sie über Mieter.person_id und Bewerber.person_id zu. Alle Daten sind synthetisch.
 */

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

const PERSON_MATCH = { id: 'p1', anrede: 'frau', vorname: 'Erika', nachname: 'Beispiel', email: 'erika@example.invalid', telefon: '000 1' };

type Aufruf = { table: string; method: string; args: unknown[] };

/** Baut je Tabelle einen Builder, der seine Aufrufe protokolliert und die gegebenen Zeilen liefert. */
function setup(rows: Record<string, unknown[]>, failing: string[] = []) {
  const aufrufe: Aufruf[] = [];
  const from = jest.fn((table: string) => {
    const builder: Record<string, unknown> = {};
    for (const method of ['select', 'or', 'order', 'limit', 'not', 'eq', 'neq', 'in', 'ilike']) {
      builder[method] = jest.fn((...args: unknown[]) => {
        aufrufe.push({ table, method, args });
        return builder;
      });
    }
    const result = failing.includes(table)
      ? { data: null, error: { message: 'Testfehler' } }
      : { data: rows[table] ?? [], error: null };
    builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
    return builder;
  });
  (createSupabaseServerClient as jest.Mock).mockResolvedValue({
    from,
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
  });
  return { from, aufrufe };
}

const aufrufeVon = (aufrufe: Aufruf[], table: string, method: string) =>
  aufrufe.filter((a) => a.table === table && a.method === method);

describe('GET /api/search (tenant): Personensuche (GH-30)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (checkPermission as jest.Mock).mockResolvedValue('allowed');
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sucht Personen über Vorname, Nachname, E-Mail und Telefon', async () => {
    const { aufrufe } = setup({ Personen: [{ id: 'p1' }], Mieter: [], Bewerber: [] });

    await GET(new NextRequest('http://localhost/api/search?q=Erika&categories=tenant'));

    const [oder] = aufrufeVon(aufrufe, 'Personen', 'or').map((a) => String(a.args[0]));
    expect(oder).toContain('vorname.ilike.');
    expect(oder).toContain('nachname.ilike.');
    expect(oder).toContain('email.ilike.');
    expect(oder).toContain('telefon.ilike.');
  });

  it('lässt Telefon weg, wenn die Suche eine E-Mail-Adresse ist', async () => {
    const { aufrufe } = setup({ Personen: [{ id: 'p1' }], Mieter: [], Bewerber: [] });

    await GET(new NextRequest('http://localhost/api/search?q=erika%40example.invalid&categories=tenant'));

    const [oder] = aufrufeVon(aufrufe, 'Personen', 'or').map((a) => String(a.args[0]));
    expect(oder).not.toContain('telefon.ilike.');
  });

  it('ordnet die gefundenen Personen über person_id Mietern und Bewerbern zu und überspringt angenommene Bewerber', async () => {
    const { aufrufe } = setup({
      Personen: [{ id: 'p1' }],
      Mieter: [{ id: 'm1', einzug: '2024-01-01', auszug: null, person: PERSON_MATCH, Wohnungen: [] }],
      Bewerber: [{ id: 'b1', person: PERSON_MATCH, Wohnungen: [] }],
    });

    const res = await GET(new NextRequest('http://localhost/api/search?q=Erika&categories=tenant'));
    const data = await res.json();

    expect(aufrufeVon(aufrufe, 'Mieter', 'in')).toEqual([{ table: 'Mieter', method: 'in', args: ['person_id', ['p1']] }]);
    expect(aufrufeVon(aufrufe, 'Bewerber', 'in')).toEqual([{ table: 'Bewerber', method: 'in', args: ['person_id', ['p1']] }]);
    expect(aufrufeVon(aufrufe, 'Bewerber', 'neq')).toEqual([{ table: 'Bewerber', method: 'neq', args: ['status', 'angenommen'] }]);
    expect(data.results.tenant.map((t: { id: string }) => t.id)).toEqual(expect.arrayContaining(['m1', 'b1']));
    expect(data.results.tenant.find((t: { id: string }) => t.id === 'm1')).toEqual(expect.objectContaining({
      name: 'Erika Beispiel',
      email: 'erika@example.invalid',
      phone: '000 1',
      status: 'active',
    }));
  });

  it('liefert keine Treffer, wenn keine Person passt (ohne Mieter- oder Bewerberabfrage)', async () => {
    const { aufrufe } = setup({ Personen: [], Mieter: [{ id: 'm1', person: PERSON_MATCH }] });

    const res = await GET(new NextRequest('http://localhost/api/search?q=Niemand&categories=tenant'));
    const data = await res.json();

    expect(data.results.tenant).toEqual([]);
    expect(aufrufeVon(aufrufe, 'Mieter', 'in')).toEqual([]);
  });

  it('schreibt keine Personennamen in die Logs', async () => {
    setup({
      Personen: [{ id: 'p1' }],
      Mieter: [{ id: 'm1', einzug: '2024-01-01', auszug: null, person: PERSON_MATCH, Wohnungen: [] }],
      Bewerber: [],
    });

    await GET(new NextRequest('http://localhost/api/search?q=Erika&categories=tenant'));

    const protokolliert = JSON.stringify([
      ...(console.log as jest.Mock).mock.calls,
      ...(console.error as jest.Mock).mock.calls,
      ...(console.warn as jest.Mock).mock.calls,
    ]);
    expect(protokolliert).not.toContain('Erika');
    expect(protokolliert).not.toContain('Beispiel');
    expect(protokolliert).not.toContain('erika@example.invalid');
  });

  it('liefert Mieter weiter, wenn die Bewerber-Abfrage fehlschlägt', async () => {
    setup(
      {
        Personen: [{ id: 'p1' }],
        Mieter: [{ id: 'm1', einzug: '2024-01-01', auszug: null, person: PERSON_MATCH, Wohnungen: [] }],
      },
      ['Bewerber']
    );

    const res = await GET(new NextRequest('http://localhost/api/search?q=Erika&categories=tenant'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.results.tenant.map((t: { id: string }) => t.id)).toEqual(['m1']);
  });
});
