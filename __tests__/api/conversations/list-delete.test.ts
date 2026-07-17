/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/conversations/route';
import { DELETE } from '@/app/api/conversations/[id]/route';

const mockFrom = jest.fn();
const mockAuthGetUser = jest.fn();
const mockRpc = jest.fn();

const mockSupabaseClient = {
  auth: { getUser: mockAuthGetUser },
  from: mockFrom,
  rpc: mockRpc,
};

const mockServiceFrom = jest.fn();
const mockServiceSupabase = { from: mockServiceFrom };

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockServiceSupabase),
}));

function req(url: string) {
  return { url } as unknown as NextRequest;
}

const ORG = 'org-123';
const USER = 'user-456';
const CID = 'conv-789';

function mockServiceDefaults() {
  mockServiceFrom.mockImplementation((t: string) => {
    if (t === 'KI_Konversationen') {
      const q: any = buildQuery({ data: { organisation_id: ORG }, error: null });
      return q;
    }
    if (t === 'Organisation_Mitglieder') {
      const q: any = buildQuery({ data: { id: 'member-1' }, error: null });
      q.maybeSingle = jest.fn().mockResolvedValue({ data: { id: 'member-1' }, error: null });
      return q;
    }
    return buildQuery(null);
  });
}

function buildQuery(result: any) {
  const q: any = {
    select: jest.fn(() => q),
    eq: jest.fn(() => q),
    in: jest.fn(() => q),
    is: jest.fn(() => q),
    order: jest.fn(() => q),
    limit: jest.fn(() => q),
    single: jest.fn().mockResolvedValue(result || { data: null, error: { message: 'mock' } }),
    maybeSingle: jest.fn().mockResolvedValue(result || { data: null, error: null }),
    update: jest.fn(() => q),
    delete: jest.fn(() => q),
    insert: jest.fn(() => Promise.resolve({ error: null })),
  };
  return q;
}

describe('GET /api/conversations — list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: USER } }, error: null });
  });

  it('returns 401 if not authenticated', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Unauthorized' } });
    const res = await GET(req('http://api/conversations'));
    expect(res.status).toBe(401);
  });

  function chainWithResult(result: any) {
    const q = buildQuery(null);
    // order() is called twice: first returns chain, second returns result
    q.order = jest.fn()
      .mockImplementationOnce(() => q)
      .mockResolvedValue({ data: result, error: null });
    return q;
  }

  it('resolves orgId from rpc and returns conversations', async () => {
    mockRpc.mockResolvedValue({ data: ORG, error: null });
    const listData = [{ id: CID, titel: 'Test', status: 'aktiv' }];
    mockFrom.mockReturnValue(chainWithResult(listData));

    const res = await GET(req(`http://api/conversations?orgId=${ORG}`));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(listData);
  });

  it('returns 400 if no orgId resolved', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const q = buildQuery(null);
    q.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
    mockFrom.mockReturnValue(q);

    const res = await GET(req('http://api/conversations'));
    expect(res.status).toBe(400);
  });

  it('orders conversations by status then last access', async () => {
    mockRpc.mockResolvedValue({ data: ORG, error: null });
    const q = buildQuery(null);
    q.order = jest.fn()
      .mockImplementationOnce(() => q)
      .mockResolvedValue({ data: [], error: null });
    mockFrom.mockReturnValue(q);

    await GET(req(`http://api/conversations?orgId=${ORG}`));

    expect(q.in).toHaveBeenCalledWith('status', ['aktiv', 'archiviert']);
    expect(q.is).toHaveBeenCalledWith('geloescht_am', null);
    expect(q.order).toHaveBeenCalledWith('status', { ascending: true });
  });
});

describe('DELETE /api/conversations/[id] — soft-delete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: USER } }, error: null });
  });

  it('returns 401 if not authenticated', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Unauthorized' } });
    const res = await DELETE(req('http://api'), { params: Promise.resolve({ id: CID }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 if service role cannot find conversation', async () => {
    mockServiceFrom.mockImplementation((t: string) => {
      if (t === 'KI_Konversationen') {
        const q = buildQuery({ data: null, error: { message: 'not found' } });
        return q;
      }
      return buildQuery(null);
    });

    const res = await DELETE(req('http://api'), { params: Promise.resolve({ id: CID }) });
    expect(res.status).toBe(404);
  });

  it('soft-deletes conversation via geloescht_am', async () => {
    mockServiceDefaults();

    const updateQ = buildQuery(null);
    updateQ.update = jest.fn(() => updateQ);
    updateQ.eq = jest.fn().mockResolvedValue({ error: null });

    mockFrom.mockReturnValue(updateQ);

    const res = await DELETE(req('http://api'), { params: Promise.resolve({ id: CID }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(updateQ.update).toHaveBeenCalledWith(expect.objectContaining({
      geloescht_am: expect.any(String),
      status: 'geloescht',
    }));
  });
});
