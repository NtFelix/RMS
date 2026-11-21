import { searchMailSenders, getMailsBySender, createApplicantsFromMails, checkWorkerQueueStatus } from './mieter-import-actions';
import { ensureAuth } from '@/lib/auth-utils';
import { hasPermission } from '@/lib/permissions';
import { posthogLogger } from '@/lib/posthog-logger';

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn()
}));

jest.mock('@/lib/auth-utils', () => ({
  ensureAuth: jest.fn()
}));

jest.mock('@/lib/permissions', () => ({
  hasPermission: jest.fn()
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn()
}));

jest.mock('@/lib/posthog-logger', () => ({
  posthogLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    flush: jest.fn()
  }
}));

describe('mieter-import-actions', () => {
  let mockSupabase: any;
  const originalEnv = { ...process.env };

  afterEach(() => {
    for (const key in process.env) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [{ absender: 'sender1@example.com' }, { absender: 'sender2@example.com' }], error: null }),
      not: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null }),
      rpc: jest.fn().mockResolvedValue({ data: { bewerber_id: 'b-1', person_id: 'p-1' }, error: null })
    };

    (ensureAuth as jest.Mock).mockResolvedValue({ user: { id: 'test-user-id' }, supabase: mockSupabase });
    (hasPermission as jest.Mock).mockResolvedValue(true);
  });

  describe('searchMailSenders', () => {
    it('should successfully search mail senders', async () => {
      const result = await searchMailSenders('sender');
      expect(result).toEqual(['sender1@example.com', 'sender2@example.com']);
      expect(mockSupabase.from).toHaveBeenCalledWith('Mail_Metadaten');
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'test-user-id');
      expect(mockSupabase.ilike).toHaveBeenCalledWith('absender', '%sender%');
    });

    it('should return empty array if unauthorized', async () => {
      (hasPermission as jest.Mock).mockResolvedValue(false);
      const result = await searchMailSenders('sender');
      expect(result).toEqual([]);
    });
  });

  describe('getMailsBySender', () => {
    it('should successfully get mails by sender', async () => {
      const mockData = [{ id: '1', betreff: 'test', absender: 'sender1@example.com' }];
      mockSupabase.order.mockResolvedValue({ data: mockData, error: null });
      const result = await getMailsBySender('sender1@example.com');
      expect(result).toEqual(mockData);
      expect(mockSupabase.from).toHaveBeenCalledWith('Mail_Metadaten');
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'test-user-id');
      expect(mockSupabase.eq).toHaveBeenCalledWith('absender', 'sender1@example.com');
      expect(mockSupabase.not).toHaveBeenCalledWith('dateipfad', 'is', null);
      expect(mockSupabase.order).toHaveBeenCalledWith('datum_erhalten', { ascending: false });
    });
  });

  describe('createApplicantsFromMails', () => {
    it('should return unauthorized if not authenticated', async () => {
      (ensureAuth as jest.Mock).mockRejectedValue(new Error('Nicht authentifiziert'));
      const result = await createApplicantsFromMails([{ id: '1', absender: 'test@example.com', dateipfad: '/path/1' }]);
      expect(result).toEqual({ success: false, error: 'Nicht authentifiziert' });
    });

    it('should return forbidden if missing permission', async () => {
      (hasPermission as jest.Mock).mockResolvedValue(false);
      const result = await createApplicantsFromMails([{ id: '1', absender: 'test@example.com', dateipfad: '/path/1' }]);
      expect(result).toEqual({ success: false, error: 'Keine Berechtigung' });
    });

    it('should successfully create applicants and trigger worker', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      process.env.WORKER_AUTH_KEY = 'test-key';

      const mails = [{ id: '1', absender: 'sender1@example.com', dateipfad: '/path/1' }];
      const result = await createApplicantsFromMails(mails);

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('send_applicant_processing_message', { p_mail_id: '1' });
      expect(global.fetch).toHaveBeenCalled();
    });

    it('creates applicants through bewerber_anlegen and never writes to "Mieter"', async () => {
      const mails = [{ id: 'mail-1', absender: 'sender1@example.com' }];
      const result = await createApplicantsFromMails(mails);

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('bewerber_anlegen', {
        p_person: { nachname: 'sender1@example.com', email: 'sender1@example.com' },
        p_bewerber: { bewerbung_mail_id: 'mail-1' },
      });
      expect(mockSupabase.from).not.toHaveBeenCalledWith('Mieter');
      expect(mockSupabase.insert).not.toHaveBeenCalled();
    });

    it('takes the sender name into the last name and the address from the angle brackets', async () => {
      await createApplicantsFromMails([{ id: 'mail-2', absender: '"Max Muster" <max@example.test>' }]);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('bewerber_anlegen', {
        p_person: { nachname: 'Max Muster', email: 'max@example.test' },
        p_bewerber: { bewerbung_mail_id: 'mail-2' },
      });
    });

    it('reports failed applicants without the technical code and keeps the successful ones', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'PERSON_EINGABE_UNGUELTIG: Vor- oder Nachname ist erforderlich.' } });

      const result = await createApplicantsFromMails([
        { id: 'mail-3', absender: '<leer@example.test>' },
        { id: 'mail-4', absender: 'Erika Beispiel <erika@example.test>' },
      ]);

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.error).toBe('Import partially failed: Vor- oder Nachname ist erforderlich.');
    });
  });

  describe('checkWorkerQueueStatus', () => {
    it('should successfully check worker queue status', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ hasMore: true })
      });
      process.env.WORKER_AUTH_KEY = 'test-key';

      const result = await checkWorkerQueueStatus('test-user-id');
      expect(result).toEqual({ hasMore: true, success: true });
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
