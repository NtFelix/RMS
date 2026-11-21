import {
  bewerberLadenAction,
  bewerberAktualisierenAction,
  bewerberAnnehmenAction,
  bewerberLoeschenAction,
  bewerberAlleLoeschenAction,
} from './bewerber-actions';
import { ensureAuth } from '@/lib/auth-utils';
import { hasPermission } from '@/lib/permissions';
import { getAccessibleWohnungIds } from '@/lib/object-scope';

jest.mock('@/lib/auth-utils', () => ({
  ensureAuth: jest.fn(),
}));

jest.mock('@/lib/permissions', () => ({
  hasPermission: jest.fn(),
}));

jest.mock('@/lib/object-scope', () => ({
  getAccessibleWohnungIds: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

// Fake-Abfragen: Jede Tabelle liefert ihre Antwort, Schreibvorgänge werden protokolliert.
let antworten: Record<string, { data: unknown; error: unknown }>;
let geschrieben: Array<{ tabelle: string; werte: Record<string, unknown> }>;
let mockRpc: jest.Mock;
let mockSupabase: { from: jest.Mock; rpc: jest.Mock };

function abfrage(tabelle: string) {
  const antwort = () => Promise.resolve(antworten[tabelle] ?? { data: null, error: null });
  const builder: Record<string, unknown> = {};
  for (const methode of ['select', 'eq', 'neq', 'is']) {
    builder[methode] = jest.fn(() => builder);
  }
  builder.update = jest.fn((werte: Record<string, unknown>) => {
    geschrieben.push({ tabelle, werte });
    return builder;
  });
  builder.maybeSingle = jest.fn(antwort);
  builder.then = (onFulfilled: (wert: unknown) => unknown, onRejected?: (grund: unknown) => unknown) =>
    antwort().then(onFulfilled, onRejected);
  return builder;
}

const bewerberZeile = (overrides: Record<string, unknown> = {}) => ({
  id: 'b-1',
  person_id: 'p-1',
  wohnung_id: 'w-1',
  status: 'neu',
  bewerbung_score: 82,
  bewerbung_metadaten: { fit: 'A' },
  bewerbung_mail_id: 'mail-1',
  notiz: null,
  person: { id: 'p-1', anrede: 'frau', vorname: 'Anna', nachname: 'Muster', email: 'anna@example.test', telefon: '0301234', strasse: null, plz: null, ort: null },
  ...overrides,
});

function formData(felder: Record<string, string>): FormData {
  const form = new FormData();
  for (const [name, wert] of Object.entries(felder)) form.append(name, wert);
  return form;
}

describe('bewerber-actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    antworten = {};
    geschrieben = [];
    mockRpc = jest.fn().mockResolvedValue({ data: null, error: null });
    mockSupabase = { from: jest.fn((tabelle: string) => abfrage(tabelle)), rpc: mockRpc };
    (ensureAuth as jest.Mock).mockResolvedValue({ user: { id: 'user-1' }, supabase: mockSupabase });
    (hasPermission as jest.Mock).mockResolvedValue(true);
    (getAccessibleWohnungIds as jest.Mock).mockResolvedValue(null);
  });

  describe('bewerberLadenAction', () => {
    it('lädt aus "Bewerber" mit eingebetteter Person, ohne Papierkorb und ohne angenommene', async () => {
      antworten.Bewerber = { data: [bewerberZeile()], error: null };

      await bewerberLadenAction();

      expect(mockSupabase.from).toHaveBeenCalledWith('Bewerber');
      expect(mockSupabase.from).not.toHaveBeenCalledWith('Mieter');
      const query = mockSupabase.from.mock.results[0].value as Record<string, jest.Mock>;
      expect(query.select.mock.calls[0][0]).toContain('person:Personen!fk_bewerber_person(');
      expect(query.is).toHaveBeenCalledWith('geloescht_am', null);
      expect(query.neq).toHaveBeenCalledWith('status', 'angenommen');
    });

    it('bildet den Bewerber auf die Tenant-Form ab (Name und Kontakt aus der Person)', async () => {
      antworten.Bewerber = { data: [bewerberZeile()], error: null };

      const ergebnis = await bewerberLadenAction();

      expect(ergebnis.success).toBe(true);
      expect(ergebnis.data).toEqual([
        expect.objectContaining({
          id: 'b-1',
          status: 'bewerber',
          bewerber_status: 'neu',
          name: 'Anna Muster',
          email: 'anna@example.test',
          telefonnummer: '0301234',
          anrede: 'frau',
          wohnung_id: 'w-1',
          bewerbung_score: 82,
          bewerbung_metadaten: { fit: 'A' },
          bewerbung_mail_id: 'mail-1',
        }),
      ]);
    });

    it('blendet Bewerber in fremden Wohnungen aus, behält aber solche ohne Wohnung', async () => {
      (getAccessibleWohnungIds as jest.Mock).mockResolvedValue(['w-1']);
      antworten.Bewerber = {
        data: [
          bewerberZeile({ id: 'b-sichtbar', wohnung_id: 'w-1' }),
          bewerberZeile({ id: 'b-fremd', wohnung_id: 'w-fremd' }),
          bewerberZeile({ id: 'b-ohne-wohnung', wohnung_id: null }),
        ],
        error: null,
      };

      const ergebnis = await bewerberLadenAction();

      expect(ergebnis.data.map((b) => b.id)).toEqual(['b-sichtbar', 'b-ohne-wohnung']);
    });

    it('verweigert ohne Modulrecht mieter:ansehen', async () => {
      (hasPermission as jest.Mock).mockResolvedValue(false);

      const ergebnis = await bewerberLadenAction();

      expect(ergebnis).toEqual({ success: false, data: [], error: 'Keine Berechtigung' });
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  describe('bewerberAktualisierenAction', () => {
    beforeEach(() => {
      antworten.Bewerber = { data: { id: 'b-1', person_id: 'p-1', wohnung_id: 'w-1' }, error: null };
      antworten.Personen = { data: { id: 'p-1', vorname: 'Anna', nachname: 'Muster' }, error: null };
    });

    it('ändert die Person in "Personen" und die Bewerberfelder in "Bewerber"', async () => {
      const ergebnis = await bewerberAktualisierenAction(
        'b-1',
        formData({ anrede: 'frau', vorname: 'Anna', nachname: 'Neumann', email: 'anna.neu@example.test', telefon: '', notiz: 'Rückruf', bewerber_status: 'in_pruefung' })
      );

      expect(ergebnis.success).toBe(true);
      expect(geschrieben).toEqual(
        expect.arrayContaining([
          { tabelle: 'Personen', werte: expect.objectContaining({ anrede: 'frau', nachname: 'Neumann', email: 'anna.neu@example.test', telefon: null }) },
          { tabelle: 'Bewerber', werte: { notiz: 'Rückruf', status: 'in_pruefung' } },
        ])
      );
    });

    it('übernimmt keine person_id aus dem Formular', async () => {
      await bewerberAktualisierenAction('b-1', formData({ person_id: 'fremde-person', vorname: 'Anna', nachname: 'Muster' }));

      const personUpdate = geschrieben.find((g) => g.tabelle === 'Personen');
      expect(personUpdate?.werte).not.toHaveProperty('person_id');
      expect(geschrieben.some((g) => 'person_id' in g.werte)).toBe(false);
    });

    it('lehnt das Entfernen beider Namen ab', async () => {
      const ergebnis = await bewerberAktualisierenAction('b-1', formData({ vorname: '', nachname: '' }));

      expect(ergebnis).toEqual({ success: false, error: { message: 'Vor- oder Nachname ist erforderlich.' } });
      expect(geschrieben).toHaveLength(0);
    });

    it('verweigert eine Wohnung außerhalb des Objektzugriffs', async () => {
      (getAccessibleWohnungIds as jest.Mock).mockResolvedValue(['w-1']);

      const ergebnis = await bewerberAktualisierenAction('b-1', formData({ wohnung_id: 'w-fremd' }));

      expect(ergebnis.success).toBe(false);
      expect(geschrieben).toHaveLength(0);
    });

    it('lehnt den Status "angenommen" hier ab (eigener Weg über bewerberAnnehmenAction)', async () => {
      const ergebnis = await bewerberAktualisierenAction('b-1', formData({ bewerber_status: 'angenommen' }));

      expect(ergebnis.success).toBe(false);
      expect(geschrieben).toHaveLength(0);
    });

    it('verweigert ohne Modulrecht mieter:bearbeiten', async () => {
      (hasPermission as jest.Mock).mockResolvedValue(false);

      const ergebnis = await bewerberAktualisierenAction('b-1', formData({ notiz: 'x' }));

      expect(ergebnis).toEqual({ success: false, error: { message: 'Keine Berechtigung' } });
    });
  });

  describe('bewerberAnnehmenAction', () => {
    it('ruft bewerber_annehmen mit Bewerber, Wohnung und Einzugsdatum und gibt die neue Mieter-ID zurück', async () => {
      mockRpc.mockResolvedValue({ data: 'm-neu', error: null });

      const ergebnis = await bewerberAnnehmenAction('b-1', 'w-1', '2026-12-01');

      expect(mockRpc).toHaveBeenCalledWith('bewerber_annehmen', {
        p_bewerber_id: 'b-1',
        p_wohnung_id: 'w-1',
        p_einzug: '2026-12-01',
      });
      expect(ergebnis).toEqual({ success: true, mieterId: 'm-neu' });
    });

    it('gibt die Datenbankmeldung ohne Präfix zurück', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { code: 'PE007', message: 'PERSON_BEWERBER_NICHT_OFFEN: Der Bewerber ist bereits angenommen oder abgesagt.' } });

      const ergebnis = await bewerberAnnehmenAction('b-1', 'w-1', '2026-12-01');

      expect(ergebnis).toEqual({
        success: false,
        error: { message: 'Der Bewerber ist bereits angenommen oder abgesagt.' },
      });
    });

    it('prüft das Einzugsdatum und die Wohnung, bevor die Datenbank aufgerufen wird', async () => {
      expect((await bewerberAnnehmenAction('b-1', 'w-1', '01.12.2026')).success).toBe(false);
      expect((await bewerberAnnehmenAction('b-1', '', '2026-12-01')).success).toBe(false);
      (getAccessibleWohnungIds as jest.Mock).mockResolvedValue(['w-1']);
      expect((await bewerberAnnehmenAction('b-1', 'w-fremd', '2026-12-01')).success).toBe(false);
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  describe('bewerberLoeschenAction', () => {
    it('löscht den Bewerber über soft_delete_record mit Tabelle "Bewerber"', async () => {
      antworten.Bewerber = { data: { id: 'b-1', person_id: 'p-1', wohnung_id: 'w-1' }, error: null };

      const ergebnis = await bewerberLoeschenAction('b-1');

      expect(ergebnis).toEqual({ success: true });
      expect(mockRpc).toHaveBeenCalledWith('soft_delete_record', { p_table_name: 'Bewerber', p_record_id: 'b-1' });
    });

    it('löscht nichts außerhalb des Objektzugriffs', async () => {
      antworten.Bewerber = { data: { id: 'b-1', person_id: 'p-1', wohnung_id: 'w-fremd' }, error: null };
      (getAccessibleWohnungIds as jest.Mock).mockResolvedValue(['w-1']);

      const ergebnis = await bewerberLoeschenAction('b-1');

      expect(ergebnis.success).toBe(false);
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('verweigert ohne Modulrecht mieter:loeschen', async () => {
      (hasPermission as jest.Mock).mockResolvedValue(false);

      const ergebnis = await bewerberLoeschenAction('b-1');

      expect(ergebnis).toEqual({ success: false, error: { message: 'Keine Berechtigung' } });
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  describe('bewerberAlleLoeschenAction', () => {
    it('löscht alle sichtbaren Bewerber und meldet Teilerfolge mit Grund', async () => {
      antworten.Bewerber = {
        data: [
          { id: 'b-1', wohnung_id: null },
          { id: 'b-2', wohnung_id: null },
        ],
        error: null,
      };
      mockRpc
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'PERSON_OBJEKTZUGRIFF: Kein Zugriff auf dieses Objekt.' } });

      const ergebnis = await bewerberAlleLoeschenAction();

      expect(mockRpc).toHaveBeenCalledWith('soft_delete_record', { p_table_name: 'Bewerber', p_record_id: 'b-1' });
      expect(mockRpc).toHaveBeenCalledWith('soft_delete_record', { p_table_name: 'Bewerber', p_record_id: 'b-2' });
      expect(ergebnis.success).toBe(false);
      expect(ergebnis.error?.message).toContain('1 von 2 Bewerbern konnte nicht gelöscht werden.');
      expect(ergebnis.error?.message).toContain('Kein Zugriff auf dieses Objekt.');
      expect(ergebnis.error?.message).not.toContain('PERSON_OBJEKTZUGRIFF');
    });
  });
});
