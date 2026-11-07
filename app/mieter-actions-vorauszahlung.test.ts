import { planNebenkostenVorauszahlungenAction } from '@/app/mieter-actions';
import { hasPermission } from '@/lib/permissions';
import { getAccessibleWohnungIds } from '@/lib/object-scope';
import { revalidatePath } from 'next/cache';
import { logAction } from '@/lib/logging-middleware';

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/logging-middleware', () => ({ logAction: jest.fn() }));
jest.mock('@/app/posthog-server.mjs', () => ({
  getPostHogServer: jest.fn(() => ({ capture: jest.fn(), flush: jest.fn().mockResolvedValue(undefined) })),
}));
jest.mock('@/lib/posthog-logger', () => ({ posthogLogger: { flush: jest.fn().mockResolvedValue(undefined) } }));
jest.mock('@/utils/logger', () => ({ logger: { info: jest.fn(), error: jest.fn() } }));

type Row = { id: string; wohnung_id: string | null; nebenkosten: any };

let rows: Row[] = [];
const updates: Array<{ id: string; nebenkosten: any }> = [];
let failUpdateFor: string | null = null;

const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      in: jest.fn(async (_column: string, ids: string[]) => ({ data: rows.filter(row => ids.includes(row.id)), error: null })),
    })),
    update: jest.fn((payload: { nebenkosten: any }) => ({
      eq: jest.fn(async (_column: string, id: string) => {
        if (id === failUpdateFor) return { error: { message: 'db down' } };
        updates.push({ id, nebenkosten: payload.nebenkosten });
        return { error: null };
      }),
    })),
  })),
  auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }) },
};

jest.mock('@/lib/supabase-server', () => ({ createSupabaseServerClient: jest.fn(() => mockSupabase) }));

describe('planNebenkostenVorauszahlungenAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    rows = [
      { id: 't1', wohnung_id: 'w1', nebenkosten: [{ id: 'a', amount: '80', date: '2025-01-01' }] },
      { id: 't2', wohnung_id: 'w2', nebenkosten: null },
    ];
    updates.length = 0;
    failUpdateFor = null;
    (hasPermission as jest.Mock).mockResolvedValue(true);
    (getAccessibleWohnungIds as jest.Mock).mockResolvedValue(null);
  });

  it('adds the planned prepayment to each tenant schedule', async () => {
    const result = await planNebenkostenVorauszahlungenAction([
      { tenantId: 't1', amount: 95, date: '2026-01-01' },
      { tenantId: 't2', amount: 60.5, date: '2026-01-01' },
    ]);

    expect(result).toEqual({
      success: true,
      results: [{ tenantId: 't1', success: true }, { tenantId: 't2', success: true }],
    });
    expect(updates.find(u => u.id === 't1')!.nebenkosten).toEqual([
      { id: 'a', amount: '80', date: '2025-01-01' },
      { id: expect.any(String), amount: '95', date: '2026-01-01' },
    ]);
    expect(updates.find(u => u.id === 't2')!.nebenkosten).toEqual([{ id: expect.any(String), amount: '60.5', date: '2026-01-01' }]);
    expect(revalidatePath).toHaveBeenCalledWith('/mieter');
    expect(revalidatePath).toHaveBeenCalledWith('/betriebskosten');
  });

  it('replaces an entry with the same date instead of adding a second one', async () => {
    rows[0].nebenkosten.push({ id: 'b', amount: '90', date: '2026-01-01' });
    await planNebenkostenVorauszahlungenAction([{ tenantId: 't1', amount: 95, date: '2026-01-01' }]);
    expect(updates[0].nebenkosten).toEqual([
      { id: 'a', amount: '80', date: '2025-01-01' },
      { id: 'b', amount: '95', date: '2026-01-01' },
    ]);
  });

  it('refuses without permission and saves nothing', async () => {
    (hasPermission as jest.Mock).mockResolvedValue(false);
    const result = await planNebenkostenVorauszahlungenAction([{ tenantId: 't1', amount: 95, date: '2026-01-01' }]);
    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('Keine Berechtigung');
    expect(updates).toHaveLength(0);
  });

  it('refuses tenants outside the accessible apartments, per tenant', async () => {
    (getAccessibleWohnungIds as jest.Mock).mockResolvedValue(['w1']);
    const result = await planNebenkostenVorauszahlungenAction([
      { tenantId: 't1', amount: 95, date: '2026-01-01' },
      { tenantId: 't2', amount: 60, date: '2026-01-01' },
    ]);
    expect(result.success).toBe(false);
    expect(result.results).toEqual([
      { tenantId: 't1', success: true },
      { tenantId: 't2', success: false, error: 'Zugriff auf diesen Mieter verweigert.' },
    ]);
    expect(updates.map(u => u.id)).toEqual(['t1']);
  });

  it('reports invalid amounts, dates and unknown tenants without saving them', async () => {
    const result = await planNebenkostenVorauszahlungenAction([
      { tenantId: 't1', amount: 0, date: '2026-01-01' },
      { tenantId: 't2', amount: 50, date: '2026-02-31' },
      { tenantId: 'unknown', amount: 50, date: '2026-01-01' },
    ]);
    expect(result.results).toEqual([
      { tenantId: 't1', success: false, error: 'Ungültiger Betrag.' },
      { tenantId: 't2', success: false, error: 'Ungültiges Datum.' },
      { tenantId: 'unknown', success: false, error: 'Mieter nicht gefunden.' },
    ]);
    expect(updates).toHaveLength(0);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('keeps saving the other tenants when one update fails', async () => {
    failUpdateFor = 't1';
    const result = await planNebenkostenVorauszahlungenAction([
      { tenantId: 't1', amount: 95, date: '2026-01-01' },
      { tenantId: 't2', amount: 60, date: '2026-01-01' },
    ]);
    expect(result.results).toEqual([
      { tenantId: 't1', success: false, error: 'Speichern fehlgeschlagen.' },
      { tenantId: 't2', success: true },
    ]);
  });

  it('rejects an empty request and logs no tenant data', async () => {
    expect((await planNebenkostenVorauszahlungenAction([])).success).toBe(false);
    await planNebenkostenVorauszahlungenAction([{ tenantId: 't1', amount: 95, date: '2026-01-01' }]);
    expect(logAction).toHaveBeenCalledWith('planNebenkostenVorauszahlungen', 'success', { saved_count: 1, failed_count: 0 });
  });
});
