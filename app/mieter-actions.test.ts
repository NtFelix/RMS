
import { handleSubmit, deleteTenantAction, deleteAllApplicantsAction, getMieterByHausIdAction } from '@/app/mieter-actions';
import { hasPermission } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';
import { logAction } from '@/lib/logging-middleware';

// Mock dependencies
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('@/lib/logging-middleware', () => ({
  logAction: jest.fn(),
}));

jest.mock('@/app/posthog-server.mjs', () => ({
  getPostHogServer: jest.fn(() => ({
    capture: jest.fn(),
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

// Mock Supabase
const mockSelectEq = jest.fn();
const mockUpdateEq = jest.fn();
const mockDeleteEq = jest.fn();
const mockRpc = jest.fn();

const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

const mockSingle = jest.fn();
const mockIn = jest.fn();
const mockOr = jest.fn();

const mockSupabase = {
  from: jest.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  })),
  rpc: mockRpc,
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
  },
};

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(() => mockSupabase),
}));

describe('Mieter Server Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default chainable mocks
    mockSelect.mockReturnThis();
    mockInsert.mockReturnThis();
    mockUpdate.mockReturnThis();
    mockDelete.mockReturnThis();

    mockSelectEq.mockReturnThis();
    mockUpdateEq.mockReturnThis();
    mockDeleteEq.mockReturnThis();

    mockSingle.mockReturnThis();
    mockIn.mockReturnThis();
    mockOr.mockReturnThis();

    // Default return values for chains
    mockSelect.mockReturnValue({
      eq: mockSelectEq,
      in: mockIn,
      or: mockOr,
      single: mockSingle,
    });

    mockInsert.mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: mockSingle
      })
    });

    mockUpdate.mockReturnValue({
      eq: mockUpdateEq
    });

    mockDelete.mockReturnValue({
      eq: mockDeleteEq
    });

    // Select chain
    mockSelectEq.mockReturnValue({
      single: mockSingle,
      data: [],
      error: null
    });

    // Default leaf resolutions
    mockUpdateEq.mockResolvedValue({ data: null, error: null });
    mockDeleteEq.mockResolvedValue({ data: null, error: null });
    mockRpc.mockResolvedValue({ data: null, error: null });
    mockSingle.mockResolvedValue({ data: {}, error: null });
  });

  describe('handleSubmit', () => {
    it('should create a new tenant successfully', async () => {
      const formData = new FormData();
      formData.append('name', 'John Doe');
      formData.append('email', 'john@example.com');

      mockSingle.mockResolvedValueOnce({ data: { id: 'new-tenant-id' }, error: null });

      const result = await handleSubmit(formData);

      expect(mockSupabase.from).toHaveBeenCalledWith('Mieter');
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        name: 'John Doe',
        email: 'john@example.com',
      }));
      expect(revalidatePath).toHaveBeenCalledWith('/mieter');
      expect(logAction).toHaveBeenCalledWith('createTenant', 'success', expect.anything());
      expect(result).toEqual({ success: true });
    });

    it('should update an existing tenant successfully', async () => {
      const formData = new FormData();
      formData.append('id', 'tenant-123');
      formData.append('name', 'Jane Doe');

      mockUpdateEq.mockResolvedValueOnce({ error: null });

      const result = await handleSubmit(formData);

      expect(mockSupabase.from).toHaveBeenCalledWith('Mieter');
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Jane Doe',
      }));
      expect(mockUpdateEq).toHaveBeenCalledWith('id', 'tenant-123');
      expect(revalidatePath).toHaveBeenCalledWith('/mieter');
      expect(logAction).toHaveBeenCalledWith('updateTenant', 'success', expect.anything());
      expect(result).toEqual({ success: true });
    });

    it('should return error if insert fails', async () => {
      const formData = new FormData();
      formData.append('name', 'Fail User');

      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Insert failed' } });

      const result = await handleSubmit(formData);

      expect(result).toEqual({ success: false, error: { message: 'Insert failed' } });
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

  // "Alle Bewerber löschen" (GH-6): Die Datenbank kann einzelne Löschungen ablehnen (Bewerber mit hinterlegter Kaution).
  // Alle Löschungen werden abgewartet, die Meldung nennt die Gründe ohne technisches Präfix, die Liste wird bei einem
  // Teilerfolg neu geladen. Echte Meldung der Datenbank: "<CODE>: <deutsche Meldung>".
  describe('deleteAllApplicantsAction', () => {
    const KAUTION_GRUND = 'Der Mieter hat eine hinterlegte Kaution und kann nicht gelöscht werden.';
    const KAUTION_SPERRE = { message: `KAUT_GESPERRT: ${KAUTION_GRUND}`, code: 'KA009' };

    /** Bewerber der Abfrage; `rpcErrors` je Bewerber-ID (fehlt der Eintrag, gelingt die Löschung). */
    function bewerber(ids: string[], rpcErrors: Record<string, { message: string; code?: string }> = {}) {
      mockSelectEq.mockResolvedValueOnce({ data: ids.map((id) => ({ id })), error: null });
      mockRpc.mockImplementation(async (_name: string, args: { p_record_id: string }) => ({ error: rpcErrors[args.p_record_id] ?? null }));
    }

    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      mockRpc.mockReset();
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      // Nichts in die nächsten Tests tragen (Implementierung und nicht verbrauchte Antworten der Abfrage).
      mockRpc.mockReset();
      mockSelectEq.mockReset();
      consoleErrorSpy.mockRestore();
    });

    it('deletes all applicants and revalidates the tenant page', async () => {
      bewerber(['a1', 'a2']);

      const result = await deleteAllApplicantsAction();

      expect(result).toEqual({ success: true });
      expect(mockRpc).toHaveBeenCalledWith('soft_delete_record', { p_table_name: 'Mieter', p_record_id: 'a1' });
      expect(mockRpc).toHaveBeenCalledWith('soft_delete_record', { p_table_name: 'Mieter', p_record_id: 'a2' });
      expect(revalidatePath).toHaveBeenCalledWith('/mieter');
    });

    it('succeeds without applicants and deletes nothing', async () => {
      bewerber([]);

      expect(await deleteAllApplicantsAction()).toEqual({ success: true });
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it('works through ALL applicants on a partial failure and names the reason without the technical prefix', async () => {
      bewerber(['a1', 'a2', 'a3'], { a2: KAUTION_SPERRE });

      const result = await deleteAllApplicantsAction();

      expect(mockRpc).toHaveBeenCalledTimes(3);
      expect(result).toEqual({
        success: false,
        error: { message: `1 von 3 Bewerbern konnte nicht gelöscht werden. Grund: ${KAUTION_GRUND}` },
      });
      expect(result.error?.message).not.toContain('KAUT_GESPERRT');
      // Zwei Bewerber sind gelöscht: die Liste muss neu geladen werden.
      expect(revalidatePath).toHaveBeenCalledWith('/mieter');
    });

    it('uses the plural for several rejected applicants and collects each reason once', async () => {
      bewerber(['a1', 'a2', 'a3'], { a1: KAUTION_SPERRE, a2: KAUTION_SPERRE });

      const result = await deleteAllApplicantsAction();

      expect(result.error?.message).toBe(`2 von 3 Bewerbern konnten nicht gelöscht werden. Grund: ${KAUTION_GRUND}`);
    });

    it('reports that nothing could be deleted when every deletion is rejected', async () => {
      bewerber(['a1', 'a2'], { a1: KAUTION_SPERRE, a2: KAUTION_SPERRE });

      const result = await deleteAllApplicantsAction();

      expect(result).toEqual({
        success: false,
        error: { message: `Es konnten keine Bewerber gelöscht werden. Grund: ${KAUTION_GRUND}` },
      });
      expect(revalidatePath).not.toHaveBeenCalledWith('/mieter');
    });

    it('does not delete without the right', async () => {
      (hasPermission as jest.Mock).mockResolvedValueOnce(false);

      const result = await deleteAllApplicantsAction();

      expect(result).toEqual({ success: false, error: { message: 'Keine Berechtigung' } });
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  describe('getMieterByHausIdAction', () => {
    it('should fetch tenants by house id', async () => {
      // Mock step 1: fetch wohnungen
      mockSelectEq.mockResolvedValueOnce({ data: [{ id: 'w1' }, { id: 'w2' }], error: null });

      // Mock step 2: fetch mieter
      mockIn.mockResolvedValueOnce({ data: [{ id: 't1', name: 'Tenant 1' }], error: null });

      const result = await getMieterByHausIdAction('haus-1');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should return error if fetching wohnungen fails', async () => {
      mockSelectEq.mockResolvedValueOnce({ data: null, error: { message: 'Fetch failed' } });

      const result = await getMieterByHausIdAction('haus-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Fetch failed');
    });

    // Kautionsmanagement (GH-6): die Kaution kommt nicht mehr aus dem Altfeld Mieter.kaution, sondern über app/kautionen-actions.ts.
    it('getMieterByHausIdAction selects explicit columns without the legacy field kaution', async () => {
      mockSelectEq.mockResolvedValueOnce({ data: [{ id: 'w1' }], error: null });
      mockIn.mockResolvedValueOnce({ data: [{ id: 't1', name: 'Tenant 1' }], error: null });

      await getMieterByHausIdAction('haus-1');

      const selects = mockSelect.mock.calls.map((call) => call[0]);
      const mieterSelect = selects.find((value) => typeof value === 'string' && value.includes('Wohnungen('));
      expect(mieterSelect).toBeDefined();
      expect(mieterSelect).not.toMatch(/\*/);
      expect(mieterSelect).not.toMatch(/kaution/i);
      expect(mieterSelect).toContain('Wohnungen(name, groesse, miete)');
    });
  });
});
