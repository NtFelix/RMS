import { NextRequest, NextResponse } from 'next/server';
import { middleware } from './middleware'; // Adjust path as necessary
import { updateSession } from '@/utils/supabase/middleware'; // Adjust path
import { createServerClient } from '@supabase/ssr';

// Mock a minimal NextRequest
const mockRequest = (pathname: string, cookies: Record<string, string> = {}): NextRequest => {
  const url = new URL(`http://localhost:3000${pathname}`);
  const request = new NextRequest(url);
  for (const key in cookies) {
    request.cookies.set(key, cookies[key]);
  }
  return request;
};

// Mock @/utils/supabase/middleware
jest.mock('@/utils/supabase/middleware', () => ({
  updateSession: jest.fn().mockResolvedValue(NextResponse.next()), // Default mock
}));

// Mock @supabase/ssr
const mockSupabaseAuthUser = jest.fn();
const mockSupabaseFrom = jest.fn();
const mockSupabaseSingle = jest.fn();

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: mockSupabaseAuthUser,
    },
    from: mockSupabaseFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: mockSupabaseSingle,
    }),
  })),
}));

// Mock environment variables (if your middleware uses them directly, though it gets them for createServerClient)
// process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test-supabase.co';
// process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

describe('Middleware', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Default behavior for updateSession, can be overridden in specific tests
    (updateSession as jest.Mock).mockResolvedValue(NextResponse.next());
    // Default behavior for getUser: no user
    mockSupabaseAuthUser.mockResolvedValue({ data: { user: null }, error: null });
    // Default behavior for profile: no profile, no error
    mockSupabaseSingle.mockResolvedValue({ data: null, error: null });
  });

  it('should allow access to public routes for unauthenticated users', async () => {
    const req = mockRequest('/');
    const res = await middleware(req);
    expect(res.status).toBe(200); // Assuming NextResponse.next() results in 200
    expect(updateSession).toHaveBeenCalledWith(req);
  });

  it('should redirect unauthenticated users to /auth/login for protected routes', async () => {
    const req = mockRequest('/home');
    const res = await middleware(req);
    expect(res.status).toBe(307); // Redirect status
    expect(res.headers.get('location')).toContain('/auth/login');
  });

  it('should allow authenticated users with active subscription to access protected routes', async () => {
    mockSupabaseAuthUser.mockResolvedValue({ data: { user: { id: 'user123' } }, error: null });
    mockSupabaseSingle.mockResolvedValue({ data: { stripe_subscription_status: 'active' }, error: null });
    const req = mockRequest('/home');
    const res = await middleware(req);
    expect(res.status).toBe(200);
    expect(mockSupabaseFrom).toHaveBeenCalledWith('profiles');
  });

  it('should redirect authenticated users with inactive subscription to /subscription-locked', async () => {
    mockSupabaseAuthUser.mockResolvedValue({ data: { user: { id: 'user123' } }, error: null });
    mockSupabaseSingle.mockResolvedValue({ data: { stripe_subscription_status: 'inactive' }, error: null });
    const req = mockRequest('/home');
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/subscription-locked');
  });

  it('should redirect authenticated users with other non-active subscription to /subscription-locked', async () => {
    mockSupabaseAuthUser.mockResolvedValue({ data: { user: { id: 'user123' } }, error: null });
    mockSupabaseSingle.mockResolvedValue({ data: { stripe_subscription_status: 'past_due' }, error: null });
    const req = mockRequest('/home');
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/subscription-locked');
  });

  it('should redirect to /landing with error if profile fetch fails for an authenticated user', async () => {
    mockSupabaseAuthUser.mockResolvedValue({ data: { user: { id: 'user123' } }, error: null });
    mockSupabaseSingle.mockResolvedValue({ data: null, error: new Error('Profile fetch failed') });
    const req = mockRequest('/home'); // A protected route
    const res = await middleware(req);

    expect(console.error).toHaveBeenCalledWith('Error fetching profile:', expect.any(Error));
    expect(res.status).toBe(307); // Redirect status
    const redirectUrl = new URL(res.headers.get('location')!, 'http://localhost:3000');
    expect(redirectUrl.pathname).toBe('/landing');
    expect(redirectUrl.searchParams.get('error')).toBe('profile_fetch_failed');
  });

   beforeAll(() => {
    // Spy on console.error before all tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    // Restore console.error after all tests
    (console.error as jest.Mock).mockRestore();
  });


  it('should allow access to /subscription-locked for authenticated user even with inactive subscription', async () => {
    mockSupabaseAuthUser.mockResolvedValue({ data: { user: { id: 'user123' } }, error: null });
    // Even if they had an inactive sub, they should be able to see the page they are redirected to.
    mockSupabaseSingle.mockResolvedValue({ data: { stripe_subscription_status: 'inactive' }, error: null });
    const req = mockRequest('/subscription-locked');
    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  it('should allow access to /subscription-locked for unauthenticated user', async () => {
    const req = mockRequest('/subscription-locked');
    const res = await middleware(req);
    expect(res.status).toBe(200);
  });

  it('should allow authenticated users to access other public routes like /landing', async () => {
    mockSupabaseAuthUser.mockResolvedValue({ data: { user: { id: 'user123' } }, error: null });
    // No profile check should occur for public routes
    const req = mockRequest('/landing');
    const res = await middleware(req);
    expect(res.status).toBe(200);
    expect(mockSupabaseFrom).not.toHaveBeenCalled();
  });

  it('should correctly handle paths with regex characters like /modern/documentation/foo', async () => {
    const req = mockRequest('/modern/documentation/foo');
    const res = await middleware(req);
    expect(res.status).toBe(200); // Public route
  });

  it('should redirect authenticated user from /auth/login to /home', async () => {
    mockSupabaseAuthUser.mockResolvedValue({ data: { user: { id: 'user123' } }, error: null });
    const req = mockRequest('/auth/login');
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/home');
  });

  it('should allow unauthenticated user to access /auth/login', async () => {
    const req = mockRequest('/auth/login');
    const res = await middleware(req);
    expect(res.status).toBe(200); // Handled by updateSession or direct return
  });

});
