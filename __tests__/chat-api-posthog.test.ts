/**
 * @jest-environment node
 */
import { createClient } from '@/utils/supabase/server';
import { GoogleGenAI } from '@google/genai';
import { PostHog } from 'posthog-node';

// 1. Mock dependencies before any other imports
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('posthog-node', () => ({
  PostHog: jest.fn().mockImplementation(() => ({
    capture: jest.fn(),
    shutdown: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    chats: {
      create: jest.fn(),
    },
  })),
  Type: {
    OBJECT: 'OBJECT',
    STRING: 'STRING',
    NUMBER: 'NUMBER',
    BOOLEAN: 'BOOLEAN',
    ARRAY: 'ARRAY',
    INTEGER: 'INTEGER',
  },
}));

jest.mock('@/utils/ai-context', () => ({
  getAIContextForPathname: jest.fn().mockResolvedValue('Mock Context'),
}));

jest.mock('uuid', () => ({
  v4: () => 'mock-uuid-1234',
}));

describe('Chat API Analytics Pipeline', () => {
  let POST: any;
  let mockSupabase: any;
  let mockPostHogInstance: any;
  let mockGeminiSendMessage: any;

  beforeAll(async () => {
    process.env.GEMINI_API_KEY = 'test-api-key';
    process.env.POSTHOG_API_KEY = 'test-posthog-key';
    process.env.POSTHOG_HOST = 'https://eu.i.posthog.com';

    const route = await import('../app/api/chat/route');
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
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);

    mockPostHogInstance = {
      capture: jest.fn(),
      shutdown: jest.fn().mockResolvedValue(undefined),
    };
    (PostHog as jest.Mock).mockReturnValue(mockPostHogInstance);

    mockGeminiSendMessage = jest.fn();
    (GoogleGenAI as any).mockImplementation(() => ({
      chats: {
        create: jest.fn(() => ({
          sendMessage: mockGeminiSendMessage,
        })),
      },
    }));
  });

  const consumeStream = async (response: any) => {
    if (response.status !== 200) {
      const text = await response.text();
      throw new Error(`API error (${response.status}): ${text}`);
    }
    const reader = response.body.getReader();
    while (true) {
      const { done } = await reader.read();
      if (done) break;
    }
  };

  it('should accumulate and submit token usage from all reasoning steps', async () => {
    mockGeminiSendMessage.mockResolvedValueOnce({
      text: 'Thinking...',
      functionCalls: [{ name: 'get_houses', args: {}, id: '1' }],
      usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20 }
    });

    mockGeminiSendMessage.mockResolvedValueOnce({
      text: 'Final reply',
      functionCalls: [],
      usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 30 }
    });

    const reqData = { message: 'Häuser zeigen', pathname: '/test', sessionId: 's1' };
    const req = new (global as any).Request('http://api/chat', { method: 'POST', body: JSON.stringify(reqData) });
    req.json = jest.fn().mockResolvedValue(reqData);

    const response = await POST(req);
    await consumeStream(response);

    expect(mockPostHogInstance.capture).toHaveBeenCalledWith(expect.objectContaining({
      properties: expect.objectContaining({
        $ai_input_tokens: 150,
        $ai_output_tokens: 50,
        $ai_tool_call_count: 1,
      }),
    }));
  });

  it('should track complex tool chains with multiple reasoning loops', async () => {
    mockGeminiSendMessage.mockResolvedValueOnce({
      text: 'Ich schaue nach Häusern...',
      functionCalls: [{ name: 'get_houses', args: {}, id: 'h1' }],
      usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 10 }
    });

    mockGeminiSendMessage.mockResolvedValueOnce({
      text: 'Habe Häuser. Jetzt nach Einheiten suchen...',
      functionCalls: [{ name: 'get_apartments', args: { house_id: '123' }, id: 'u1' }],
      usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 10 }
    });

    mockGeminiSendMessage.mockResolvedValueOnce({
      text: 'Hier ist die Übersicht.',
      functionCalls: [],
      usageMetadata: { promptTokenCount: 30, candidatesTokenCount: 20 }
    });

    const reqData = { message: 'Komplex', pathname: '/dashboard', sessionId: 's2' };
    const req = new (global as any).Request('http://api/chat', { method: 'POST', body: JSON.stringify(reqData) });
    req.json = jest.fn().mockResolvedValue(reqData);

    const response = await POST(req);
    await consumeStream(response);

    expect(mockPostHogInstance.capture).toHaveBeenCalledWith(expect.objectContaining({
      properties: expect.objectContaining({
        $ai_input_tokens: 180,
        $ai_output_tokens: 40,
        $ai_tool_call_count: 2,
        $ai_tools_called: ['get_houses', 'get_apartments'],
      }),
    }));
  });

  it('should include $ai_http_status in the PostHog capture properties', async () => {
    mockGeminiSendMessage.mockResolvedValueOnce({
      text: 'Hello world',
      functionCalls: [],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 }
    });

    const reqData = { message: 'Hi', pathname: '/', sessionId: 's3' };
    const req = new (global as any).Request('http://api/chat', { method: 'POST', body: JSON.stringify(reqData) });
    req.json = jest.fn().mockResolvedValue(reqData);

    const response = await POST(req);
    await consumeStream(response);

    expect(mockPostHogInstance.capture).toHaveBeenCalledWith(expect.objectContaining({
      properties: expect.objectContaining({
        $ai_http_status: 200,
        $ai_provider: 'google',
        $ai_model: expect.any(String),
      }),
    }));
  });
});
