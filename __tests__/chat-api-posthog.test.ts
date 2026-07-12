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

function createPostHogMock() {
  return {
    capture: jest.fn(() => Promise.resolve()),
    shutdown: jest.fn(() => Promise.resolve()),
    on: jest.fn(),
    flush: jest.fn(() => Promise.resolve()),
  };
}

jest.mock('posthog-node', () => ({
  PostHog: jest.fn(createPostHogMock),
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
  let posthogSingleton: any;
  let mockGeminiSendMessage: any;

  beforeAll(async () => {
    process.env.GEMINI_API_KEY = 'test-api-key';
    process.env.POSTHOG_API_KEY = 'test-posthog-key';
    process.env.POSTHOG_HOST = 'https://eu.i.posthog.com';

    const { getPostHogServer } = await import('../app/posthog-server.mjs');
    posthogSingleton = getPostHogServer();

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
      rpc: jest.fn().mockResolvedValue({ data: 'test-org', error: null }),
    };
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);

    // Re-attach mock methods to the singleton, since clearAllMocks resets them
    // Implementation functions survive clearAllMocks, but we need fresh fns for assertions
    posthogSingleton.capture = jest.fn(() => Promise.resolve());
    posthogSingleton.shutdown = jest.fn(() => Promise.resolve());
    posthogSingleton.flush = jest.fn(() => Promise.resolve());

    mockGeminiSendMessage = jest.fn();
    (GoogleGenAI as any).mockImplementation(() => ({
      chats: {
        create: jest.fn(() => ({
          sendMessageStream: mockGeminiSendMessage,
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

  function mockGeminiResult(text: string, functionCalls: any[], usageMetadata: any) {
    const chunks = [
      ...(text ? [{ text, functionCalls: undefined, usageMetadata: undefined }] : []),
      ...(functionCalls.length > 0 ? [{ text: '', functionCalls, usageMetadata: undefined }] : []),
      { text: '', functionCalls: undefined, usageMetadata },
    ].filter(c => Object.values(c).some(v => v !== undefined));
    return {
      [Symbol.asyncIterator]: () => {
        let i = 0;
        return {
          next: () => {
            if (i < chunks.length) return Promise.resolve({ value: chunks[i++], done: false });
            return Promise.resolve({ value: undefined, done: true });
          },
        };
      },
    };
  }

  function createMockRequest(data: Record<string, unknown>) {
    const req = new (global as any).Request('http://api/chat', { method: 'POST', body: JSON.stringify(data) });
    req.json = jest.fn().mockResolvedValue(data);
    req.cookies = { get: jest.fn().mockReturnValue({ value: 'test-org' }) };
    return req;
  }

  it('should accumulate and submit token usage from all reasoning steps', async () => {
    mockGeminiSendMessage.mockResolvedValueOnce(mockGeminiResult(
      'Thinking...',
      [{ name: 'get_houses', args: {}, id: '1' }],
      { promptTokenCount: 100, candidatesTokenCount: 20 }
    ));

    mockGeminiSendMessage.mockResolvedValueOnce(mockGeminiResult(
      'Final reply',
      [],
      { promptTokenCount: 50, candidatesTokenCount: 30 }
    ));

    const req = createMockRequest({ message: 'Häuser zeigen', pathname: '/test', sessionId: 's1' });
    const response = await POST(req);
    await consumeStream(response);

    expect(posthogSingleton.capture).toHaveBeenCalledWith(expect.objectContaining({
      properties: expect.objectContaining({
        $ai_input_tokens: 150,
        $ai_output_tokens: 50,
        $ai_tool_call_count: 1,
      }),
    }));
  });

  it('should track complex tool chains with multiple reasoning loops', async () => {
    mockGeminiSendMessage.mockResolvedValueOnce(mockGeminiResult(
      'Ich schaue nach Häusern...',
      [{ name: 'get_houses', args: {}, id: 'h1' }],
      { promptTokenCount: 100, candidatesTokenCount: 10 }
    ));

    mockGeminiSendMessage.mockResolvedValueOnce(mockGeminiResult(
      'Habe Häuser. Jetzt nach Einheiten suchen...',
      [{ name: 'get_apartments', args: { house_id: '123' }, id: 'u1' }],
      { promptTokenCount: 50, candidatesTokenCount: 10 }
    ));

    mockGeminiSendMessage.mockResolvedValueOnce(mockGeminiResult(
      'Hier ist die Übersicht.',
      [],
      { promptTokenCount: 30, candidatesTokenCount: 20 }
    ));

    const req = createMockRequest({ message: 'Komplex', pathname: '/dashboard', sessionId: 's2' });
    const response = await POST(req);
    await consumeStream(response);

    expect(posthogSingleton.capture).toHaveBeenCalledWith(expect.objectContaining({
      properties: expect.objectContaining({
        $ai_input_tokens: 180,
        $ai_output_tokens: 40,
        $ai_tool_call_count: 2,
        $ai_tools_called: ['get_houses', 'get_apartments'],
      }),
    }));
  });

  it('should include $ai_http_status in the PostHog capture properties', async () => {
    mockGeminiSendMessage.mockResolvedValueOnce(mockGeminiResult(
      'Hello world',
      [],
      { promptTokenCount: 10, candidatesTokenCount: 5 }
    ));

    const req = createMockRequest({ message: 'Hi', pathname: '/', sessionId: 's3' });
    const response = await POST(req);
    await consumeStream(response);

    expect(posthogSingleton.capture).toHaveBeenCalledWith(expect.objectContaining({
      properties: expect.objectContaining({
        $ai_http_status: 200,
        $ai_provider: 'google',
        $ai_model: expect.any(String),
      }),
    }));
  });
});
