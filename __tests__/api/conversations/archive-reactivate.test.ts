/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

let PATCH: any;
let POST: any;

beforeAll(async () => {
  const route = await import('@/app/api/conversations/[id]/route');
  PATCH = route.PATCH;
  POST = route.POST;
});

jest.spyOn(console, 'error').mockImplementation(() => {});

const mockAuthGetUser = jest.fn();

const mockSupabaseClient = {
  auth: { getUser: mockAuthGetUser },
};

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(() => mockSupabaseClient),
}));

function req(body: Record<string, unknown>) {
  return { json: jest.fn().mockResolvedValue(body) } as unknown as NextRequest;
}

const CID = 'conv-789';

describe('PATCH /api/conversations/[id] — archive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'user-456' } }, error: null });
  });

  it('returns 401 if not authenticated', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Unauthorized' } });
    const res = await PATCH(req({ status: 'archiviert' }), { params: Promise.resolve({ id: CID }) });
    expect(res.status).toBe(401);
  });

  it('proxies archive request to AI service', async () => {
    const { proxyToAiService } = require('@/lib/ai-service-proxy');
    proxyToAiService.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));

    const res = await PATCH(req({ status: 'archiviert' }), { params: Promise.resolve({ id: CID }) });
    expect(res.status).toBe(200);
    expect(proxyToAiService).toHaveBeenCalledWith(
      `/api/conversations/${CID}`,
      expect.any(Object),
      expect.any(String),
      expect.any(String),
      expect.any(String)
    );
  });

  it('proxies reactivate request to AI service', async () => {
    const { proxyToAiService } = require('@/lib/ai-service-proxy');
    proxyToAiService.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));

    const res = await PATCH(req({ status: 'aktiv' }), { params: Promise.resolve({ id: CID }) });
    expect(res.status).toBe(200);
    expect(proxyToAiService).toHaveBeenCalled();
  });
});

describe('POST /api/conversations/[id] — reactivate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'user-456' } }, error: null });
  });

  it('returns 401 if not authenticated', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Unauthorized' } });
    const res = await POST(req({}), { params: Promise.resolve({ id: CID }) });
    expect(res.status).toBe(401);
  });

  it('proxies request to AI service', async () => {
    const { proxyToAiService } = require('@/lib/ai-service-proxy');
    proxyToAiService.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));

    const res = await POST(req({}), { params: Promise.resolve({ id: CID }) });
    expect(res.status).toBe(200);
    expect(proxyToAiService).toHaveBeenCalled();
  });
});
