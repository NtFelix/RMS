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
    originalEnv = process.env;
    jest.clearAllMocks();
    
    // Mock cookies function
    mockCookies.mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: 'test-cookie-value' }),
      set: jest.fn(),
      delete: jest.fn(),
    } as any);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createSupabaseServerClient', () => {
    it('should create Supabase client with correct configuration', () => {
      process.env = {
        ...originalEnv,
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
      };

      const mockClient = { from: jest.fn() };
      mockCreateServerClient.mockReturnValue(mockClient as any);

      const result = createSupabaseServerClient();

      expect(mockCreateServerClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        expect.objectContaining({
          cookies: expect.objectContaining({
            get: expect.any(Function),
            set: expect.any(Function),
            remove: expect.any(Function)
          })
        })
      );

      expect(result).toBe(mockClient);
    });

    it('should handle missing environment variables', () => {
      process.env = { ...originalEnv };
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
      process.env = {
        ...originalEnv,
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
      };

      mockCreateServerClient.mockReturnValue({} as any);

      createSupabaseServerClient();

      const cookiesConfig = mockCreateServerClient.mock.calls[0][2];
      expect(cookiesConfig).toHaveProperty('cookies');
      expect(cookiesConfig.cookies).toHaveProperty('get');
      expect(cookiesConfig.cookies).toHaveProperty('set');
      expect(cookiesConfig.cookies).toHaveProperty('remove');
      expect(typeof cookiesConfig.cookies.get).toBe('function');
      expect(typeof cookiesConfig.cookies.set).toBe('function');
      expect(typeof cookiesConfig.cookies.remove).toBe('function');
    });

    it('should return the same client instance', () => {
      process.env = {
        ...originalEnv,
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
      };

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
      process.env = {
        ...originalEnv,
        NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
      };

      mockCreateServerClient.mockReturnValue({} as any);

      createSupabaseServerClient();

      const cookiesConfig = mockCreateServerClient.mock.calls[0][2];
      const { get, set, remove } = cookiesConfig.cookies;

      // Test get function
      const result = await get('test-cookie');
      expect(result).toBe('test-cookie-value');

      // Test set function
      expect(() => set('test-cookie', 'test-value', {})).not.toThrow();

      // Test remove function
      expect(() => remove('test-cookie', {})).not.toThrow();
    });
  });
});