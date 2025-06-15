import { GET } from './route'; // Assuming route.ts is in the same directory for testing
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { getPlanDetails } from '@/lib/stripe-server';
import { NextResponse } from 'next/server';

// Mock dependencies
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: jest.fn(),
}));
jest.mock('@/lib/stripe-server', () => ({
  getPlanDetails: jest.fn(),
}));
jest.mock('next/headers', () => ({ // Mock cookies if your Supabase client setup needs it
    cookies: jest.fn(() => ({
      get: jest.fn(),
      set: jest.fn(),
      // ... other cookie methods if needed
    })),
}));

// Helper to simulate NextResponse.json
const mockNextResponseJson = (body: any, options?: { status: number }) => {
  return {
    json: () => Promise.resolve(body),
    status: options?.status || 200,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    ok: (options?.status || 200) >= 200 && (options?.status || 200) < 300,
    text: () => Promise.resolve(JSON.stringify(body)),
    clone: function() { return this; } // Basic clone
  } as unknown as Response; // Cast to Response type for compatibility
};


describe('API Route: /api/user/profile GET', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabaseClient = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };
    (createRouteHandlerClient as jest.Mock).mockReturnValue(mockSupabaseClient);
  });

  it('should return 401 if user is not authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    // Simulate a Request object if your handler expects it
    const request = new Request('http://localhost/api/user/profile');
    const response = await GET(request);
    const jsonResponse = await response.json();

    expect(response.status).toBe(401);
    expect(jsonResponse.error).toBe('Not authenticated');
  });

  it('should return 404 if user is authenticated but has no profile', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'user123', email: 'test@example.com' } }, error: null });
    mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: { message: 'Profile not found', code: 'PGRST116' } }); // PGRST116 is often "Row not found"

    const request = new Request('http://localhost/api/user/profile');
    const response = await GET(request);
    const jsonResponse = await response.json();

    expect(response.status).toBe(404);
    expect(jsonResponse.error).toBe('Profile not found');
  });

  it('should return profile with no active subscription if status is not active', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com' };
    const mockProfile = { id: 'user123', stripe_subscription_status: 'canceled', stripe_price_id: null };
    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({ data: { user: mockUser }, error: null });
    mockSupabaseClient.single.mockResolvedValueOnce({ data: mockProfile, error: null });

    const request = new Request('http://localhost/api/user/profile');
    const response = await GET(request);
    const jsonResponse = await response.json();

    expect(response.status).toBe(200);
    expect(jsonResponse.email).toBe(mockUser.email);
    expect(jsonResponse.hasActiveSubscription).toBe(false);
    expect(jsonResponse.activePlan).toBeNull();
  });

  it('should return profile with active subscription and plan details', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com' };
    const mockProfile = { id: 'user123', stripe_subscription_status: 'active', stripe_price_id: 'price_123' };
    const mockPlan = { name: 'Pro Plan', features: 'All features', limitWohnungen: 10 };

    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({ data: { user: mockUser }, error: null });
    mockSupabaseClient.single.mockResolvedValueOnce({ data: mockProfile, error: null });
    (getPlanDetails as jest.Mock).mockResolvedValueOnce(mockPlan);

    const request = new Request('http://localhost/api/user/profile');
    const response = await GET(request);
    const jsonResponse = await response.json();

    expect(response.status).toBe(200);
    expect(jsonResponse.email).toBe(mockUser.email);
    expect(jsonResponse.hasActiveSubscription).toBe(true);
    expect(jsonResponse.activePlan).toEqual(mockPlan);
    expect(getPlanDetails).toHaveBeenCalledWith('price_123');
  });

  it('should handle error from getPlanDetails gracefully', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com' };
    const mockProfile = { id: 'user123', stripe_subscription_status: 'active', stripe_price_id: 'price_123' };

    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({ data: { user: mockUser }, error: null });
    mockSupabaseClient.single.mockResolvedValueOnce({ data: mockProfile, error: null });
    (getPlanDetails as jest.Mock).mockRejectedValueOnce(new Error('Stripe API error'));

    const request = new Request('http://localhost/api/user/profile');
    const response = await GET(request);
    const jsonResponse = await response.json();

    expect(response.status).toBe(500);
    expect(jsonResponse.error).toBe('Could not fetch plan details');
  });

   it('should return profile with hasActiveSubscription false if getPlanDetails returns null', async () => {
    const mockUser = { id: 'user123', email: 'test@example.com' };
    const mockProfile = { id: 'user123', stripe_subscription_status: 'active', stripe_price_id: 'price_non_existent' };

    mockSupabaseClient.auth.getUser.mockResolvedValueOnce({ data: { user: mockUser }, error: null });
    mockSupabaseClient.single.mockResolvedValueOnce({ data: mockProfile, error: null });
    (getPlanDetails as jest.Mock).mockResolvedValueOnce(null); // Simulate price ID not found in Stripe

    const request = new Request('http://localhost/api/user/profile');
    const response = await GET(request);
    const jsonResponse = await response.json();

    expect(response.status).toBe(200);
    expect(jsonResponse.hasActiveSubscription).toBe(false);
    expect(jsonResponse.activePlan).toBeNull();
  });
});
