/**
 * @jest-environment node
 */
const mockPHCapture = jest.fn();
const mockPHFlush = jest.fn();

jest.mock('@/app/posthog-server.mjs', () => ({
  getPostHogServer: jest.fn(() => ({
    capture: mockPHCapture,
    flush: mockPHFlush,
  })),
}));

const mockGetUser = jest.fn();
const mockClient = {
  auth: { getUser: mockGetUser },
};

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => mockClient),
}));

function feedbackReq(body: Record<string, unknown>) {
  return { json: jest.fn().mockResolvedValue(body) } as unknown as Request;
}

describe('POST /api/chat/feedback', () => {
  let POST: any;

  beforeAll(async () => {
    process.env.AI_FEEDBACK_SURVEY_ID = 'survey-123';
    const route = await import('@/app/api/chat/feedback/route');
    POST = route.POST;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
  });

  it('returns 401 if not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Unauthorized' } });
    const res = await POST(feedbackReq({ traceId: 't1', rating: 'up' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 if traceId or rating missing', async () => {
    const res = await POST(feedbackReq({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 if rating is invalid', async () => {
    const res = await POST(feedbackReq({ traceId: 't1', rating: 'invalid' }));
    expect(res.status).toBe(400);
  });

  it('captures survey in PostHog and returns success', async () => {
    const res = await POST(feedbackReq({ traceId: 'trace-abc', rating: 'up', text: 'Great!' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockPHCapture).toHaveBeenCalledWith({
      distinctId: 'u1',
      event: 'survey sent',
      properties: expect.objectContaining({
        $survey_id: 'survey-123',
        $survey_response: 1,
        $survey_response_1: 'Great!',
        $ai_trace_id: 'trace-abc',
      }),
    });
    expect(mockPHFlush).toHaveBeenCalled();
  });

  it('accepts down rating', async () => {
    const res = await POST(feedbackReq({ traceId: 'trace-xyz', rating: 'down' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockPHCapture).toHaveBeenCalledWith(expect.objectContaining({
      properties: expect.objectContaining({ $survey_response: 2 }),
    }));
  });
});
