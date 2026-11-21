/**
 * @jest-environment node
 */
import { ladeKontakteAction } from '../kontakte-actions';
import { ensureAuth } from '@/lib/auth-utils';
import { hasPermission } from '@/lib/permissions';

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/logging-middleware', () => ({ logAction: jest.fn() }));
jest.mock('@/lib/auth-utils', () => ({ ensureAuth: jest.fn() }));
jest.mock('@/lib/permissions', () => ({ hasPermission: jest.fn() }));

type Zeile = Record<string, unknown>;

/** Supabase-Attrappe: jede Tabelle liefert ihre Zeilen bereichsweise wie PostgREST mit range(von, bis). */
function supabaseMit(tabellen: Record<string, Zeile[]>, fehlerBei?: string) {
  const bereiche: Record<string, Array<[number, number]>> = {};
  return {
    bereiche,
    client: {
      from(tabelle: string) {
        const abfrage = {
          select: () => abfrage,
          order: () => abfrage,
          range: (von: number, bis: number) => {
            (bereiche[tabelle] ??= []).push([von, bis]);
            if (fehlerBei === tabelle) return Promise.resolve({ data: null, error: { code: '42501' } });
            return Promise.resolve({ data: (tabellen[tabelle] ?? []).slice(von, bis + 1), error: null });
          },
        };
        return abfrage;
      },
    },
  };
}

function personen(anzahl: number): Zeile[] {
  return Array.from({ length: anzahl }, (_, i) => ({
    id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    anrede: 'keine_angabe',
    vorname: null,
    nachname: `Person ${String(i).padStart(4, '0')}`,
    email: null,
    telefon: null,
  }));
}

describe('ladeKontakteAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (hasPermission as jest.Mock).mockResolvedValue(true);
  });

  it('lädt mehr als 1000 Personen seitenweise und setzt die Rollen', async () => {
    const liste = personen(2001);
    const { client, bereiche } = supabaseMit({
      Personen: liste,
      Mieter: [{ person_id: liste[0].id }],
      Bewerber: [{ person_id: liste[2000].id }],
    });
    (ensureAuth as jest.Mock).mockResolvedValue({ supabase: client });

    const ergebnis = await ladeKontakteAction();

    expect(ergebnis.success).toBe(true);
    if (!ergebnis.success) return;
    expect(ergebnis.data).toHaveLength(2001);
    expect(bereiche.Personen).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
    expect(bereiche.Mieter).toEqual([[0, 999]]);
    const erste = ergebnis.data!.find((k) => k.id === liste[0].id)!;
    const letzte = ergebnis.data!.find((k) => k.id === liste[2000].id)!;
    expect(erste.istMieter).toBe(true);
    expect(erste.istBewerber).toBe(false);
    expect(letzte.istBewerber).toBe(true);
  });

  it('fragt bei genau 1000 Zeilen eine leere Folgeseite an', async () => {
    const { client, bereiche } = supabaseMit({ Personen: personen(1000) });
    (ensureAuth as jest.Mock).mockResolvedValue({ supabase: client });

    const ergebnis = await ladeKontakteAction();

    expect(ergebnis.success && ergebnis.data).toHaveLength(1000);
    expect(bereiche.Personen).toEqual([[0, 999], [1000, 1999]]);
  });

  it('meldet einen allgemeinen Fehler, wenn eine Seite fehlschlägt', async () => {
    const { client } = supabaseMit({ Personen: personen(3) }, 'Bewerber');
    (ensureAuth as jest.Mock).mockResolvedValue({ supabase: client });

    const ergebnis = await ladeKontakteAction();

    expect(ergebnis.success).toBe(false);
  });

  it('lehnt ohne Recht kontakte ansehen ab, ohne zu lesen', async () => {
    (hasPermission as jest.Mock).mockResolvedValue(false);
    const { client, bereiche } = supabaseMit({ Personen: personen(1) });
    (ensureAuth as jest.Mock).mockResolvedValue({ supabase: client });

    const ergebnis = await ladeKontakteAction();

    expect(ergebnis).toEqual({ success: false, error: 'Sie haben keine Berechtigung für diese Aktion.' });
    expect(bereiche.Personen).toBeUndefined();
  });
});
