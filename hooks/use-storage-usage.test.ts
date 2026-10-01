import { renderHook, act, waitFor } from '@testing-library/react';
import type { User } from '@supabase/supabase-js';
import { useStorageUsage } from '@/hooks/use-storage-usage';

const mockRpc = jest.fn();
const mockSingle = jest.fn();

jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    rpc: mockRpc,
    from: () => ({
      select: () => ({
        eq: () => ({ single: mockSingle }),
      }),
    }),
  }),
}));

const GB = 1024 ** 3;
const user = { id: 'user-1' } as User;

async function renderLoaded(usage: number) {
  mockRpc.mockResolvedValue({ data: usage, error: null });
  const hook = renderHook(() => useStorageUsage(user));
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  return hook.result;
}

describe('useStorageUsage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSingle.mockResolvedValue({
      data: { stripe_subscription_status: 'active', stripe_price_id: 'price_1' },
      error: null,
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ storageLimit: GB }),
    }) as unknown as typeof fetch;
  });

  it('reads the stored usage and the plan limit', async () => {
    const result = await renderLoaded(5 * 1024 * 1024);

    expect(result.current.usage).toBe(5 * 1024 * 1024);
    expect(result.current.limit).toBe(GB);
  });

  it('refresh() re-reads the stored usage after a change', async () => {
    const result = await renderLoaded(1000);
    expect(result.current.usage).toBe(1000);

    mockRpc.mockResolvedValue({ data: 4000, error: null });
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.usage).toBe(4000);
    expect(result.current.limit).toBe(GB);
  });

  it('refresh() keeps the last known usage when the lookup fails', async () => {
    const result = await renderLoaded(1000);

    mockRpc.mockResolvedValue({ data: null, error: { message: 'rpc failed' } });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await act(async () => {
      await result.current.refresh();
    });
    consoleSpy.mockRestore();

    expect(result.current.usage).toBe(1000);
  });

  it('ignores an older refresh() response that arrives after a newer one', async () => {
    const result = await renderLoaded(1000);

    let resolveOld: (value: { data: number; error: null }) => void = () => {};
    mockRpc.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }));
    mockRpc.mockResolvedValueOnce({ data: 3000, error: null });

    let oldRefresh!: Promise<void>;
    await act(async () => {
      oldRefresh = result.current.refresh(); // started first, finishes last
      await result.current.refresh();
    });
    expect(result.current.usage).toBe(3000);

    await act(async () => {
      resolveOld({ data: 2000, error: null });
      await oldRefresh;
    });

    expect(result.current.usage).toBe(3000);
  });

  it('applies the mount lookup when a newer refresh() failed', async () => {
    let resolveMountUsage: (value: { data: number; error: null }) => void = () => {};
    mockRpc.mockReturnValueOnce(new Promise(resolve => { resolveMountUsage = resolve; }));
    const hook = renderHook(() => useStorageUsage(user));

    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'rpc failed' } });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await act(async () => {
      await hook.result.current.refresh(); // started after the mount lookup, fails
    });
    consoleSpy.mockRestore();

    await act(async () => {
      resolveMountUsage({ data: 2500, error: null });
    });
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));

    expect(hook.result.current.usage).toBe(2500);
  });
});
