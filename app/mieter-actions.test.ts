import { handleSubmit, deleteTenantAction, getMieterByHausIdAction } from '@/app/mieter-actions';
import { hasPermission } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';
import { logAction } from '@/lib/logging-middleware';
import { getAccessibleWohnungIds } from '@/lib/object-scope';

// Mock dependencies
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/logging-middleware', () => ({
  logAction: jest.fn(),
}));

jest.mock('@/app/posthog-server.mjs', () => ({
  getPostHogServer: jest.fn(() => ({
    capture: mockPostHogCapture,
    flush: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@/lib/posthog-logger', () => ({
  posthogLogger: {
    flush: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Supabase: pro Tabelle ein verkettbarer Builder, `await` liefert das Ergebnis (wie PostgREST).
const mockPostHogCapture = jest.fn();
const mockRpc = jest.fn();
const mockFrom = jest.fn();

const mockSupabase = {
  from: mockFrom,
  rpc: mockRpc,
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
  },
};

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(() => mockSupabase),
}));

type Ergebnis = { data: unknown; error: { message: string; code?: string } | null };

/** Verkettbarer Query-Builder für eine Tabelle; `single` und `await` liefern `ergebnis`. */
function builder(ergebnis: Ergebnis = { data: null, error: null }) {
  const b: Record<string, unknown> = {};
  for (const methode of ['select', 'insert', 'update', 'delete', 'eq', 'in', 'is', 'or', 'match']) {
    b[methode] = jest.fn(() => b);
  }
  b.single = jest.fn(async () => ergebnis);
  b.then = (resolve: (v: Ergebnis) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(ergebnis).then(resolve, reject);
  return b as Record<string, jest.Mock> & PromiseLike<Ergebnis>;
}

/** Tabellen-Builder für diesen Test festlegen; nicht angegebene Tabellen liefern einen leeren Builder. */
function tabellen(werte: Record<string, ReturnType<typeof builder>>) {
  mockFrom.mockImplementation((tabelle: string) => werte[tabelle] ?? builder());
  return werte;
}

/** FormData wie vom Mieter-Dialog. */
function formular(felder: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [schluessel, wert] of Object.entries(felder)) formData.append(schluessel, wert);
  return formData;
}

const KAUTION_GRUND = 'Der Mieter hat eine hinterlegte Kaution und kann nicht gelöscht werden.';
const KAUTION_SPERRE = { message: `KAUT_GESPERRT: ${KAUTION_GRUND}`, code: 'KA009' };

describe('Mieter Server Actions', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReset();
    mockRpc.mockReset();
    mockRpc.mockResolvedValue({ data: null, error: null });
    mockFrom.mockImplementation(() => builder());
    (getAccessibleWohnungIds as jest.Mock).mockResolvedValue(null);
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('handleSubmit: Mieter anlegen (RPC mieter_anlegen)', () => {
    it('legt Person und Mieter über die RPC an und schreibt nicht mehr direkt in "Mieter"', async () => {
      mockRpc.mockResolvedValueOnce({ data: { mieter_id: 'm-neu', person_id: 'p-neu' }, error: null });
      const werte = tabellen({});

      const result = await handleSubmit(formular({
        anrede: 'frau',
        vorname: 'Erika',
        nachname: 'Beispiel',
        email: 'erika@example.invalid',
        telefonnummer: '+49 30 1234',
        wohnung_id: 'w1',
        einzug: '2026-01-01',
        notiz: 'Notiz',
        nebenkosten: '[]',
        status: 'mieter',
      }));

      expect(result).toEqual({ success: true });
      expect(mockRpc).toHaveBeenCalledWith('mieter_anlegen', {
        p_person: {
          anrede: 'frau',
          vorname: 'Erika',
          nachname: 'Beispiel',
          email: 'erika@example.invalid',
          telefon: '+49 30 1234',
        },
        p_mieter: {
          wohnung_id: 'w1',
          einzug: '2026-01-01',
          auszug: null,
          notiz: 'Notiz',
          nebenkosten: [],
        },
      });
      // Keine Personen- oder Statusfelder mehr an "Mieter" schreiben.
      expect(mockFrom).not.toHaveBeenCalledWith('Mieter');
      expect(Object.keys(werte)).toHaveLength(0);
      expect(revalidatePath).toHaveBeenCalledWith('/mieter');
    });

    it('übernimmt den bisherigen Feldnamen "telefonnummer" als Telefon und lässt "status" weg', async () => {
      mockRpc.mockResolvedValueOnce({ data: { mieter_id: 'm-neu', person_id: 'p-neu' }, error: null });

      await handleSubmit(formular({ vorname: 'Max', telefonnummer: '0171 2345', status: 'mieter' }));

      const aufruf = mockRpc.mock.calls[0][1];
      expect(aufruf.p_person).toEqual({ vorname: 'Max', telefon: '0171 2345' });
      expect(aufruf.p_mieter).not.toHaveProperty('status');
      expect(aufruf.p_person).not.toHaveProperty('name');
    });

    it('verlangt Vor- oder Nachnamen, bevor die Datenbank angesprochen wird', async () => {
      const result = await handleSubmit(formular({ email: 'nur@example.invalid', status: 'mieter' }));

      expect(result).toEqual({ success: false, error: { message: 'Bitte geben Sie einen Vor- oder Nachnamen an.' } });
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('gibt die Meldung der RPC ohne technisches Präfix zurück', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { code: 'PE004', message: 'PERSON_EINGABE_UNGUELTIG: Ungültige Anrede.' },
      });

      const result = await handleSubmit(formular({ nachname: 'Beispiel', status: 'mieter' }));

      expect(result).toEqual({ success: false, error: { message: 'Ungültige Anrede.' } });
      expect(revalidatePath).not.toHaveBeenCalledWith('/mieter');
    });
  });

  describe('handleSubmit: Bewerber anlegen (RPC bewerber_anlegen)', () => {
    it('legt bei status "bewerber" einen Bewerber über die RPC an, nicht einen Mieter', async () => {
      mockRpc.mockResolvedValueOnce({ data: { bewerber_id: 'b-neu', person_id: 'p-neu' }, error: null });

      const result = await handleSubmit(formular({
        vorname: 'Bea',
        nachname: 'Bewerberin',
        wohnung_id: 'w1',
        notiz: 'Interesse',
        status: 'bewerber',
      }));

      expect(result).toEqual({ success: true });
      expect(mockRpc).toHaveBeenCalledWith('bewerber_anlegen', {
        p_person: { vorname: 'Bea', nachname: 'Bewerberin' },
        p_bewerber: { wohnung_id: 'w1', notiz: 'Interesse' },
      });
      expect(mockRpc).not.toHaveBeenCalledWith('mieter_anlegen', expect.anything());
    });
  });

  describe('handleSubmit: Mieter ändern (RPC mieter_aktualisieren)', () => {
    it('ändert Person und Mieter über die RPC und übergibt nur die Formularfelder', async () => {
      tabellen({ Mieter: builder({ data: { wohnung_id: 'w1' }, error: null }) });

      const result = await handleSubmit(formular({
        id: 'tenant-123',
        vorname: 'Jane',
        nachname: 'Doe',
        email: 'jane@example.invalid',
        telefonnummer: '',
        wohnung_id: 'w1',
        einzug: '',
        auszug: '',
        notiz: '',
        nebenkosten: '[]',
        status: 'mieter',
      }));

      expect(result).toEqual({ success: true });
      expect(mockRpc).toHaveBeenCalledWith('mieter_aktualisieren', {
        p_mieter_id: 'tenant-123',
        p_person: { vorname: 'Jane', nachname: 'Doe', email: 'jane@example.invalid', telefon: null },
        p_mieter: { wohnung_id: 'w1', einzug: null, auszug: null, notiz: null, nebenkosten: [] },
      });
      expect(logAction).toHaveBeenCalledWith('updateTenant', 'success', { operation: 'update' });
    });

    it('übersetzt eine Fehlermeldung der RPC (z. B. Wohnungswechsel mit Mietverhältnis)', async () => {
      tabellen({ Mieter: builder({ data: { wohnung_id: 'w1' }, error: null }) });
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { code: 'PE004', message: 'PERSON_EINGABE_UNGUELTIG: Der Mieter hat ein Mietverhältnis. Die Wohnung wird über den Umzug geändert.' },
      });

      const result = await handleSubmit(formular({ id: 'tenant-123', nachname: 'Doe', wohnung_id: 'w2', status: 'mieter' }));

      expect(result).toEqual({
        success: false,
        error: { message: 'Der Mieter hat ein Mietverhältnis. Die Wohnung wird über den Umzug geändert.' },
      });
    });

    it('ändert einen Bewerber direkt in "Bewerber" und "Personen" (Modul mieter per RLS)', async () => {
      const bewerber = builder({ data: { person_id: 'p-7' }, error: null });
      const personen = builder({ data: null, error: null });
      const bewerberUpdate = builder({ data: null, error: null });
      // Erster Zugriff auf "Bewerber": Lesen der person_id; danach das Update.
      const bewerberTabelle = jest.fn()
        .mockReturnValueOnce(bewerber)
        .mockReturnValueOnce(bewerberUpdate);
      mockFrom.mockImplementation((tabelle: string) => {
        if (tabelle === 'Bewerber') return bewerberTabelle();
        if (tabelle === 'Personen') return personen;
        return builder();
      });

      const result = await handleSubmit(formular({
        id: 'b-7',
        vorname: 'Bea',
        nachname: 'Neu',
        wohnung_id: 'w1',
        notiz: 'Aktualisiert',
        status: 'bewerber',
      }));

      expect(result).toEqual({ success: true });
      expect(personen.update).toHaveBeenCalledWith({ vorname: 'Bea', nachname: 'Neu' });
      expect(personen.eq).toHaveBeenCalledWith('id', 'p-7');
      expect(bewerberUpdate.update).toHaveBeenCalledWith({ wohnung_id: 'w1', notiz: 'Aktualisiert' });
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  describe('Datenschutz: keine Personennamen in Logs und Analytics', () => {
    it('schreibt keinen Namen in logAction oder PostHog', async () => {
      mockRpc.mockResolvedValueOnce({ data: { mieter_id: 'm-neu', person_id: 'p-neu' }, error: null });

      await handleSubmit(formular({ vorname: 'Erika', nachname: 'Beispiel', email: 'erika@example.invalid', status: 'mieter' }));

      const protokolliert = JSON.stringify([(logAction as jest.Mock).mock.calls, mockPostHogCapture.mock.calls]);
      expect(protokolliert).not.toContain('Erika');
      expect(protokolliert).not.toContain('Beispiel');
      expect(protokolliert).not.toContain('erika@example.invalid');
      expect(protokolliert).not.toContain('tenant_name');
      expect(mockPostHogCapture).toHaveBeenCalledWith(expect.objectContaining({ event: 'tenant_added' }));
    });
  });

  describe('deleteTenantAction', () => {
    it('should delete a tenant successfully', async () => {
      mockRpc.mockResolvedValueOnce({ error: null });

      const result = await deleteTenantAction('tenant-123');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('soft_delete_record', {
        p_table_name: 'Mieter',
        p_record_id: 'tenant-123',
      });
      expect(result).toEqual({ success: true });
    });

    it('should return error if delete fails', async () => {
      mockRpc.mockResolvedValueOnce({ error: { message: 'Delete failed' } });

      const result = await deleteTenantAction('tenant-123');

      expect(result).toEqual({ success: false, error: { message: 'Delete failed' } });
    });

    it('shows the deletion lock of a tenant with a deposit without the technical code prefix (GH-6)', async () => {
      mockRpc.mockResolvedValueOnce({
        error: { message: 'KAUT_GESPERRT: Der Mieter hat eine hinterlegte Kaution und kann nicht gelöscht werden.' },
      });

      const result = await deleteTenantAction('tenant-123');

      expect(result).toEqual({
        success: false,
        error: { message: 'Der Mieter hat eine hinterlegte Kaution und kann nicht gelöscht werden.' },
      });
      expect(revalidatePath).not.toHaveBeenCalledWith('/mieter');
    });
  });

  // "Alle Bewerber löschen" (GH-6, GH-30): Bewerber liegen in der Tabelle "Bewerber" und wandern einzeln per
  // soft_delete_record('Bewerber') in den Papierkorb. Die Datenbank kann einzelne Löschungen ablehnen.
  describe('getMieterByHausIdAction', () => {
    /** Erste Abfrage: Wohnungen des Hauses; zweite: Mieter in diesen Wohnungen. */
    function hausAbfragen(wohnungen: Ergebnis, mieter: Ergebnis) {
      const wohnungenBuilder = builder(wohnungen);
      const mieterBuilder = builder(mieter);
      mockFrom.mockImplementation((tabelle: string) => (tabelle === 'Wohnungen' ? wohnungenBuilder : mieterBuilder));
      return { wohnungenBuilder, mieterBuilder };
    }

    it('should fetch tenants by house id', async () => {
      hausAbfragen({ data: [{ id: 'w1' }, { id: 'w2' }], error: null }, { data: [{ id: 't1', wohnung_id: 'w1' }], error: null });

      const result = await getMieterByHausIdAction('haus-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('bildet die eingebettete Person auf name, email und telefonnummer ab', async () => {
      hausAbfragen(
        { data: [{ id: 'w1' }], error: null },
        {
          data: [{
            id: 't1',
            wohnung_id: 'w1',
            person: { id: 'p1', anrede: 'herr', vorname: 'Max', nachname: 'Beispiel', email: 'max@example.invalid', telefon: '0301' },
          }],
          error: null,
        },
      );

      const result = await getMieterByHausIdAction('haus-1');

      expect(result.data?.[0]).toMatchObject({ name: 'Max Beispiel', email: 'max@example.invalid', telefonnummer: '0301' });
    });

    it('should return error if fetching wohnungen fails', async () => {
      hausAbfragen({ data: null, error: { message: 'Fetch failed' } }, { data: [], error: null });

      const result = await getMieterByHausIdAction('haus-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Fetch failed');
    });

    // Kautionsmanagement (GH-6) und Personen-Stammdaten (GH-30): kein Altfeld und keine Personenspalten an "Mieter".
    it('selects explicit columns without the legacy field kaution and without the person columns of "Mieter"', async () => {
      const { mieterBuilder } = hausAbfragen({ data: [{ id: 'w1' }], error: null }, { data: [{ id: 't1' }], error: null });

      await getMieterByHausIdAction('haus-1');

      const mieterSelect: string = mieterBuilder.select.mock.calls[0][0];
      const mieterSpalten = mieterSelect.split(', person:')[0];
      expect(mieterSelect).not.toMatch(/\*/);
      expect(mieterSelect).not.toMatch(/kaution/i);
      expect(mieterSelect).toContain('Wohnungen(name, groesse, miete)');
      expect(mieterSpalten).not.toMatch(/\b(email|telefonnummer|status|bewerbung_\w+)\b/);
      expect(mieterSelect).toContain('person:Personen!fk_mieter_person(');
    });
  });
});
