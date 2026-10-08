jest.mock('ai', () => ({}));
jest.mock('@/lib/agents/mietevo-agent', () => ({}));
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    rpc: jest.fn().mockResolvedValue({
      error: { code: 'PGRST202', message: 'could not find the function' },
    }),
  })),
}));

import { sandboxRpc } from './runner';

describe('sandboxRpc', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  });

  it('rejects RPC calls that are not in the whitelist', async () => {
    await expect(sandboxRpc('unapproved_function', {})).rejects.toThrow(
      'RPC unapproved_function is not whitelisted'
    );
  });

  it('rejects service-role table fallback execution when orgId is missing', async () => {
    await expect(sandboxRpc('fetch_mieter_list', {})).rejects.toThrow(
      /Cannot execute table fallback for 'fetch_mieter_list' without active orgId/
    );
  });
});
