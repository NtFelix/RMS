import { getFinanceDocumentPath, getFinanceDocumentUrl, deleteFinanceDocument, getFinanceDocumentInfo } from './finance-file-actions';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// Mock dependencies
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('finance-file-actions', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      storage: {
        from: jest.fn().mockReturnThis(),
        createSignedUrl: jest.fn(),
        remove: jest.fn(),
      },
    };

    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  describe('getFinanceDocumentPath', () => {
    it('should return path with Allgemein when no wohnungId is provided', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      const result = await getFinanceDocumentPath();

      expect(result).toEqual({
        success: true,
        path: 'user_user123/Rechnungen/Allgemein',
      });
    });

    it('should return error when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error' },
      });

      const result = await getFinanceDocumentPath();

      expect(result).toEqual({
        success: false,
        error: 'Nicht authentifiziert',
      });
    });

    it('should return correct path for a given apartment', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'apt1',
          name: 'Apartment 1',
          Haeuser: { name: 'House A' },
        },
        error: null,
      });

      const result = await getFinanceDocumentPath('apt1');

      expect(result).toEqual({
        success: true,
        path: 'user_user123/Rechnungen/House_A/Apartment_1',
      });
    });

    it('should sanitize folder names', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'apt1',
          name: 'München Apartment',
          Haeuser: { name: 'Grüner Weg' },
        },
        error: null,
      });

      const result = await getFinanceDocumentPath('apt1');

      expect(result).toEqual({
        success: true,
        path: 'user_user123/Rechnungen/Gruener_Weg/Muenchen_Apartment',
      });
    });

    it('should return error if apartment not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await getFinanceDocumentPath('apt1');

      expect(result).toEqual({
        success: false,
        error: 'Wohnung konnte nicht gefunden werden, um den Dateipfad zu erstellen.',
      });
    });
  });

  describe('getFinanceDocumentUrl', () => {
    it('should return signed url', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          dateipfad: 'path/to',
          dateiname: 'file.pdf',
        },
        error: null,
      });

      mockSupabase.storage.createSignedUrl.mockResolvedValue({
        data: { signedUrl: 'https://example.com/file.pdf' },
        error: null,
      });

      const result = await getFinanceDocumentUrl('doc1');

      expect(result).toEqual({
        success: true,
        url: 'https://example.com/file.pdf',
        filename: 'file.pdf',
      });
    });

    it('should return error if document id is missing', async () => {
        // @ts-ignore
      const result = await getFinanceDocumentUrl(null);
      expect(result).toEqual({ success: false, error: 'Keine Dokument-ID angegeben' });
    });

    it('should return error if document not found', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const result = await getFinanceDocumentUrl('doc1');

      expect(result).toEqual({ success: false, error: 'Dokument nicht gefunden' });
    });
  });

  describe('deleteFinanceDocument', () => {
    it('should delete document and revalidate path', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      });

      mockSupabase.single.mockResolvedValue({
        data: {
          dateipfad: 'path/to',
          dateiname: 'file.pdf',
          user_id: 'user123',
        },
        error: null,
      });

      mockSupabase.storage.remove.mockResolvedValue({ error: null });

      const result = await deleteFinanceDocument('doc1');

      expect(result).toEqual({ success: true });
      expect(revalidatePath).toHaveBeenCalledWith('/finanzen');
    });

    it('should return error if user does not own document', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user456' } },
        error: null,
      });

      mockSupabase.single.mockResolvedValue({
        data: {
          dateipfad: 'path/to',
          dateiname: 'file.pdf',
          user_id: 'user123',
        },
        error: null,
      });

      const result = await deleteFinanceDocument('doc1');

      expect(result).toEqual({ success: false, error: 'Keine Berechtigung' });
    });
  });

  describe('getFinanceDocumentInfo', () => {
      it('should return document info', async () => {
          const mockDoc = {
              id: 'doc1',
              dateiname: 'test.pdf',
              dateipfad: 'path/to',
              dateigroesse: 1024,
              mime_type: 'application/pdf'
          };

          mockSupabase.single.mockResolvedValue({
              data: mockDoc,
              error: null
          });

          const result = await getFinanceDocumentInfo('doc1');

          expect(result).toEqual({
              success: true,
              document: mockDoc
          });
      });

      it('should return error if not found', async () => {
          mockSupabase.single.mockResolvedValue({
              data: null,
              error: { message: 'Not found' }
          });

          const result = await getFinanceDocumentInfo('doc1');

          expect(result).toEqual({
              success: false,
              error: 'Dokument nicht gefunden'
          });
      });
  });
});
