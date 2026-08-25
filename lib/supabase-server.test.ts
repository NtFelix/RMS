/**
 * @jest-environment node
 */

// Mock the Supabase SSR module
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}));

// Mock Next.js headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

import { createSupabaseServerClient } from './supabase-server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const mockCreateServerClient = createServerClient as jest.MockedFunction<typeof createServerClient>;
const mockCookies = cookies as jest.MockedFunction<typeof cookies>;

describe('lib/supabase-server', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.clearAllMocks();

    // Mock cookies function
    mockCookies.mockResolvedValue({
      get: jest.fn().mockReturnValue(undefined),
      getAll: jest.fn().mockReturnValue([{ name: 'test-cookie', value: 'test-cookie-value' }]),
      set: jest.fn(),
    } as any);
  });

  afterEach(() => {
    for (const key in process.env) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
  });

  describe('createSupabaseServerClient', () => {
    it('should create Supabase client with correct configuration', async () => {
      Object.assign(process.env, {
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
      });

      const mockClient = { from: jest.fn() };
      mockCreateServerClient.mockReturnValue(mockClient as any);

      const result = await createSupabaseServerClient();

      expect(mockCreateServerClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        expect.objectContaining({
          cookies: expect.objectContaining({
            getAll: expect.any(Function),
            setAll: expect.any(Function)
          })
        })
      );

      expect(result).toBe(mockClient);
    });

    it('should handle missing environment variables', async () => {
      Object.assign(process.env, originalEnv);
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const mockClient = { from: jest.fn() };
      mockCreateServerClient.mockReturnValue(mockClient as any);

      await createSupabaseServerClient();

      // getSupabasePublicEnv() falls back to '' (never undefined) when env is missing
      expect(mockCreateServerClient).toHaveBeenCalledWith(
        '',
        '',
        expect.any(Object)
      );
    });

    it('should configure cookies correctly', async () => {
      Object.assign(process.env, {
        ...originalEnv,
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
      });

      mockCreateServerClient.mockReturnValue({} as any);

      await createSupabaseServerClient();

      const cookiesConfig = mockCreateServerClient.mock.calls[0][2];
      expect(cookiesConfig).toHaveProperty('cookies');
      expect(cookiesConfig.cookies).toHaveProperty('getAll');
      expect(cookiesConfig.cookies).toHaveProperty('setAll');
      expect(typeof (cookiesConfig.cookies as any).getAll).toBe('function');
      expect(typeof (cookiesConfig.cookies as any).setAll).toBe('function');
    });

    it('should return the same client instance', async () => {
      Object.assign(process.env, {
        ...originalEnv,
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
      });

      const mockClient = { from: jest.fn() };
      mockCreateServerClient.mockReturnValue(mockClient as any);

      const client1 = await createSupabaseServerClient();
      const client2 = await createSupabaseServerClient();

      // Both calls should create new instances (not cached)
      expect(mockCreateServerClient).toHaveBeenCalledTimes(2);
      expect(client1).toBe(mockClient);
      expect(client2).toBe(mockClient);
    });

    it('should handle cookie operations', async () => {
      Object.assign(process.env, {
        ...originalEnv,
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
      });

      mockCreateServerClient.mockReturnValue({} as any);

      // The client captures the cookie store at creation time, so the
      // cookie data must be present before createSupabaseServerClient().
      const cookieData = [{ name: 'test-cookie', value: 'test-value' }];
      mockCookies.mockResolvedValue({
        get: jest.fn().mockReturnValue(undefined),
        getAll: jest.fn().mockReturnValue(cookieData),
        set: jest.fn()
      } as any);

      await createSupabaseServerClient();

      const cookiesConfig = mockCreateServerClient.mock.calls[0][2];
      const { getAll, setAll } = cookiesConfig.cookies as any;

      const result = await getAll();
      expect(result).toEqual(cookieData);

      // Test setAll function (swallows errors from cookies().set during RSC render)
      expect(() => setAll(cookieData)).not.toThrow();
    });

    describe('multi-tenancy org header injection', () => {
      beforeEach(() => {
        Object.assign(process.env, {
          NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
        });
        mockCreateServerClient.mockReturnValue({} as any);
      });

      function getGlobalHeaders(): Record<string, string> {
        return (mockCreateServerClient.mock.calls[0][2] as any).global?.headers ?? {};
      }

      it('should inject the current_organisation_id header when the cookie is present', async () => {
        mockCookies.mockResolvedValue({
          get: jest.fn().mockImplementation((name: string) =>
            name === 'current_organisation_id'
              ? { name, value: 'org-42' }
              : undefined
          ),
          getAll: jest.fn().mockReturnValue([]),
          set: jest.fn(),
        } as any);

        await createSupabaseServerClient();

        expect(getGlobalHeaders()).toEqual({
          Cookie: 'current_organisation_id=org-42',
        });
      });

      it('should not inject the org header when no cookie and no override are present', async () => {
        await createSupabaseServerClient();

        expect(getGlobalHeaders()).toEqual({});
      });

      it('should prefer orgIdOverride over the cookie value', async () => {
        mockCookies.mockResolvedValue({
          get: jest.fn().mockImplementation((name: string) =>
            name === 'current_organisation_id'
              ? { name, value: 'org-from-cookie' }
              : undefined
          ),
          getAll: jest.fn().mockReturnValue([]),
          set: jest.fn(),
        } as any);

        await createSupabaseServerClient('org-from-override');

        expect(getGlobalHeaders()).toEqual({
          Cookie: 'current_organisation_id=org-from-override',
        });
      });
    });
  });
});
