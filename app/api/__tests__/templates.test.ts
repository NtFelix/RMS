import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET, POST } from '../templates/route';
import { GET as getTemplate, PUT, DELETE } from '../templates/[id]/route';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => ({
          data: [],
          error: null
        })),
        single: jest.fn(() => ({
          data: null,
          error: null
        }))
      }))
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(() => ({
          data: null,
          error: null
        }))
      }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: null
          }))
        }))
      }))
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(() => ({
        error: null
      }))
    }))
  }))
};

// Mock the Supabase client creation
jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(() => Promise.resolve(mockSupabaseClient))
}));

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

      const mockChain = {
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            data: mockTemplates,
            error: null
          }))
        }))
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => mockChain)
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
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle database errors', async () => {
      const mockChain = {
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            data: null,
            error: { message: 'Database error' }
          }))
        }))
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => mockChain)
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database error');
    });
  });

  describe('POST /api/templates', () => {
    it('should create a new template', async () => {
      const templateData = {
        titel: 'New Template',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Mail',
        kontext_anforderungen: []
      };

      const createdTemplate = {
        id: 'new-123',
        ...templateData,
        user_id: 'user-123'
      };

      const mockChain = {
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: createdTemplate,
            error: null
          }))
        }))
      };

      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn(() => mockChain)
      });

      const request = new NextRequest('http://localhost/api/templates', {
        method: 'POST',
        body: JSON.stringify(templateData)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(createdTemplate);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        titel: '',
        inhalt: null,
        kategorie: ''
      };

      const request = new NextRequest('http://localhost/api/templates', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Titel, Inhalt und Kategorie sind erforderlich.');
    });
  });
});

describe('/api/templates/[id]', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com'
  };

  const mockParams = { id: 'template-123' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });
  });

  describe('GET /api/templates/[id]', () => {
    it('should return a specific template', async () => {
      const mockTemplate = {
        id: 'template-123',
        titel: 'Test Template',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Mail',
        user_id: 'user-123'
      };

      const mockChain = {
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: mockTemplate,
            error: null
          }))
        }))
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => mockChain)
        }))
      });

      const request = new NextRequest('http://localhost/api/templates/template-123');
      const response = await getTemplate(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockTemplate);
    });

    it('should return 404 for non-existent template', async () => {
      const mockChain = {
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: { code: 'PGRST116' }
          }))
        }))
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => mockChain)
        }))
      });

      const request = new NextRequest('http://localhost/api/templates/nonexistent');
      const response = await getTemplate(request, { params: { id: 'nonexistent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Template nicht gefunden.');
    });
  });

  describe('PUT /api/templates/[id]', () => {
    it('should update a template', async () => {
      const updateData = {
        titel: 'Updated Template',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Brief',
        kontext_anforderungen: []
      };

      const updatedTemplate = {
        id: 'template-123',
        ...updateData,
        user_id: 'user-123'
      };

      const mockChain = {
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => ({
              data: updatedTemplate,
              error: null
            }))
          }))
        }))
      };

      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn(() => ({
          eq: jest.fn(() => mockChain)
        }))
      });

      const request = new NextRequest('http://localhost/api/templates/template-123', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      const response = await PUT(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(updatedTemplate);
    });
  });

  describe('DELETE /api/templates/[id]', () => {
    it('should delete a template', async () => {
      const mockChain = {
        eq: jest.fn(() => ({
          error: null
        }))
      };

      mockSupabaseClient.from.mockReturnValue({
        delete: jest.fn(() => ({
          eq: jest.fn(() => mockChain)
        }))
      });

      const request = new NextRequest('http://localhost/api/templates/template-123');
      const response = await DELETE(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Template gelöscht');
    });
  });
});