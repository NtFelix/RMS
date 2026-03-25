import {
  searchMailSenders,
  getMailsBySender,
  createApplicantsFromMails,
  checkWorkerQueueStatus,
} from './mieter-import-actions';
import { createClient } from '@/utils/supabase/server';
import { posthogLogger } from '@/lib/posthog-logger';
import { revalidatePath } from 'next/cache';

// STANDARD SUPABASE MOCK PATTERN WITH CHAINING SUPPORT
// Supabase query builder chains must be awaitable (thenable) while still returning
// methods for chaining. We achieve this by returning an object that has the methods
// AND a 'then' method so it acts like a Promise.
const createMockQueryBuilder = () => {
  const mockBuilder: any = {
    // Chainable methods
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),

    // Promise interface (thenable)
    then: jest.fn((resolve) => resolve({ data: [], error: null })),
    catch: jest.fn(),
    finally: jest.fn(),
  };

  return mockBuilder;
};

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/posthog-logger', () => ({
  posthogLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    flush: jest.fn(),
  },
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('mieter-import-actions', () => {
  let mockSupabase: any;
  let mockBuilder: any;
  let originalFetch: typeof global.fetch;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockBuilder = createMockQueryBuilder();

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user_123' } }, error: null }),
      },
      from: jest.fn(() => mockBuilder),
      rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);

    originalFetch = global.fetch;
    global.fetch = jest.fn();

    process.env.WORKER_URL = 'https://mock-worker.com';
    process.env.WORKER_AUTH_KEY = 'mock_auth_key';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.WORKER_URL;
    delete process.env.WORKER_AUTH_KEY;
  });

  describe('searchMailSenders', () => {
    it('returns empty array if user not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('Auth error') });
      const result = await searchMailSenders('query');
      expect(result).toEqual([]);
    });

    it('returns empty array if query length < 2', async () => {
      const result = await searchMailSenders('q');
      expect(result).toEqual([]);
    });

    it('returns unique senders', async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({
          data: [{ absender: 'sender1@example.com' }, { absender: 'sender1@example.com' }, { absender: 'sender2@example.com' }],
          error: null,
        })
      );

      const result = await searchMailSenders('send');
      expect(result).toEqual(['sender1@example.com', 'sender2@example.com']);
      expect(mockSupabase.from).toHaveBeenCalledWith('Mail_Metadaten');
      expect(mockBuilder.select).toHaveBeenCalledWith('absender');
      expect(mockBuilder.eq).toHaveBeenCalledWith('user_id', 'user_123');
      expect(mockBuilder.ilike).toHaveBeenCalledWith('absender', '%send%');
    });

    it('returns empty array on error and logs it', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockBuilder.then.mockImplementationOnce((resolve: any) => resolve({ data: null, error: new Error('DB error') }));

      const result = await searchMailSenders('send');
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getMailsBySender', () => {
    it('returns empty array if user not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('Auth error') });
      const result = await getMailsBySender('sender@example.com');
      expect(result).toEqual([]);
    });

    it('returns mails matching sender and applies date filters', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');

      mockBuilder.then.mockImplementationOnce((resolve: any) =>
        resolve({
          data: [{ id: '1', betreff: 'Test' }],
          error: null,
        })
      );

      const result = await getMailsBySender('sender@example.com', startDate, endDate);
      expect(result).toEqual([{ id: '1', betreff: 'Test' }]);
      expect(mockBuilder.eq).toHaveBeenCalledWith('absender', 'sender@example.com');
      expect(mockBuilder.gte).toHaveBeenCalledWith('datum_erhalten', startDate.toISOString());
      expect(mockBuilder.lte).toHaveBeenCalledWith('datum_erhalten', expect.any(String));
    });

    it('returns empty array on error and logs it', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockBuilder.then.mockImplementationOnce((resolve: any) => resolve({ data: null, error: new Error('DB error') }));

      const result = await getMailsBySender('sender@example.com');
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('createApplicantsFromMails', () => {
    it('returns error if user not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('Auth error') });
      const result = await createApplicantsFromMails([{ id: '1', absender: 'test' }]);
      expect(result).toEqual({ success: false, error: 'Unauthorized: Please log in.' });
    });

    it('returns error if mails array is empty', async () => {
      const result = await createApplicantsFromMails([]);
      expect(result).toEqual({ success: false, error: 'No mails provided' });
    });

    it('inserts applicants successfully and queues them if dateipfad is provided', async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) => resolve({ error: null }));
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      const result = await createApplicantsFromMails([
        { id: '1', absender: '"John Doe" <john@example.com>', dateipfad: 'path/to/file' },
        { id: '2', absender: 'Jane <jane@example.com>', dateipfad: null },
      ]);

      expect(mockSupabase.from).toHaveBeenCalledWith('Mieter');
      expect(mockBuilder.insert).toHaveBeenCalledTimes(1);

      const insertArg = mockBuilder.insert.mock.calls[0][0];
      expect(insertArg[0]).toEqual(expect.objectContaining({ name: 'John Doe', email: 'john@example.com' }));
      expect(insertArg[1]).toEqual(expect.objectContaining({ name: 'Jane', email: 'jane@example.com' }));

      expect(revalidatePath).toHaveBeenCalledWith('/mieter');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('pgmq_send', expect.objectContaining({ queue_name: 'applicant_ai_processing' }));
      expect(global.fetch).toHaveBeenCalledWith('https://mock-worker.com/process-queue', expect.any(Object));
      expect(result.success).toBe(true);
      expect(result.queued).toBe(1);
    });

    it('handles insert errors', async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) => resolve({ error: { message: 'Insert failed' } }));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await createApplicantsFromMails([{ id: '1', absender: 'john@example.com' }]);

      expect(result).toEqual({
        success: false,
        count: 0,
        error: 'Import partially failed: Insert failed',
      });
      consoleErrorSpy.mockRestore();
    });

    it('handles pgmq_send rpc errors', async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) => resolve({ error: null }));
      mockSupabase.rpc.mockResolvedValueOnce({ error: 'RPC failed' });
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await createApplicantsFromMails([{ id: '1', absender: 'john@example.com', dateipfad: 'path/to/file' }]);

      expect(posthogLogger.error).toHaveBeenCalledWith('PGMQ Send Errors', expect.any(Object));
      consoleErrorSpy.mockRestore();
    });

    it('handles fetch worker kickoff failure gracefully via catch block', async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) => resolve({ error: null }));
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await createApplicantsFromMails([{ id: '1', absender: 'john@example.com', dateipfad: 'path/to/file' }]);

      expect(result.message).toContain('some warnings');
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('warns when no mails with content to process are provided', async () => {
      mockBuilder.then.mockImplementationOnce((resolve: any) => resolve({ error: null }));
      const result = await createApplicantsFromMails([{ id: '1', absender: 'john@example.com', dateipfad: null }]);

      expect(posthogLogger.warn).toHaveBeenCalledWith('No mails with stored content to process', { totalMails: 1 });
      expect(result.queued).toBe(0);
    });

    it('uses empty worker auth key in development if missing', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.WORKER_AUTH_KEY;
      mockBuilder.then.mockImplementationOnce((resolve: any) => resolve({ error: null }));
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

      await createApplicantsFromMails([{ id: '1', absender: 'john@example.com', dateipfad: 'path/to/file' }]);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://mock-worker.com/process-queue',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json', 'x-worker-auth': '' },
        })
      );
    });

    it('throws error if worker auth key is missing and not in dev', async () => {
      delete process.env.WORKER_AUTH_KEY;
      process.env.NODE_ENV = 'production';
      mockBuilder.then.mockImplementationOnce((resolve: any) => resolve({ error: null }));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await createApplicantsFromMails([{ id: '1', absender: 'john@example.com', dateipfad: 'path/to/file' }]);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result.message).toContain('warnings');
      consoleErrorSpy.mockRestore();
    });
  });

  describe('checkWorkerQueueStatus', () => {
    it('returns error if worker auth key is missing and not dev env', async () => {
      delete process.env.WORKER_AUTH_KEY;
      process.env.NODE_ENV = 'production';
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await checkWorkerQueueStatus('user_123');
      expect(result).toEqual({ hasMore: false, error: 'Configuration Error' });
      consoleErrorSpy.mockRestore();
    });

    it('uses empty key in development if worker auth key is missing', async () => {
      delete process.env.WORKER_AUTH_KEY;
      process.env.NODE_ENV = 'development';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ hasMore: true }),
      });

      const result = await checkWorkerQueueStatus('user_123');
      expect(result).toEqual({ hasMore: true, success: true });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://mock-worker.com/process-queue',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json', 'x-worker-auth': '' },
        })
      );
    });

    it('returns hasMore data on success', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ hasMore: false }),
      });

      const result = await checkWorkerQueueStatus('user_123');
      expect(result).toEqual({ hasMore: false, success: true });
    });

    it('handles worker returning error status', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error',
      });
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await checkWorkerQueueStatus('user_123');
      expect(result).toEqual({ hasMore: false, error: 'Worker Error' });
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('handles network error in polling', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Fetch failed'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await checkWorkerQueueStatus('user_123');
      expect(result).toEqual({ hasMore: false, error: 'Fetch failed' });
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
