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
    it('should create Supabase client with correct configuration', () => {
      Object.assign(process.env, {
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
      });

      const mockClient = { from: jest.fn() };
      mockCreateServerClient.mockReturnValue(mockClient as any);

      const result = createSupabaseServerClient();

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

    it('should handle missing environment variables', () => {
      Object.assign(process.env, originalEnv);
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const mockClient = { from: jest.fn() };
      mockCreateServerClient.mockReturnValue(mockClient as any);

      createSupabaseServerClient();

      expect(mockCreateServerClient).toHaveBeenCalledWith(
        undefined,
        undefined,
        expect.any(Object)
      );
    });

    it('should configure cookies correctly', () => {
      Object.assign(process.env, {
        ...originalEnv,
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
      });

      mockCreateServerClient.mockReturnValue({} as any);

      createSupabaseServerClient();

      const cookiesConfig = mockCreateServerClient.mock.calls[0][2];
      expect(cookiesConfig).toHaveProperty('cookies');
      expect(cookiesConfig.cookies).toHaveProperty('getAll');
      expect(cookiesConfig.cookies).toHaveProperty('setAll');
      expect(typeof (cookiesConfig.cookies as any).getAll).toBe('function');
      expect(typeof (cookiesConfig.cookies as any).setAll).toBe('function');
    });

    it('should return the same client instance', () => {
      Object.assign(process.env, {
        ...originalEnv,
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
      });

      const mockClient = { from: jest.fn() };
      mockCreateServerClient.mockReturnValue(mockClient as any);

      const client1 = createSupabaseServerClient();
      const client2 = createSupabaseServerClient();

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

      createSupabaseServerClient();

      const cookiesConfig = mockCreateServerClient.mock.calls[0][2];
      const { getAll, setAll } = cookiesConfig.cookies as any;

      // Test getAll function
      const cookieData = [{ name: 'test-cookie', value: 'test-value' }];
      mockCookies.mockResolvedValue({
        getAll: jest.fn().mockReturnValue(cookieData),
        set: jest.fn()
      } as any);
      
      const result = await getAll();
      expect(result).toEqual(cookieData);

      // Test setAll function
      expect(() => setAll(cookieData)).not.toThrow();
    });
  });
});