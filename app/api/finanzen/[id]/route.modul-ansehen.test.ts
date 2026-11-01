/**
 * @jest-environment node
 */
import { GET } from './route';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { checkPermission } from '@/lib/permissions';
import { getAccessibleWohnungIds } from '@/lib/object-scope';
import { NextRequest } from 'next/server';

/**
 * GET /api/finanzen/[id] braucht finanzen:ansehen; der vorhandene Objekt-Scope bleibt erhalten.
 * Alle Daten sind synthetisch.
 */

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

type Result = { data: unknown; count?: number; error: { message: string } | null };

const TRANSACTION = { id: 'finanz-1', name: 'Miete Testwohnung', betrag: 500, ist_einnahmen: true, datum: '2026-01-01', wohnung_id: 'wohnung-1', notiz: null, Wohnungen: { name: 'Wohnung 1' } };

function createBuilder(result: Result, row: unknown) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'in', 'eq', 'gte', 'lte', 'or', 'order', 'range', 'limit', 'not', 'is']) {
    builder[method] = jest.fn(() => builder);
  }
  builder.single = jest.fn(async () => ({ data: row, error: null }));
  builder.then = (resolve: (v: Result) => unknown) => Promise.resolve(result).then(resolve);
  return builder as Record<string, jest.Mock>;
}

function setup() {
  const builder = createBuilder({ data: [], count: 0, error: null }, TRANSACTION);
  const from = jest.fn(() => builder);
  const rpc = jest.fn(async () => ({ data: [], error: null }));
  const auth = { getUser: jest.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })) };
  (createSupabaseServerClient as jest.Mock).mockResolvedValue({ from, rpc, auth });
  return { from, rpc, builder };
}

function mockFinanzenAnsehen(result: 'allowed' | 'denied' | 'error') {
  (checkPermission as jest.Mock).mockImplementation(async (modul: string) => (modul === 'finanzen' ? result : 'allowed'));
}

const call = () => GET(new NextRequest('http://localhost/api/finanzen/finanz-1'), { params: Promise.resolve({ id: 'finanz-1' }) });

describe('GET /api/finanzen/[id]: finanzen:ansehen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'log').mockImplementation();
    (getAccessibleWohnungIds as jest.Mock).mockResolvedValue(null);
  });

  it('antwortet mit finanzen:ansehen wie bisher (200)', async () => {
    mockFinanzenAnsehen('allowed');
    const { from, rpc } = setup();

    const res = await call();

    expect(res.status).toBe(200);
    expect(checkPermission).toHaveBeenCalledWith('finanzen', 'ansehen');
    expect(from.mock.calls.length + rpc.mock.calls.length).toBeGreaterThan(0);
  });

  it('behaelt den Haus-Scope bei: Transaktion ausserhalb des Scopes liefert 403 ohne Daten', async () => {
    mockFinanzenAnsehen('allowed');
    (getAccessibleWohnungIds as jest.Mock).mockResolvedValue(['wohnung-anders']);
    setup();

    const res = await call();
    const text = await res.text();

    expect(res.status).toBe(403);
    expect(JSON.parse(text)).toEqual({ error: 'Permission denied' });
    expect(text).not.toContain('Miete Testwohnung');
  });

  it('antwortet ohne finanzen:ansehen mit 403 PERMISSION_DENIED und liest keine Finanzdaten', async () => {
    mockFinanzenAnsehen('denied');
    const { from, rpc } = setup();

    const res = await call();
    const text = await res.text();

    expect(res.status).toBe(403);
    expect(JSON.parse(text)).toEqual({ error: 'Permission denied', code: 'PERMISSION_DENIED' });
    expect(text).not.toContain('Miete Testwohnung');
    expect(from).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('antwortet auch bei leerem Scope ohne finanzen:ansehen mit 403 statt leerer Antwort', async () => {
    mockFinanzenAnsehen('denied');
    (getAccessibleWohnungIds as jest.Mock).mockResolvedValue([]);
    setup();

    const res = await call();

    expect(res.status).toBe(403);
  });

  it('antwortet 503 PERMISSION_CHECK_FAILED, wenn die Pruefung von finanzen:ansehen fehlschlaegt', async () => {
    mockFinanzenAnsehen('error');
    const { from, rpc } = setup();

    const res = await call();

    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'Permission check failed', code: 'PERMISSION_CHECK_FAILED' });
    expect(from).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
});
