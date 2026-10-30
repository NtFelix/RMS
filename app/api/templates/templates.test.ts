import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';

// Create mock supabase client
const mockSupabaseClient: any = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(),
};

// Mock the createSupabaseServerClient from server BEFORE any route imports
jest.mock('@/lib/supabase-server', () => ({
  __esModule: true,
  createSupabaseServerClient: jest.fn(() => Promise.resolve(mockSupabaseClient))
}));

// Mock resolveUserAndOrg so it doesn't interfere
jest.mock('@/lib/auth-utils', () => ({
  __esModule: true,
  ensureAuth: jest.fn(),
  resolveUserAndOrg: jest.fn(),
}));

// Now import routes (jest.mock is hoisted so this runs after mock setup)
let GET: any, POST: any;

beforeAll(async () => {
  const templateRoutes = await import('../templates/route');
  GET = templateRoutes.GET;
  POST = templateRoutes.POST;
});

describe('/api/templates', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });
  });

  describe('GET /api/templates', () => {
    it('should return templates for authenticated user', async () => {
      const mockTemplates = [
        {
          id: '1',
          titel: 'Test Template',
          inhalt: { type: 'doc', content: [] },
          kategorie: 'Mail',
          user_id: 'user-123'
        }
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          order: jest.fn(() => ({
            data: mockTemplates,
            error: null
          }))
        }))
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockTemplates);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('Vorlagen');
    });

    it('should return 401 for unauthenticated user', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe('UNAUTHORIZED');
    });

    it('should handle database errors', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          order: jest.fn(() => ({
            data: null,
            error: { message: 'Database error' }
          }))
        }))
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.code).toBe('DATABASE_ERROR');
      expect(data.details).toBe('Database error');
    });
  });
});
