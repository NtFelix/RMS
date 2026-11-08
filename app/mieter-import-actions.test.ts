import { searchMailSenders, getMailsBySender, createApplicantsFromMails, checkWorkerQueueStatus } from './mieter-import-actions';
import { ensureAuth } from '@/lib/auth-utils';
import { hasPermission } from '@/lib/permissions';
import { posthogLogger } from '@/lib/posthog-logger';
import { revalidatePath } from 'next/cache';

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

const flushPromises = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const setNodeEnv = (value: string) => {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
};

describe('mieter-import-actions', () => {
  let mockSupabase: any;
  const originalEnv = { ...process.env };
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  // Thenable query builder for getMailsBySender with date filters (gte/lte are awaited at the end)
  const mockDateFilterQuery = (result: { data: unknown; error: unknown }) => {
    const builder: {
      gte: jest.Mock;
      lte: jest.Mock;
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise<unknown>;
    } = {
      gte: jest.fn(() => builder),
      lte: jest.fn(() => builder),
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.resolve(result).then(resolve, reject)
    };
    mockSupabase.order.mockReturnValue(builder);
    return builder;
  };

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
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

    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Start every test without worker configuration; individual tests set what they need
    delete process.env.WORKER_URL;
    delete process.env.WORKER_AUTH_KEY;

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
      rpc: jest.fn().mockResolvedValue({ error: null })
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

    it('should return empty array and skip the database when ensureAuth throws', async () => {
      (ensureAuth as jest.Mock).mockRejectedValueOnce(new Error('Nicht authentifiziert'));
      const result = await searchMailSenders('erika');
      expect(result).toEqual([]);
      expect(hasPermission).not.toHaveBeenCalled();
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should check the mieter/ansehen permission and skip the database when permission is missing', async () => {
      (hasPermission as jest.Mock).mockResolvedValue(false);
      const result = await searchMailSenders('erika');
      expect(result).toEqual([]);
      expect(hasPermission).toHaveBeenCalledWith('mieter', 'ansehen');
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should return empty array without querying when query is empty', async () => {
      const result = await searchMailSenders('');
      expect(result).toEqual([]);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should return empty array without querying when query has only one character', async () => {
      const result = await searchMailSenders('e');
      expect(result).toEqual([]);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should run the search when query has exactly two characters', async () => {
      const result = await searchMailSenders('er');
      expect(result).toEqual(['sender1@example.com', 'sender2@example.com']);
      expect(mockSupabase.ilike).toHaveBeenCalledWith('absender', '%er%');
      expect(mockSupabase.limit).toHaveBeenCalledWith(50);
    });

    it('should return empty array and log the error when Supabase returns an error', async () => {
      const dbError = { message: 'db unavailable' };
      mockSupabase.limit.mockResolvedValueOnce({ data: null, error: dbError });
      const result = await searchMailSenders('erika');
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error searching mail senders:', dbError);
    });

    it('should deduplicate senders and drop empty values', async () => {
      mockSupabase.limit.mockResolvedValueOnce({
        data: [
          { absender: 'erika@example.com' },
          { absender: 'erika@example.com' },
          { absender: null },
          { absender: '' },
          { absender: 'max@example.com' }
        ],
        error: null
      });
      const result = await searchMailSenders('ex');
      expect(result).toEqual(['erika@example.com', 'max@example.com']);
      expect(mockSupabase.limit).toHaveBeenCalledWith(50);
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

    it('should return empty array and skip the database when ensureAuth throws', async () => {
      (ensureAuth as jest.Mock).mockRejectedValueOnce(new Error('Nicht authentifiziert'));
      const result = await getMailsBySender('erika@example.com');
      expect(result).toEqual([]);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should return empty array without querying when permission is missing', async () => {
      (hasPermission as jest.Mock).mockResolvedValue(false);
      const result = await getMailsBySender('erika@example.com');
      expect(result).toEqual([]);
      expect(hasPermission).toHaveBeenCalledWith('mieter', 'ansehen');
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should return empty array and log the error when Supabase returns an error', async () => {
      const dbError = { message: 'timeout' };
      mockSupabase.order.mockResolvedValueOnce({ data: null, error: dbError });
      const result = await getMailsBySender('erika@example.com');
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching mails by sender:', dbError);
    });

    it('should not apply any date filter when no dates are given', async () => {
      const query = mockDateFilterQuery({ data: [], error: null });
      await getMailsBySender('erika@example.com');
      expect(query.gte).not.toHaveBeenCalled();
      expect(query.lte).not.toHaveBeenCalled();
    });

    it('should apply only a lower bound when only startDate is given', async () => {
      const query = mockDateFilterQuery({ data: [], error: null });
      const startDate = new Date('2026-01-01T00:00:00.000Z');
      await getMailsBySender('erika@example.com', startDate);
      expect(query.gte).toHaveBeenCalledWith('datum_erhalten', '2026-01-01T00:00:00.000Z');
      expect(query.lte).not.toHaveBeenCalled();
    });

    it('should apply an upper bound at the end of endDate and not mutate endDate', async () => {
      const query = mockDateFilterQuery({ data: [], error: null });
      const endDate = new Date(2026, 0, 31, 12, 30, 15, 500);
      const originalTime = endDate.getTime();
      await getMailsBySender('erika@example.com', undefined, endDate);

      expect(query.gte).not.toHaveBeenCalled();
      expect(query.lte).toHaveBeenCalledTimes(1);
      const [column, isoValue] = query.lte.mock.calls[0];
      expect(column).toBe('datum_erhalten');

      const upperBound = new Date(isoValue);
      expect(upperBound.getFullYear()).toBe(2026);
      expect(upperBound.getMonth()).toBe(0);
      expect(upperBound.getDate()).toBe(31);
      expect(upperBound.getHours()).toBe(23);
      expect(upperBound.getMinutes()).toBe(59);
      expect(upperBound.getSeconds()).toBe(59);
      expect(upperBound.getMilliseconds()).toBe(999);

      expect(endDate.getTime()).toBe(originalTime);
    });

    it('should apply both bounds when startDate and endDate are given', async () => {
      const mockData = [{ id: 'm1', absender: 'erika@example.com' }];
      const query = mockDateFilterQuery({ data: mockData, error: null });
      const startDate = new Date(2026, 0, 1);
      const endDate = new Date(2026, 0, 31);
      const result = await getMailsBySender('erika@example.com', startDate, endDate);

      expect(result).toEqual(mockData);
      expect(query.gte).toHaveBeenCalledWith('datum_erhalten', startDate.toISOString());
      expect(query.lte).toHaveBeenCalledWith('datum_erhalten', expect.any(String));
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
      expect(mockSupabase.from).toHaveBeenCalledWith('Mieter');
      expect(mockSupabase.insert).toHaveBeenCalled();
      expect(mockSupabase.rpc).toHaveBeenCalledWith('send_applicant_processing_message', { p_mail_id: '1' });
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should return unauthorized without inserting when ensureAuth throws', async () => {
      (ensureAuth as jest.Mock).mockRejectedValueOnce(new Error('no session'));
      const result = await createApplicantsFromMails([{ id: '1', absender: 'erika@example.com' }]);
      expect(result).toEqual({ success: false, error: 'Nicht authentifiziert' });
      expect(mockSupabase.insert).not.toHaveBeenCalled();
    });

    it('should parse quoted, unquoted and bare sender addresses into applicant payloads', async () => {
      const mails = [
        { id: 'm1', absender: '"Erika Muster" <erika@example.com>' },
        { id: 'm2', absender: 'Max Mustermann <max@example.com>' },
        { id: 'm3', absender: 'erika.bare@example.com' }
      ];
      const result = await createApplicantsFromMails(mails);

      expect(result.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('Mieter');
      expect(mockSupabase.insert).toHaveBeenCalledTimes(1);
      expect(mockSupabase.insert.mock.calls[0][0]).toEqual([
        { name: 'Erika Muster', email: 'erika@example.com', status: 'bewerber', bewerbung_mail_id: 'm1' },
        { name: 'Max Mustermann', email: 'max@example.com', status: 'bewerber', bewerbung_mail_id: 'm2' },
        { name: 'erika.bare@example.com', email: 'erika.bare@example.com', status: 'bewerber', bewerbung_mail_id: 'm3' }
      ]);
    });

    it('should return an error without inserting when no mails are provided', async () => {
      const result = await createApplicantsFromMails([]);
      expect(result).toEqual({ success: false, error: 'No mails provided' });
      expect(mockSupabase.insert).not.toHaveBeenCalled();
    });

    it('should return an error without inserting when mails is null or undefined', async () => {
      expect(await createApplicantsFromMails(null as unknown as never[])).toEqual({ success: false, error: 'No mails provided' });
      expect(await createApplicantsFromMails(undefined as unknown as never[])).toEqual({ success: false, error: 'No mails provided' });
      expect(mockSupabase.insert).not.toHaveBeenCalled();
    });

    it('should insert applicants in chunks of 100', async () => {
      const mails = Array.from({ length: 250 }, (_, i) => ({ id: `mail-${i}`, absender: `sender${i}@example.com` }));
      const result = await createApplicantsFromMails(mails);

      expect(mockSupabase.insert).toHaveBeenCalledTimes(3);
      const chunkSizes = mockSupabase.insert.mock.calls.map((call: unknown[]) => (call[0] as unknown[]).length);
      expect(chunkSizes).toEqual([100, 100, 50]);
      expect(result).toMatchObject({ success: true, count: 250 });
    });

    it('should report partial success and skip queueing when a later chunk fails', async () => {
      const mails = Array.from({ length: 250 }, (_, i) => ({
        id: `mail-${i}`,
        absender: `sender${i}@example.com`,
        dateipfad: `/path/${i}`
      }));
      mockSupabase.insert
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: { message: 'chunk 2 failed' } })
        .mockResolvedValueOnce({ error: null });

      const result = await createApplicantsFromMails(mails);

      expect(result).toEqual({
        success: true,
        count: 150,
        error: 'Import partially failed: chunk 2 failed'
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error inserting applicants chunk:', { message: 'chunk 2 failed' });
      expect(mockSupabase.rpc).not.toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith('/mieter');
    });

    it('should return failure with count 0 when every insert fails', async () => {
      mockSupabase.insert.mockResolvedValue({ error: { message: 'db down' } });
      const mails = [{ id: 'm1', absender: 'erika@example.com', dateipfad: '/path/1' }];

      const result = await createApplicantsFromMails(mails);

      expect(result).toEqual({ success: false, count: 0, error: 'Import partially failed: db down' });
      expect(mockSupabase.rpc).not.toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith('/mieter');
    });

    it('should revalidate /mieter after inserting applicants', async () => {
      const result = await createApplicantsFromMails([{ id: 'm1', absender: 'erika@example.com' }]);

      expect(result.success).toBe(true);
      expect(revalidatePath).toHaveBeenCalledWith('/mieter');
      const insertOrder = mockSupabase.insert.mock.invocationCallOrder[0];
      const revalidateOrder = (revalidatePath as jest.Mock).mock.invocationCallOrder[0];
      expect(revalidateOrder).toBeGreaterThan(insertOrder);
    });

    it('should skip queueing and warn when no mail has stored content', async () => {
      const result = await createApplicantsFromMails([{ id: 'm1', absender: 'erika@example.com' }]);

      expect(result).toEqual({
        success: true,
        count: 1,
        queued: 0,
        hasMore: false,
        userId: 'test-user-id',
        message: 'Import successful. 0 mails queued for AI processing.'
      });
      expect(posthogLogger.warn).toHaveBeenCalledWith('No mails with stored content to process', { totalMails: 1 });
      expect(mockSupabase.rpc).not.toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
      expect(posthogLogger.flush).toHaveBeenCalled();
    });

    it('should queue only mails with dateipfad, in batches of 10', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      process.env.WORKER_AUTH_KEY = 'test-key';

      const withContent = Array.from({ length: 25 }, (_, i) => ({
        id: `mail-${i}`,
        absender: `sender${i}@example.com`,
        dateipfad: `/path/${i}`
      }));
      const withoutContent = [
        { id: 'no-path-1', absender: 'erika@example.com', dateipfad: null },
        { id: 'no-path-2', absender: 'max@example.com' }
      ];

      // Hold each RPC open so the batch boundaries become observable
      const pending: Array<(value: { error: null }) => void> = [];
      mockSupabase.rpc.mockImplementation(() => new Promise((resolve) => pending.push(resolve)));

      const resultPromise = createApplicantsFromMails([...withContent, ...withoutContent]);

      await flushPromises();
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(10);
      pending.splice(0).forEach((resolve) => resolve({ error: null }));

      await flushPromises();
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(20);
      pending.splice(0).forEach((resolve) => resolve({ error: null }));

      await flushPromises();
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(25);
      pending.splice(0).forEach((resolve) => resolve({ error: null }));

      const result = await resultPromise;

      const queuedIds = mockSupabase.rpc.mock.calls.map((call: unknown[]) => (call[1] as { p_mail_id: string }).p_mail_id);
      expect(queuedIds).toEqual(withContent.map((mail) => mail.id));
      expect(result).toMatchObject({ success: true, count: 27, queued: 25, hasMore: true });
      expect(posthogLogger.info).toHaveBeenCalledWith('Applicants Queued', { count: 25 });
    });

    it('should log PGMQ send errors and still return success', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      process.env.WORKER_AUTH_KEY = 'test-key';
      mockSupabase.rpc.mockImplementation(async (_name: string, args: { p_mail_id: string }) => {
        if (args.p_mail_id === 'm1') return { error: { message: 'queue full' } };
        if (args.p_mail_id === 'm3') return { error: { message: 'timeout' } };
        return { error: null };
      });
      const mails = [
        { id: 'm1', absender: 'erika@example.com', dateipfad: '/path/1' },
        { id: 'm2', absender: 'max@example.com', dateipfad: '/path/2' },
        { id: 'm3', absender: 'erika2@example.com', dateipfad: '/path/3' }
      ];

      const result = await createApplicantsFromMails(mails);

      expect(posthogLogger.error).toHaveBeenCalledWith('PGMQ Send Errors', {
        count: 2,
        errors: [JSON.stringify({ message: 'queue full' }), JSON.stringify({ message: 'timeout' })]
      });
      expect(posthogLogger.info).not.toHaveBeenCalledWith('Applicants Queued', expect.anything());
      expect(result).toMatchObject({ success: true, count: 3, queued: 3 });
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should kick off the worker at WORKER_URL with auth header and user id', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      process.env.WORKER_URL = 'https://worker.example.com';
      process.env.WORKER_AUTH_KEY = 'test-key';

      await createApplicantsFromMails([{ id: 'm1', absender: 'erika@example.com', dateipfad: '/path/1' }]);

      expect(global.fetch).toHaveBeenCalledWith('https://worker.example.com/process-queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-worker-auth': 'test-key'
        },
        body: JSON.stringify({ user_id: 'test-user-id' })
      });
      expect(posthogLogger.flush).toHaveBeenCalled();
    });

    it('should fall back to the default worker URL when WORKER_URL is not set', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      process.env.WORKER_AUTH_KEY = 'test-key';

      await createApplicantsFromMails([{ id: 'm1', absender: 'erika@example.com', dateipfad: '/path/1' }]);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://backend.mietevo.de/process-queue',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should return success with a warning when the worker responds with an error status', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' });
      process.env.WORKER_AUTH_KEY = 'test-key';

      const result = await createApplicantsFromMails([{ id: 'm1', absender: 'erika@example.com', dateipfad: '/path/1' }]);

      expect(result).toEqual({
        success: true,
        count: 1,
        queued: 1,
        hasMore: true,
        userId: 'test-user-id',
        message: 'Imported 1 applicants with some warnings. Queued 1 for AI processing.'
      });
      expect(posthogLogger.error).toHaveBeenCalledWith('Queueing AI processing failed', {
        error: 'AI Processing kickoff failed: Worker returned 500 Internal Server Error'
      });
      expect(posthogLogger.flush).toHaveBeenCalled();
    });

    it('should return success with a warning when the worker request rejects', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('net down'));
      process.env.WORKER_AUTH_KEY = 'test-key';

      const result = await createApplicantsFromMails([{ id: 'm1', absender: 'erika@example.com', dateipfad: '/path/1' }]);

      expect(result).toMatchObject({ success: true, count: 1, message: expect.stringContaining('some warnings') });
      expect(posthogLogger.error).toHaveBeenCalledWith('Queueing AI processing failed', {
        error: 'AI Processing kickoff failed: net down'
      });
    });

    it('should stringify a non-Error worker rejection into the kickoff error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue('boom');
      process.env.WORKER_AUTH_KEY = 'test-key';

      const result = await createApplicantsFromMails([{ id: 'm1', absender: 'erika@example.com', dateipfad: '/path/1' }]);

      expect(result).toMatchObject({ success: true, count: 1, message: expect.stringContaining('some warnings') });
      expect(posthogLogger.error).toHaveBeenCalledWith('Queueing AI processing failed', {
        error: 'AI Processing kickoff failed: boom'
      });
    });

    it('should use the fallback message when queueing rejects with a non-Error value', async () => {
      mockSupabase.rpc.mockRejectedValue('rpc unavailable');
      process.env.WORKER_AUTH_KEY = 'test-key';

      const result = await createApplicantsFromMails([{ id: 'm1', absender: 'erika@example.com', dateipfad: '/path/1' }]);

      expect(result).toMatchObject({ success: true, count: 1, message: expect.stringContaining('some warnings') });
      expect(global.fetch).not.toHaveBeenCalled();
      expect(posthogLogger.error).toHaveBeenCalledWith('Queueing AI processing failed', {
        error: 'AI Processing verification failed to start.'
      });
    });

    it.each(['test', 'production'])(
      'should not call the worker and should warn when WORKER_AUTH_KEY is missing and NODE_ENV is %s',
      async (nodeEnv) => {
        setNodeEnv(nodeEnv);
        (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

        const result = await createApplicantsFromMails([{ id: 'm1', absender: 'erika@example.com', dateipfad: '/path/1' }]);

        expect(global.fetch).not.toHaveBeenCalled();
        expect(posthogLogger.error).toHaveBeenCalledWith('Queueing AI processing failed', {
          error: 'Worker authentication key is not configured.'
        });
        expect(result).toMatchObject({ success: true, count: 1, message: expect.stringContaining('some warnings') });
      }
    );

    it('should call the worker with an empty auth key in development when WORKER_AUTH_KEY is missing', async () => {
      setNodeEnv('development');
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      const result = await createApplicantsFromMails([{ id: 'm1', absender: 'erika@example.com', dateipfad: '/path/1' }]);

      expect(consoleWarnSpy).toHaveBeenCalledWith('WORKER_AUTH_KEY not set. Using empty key for development.');
      expect(global.fetch).toHaveBeenCalledWith('https://backend.mietevo.de/process-queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-worker-auth': ''
        },
        body: JSON.stringify({ user_id: 'test-user-id' })
      });
      expect(result).toMatchObject({ success: true, count: 1, queued: 1 });
    });

    it('should return userId, queued count and hasMore on success', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      process.env.WORKER_AUTH_KEY = 'test-key';

      const result = await createApplicantsFromMails([
        { id: 'm1', absender: 'erika@example.com', dateipfad: '/path/1' },
        { id: 'm2', absender: 'max@example.com' }
      ]);

      expect(result).toEqual({
        success: true,
        count: 2,
        queued: 1,
        hasMore: true,
        userId: 'test-user-id',
        message: 'Import successful. 1 mails queued for AI processing.'
      });
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

    it('should return Nicht authentifiziert when ensureAuth throws', async () => {
      (ensureAuth as jest.Mock).mockRejectedValueOnce(new Error('no session'));
      const result = await checkWorkerQueueStatus('test-user-id');
      expect(result).toEqual({ hasMore: false, error: 'Nicht authentifiziert' });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return Keine Berechtigung without calling the worker when permission is missing', async () => {
      (hasPermission as jest.Mock).mockResolvedValue(false);
      const result = await checkWorkerQueueStatus('test-user-id');
      expect(result).toEqual({ hasMore: false, error: 'Keine Berechtigung' });
      expect(hasPermission).toHaveBeenCalledWith('mieter', 'ansehen');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should refuse to poll the queue of another user', async () => {
      process.env.WORKER_AUTH_KEY = 'test-key';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ hasMore: true })
      });
      const result = await checkWorkerQueueStatus('other-user-id');
      expect(result).toEqual({ hasMore: false, error: 'Nicht authentifiziert' });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it.each(['test', 'production'])(
      'should return Configuration Error without calling the worker when key is missing and NODE_ENV is %s',
      async (nodeEnv) => {
        setNodeEnv(nodeEnv);
        (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
        const result = await checkWorkerQueueStatus('test-user-id');
        expect(result).toEqual({ hasMore: false, error: 'Configuration Error' });
        expect(global.fetch).not.toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalledWith('Worker authentication key is not configured.');
      }
    );

    it('should poll the worker with an empty auth key in development when key is missing', async () => {
      setNodeEnv('development');
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ hasMore: false })
      });

      const result = await checkWorkerQueueStatus('test-user-id');

      expect(result).toEqual({ hasMore: false, success: true });
      expect(global.fetch).toHaveBeenCalledWith('https://backend.mietevo.de/process-queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-worker-auth': ''
        },
        body: JSON.stringify({ user_id: 'test-user-id' })
      });
    });

    it('should return Worker Error when the worker responds with a non-ok status', async () => {
      process.env.WORKER_AUTH_KEY = 'test-key';
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 503, statusText: 'Service Unavailable' });
      const result = await checkWorkerQueueStatus('test-user-id');
      expect(result).toEqual({ hasMore: false, error: 'Worker Error' });
      expect(consoleErrorSpy).toHaveBeenCalledWith('Worker returned 503 Service Unavailable');
    });

    it('should return the error message when fetch rejects with an Error', async () => {
      process.env.WORKER_AUTH_KEY = 'test-key';
      (global.fetch as jest.Mock).mockRejectedValue(new Error('net down'));
      const result = await checkWorkerQueueStatus('test-user-id');
      expect(result).toEqual({ hasMore: false, error: 'net down' });
    });

    it('should return Polling error when fetch rejects with a non-Error value', async () => {
      process.env.WORKER_AUTH_KEY = 'test-key';
      (global.fetch as jest.Mock).mockRejectedValue('boom');
      const result = await checkWorkerQueueStatus('test-user-id');
      expect(result).toEqual({ hasMore: false, error: 'Polling error' });
      expect(consoleErrorSpy).toHaveBeenCalledWith('Polling error:', 'boom');
    });

    it('should send the expected POST request and return hasMore from the worker', async () => {
      process.env.WORKER_URL = 'https://worker.example.com';
      process.env.WORKER_AUTH_KEY = 'test-key';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ hasMore: false })
      });

      const result = await checkWorkerQueueStatus('test-user-id');

      expect(result).toEqual({ hasMore: false, success: true });
      expect(global.fetch).toHaveBeenCalledWith('https://worker.example.com/process-queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-worker-auth': 'test-key'
        },
        body: JSON.stringify({ user_id: 'test-user-id' })
      });
    });
  });
});
