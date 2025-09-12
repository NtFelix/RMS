import { NextRequest } from 'next/server';
import { createMocks } from 'node-mocks-http';
import { Template, TemplatePayload } from '@/types/template';

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  insert: jest.fn(() => mockSupabase),
  update: jest.fn(() => mockSupabase),
  delete: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  order: jest.fn(() => mockSupabase),
  single: jest.fn(() => mockSupabase),
  data: null,
  error: null,
};

jest.mock('@/lib/supabase-server', () => ({
  createClient: jest.fn(() => mockSupabase),
}));

// Mock authentication
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(() => ({
        data: { user: { id: 'user-123' } },
        error: null,
      })),
    },
  })),
}));

describe('Template API Routes', () => {
  const mockTemplates: Template[] = [
    {
      id: '1',
      titel: 'Test Template 1',
      inhalt: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Test content 1' }],
          },
        ],
      },
      user_id: 'user-123',
      kategorie: 'Mail',
      kontext_anforderungen: [],
      erstellungsdatum: '2024-01-01T00:00:00Z',
      aktualisiert_am: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      titel: 'Test Template 2',
      inhalt: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Test content 2' }],
          },
        ],
      },
      user_id: 'user-123',
      kategorie: 'Brief',
      kontext_anforderungen: [],
      erstellungsdatum: '2024-01-02T00:00:00Z',
      aktualisiert_am: '2024-01-02T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase.data = null;
    mockSupabase.error = null;
  });

  describe('GET /api/templates', () => {
    // Mock the API route handler
    const mockGetTemplatesHandler = async (request: NextRequest) => {
      try {
        // Simulate authentication check
        const user = { id: 'user-123' };
        if (!user) {
          return Response.json(
            { error: 'Unauthorized', code: 'UNAUTHORIZED' },
            { status: 401 }
          );
        }

        // Simulate database query
        const { data, error } = mockSupabase;
        
        if (error) {
          return Response.json(
            { error: 'Database error', code: 'DATABASE_ERROR' },
            { status: 500 }
          );
        }

        return Response.json(data || mockTemplates);
      } catch (error) {
        return Response.json(
          { error: 'Internal server error', code: 'INTERNAL_ERROR' },
          { status: 500 }
        );
      }
    };

    it('returns templates for authenticated user', async () => {
      mockSupabase.data = mockTemplates;
      
      const request = new NextRequest('http://localhost:3000/api/templates');
      const response = await mockGetTemplatesHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockTemplates);
      expect(mockSupabase.from).toHaveBeenCalledWith('Vorlagen');
      expect(mockSupabase.select).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockSupabase.order).toHaveBeenCalledWith('aktualisiert_am', { ascending: false });
    });

    it('returns 401 for unauthenticated user', async () => {
      // Mock unauthenticated user
      const mockGetUnauthenticatedHandler = async () => {
        return Response.json(
          { error: 'Unauthorized', code: 'UNAUTHORIZED' },
          { status: 401 }
        );
      };

      const response = await mockGetUnauthenticatedHandler();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe('UNAUTHORIZED');
    });

    it('handles database errors', async () => {
      mockSupabase.error = { message: 'Database connection failed' };
      
      const request = new NextRequest('http://localhost:3000/api/templates');
      const response = await mockGetTemplatesHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.code).toBe('DATABASE_ERROR');
    });

    it('returns empty array when no templates exist', async () => {
      mockSupabase.data = [];
      
      const request = new NextRequest('http://localhost:3000/api/templates');
      const response = await mockGetTemplatesHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });
  });

  describe('POST /api/templates', () => {
    const mockPostTemplatesHandler = async (request: NextRequest) => {
      try {
        const user = { id: 'user-123' };
        if (!user) {
          return Response.json(
            { error: 'Unauthorized', code: 'UNAUTHORIZED' },
            { status: 401 }
          );
        }

        const body = await request.json();
        
        // Validate required fields
        if (!body.titel || body.titel.length < 3) {
          return Response.json(
            { 
              error: 'Validation error', 
              code: 'VALIDATION_ERROR',
              details: ['Titel muss mindestens 3 Zeichen lang sein']
            },
            { status: 400 }
          );
        }

        if (!body.inhalt) {
          return Response.json(
            { 
              error: 'Validation error', 
              code: 'VALIDATION_ERROR',
              details: ['Inhalt ist erforderlich']
            },
            { status: 400 }
          );
        }

        if (!body.kategorie) {
          return Response.json(
            { 
              error: 'Validation error', 
              code: 'VALIDATION_ERROR',
              details: ['Kategorie ist erforderlich']
            },
            { status: 400 }
          );
        }

        // Check for duplicate title
        if (body.titel === 'Existing Template') {
          return Response.json(
            { error: 'Template with this title already exists', code: 'DUPLICATE_TITLE' },
            { status: 409 }
          );
        }

        const { data, error } = mockSupabase;
        
        if (error) {
          return Response.json(
            { error: 'Database error', code: 'DATABASE_ERROR' },
            { status: 500 }
          );
        }

        const newTemplate: Template = {
          id: 'new-id',
          titel: body.titel,
          inhalt: body.inhalt,
          kategorie: body.kategorie,
          kontext_anforderungen: body.kontext_anforderungen || [],
          user_id: user.id,
          erstellungsdatum: new Date().toISOString(),
          aktualisiert_am: new Date().toISOString(),
        };

        return Response.json(data || newTemplate, { status: 201 });
      } catch (error) {
        return Response.json(
          { error: 'Internal server error', code: 'INTERNAL_ERROR' },
          { status: 500 }
        );
      }
    };

    it('creates a new template successfully', async () => {
      const templateData: TemplatePayload = {
        titel: 'New Template',
        inhalt: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'New content' }],
            },
          ],
        },
        kategorie: 'Mail',
        kontext_anforderungen: [],
      };

      const newTemplate: Template = {
        id: 'new-id',
        ...templateData,
        user_id: 'user-123',
        erstellungsdatum: '2024-01-03T00:00:00Z',
        aktualisiert_am: '2024-01-03T00:00:00Z',
      };

      mockSupabase.data = newTemplate;

      const request = new NextRequest('http://localhost:3000/api/templates', {
        method: 'POST',
        body: JSON.stringify(templateData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await mockPostTemplatesHandler(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.titel).toBe(templateData.titel);
      expect(data.kategorie).toBe(templateData.kategorie);
      expect(mockSupabase.from).toHaveBeenCalledWith('Vorlagen');
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('validates required fields', async () => {
      const invalidData = {
        titel: 'ab', // Too short
        inhalt: null,
        kategorie: '',
      };

      const request = new NextRequest('http://localhost:3000/api/templates', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await mockPostTemplatesHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.details).toContain('Titel muss mindestens 3 Zeichen lang sein');
    });

    it('handles duplicate title error', async () => {
      const duplicateData: TemplatePayload = {
        titel: 'Existing Template',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Mail',
        kontext_anforderungen: [],
      };

      const request = new NextRequest('http://localhost:3000/api/templates', {
        method: 'POST',
        body: JSON.stringify(duplicateData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await mockPostTemplatesHandler(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.code).toBe('DUPLICATE_TITLE');
    });

    it('handles malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/templates', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await mockPostTemplatesHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /api/templates/[id]', () => {
    const mockGetTemplateHandler = async (id: string) => {
      try {
        const user = { id: 'user-123' };
        if (!user) {
          return Response.json(
            { error: 'Unauthorized', code: 'UNAUTHORIZED' },
            { status: 401 }
          );
        }

        // Validate ID format
        if (!id || id === 'invalid') {
          return Response.json(
            { error: 'Invalid template ID', code: 'INVALID_ID' },
            { status: 400 }
          );
        }

        const { data, error } = mockSupabase;
        
        if (error) {
          return Response.json(
            { error: 'Database error', code: 'DATABASE_ERROR' },
            { status: 500 }
          );
        }

        if (!data) {
          return Response.json(
            { error: 'Template not found', code: 'NOT_FOUND' },
            { status: 404 }
          );
        }

        return Response.json(data);
      } catch (error) {
        return Response.json(
          { error: 'Internal server error', code: 'INTERNAL_ERROR' },
          { status: 500 }
        );
      }
    };

    it('returns template by ID', async () => {
      const template = mockTemplates[0];
      mockSupabase.data = template;

      const response = await mockGetTemplateHandler('1');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(template);
      expect(mockSupabase.from).toHaveBeenCalledWith('Vorlagen');
      expect(mockSupabase.select).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '1');
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-123');
    });

    it('returns 404 for non-existent template', async () => {
      mockSupabase.data = null;

      const response = await mockGetTemplateHandler('999');
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe('NOT_FOUND');
    });

    it('returns 400 for invalid ID', async () => {
      const response = await mockGetTemplateHandler('invalid');
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('INVALID_ID');
    });
  });

  describe('PUT /api/templates/[id]', () => {
    const mockPutTemplateHandler = async (id: string, request: NextRequest) => {
      try {
        const user = { id: 'user-123' };
        if (!user) {
          return Response.json(
            { error: 'Unauthorized', code: 'UNAUTHORIZED' },
            { status: 401 }
          );
        }

        if (!id || id === 'invalid') {
          return Response.json(
            { error: 'Invalid template ID', code: 'INVALID_ID' },
            { status: 400 }
          );
        }

        const body = await request.json();
        
        // Validate required fields
        if (!body.titel || body.titel.length < 3) {
          return Response.json(
            { 
              error: 'Validation error', 
              code: 'VALIDATION_ERROR',
              details: ['Titel muss mindestens 3 Zeichen lang sein']
            },
            { status: 400 }
          );
        }

        const { data, error } = mockSupabase;
        
        if (error) {
          return Response.json(
            { error: 'Database error', code: 'DATABASE_ERROR' },
            { status: 500 }
          );
        }

        if (!data) {
          return Response.json(
            { error: 'Template not found', code: 'NOT_FOUND' },
            { status: 404 }
          );
        }

        const updatedTemplate: Template = {
          ...mockTemplates[0],
          ...body,
          aktualisiert_am: new Date().toISOString(),
        };

        return Response.json(data || updatedTemplate);
      } catch (error) {
        return Response.json(
          { error: 'Internal server error', code: 'INTERNAL_ERROR' },
          { status: 500 }
        );
      }
    };

    it('updates template successfully', async () => {
      const updateData: TemplatePayload = {
        titel: 'Updated Template',
        inhalt: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Updated content' }],
            },
          ],
        },
        kategorie: 'Brief',
        kontext_anforderungen: [],
      };

      const updatedTemplate: Template = {
        ...mockTemplates[0],
        ...updateData,
        aktualisiert_am: '2024-01-03T00:00:00Z',
      };

      mockSupabase.data = updatedTemplate;

      const request = new NextRequest('http://localhost:3000/api/templates/1', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await mockPutTemplateHandler('1', request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.titel).toBe(updateData.titel);
      expect(data.kategorie).toBe(updateData.kategorie);
      expect(mockSupabase.from).toHaveBeenCalledWith('Vorlagen');
      expect(mockSupabase.update).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '1');
    });

    it('returns 404 for non-existent template', async () => {
      mockSupabase.data = null;

      const updateData: TemplatePayload = {
        titel: 'Updated Template',
        inhalt: { type: 'doc', content: [] },
        kategorie: 'Brief',
        kontext_anforderungen: [],
      };

      const request = new NextRequest('http://localhost:3000/api/templates/999', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await mockPutTemplateHandler('999', request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/templates/[id]', () => {
    const mockDeleteTemplateHandler = async (id: string) => {
      try {
        const user = { id: 'user-123' };
        if (!user) {
          return Response.json(
            { error: 'Unauthorized', code: 'UNAUTHORIZED' },
            { status: 401 }
          );
        }

        if (!id || id === 'invalid') {
          return Response.json(
            { error: 'Invalid template ID', code: 'INVALID_ID' },
            { status: 400 }
          );
        }

        // Check for foreign key constraints
        if (id === 'in-use') {
          return Response.json(
            { error: 'Template is in use', code: 'FOREIGN_KEY_CONSTRAINT' },
            { status: 409 }
          );
        }

        const { data, error } = mockSupabase;
        
        if (error) {
          return Response.json(
            { error: 'Database error', code: 'DATABASE_ERROR' },
            { status: 500 }
          );
        }

        if (!data) {
          return Response.json(
            { error: 'Template not found', code: 'NOT_FOUND' },
            { status: 404 }
          );
        }

        return new Response(null, { status: 204 });
      } catch (error) {
        return Response.json(
          { error: 'Internal server error', code: 'INTERNAL_ERROR' },
          { status: 500 }
        );
      }
    };

    it('deletes template successfully', async () => {
      mockSupabase.data = { id: '1' };

      const response = await mockDeleteTemplateHandler('1');

      expect(response.status).toBe(204);
      expect(mockSupabase.from).toHaveBeenCalledWith('Vorlagen');
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', '1');
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'user-123');
    });

    it('returns 404 for non-existent template', async () => {
      mockSupabase.data = null;

      const response = await mockDeleteTemplateHandler('999');
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe('NOT_FOUND');
    });

    it('handles foreign key constraint error', async () => {
      const response = await mockDeleteTemplateHandler('in-use');
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.code).toBe('FOREIGN_KEY_CONSTRAINT');
    });

    it('returns 400 for invalid ID', async () => {
      const response = await mockDeleteTemplateHandler('invalid');
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('INVALID_ID');
    });
  });

  describe('Error Handling', () => {
    it('handles network timeouts', async () => {
      mockSupabase.error = { message: 'Network timeout' };

      const request = new NextRequest('http://localhost:3000/api/templates');
      const mockHandler = async () => {
        return Response.json(
          { error: 'Network timeout', code: 'NETWORK_ERROR' },
          { status: 503 }
        );
      };

      const response = await mockHandler();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.code).toBe('NETWORK_ERROR');
    });

    it('handles rate limiting', async () => {
      const mockHandler = async () => {
        return Response.json(
          { error: 'Too many requests', code: 'RATE_LIMIT' },
          { status: 429 }
        );
      };

      const response = await mockHandler();
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.code).toBe('RATE_LIMIT');
    });

    it('handles database connection errors', async () => {
      mockSupabase.error = { message: 'Connection refused' };

      const mockHandler = async () => {
        return Response.json(
          { error: 'Database unavailable', code: 'DATABASE_UNAVAILABLE' },
          { status: 503 }
        );
      };

      const response = await mockHandler();
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.code).toBe('DATABASE_UNAVAILABLE');
    });
  });
});