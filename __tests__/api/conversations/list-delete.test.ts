/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

let GET: any;
let DELETE: any;

beforeAll(async () => {
  const routeConversations = await import('@/app/api/conversations/route');
  const routeConversationsId = await import('@/app/api/conversations/[id]/route');
  GET = routeConversations.GET;
  DELETE = routeConversationsId.DELETE;
});

const mockAuthGetUser = jest.fn();

const mockSupabaseClient = {
  auth: { getUser: mockAuthGetUser },
};

jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(() => mockSupabaseClient),
}));

function req(url: string) {
  return { url } as unknown as NextRequest;
}

const CID = 'conv-789';

describe('GET /api/conversations — list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'user-456' } }, error: null });
  });

  it('returns 401 if not authenticated', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Unauthorized' } });
    const res = await GET(req('http://api/conversations'));
    expect(res.status).toBe(401);
  });

  it('proxies list request to AI service', async () => {
    const { proxyToAiService } = require('@/lib/ai-service-proxy');
    proxyToAiService.mockResolvedValue(new Response(JSON.stringify([{ id: CID }]), { status: 200 }));

    const res = await GET(req(`http://api/conversations?orgId=org-123`));
    expect(res.status).toBe(200);
    expect(proxyToAiService).toHaveBeenCalled();
  });
});

describe('DELETE /api/conversations/[id] — soft-delete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'user-456' } }, error: null });
  });

  it('returns 401 if not authenticated', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Unauthorized' } });
    const res = await DELETE(req('http://api'), { params: Promise.resolve({ id: CID }) });
    expect(res.status).toBe(401);
  });

  it('proxies delete request to AI service', async () => {
    const { proxyToAiService } = require('@/lib/ai-service-proxy');
    proxyToAiService.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));

    const res = await DELETE(req('http://api'), { params: Promise.resolve({ id: CID }) });
    expect(res.status).toBe(200);
    expect(proxyToAiService).toHaveBeenCalledWith(
      `/api/conversations/${CID}`,
      expect.any(Object),
      expect.any(String),
      expect.any(String),
      expect.any(String)
    );
  });
});
