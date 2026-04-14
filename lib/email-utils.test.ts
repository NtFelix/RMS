import { createClient } from '@/utils/supabase/client';
import pako from 'pako';
import {
  fetchEmailMetadata,
  fetchEmailById,
  fetchEmailBodyFromStorage,
  updateEmailReadStatus,
  deleteEmailPermanently,
  getEmailSummary
} from './email-utils';

// Mock dependencies
jest.mock('@/utils/supabase/client');
jest.mock('pako');

// Define mock instances
const mockStorageDownload = jest.fn();
const mockStorageList = jest.fn();
const mockStorageRemove = jest.fn();

const mockQueryBuilder = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  then: jest.fn().mockImplementation(function(resolve: any) {
    return Promise.resolve({ data: [], error: null, count: 0 }).then(resolve);
  }),
};

const mockSupabase = {
  from: jest.fn().mockReturnValue(mockQueryBuilder),
  storage: {
    from: jest.fn().mockReturnValue({
      download: mockStorageDownload,
      list: mockStorageList,
      remove: mockStorageRemove,
    }),
  },
  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
  },
};

(createClient as jest.Mock).mockReturnValue(mockSupabase);

describe('Email Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset query builder
    mockQueryBuilder.select.mockReturnThis();
    mockQueryBuilder.eq.mockReturnThis();
    mockQueryBuilder.order.mockReturnThis();
    mockQueryBuilder.range.mockReturnThis();
    mockQueryBuilder.single.mockReturnThis();
    mockQueryBuilder.update.mockReturnThis();
    mockQueryBuilder.delete.mockReturnThis();
    mockQueryBuilder.or.mockReturnThis();
    
    // Default leaf resolutions
    mockQueryBuilder.then.mockImplementation(function(resolve: any) {
      return Promise.resolve({ data: [], error: null, count: 0 }).then(resolve);
    });
  });

  describe('fetchEmailMetadata', () => {
    it('fetches email metadata with correct parameters', async () => {
      mockQueryBuilder.then.mockImplementationOnce(function(resolve: any) {
        return Promise.resolve({ data: [{ id: '1' }], error: null, count: 1 }).then(resolve);
      });

      const result = await fetchEmailMetadata('user-1', 'inbox', 10, 0);

      expect(mockSupabase.from).toHaveBeenCalledWith('Mail_Metadaten');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('ordner', 'inbox');
      expect(mockQueryBuilder.range).toHaveBeenCalledWith(0, 9);
      expect(result.emails).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('throws error if fetch fails', async () => {
      mockQueryBuilder.then.mockImplementationOnce(function(resolve: any) {
        return Promise.resolve({ data: null, error: { message: 'DB Error' } }).then(resolve);
      });

      await expect(fetchEmailMetadata('user-1')).rejects.toEqual({ message: 'DB Error' });
    });
  });

  describe('fetchEmailById', () => {
    it('fetches single email by ID', async () => {
      mockQueryBuilder.then.mockImplementationOnce(function(resolve: any) {
        return Promise.resolve({ data: { id: '1', betreff: 'Test' }, error: null }).then(resolve);
      });

      const result = await fetchEmailById('1');

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1');
      expect(result.betreff).toBe('Test');
    });
  });

  describe('fetchEmailBodyFromStorage', () => {
    it('downloads and decompresses email body', async () => {
      const mockBlob = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8))
      };
      mockStorageDownload.mockResolvedValue({ data: mockBlob, error: null });
      (pako.ungzip as jest.Mock).mockReturnValue(JSON.stringify({ plain: 'Hello', html: '<b>Hello</b>' }));

      const result = await fetchEmailBodyFromStorage('path/to/mail.gz');

      expect(mockStorageDownload).toHaveBeenCalledWith('path/to/mail.gz');
      expect(pako.ungzip).toHaveBeenCalled();
      expect(result.plain).toBe('Hello');
    });

    it('throws error if download fails', async () => {
      mockStorageDownload.mockResolvedValue({ data: null, error: { message: 'Download Error' } });

      await expect(fetchEmailBodyFromStorage('path/to/mail.gz')).rejects.toThrow('Failed to download email body');
    });
  });

  describe('updateEmailReadStatus', () => {
    it('updates read status correctly', async () => {
      mockQueryBuilder.then.mockImplementationOnce((resolve: any) => Promise.resolve({ error: null }).then(resolve));

      await updateEmailReadStatus('1', true);

      expect(mockQueryBuilder.update).toHaveBeenCalledWith({ ist_gelesen: true });
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', '1');
    });
  });

  describe('deleteEmailPermanently', () => {
    it('deletes email from storage and database', async () => {
      // 1. Mock fetch metadata
      mockQueryBuilder.then.mockImplementationOnce((resolve: any) => 
        Promise.resolve({ data: { dateipfad: 'path/1', user_id: 'user-1' }, error: null }).then(resolve)
      );
      
      // 2. Mock storage list (folder and attachments)
      mockStorageList
        .mockResolvedValueOnce({ data: [{ name: 'body.gz' }], error: null }) // folder
        .mockResolvedValueOnce({ data: [], error: null }); // attachments

      // 3. Mock storage remove
      mockStorageRemove.mockResolvedValue({ error: null });

      // 4. Mock database delete
      mockQueryBuilder.then.mockImplementationOnce((resolve: any) => 
        Promise.resolve({ error: null }).then(resolve)
      );

      await deleteEmailPermanently('1', 'user-1');

      expect(mockStorageRemove).toHaveBeenCalledWith(expect.arrayContaining(['path/1', 'user-1/1/body.gz']));
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
    });

    it('throws error if verification fails', async () => {
      mockQueryBuilder.then.mockImplementationOnce((resolve: any) => 
        Promise.resolve({ data: null, error: { message: 'Not found' } }).then(resolve)
      );

      await expect(deleteEmailPermanently('1', 'user-1')).rejects.toThrow('Email nicht gefunden');
    });
  });

  describe('getEmailSummary', () => {
    it('uses RPC when available', async () => {
      const mockSummary = { total: 10, unread: 2 };
      mockSupabase.rpc.mockResolvedValue({ data: mockSummary, error: null });

      const result = await getEmailSummary();

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_mail_summary');
      expect(result).toEqual(mockSummary);
    });

    it('falls back to legacy counts if RPC fails', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'Not allowed' } });
      
      // Mock getUser
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

      // Mock multiple count queries
      mockQueryBuilder.then.mockImplementation((resolve: any) => 
        Promise.resolve({ count: 5, error: null }).then(resolve)
      );

      const result = await getEmailSummary();

      expect(result.total).toBe(5);
      expect(mockQueryBuilder.select).toHaveBeenCalled();
    });
  });
});
