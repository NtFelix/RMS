/**
 * @jest-environment node
 */
import { createSupabaseServerClient } from '@/lib/supabase-server';

// Mock dependencies
jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

jest.mock('posthog-node', () => ({
  PostHog: jest.fn(() => ({
    capture: jest.fn(() => Promise.resolve()),
    shutdown: jest.fn(() => Promise.resolve()),
    on: jest.fn(),
    flush: jest.fn(() => Promise.resolve()),
  })),
}));

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    chats: { create: jest.fn() },
  })),
  Type: {
    OBJECT: 'OBJECT', STRING: 'STRING', NUMBER: 'NUMBER',
    BOOLEAN: 'BOOLEAN', ARRAY: 'ARRAY', INTEGER: 'INTEGER',
  },
}));

jest.mock('@/utils/ai-context', () => ({
  getAIContextForPathname: jest.fn().mockResolvedValue('Mock Context'),
}));

jest.mock('uuid', () => ({
  v4: () => 'mock-uuid-1234',
}));

describe('Chat API', () => {
  let POST: any;
  let mockSupabase: any;

  beforeAll(async () => {
    process.env.GEMINI_API_KEY = 'test-api-key';
    process.env.POSTHOG_API_KEY = 'test-posthog-key';
    process.env.POSTHOG_HOST = 'https://eu.i.posthog.com';

    const route = await import('@/app/api/chat/route');
    POST = route.POST;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    };
    (createSupabaseServerClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  function createMockRequest(data: Record<string, unknown>) {
    const req = new (global as any).Request('http://api/chat', { method: 'POST', body: JSON.stringify(data) });
    req.json = jest.fn().mockResolvedValue(data);
    req.cookies = { get: jest.fn().mockReturnValue({ value: 'test-org' }) };
    return req;
  }

  it('should return 401 when auth fails', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('Not authenticated') });
    const req = createMockRequest({ message: 'Hi', pathname: '/', sessionId: 's-unauth' });
    const response = await POST(req);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toMatch(/nicht authentifiziert|unauthorized/i);
  });

  it('proxies chat request to AI service', async () => {
    const { proxyToAiService } = require('@/lib/ai-service-proxy');
    proxyToAiService.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));

    const req = createMockRequest({ message: 'Hi', pathname: '/', sessionId: 's-test' });
    const response = await POST(req);
    expect(response.status).toBe(200);
    expect(proxyToAiService).toHaveBeenCalledWith(
      '/api/chat',
      expect.any(Object),
      expect.any(String),
      expect.any(String),
      expect.any(String)
    );
  });
});
