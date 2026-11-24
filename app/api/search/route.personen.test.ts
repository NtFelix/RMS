/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET } from './route';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { checkPermission } from '@/lib/permissions';
import { getAccessibleWohnungIds } from '@/lib/object-scope';

/**
 * GET /api/search, Kategorie "tenant" (GH-30): Name, E-Mail und Telefon stehen in "Personen". Die Suche fragt Mieter und
 * Bewerber direkt ab und filtert über die eingebettete Person (Inner-Join, Filter auf referencedTable 'person').
 * Alle Daten sind synthetisch.
 */

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

// Ohne Einschränkung (null) ist der Nutzer nicht auf Wohnungen beschränkt; einzelne Tests setzen eine Liste.
jest.mock('@/lib/object-scope', () => ({
  getAccessibleHaeuserIds: jest.fn(async () => null),
  getAccessibleWohnungIds: jest.fn(async () => null),
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

/** or()-Aufrufe auf der eingebetteten Person (Option referencedTable: 'person'). */
const personenOder = (aufrufe: Aufruf[], table: string) =>
  aufrufeVon(aufrufe, table, 'or')
    .filter((a) => (a.args[1] as { referencedTable?: string } | undefined)?.referencedTable === 'person')
    .map((a) => String(a.args[0]));

describe('GET /api/search (tenant): Personensuche (GH-30)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (checkPermission as jest.Mock).mockResolvedValue('allowed');
    (getAccessibleWohnungIds as jest.Mock).mockResolvedValue(null);
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sucht Mieter und Bewerber über Vorname, Nachname, E-Mail und Telefon der Person', async () => {
    const { aufrufe } = setup({ Mieter: [], Bewerber: [] });

    await GET(new NextRequest('http://localhost/api/search?q=Erika&categories=tenant'));

    expect(aufrufeVon(aufrufe, 'Personen', 'or')).toEqual([]);
    expect(String(aufrufeVon(aufrufe, 'Mieter', 'select')[0].args[0])).toContain('!inner(');
    expect(personenOder(aufrufe, 'Bewerber')).toHaveLength(1);
    const [oder] = personenOder(aufrufe, 'Mieter');
    expect(oder).toContain('vorname.ilike.');
    expect(oder).toContain('nachname.ilike.');
    expect(oder).toContain('email.ilike.');
    expect(oder).toContain('telefon.ilike.');
  });

  it('lässt Telefon weg, wenn die Suche eine E-Mail-Adresse ist', async () => {
    const { aufrufe } = setup({ Mieter: [], Bewerber: [] });

    await GET(new NextRequest('http://localhost/api/search?q=erika%40example.invalid&categories=tenant'));

    const [oder] = personenOder(aufrufe, 'Mieter');
    expect(oder).not.toContain('telefon.ilike.');
  });

  it('liefert Mieter und Bewerber mit Personendaten und überspringt angenommene Bewerber', async () => {
    const { aufrufe } = setup({
      Mieter: [{ id: 'm1', einzug: '2024-01-01', auszug: null, person: PERSON_MATCH, Wohnungen: [] }],
      Bewerber: [{ id: 'b1', person: PERSON_MATCH, Wohnungen: [] }],
    });

    const res = await GET(new NextRequest('http://localhost/api/search?q=Erika&categories=tenant'));
    const data = await res.json();

    expect(aufrufeVon(aufrufe, 'Mieter', 'in')).toEqual([]);
    expect(aufrufeVon(aufrufe, 'Bewerber', 'neq')).toEqual([{ table: 'Bewerber', method: 'neq', args: ['status', 'angenommen'] }]);
    expect(data.results.tenant.map((t: { id: string }) => t.id)).toEqual(expect.arrayContaining(['m1', 'b1']));
    expect(data.results.tenant.find((t: { id: string }) => t.id === 'm1')).toEqual(expect.objectContaining({
      name: 'Erika Beispiel',
      email: 'erika@example.invalid',
      phone: '000 1',
      status: 'active',
    }));
  });

  it('entfernt Komma und Klammern aus dem Suchtext (sonst scheitert das PostgREST-or)', async () => {
    const { aufrufe } = setup({ Mieter: [], Bewerber: [] });

    await GET(new NextRequest('http://localhost/api/search?q=' + encodeURIComponent('Müller, Hans (alt)') + '&categories=tenant'));

    const [oder] = personenOder(aufrufe, 'Mieter');
    expect(oder).toContain('vorname.ilike.');
    expect(oder).not.toMatch(/ilike\.[^,]*Müller,/);
    expect(oder).not.toContain('(alt)');
  });

  it('fragt bei "*" ohne Personenfilter und ohne Inner-Join ab', async () => {
    const { aufrufe } = setup({ Mieter: [], Bewerber: [] });

    await GET(new NextRequest('http://localhost/api/search?q=*&categories=tenant'));

    expect(personenOder(aufrufe, 'Mieter')).toEqual([]);
    expect(String(aufrufeVon(aufrufe, 'Mieter', 'select')[0].args[0])).not.toContain('!inner(');
  });

  it('schreibt keine Personennamen in die Logs', async () => {
    setup({
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
                Mieter: [{ id: 'm1', einzug: '2024-01-01', auszug: null, person: PERSON_MATCH, Wohnungen: [] }],
      },
      ['Bewerber']
    );

    const res = await GET(new NextRequest('http://localhost/api/search?q=Erika&categories=tenant'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.results.tenant.map((t: { id: string }) => t.id)).toEqual(['m1']);
  });

  it('kennzeichnet Bewerber mit is_applicant, Mieter nicht', async () => {
    setup({
            Mieter: [{ id: 'm1', einzug: '2024-01-01', auszug: null, person: PERSON_MATCH, Wohnungen: [] }],
      Bewerber: [{ id: 'b1', person: PERSON_MATCH, Wohnungen: [] }],
    });

    const res = await GET(new NextRequest('http://localhost/api/search?q=Erika&categories=tenant'));
    const data = await res.json();
    const nachId = Object.fromEntries(data.results.tenant.map((t: { id: string }) => [t.id, t]));

    expect(nachId.b1).toEqual(expect.objectContaining({ is_applicant: true }));
    expect(nachId.m1).toEqual(expect.objectContaining({ is_applicant: false }));
  });

  it('sortiert Mieter und Bewerber vor dem Limit nach Nachname und Vorname der Person', async () => {
    const { aufrufe } = setup({ Mieter: [], Bewerber: [] });

    await GET(new NextRequest('http://localhost/api/search?q=Erika&categories=tenant'));

    expect(aufrufeVon(aufrufe, 'Mieter', 'order').map((a) => a.args[0])).toEqual(['person(nachname)', 'person(vorname)', 'id']);
    expect(aufrufeVon(aufrufe, 'Bewerber', 'order').map((a) => a.args[0])).toEqual(['person(nachname)', 'person(vorname)', 'id']);
  });

  it('lässt Bewerber ohne Wohnung im Scope eingeschränkter Nutzer zu und filtert gesetzte Wohnungen', async () => {
    (getAccessibleWohnungIds as jest.Mock).mockResolvedValue(['w1']);
    const { aufrufe } = setup({ Mieter: [], Bewerber: [] });

    await GET(new NextRequest('http://localhost/api/search?q=Erika&categories=tenant'));

    expect(aufrufeVon(aufrufe, 'Bewerber', 'or').filter((a) => a.args.length === 1)).toEqual([
      { table: 'Bewerber', method: 'or', args: ['wohnung_id.is.null,wohnung_id.in.(w1)'] },
    ]);
    expect(aufrufeVon(aufrufe, 'Bewerber', 'in')).toEqual([]);
    expect(aufrufeVon(aufrufe, 'Mieter', 'in').map((a) => a.args[0])).toEqual(['wohnung_id']);
  });
});
