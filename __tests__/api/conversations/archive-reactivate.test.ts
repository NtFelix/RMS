/**
 * @jest-environment node
 */
import { PATCH, POST } from '@/app/api/conversations/[id]/route';
import pako from 'pako';

jest.spyOn(console, 'error').mockImplementation(() => {});

const mockFrom = jest.fn();
const mockAuthGetUser = jest.fn();
const mockStorageFrom = jest.fn();

const mockSupabaseClient = {
  auth: { getUser: mockAuthGetUser },
  from: mockFrom,
  storage: { from: mockStorageFrom },
};

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

// Build a flat object where all query methods return the object itself,
// and .single() returns a Promise
function q(responses: any[]) {
  let idx = 0;
  const single = jest.fn(() => {
    const r = responses[idx] ?? { data: null, error: { message: `call ${idx} not mocked` } };
    idx++;
    return Promise.resolve(r);
  });
  const obj: Record<string, any> = {
    select: jest.fn(() => obj),
    eq: jest.fn(() => obj),
    is: jest.fn(() => obj),
    order: jest.fn(() => obj),
    single,
    update: jest.fn(() => obj),
    delete: jest.fn(() => obj),
    insert: jest.fn(() => Promise.resolve({ error: null })),
  };
  return obj;
}

const ORG = 'org-123';
const USER = 'user-456';
const CID = 'conv-789';
const MID = 'mitglied-111';
const AID = 'agent-222';

const activeConv = {
  id: CID, organisation_id: ORG, mitglied_id: MID, agent_id: AID,
  titel: 'Test', status: 'aktiv', storage_pfad: null,
  storage_status: 'db', archiviert_am: null,
};

const archivedConv = {
  ...activeConv, status: 'archiviert', storage_status: 'bucket',
  storage_pfad: `${MID}/${CID}/archiv.json.gz`,
  archiviert_am: '2026-07-16T11:00:00Z',
};

const messages = [
  { id: 'm1', konversation_id: CID, organisation_id: ORG, agent_run_id: 'r1', agent_id: AID,
    rolle: 'user', inhalt: 'Hello', status: 'abgeschlossen', token_anzahl: 10, latenz_ms: 100,
    fehler_meldung: null, client_nachricht_id: null, seiten_kontext: null,
    erstellt_am: '2026-07-16T10:00:01Z', geloescht_am: null },
  { id: 'm2', konversation_id: CID, organisation_id: ORG, agent_run_id: 'r1', agent_id: AID,
    rolle: 'assistant', inhalt: 'Hi', status: 'abgeschlossen', token_anzahl: 20, latenz_ms: 200,
    fehler_meldung: null, client_nachricht_id: null, seiten_kontext: null,
    erstellt_am: '2026-07-16T10:00:02Z', geloescht_am: null },
];

function req(body: Record<string, unknown>) {
  return { json: jest.fn().mockResolvedValue(body) } as unknown as Request;
}

// Helper: configure mockFrom for the "two single() lookups then any table" pattern
function mockConvOnly(first: any, second: any) {
  const c = q([first, second]);
  mockFrom.mockImplementation((t: string) => t === 'KI_Konversationen' ? c : q([]));
  return c;
}

describe('PATCH /api/conversations/[id] — archive', () => {
  const storageUpload = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: USER } }, error: null });
    mockStorageFrom.mockReturnValue({ upload: storageUpload, download: jest.fn() });
    storageUpload.mockResolvedValue({ error: null });
  });

  it('archives conversation', async () => {
    // First two .single() calls
    const conv = q([{ data: { organisation_id: ORG }, error: null }, { data: activeConv, error: null }]);

    // Nachrichten query
    const nach = q([]);
    nach.order = jest.fn().mockResolvedValue({ data: messages, error: null });
    nach.delete = jest.fn(() => {
      const d = q([]);
      d.eq = jest.fn(() => d);
      d.is = jest.fn().mockResolvedValue({ error: null });
      return d;
    });

    // Update chain
    const upd = q([{ data: archivedConv, error: null }]);

    mockFrom.mockImplementation((t: string) => {
      if (t === 'KI_Konversationen') {
        const base = conv;
        base.update = jest.fn(() => upd);
        return base;
      }
      if (t === 'KI_Nachrichten') return nach;
      return q([]);
    });

    const res = await PATCH(req({ status: 'archiviert' }), { params: Promise.resolve({ id: CID }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.storage_status).toBe('bucket');
    expect(storageUpload).toHaveBeenCalledWith(
      expect.stringContaining(`${MID}/${CID}/archiv.json.gz`),
      expect.any(Uint8Array),
      expect.objectContaining({ contentType: 'application/gzip' })
    );
  });

  it('returns 409 if already archived', async () => {
    mockConvOnly({ data: { organisation_id: ORG }, error: null }, { data: archivedConv, error: null });
    const res = await PATCH(req({ status: 'archiviert' }), { params: Promise.resolve({ id: CID }) });
    expect(res.status).toBe(409);
  });

  it('unarchives conversation: downloads gzip, inserts messages, updates status', async () => {
    const archive = { konversation_id: CID, nachrichten: messages, metadaten: { token_gesamt: 30, agent_id: AID } };
    const storageDownload = jest.fn().mockResolvedValue({ data: new Blob([pako.gzip(JSON.stringify(archive))]), error: null });

    const conv = q([{ data: { organisation_id: ORG }, error: null }, { data: archivedConv, error: null }]);
    const insertMock = q([]);
    insertMock.insert = jest.fn().mockResolvedValue({ error: null });
    const updMock = q([{ data: { ...activeConv, status: 'aktiv' }, error: null }]);

    mockStorageFrom.mockReturnValue({ download: storageDownload, upload: jest.fn() });
    mockFrom.mockImplementation((t: string) => {
      if (t === 'KI_Konversationen') {
        conv.update = jest.fn(() => updMock);
        return conv;
      }
      if (t === 'KI_Nachrichten') return insertMock;
      return q([]);
    });

    const res = await PATCH(req({ status: 'aktiv' }), { params: Promise.resolve({ id: CID }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('aktiv');
    expect(storageDownload).toHaveBeenCalledWith(`${MID}/${CID}/archiv.json.gz`);
    expect(insertMock.insert).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ konversation_id: CID, rolle: 'user', inhalt: 'Hello' }),
    ]));
  });

  it('returns 401 if not authenticated', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Unauthorized' } });
    const res = await PATCH(req({ status: 'archiviert' }), { params: Promise.resolve({ id: CID }) });
    expect(res.status).toBe(401);
  });

  it('returns 400 if no fields', async () => {
    mockConvOnly({ data: { organisation_id: ORG }, error: null }, { data: activeConv, error: null });
    const res = await PATCH(req({}), { params: Promise.resolve({ id: CID }) });
    expect(res.status).toBe(400);
  });

  it('returns 404 if conversation not found', async () => {
    mockConvOnly({ data: { organisation_id: ORG }, error: null }, { data: null, error: { message: 'nope' } });
    const res = await PATCH(req({ status: 'archiviert' }), { params: Promise.resolve({ id: CID }) });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/conversations/[id] — reactivate', () => {
  const storageDownload = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: USER } }, error: null });
    mockStorageFrom.mockReturnValue({ download: storageDownload, upload: jest.fn() });
  });

  it('restores archived conversation', async () => {
    const archive = { konversation_id: CID, nachrichten: messages, metadaten: { token_gesamt: 30, agent_id: AID } };
    storageDownload.mockResolvedValue({ data: new Blob([pako.gzip(JSON.stringify(archive))]), error: null });

    const conv = q([{ data: { organisation_id: ORG }, error: null }, { data: archivedConv, error: null }]);
    const insertMock = q([]);
    insertMock.insert = jest.fn().mockResolvedValue({ error: null });
    const updMock = q([]);
    updMock.update = jest.fn(() => updMock);
    updMock.eq = jest.fn(() => Promise.resolve({ error: null }));

    mockFrom.mockImplementation((t: string) => {
      if (t === 'KI_Konversationen') {
        conv.update = jest.fn(() => updMock);
        return conv;
      }
      if (t === 'KI_Nachrichten') return insertMock;
      return q([]);
    });

    const res = await POST(req({}), { params: Promise.resolve({ id: CID }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(storageDownload).toHaveBeenCalledWith(`${MID}/${CID}/archiv.json.gz`);
    expect(insertMock.insert).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ konversation_id: CID, rolle: 'user', inhalt: 'Hello' }),
    ]));
  });

  it('returns success for active conversation (no bucket)', async () => {
    const conv = q([{ data: { organisation_id: ORG }, error: null }, { data: activeConv, error: null }]);
    const updMock = q([]);
    updMock.update = jest.fn(() => updMock);
    updMock.eq = jest.fn(() => Promise.resolve({ error: null }));

    mockFrom.mockImplementation((t: string) => {
      if (t === 'KI_Konversationen') {
        conv.update = jest.fn(() => updMock);
        return conv;
      }
      return q([]);
    });

    const res = await POST(req({}), { params: Promise.resolve({ id: CID }) });
    expect(res.status).toBe(200);
    expect(mockStorageFrom).not.toHaveBeenCalled();
  });

  it('returns 500 if bucket download fails', async () => {
    storageDownload.mockResolvedValue({ data: null, error: { message: 'boom' } });
    mockConvOnly({ data: { organisation_id: ORG }, error: null }, { data: archivedConv, error: null });

    const res = await POST(req({}), { params: Promise.resolve({ id: CID }) });
    expect(res.status).toBe(500);
  });

  it('returns 401 if not authenticated', async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Unauthorized' } });
    const res = await POST(req({}), { params: Promise.resolve({ id: CID }) });
    expect(res.status).toBe(401);
  });
});
