/**
 * @jest-environment node
 */

let mockUserClient: any;

function buildQuery() {
  const q: any = {
    select: jest.fn(() => q),
    eq: jest.fn(() => q),
    is: jest.fn(() => q),
    order: jest.fn(() => q),
    limit: jest.fn(() => q),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    single: jest.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null }),
    insert: jest.fn(() => q),
  };
  return q;
}

// jest.mock factory captures `mockUserClient` reference (let),
// so beforeEach can set the value before each test
jest.mock('@/lib/sandbox/runner', () => ({
  createSupabaseUserClient: jest.fn(() => mockUserClient),
  createSupabaseServiceClient: jest.fn(() => mockUserClient),
}));

jest.mock('@/lib/agents/mietevo-agent', () => ({
  runAgent: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  process.env.AI_SERVICE_AUTH_SECRET = 'test-secret';

  const authGetUser = jest.fn();
  mockUserClient = {
    auth: { getUser: authGetUser },
    from: jest.fn(() => buildQuery()),
    rpc: jest.fn(),
  };
});

function engineReq(headers: Record<string, string>, body: Record<string, unknown> = {}) {
  const h = new Headers();
  Object.entries(headers).forEach(([k, v]) => h.set(k, v));
  return { headers: h, json: jest.fn().mockResolvedValue(body) } as unknown as Request;
}

describe('POST /api/chat/engine — auth & validation', () => {
  let POST: any;

  beforeAll(async () => {
    const route = await import('@/app/api/chat/engine/route');
    POST = route.POST;
  });

  it('returns 401 when auth secret is missing', async () => {
    const res = await POST(engineReq({}, {}));
    expect(res.status).toBe(401);
  });

  it('returns 401 when auth secret is wrong', async () => {
    const res = await POST(engineReq({ 'X-AI-Service-Auth': 'wrong-secret' }, {}));
    expect(res.status).toBe(401);
  });

  it('returns 401 when auth secret length differs', async () => {
    const res = await POST(engineReq({ 'x-ai-service-auth': 'longer-secret-12345' }, {}));
    expect(res.status).toBe(401);
  });

  it('returns 400 when auth metadata headers are missing', async () => {
    const res = await POST(engineReq({ 'X-AI-Service-Auth': 'test-secret' }, {}));
    expect(res.status).toBe(400);
  });

  it('returns 401 when JWT is invalid', async () => {
    mockUserClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid token' } });

    const res = await POST(engineReq({
      'X-AI-Service-Auth': 'test-secret',
      'X-User-Id': 'user-1',
      'X-Org-Id': 'org-1',
      'X-User-Jwt': 'invalid-jwt',
    }, {}));
    expect(res.status).toBe(401);
  });

  it('returns 403 when X-User-Id does not match JWT sub', async () => {
    mockUserClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'different-user' } }, error: null });

    const res = await POST(engineReq({
      'X-AI-Service-Auth': 'test-secret',
      'X-User-Id': 'user-1',
      'X-Org-Id': 'org-1',
      'X-User-Jwt': 'valid-jwt-but-wrong-user',
    }, {}));
    expect(res.status).toBe(403);
  });

  it('returns 403 when conversation does not belong to org', async () => {
    mockUserClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    const q: any = {
      select: jest.fn(() => q),
      eq: jest.fn(() => q),
      is: jest.fn(() => q),
      order: jest.fn(() => q),
      limit: jest.fn(() => q),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn(() => q),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    };
    mockUserClient.from = jest.fn(() => q);

    const res = await POST(engineReq({
      'X-AI-Service-Auth': 'test-secret',
      'X-User-Id': 'user-1',
      'X-Org-Id': 'org-1',
      'X-User-Jwt': 'valid-jwt',
    }, { conversationId: 'conv-999' }));
    expect(res.status).toBe(403);
  });
});
