/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

let GET_AGENTS: any;
let POST_AGENTS: any;
let GET_AGENT_ID: any;
let PATCH_AGENT_ID: any;
let DELETE_AGENT_ID: any;
let POST_RUN: any;
let GET_RUNS: any;
let GET_RUN_ID: any;

const mockRpc = jest.fn();
const mockAuthGetUser = jest.fn();
const mockFrom = jest.fn();

const mockSupabaseClient = {
  auth: { getUser: mockAuthGetUser },
  rpc: mockRpc,
  from: mockFrom,
};

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
}));

beforeAll(async () => {
  const routeAgents = await import('@/app/api/agents/route');
  const routeAgentId = await import('@/app/api/agents/[id]/route');
  const routeRun = await import('@/app/api/agents/[id]/run/route');
  const routeRuns = await import('@/app/api/agents/runs/route');
  const routeRunId = await import('@/app/api/agents/runs/[id]/route');

  GET_AGENTS = routeAgents.GET;
  POST_AGENTS = routeAgents.POST;
  GET_AGENT_ID = routeAgentId.GET;
  PATCH_AGENT_ID = routeAgentId.PATCH;
  DELETE_AGENT_ID = routeAgentId.DELETE;
  POST_RUN = routeRun.POST;
  GET_RUNS = routeRuns.GET;
  GET_RUN_ID = routeRunId.GET;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
});

function createMockRequest(url: string, options: { method?: string; body?: any; headers?: Record<string, string> } = {}) {
  const { method = 'GET', body, headers = {} } = options;
  const req = new NextRequest(url, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (body) {
    req.json = async () => body;
  }
  return req;
}

describe('Agents API Endpoints', () => {
  describe('GET /api/agents', () => {
    it('returns 401 if unauthenticated', async () => {
      mockAuthGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('Unauthorized') });
      const req = createMockRequest('http://localhost/api/agents');
      const res = await GET_AGENTS(req);
      expect(res.status).toBe(401);
    });

    it('returns list of agents', async () => {
      const sampleAgents = [{ id: 'agent-1', name: 'Test Agent' }];
      mockRpc.mockResolvedValueOnce({ data: sampleAgents, error: null });
      const req = createMockRequest('http://localhost/api/agents');
      const res = await GET_AGENTS(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(sampleAgents);
    });
  });

  describe('POST /api/agents', () => {
    it('validates request payload and creates agent', async () => {
      mockRpc.mockResolvedValueOnce({ data: 'agent-123', error: null });
      const payload = {
        name: 'New Agent',
        anweisungen: 'Perform audit',
        trigger: { type: 'manual' },
      };
      const req = createMockRequest('http://localhost/api/agents', { method: 'POST', body: payload });
      const res = await POST_AGENTS(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json).toEqual({ id: 'agent-123' });
    });

    it('returns 400 on invalid payload', async () => {
      const req = createMockRequest('http://localhost/api/agents', { method: 'POST', body: { name: '' } });
      const res = await POST_AGENTS(req);
      expect(res.status).toBe(400);
    });
  });

  describe('GET & PATCH & DELETE /api/agents/[id]', () => {
    const params = Promise.resolve({ id: 'agent-123' });

    it('GET returns agent details', async () => {
      mockRpc.mockResolvedValueOnce({ data: { id: 'agent-123', name: 'Agent 123' }, error: null });
      const req = createMockRequest('http://localhost/api/agents/agent-123');
      const res = await GET_AGENT_ID(req, { params });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.name).toBe('Agent 123');
    });

    it('PATCH updates agent details', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: null });
      const req = createMockRequest('http://localhost/api/agents/agent-123', {
        method: 'PATCH',
        body: { name: 'Updated Agent Name' },
      });
      const res = await PATCH_AGENT_ID(req, { params });
      expect(res.status).toBe(200);
    });

    it('DELETE soft-deletes agent', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: null });
      const req = createMockRequest('http://localhost/api/agents/agent-123', { method: 'DELETE' });
      const res = await DELETE_AGENT_ID(req, { params });
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/agents/[id]/run', () => {
    it('creates run record for active agent', async () => {
      const params = Promise.resolve({ id: 'agent-123' });
      mockRpc.mockResolvedValueOnce({
        data: { id: 'agent-123', status: 'aktiv', organisation_id: 'org-1', trigger: { type: 'manual' } },
        error: null,
      });

      const mockSingle = jest.fn().mockResolvedValue({ data: { id: 'run-999' }, error: null });
      const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = jest.fn().mockReturnValue({ select: mockSelect });
      mockFrom.mockReturnValue({ insert: mockInsert });

      const req = createMockRequest('http://localhost/api/agents/agent-123/run', { method: 'POST' });
      const res = await POST_RUN(req, { params });
      expect(res.status).toBe(202);
      const json = await res.json();
      expect(json.runId).toBe('run-999');
    });
  });

  describe('GET /api/agents/runs and /api/agents/runs/[id]', () => {
    it('GET /api/agents/runs returns list of runs', async () => {
      mockRpc.mockResolvedValueOnce({ data: [{ id: 'run-1' }], error: null });
      const req = createMockRequest('http://localhost/api/agents/runs');
      const res = await GET_RUNS(req);
      expect(res.status).toBe(200);
    });

    it('GET /api/agents/runs/[id] returns run details', async () => {
      const params = Promise.resolve({ id: 'run-1' });
      mockRpc.mockResolvedValueOnce({ data: { id: 'run-1', nachrichten: [] }, error: null });
      const req = createMockRequest('http://localhost/api/agents/runs/run-1');
      const res = await GET_RUN_ID(req, { params });
      expect(res.status).toBe(200);
    });
  });
});
