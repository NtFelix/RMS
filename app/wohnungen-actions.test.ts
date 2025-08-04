/**
 * @jest-environment node
 */

// Mock dependencies first
jest.mock('@/utils/supabase/server');
jest.mock('next/cache');

import { wohnungServerAction } from './wohnungen-actions';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// Mock the auth functions that would be used to get user info
jest.mock('@/utils/supabase/server', () => {
  const originalModule = jest.requireActual('@/utils/supabase/server');
  return {
    ...originalModule,
    createClient: jest.fn(),
  };
});

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

const mockCreateClient = createClient as jest.Mock;
const mockRevalidatePath = revalidatePath as jest.Mock;

describe('Wohnungen Server Action', () => {
  let mockSupabase: any;
  let mockUser: any;
  let mockSubscription: any;
  let mockCurrentApartments: any[] = [];

  // Helper function to create a mock apartment
  const createMockApartment = (id: string, index: number) => ({
    id,
    name: `Wohnung ${index + 1}`,
    groesse: 80,
    miete: 1200,
    haus_id: 'h1',
    user_id: 'user123',
    created_at: new Date().toISOString()
  });

  // Helper function to set up subscription plan limits
  const setupSubscriptionPlan = (planId: string) => {
    mockSubscription.plan_id = planId;
    
    // Reset apartment count based on plan
    const counts = {
      free: 1,
      pro: 10,
      business: 50
    };

    const count = counts[planId as keyof typeof counts] || 1;
    mockCurrentApartments = Array(count).fill(null).map((_, i) => 
      createMockApartment(`w${i+1}`, i)
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock user data
    mockUser = {
      id: 'user123',
      email: 'test@example.com'
    };
    
    // Mock subscription data
    mockSubscription = {
      id: 'sub123',
      user_id: mockUser.id,
      plan_id: 'free',
      status: 'active',
      current_period_end: Math.floor(Date.now() / 1000) + 86400 // 1 day from now
    };

    // Create a mock for the Supabase query builder
    const createMockQueryBuilder = (table: string) => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        single: jest.fn()
      };

      if (table === 'Wohnungen') {
        mockQuery.select.mockImplementation(() => ({
          eq: (field: string, value: any) => ({
            data: field === 'user_id' && value === mockUser.id 
              ? mockCurrentApartments 
              : [],
            error: null,
            count: field === 'user_id' && value === mockUser.id 
              ? mockCurrentApartments.length 
              : 0
          })
        }));

        mockQuery.insert.mockImplementation((data: any) => ({
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ 
            data: { ...data, id: 'new-id', created_at: new Date().toISOString() }, 
            error: null 
          })
        }));

        mockQuery.update.mockImplementation((data: any) => ({
          eq: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ 
            data: { ...data, id: 'w1', created_at: new Date().toISOString() }, 
            error: null 
          })
        }));
      } else if (table === 'user_subscriptions') {
        mockQuery.single.mockResolvedValue({ 
          data: mockSubscription, 
          error: null 
        });
      } else if (table === 'profiles') {
        mockQuery.single.mockResolvedValue({ 
          data: { id: mockUser.id, email: mockUser.email },
          error: null 
        });
      } else {
        mockQuery.single.mockResolvedValue({ data: null, error: null });
      }
      
      return mockQuery;
    };

    // Create the main Supabase mock
    mockSupabase = {
      from: jest.fn((table) => createMockQueryBuilder(table)),
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null })
      },
      rpc: jest.fn().mockImplementation((fnName: string) => ({
        data: fnName === 'get_user_subscription' ? mockSubscription : null,
        error: null
      }))
    };

    // Set up the client mock
    mockCreateClient.mockResolvedValue(mockSupabase);
    
    // Set up default empty apartments
    mockCurrentApartments = [];
  });

  describe('Subscription Plan Limits', () => {
    const validPayload = { 
      name: 'New Wohnung', 
      groesse: '80', 
      miete: '1200', 
      haus_id: 'h1' 
    };

    it('allows creating an apartment within free plan limits', async () => {
      setupSubscriptionPlan('free');
      // Free plan allows 1 apartment, we have 1, but we're updating it
      const result = await wohnungServerAction('w1', validPayload);
      expect(result.success).toBe(true);
    });

    it('prevents creating more apartments than free plan allows', async () => {
      setupSubscriptionPlan('free');
      // Try to create a new apartment (would be 2nd, but free plan allows only 1)
      const result = await wohnungServerAction(null, validPayload);
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Ihr aktueller Tarif erlaubt nur 1 Wohnung');
    });

    it('allows creating apartments within pro plan limits', async () => {
      setupSubscriptionPlan('pro');
      // Pro plan allows 10 apartments, we have 10, but we're updating one
      const result = await wohnungServerAction('w1', validPayload);
      expect(result.success).toBe(true);
    });

    it('prevents creating more apartments than pro plan allows', async () => {
      setupSubscriptionPlan('pro');
      // Add one more apartment to reach the limit
      mockCurrentApartments.push(createMockApartment('w11', 10));
      
      // Try to create another apartment (would be 11th, but pro plan allows only 10)
      const result = await wohnungServerAction(null, validPayload);
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Ihr aktueller Tarif erlaubt nur 10 Wohnungen');
    });

    it('allows creating many apartments with business plan', async () => {
      setupSubscriptionPlan('business');
      // Business plan allows 50 apartments, we have 50, but we're updating one
      const result = await wohnungServerAction('w1', validPayload);
      expect(result.success).toBe(true);
    });

    it('handles missing subscription by applying free tier limits', async () => {
      // Simulate no subscription found
      mockSupabase.rpc.mockImplementationOnce(() => ({
        data: null,
        error: { message: 'No subscription found' }
      }));
      
      setupSubscriptionPlan('free');
      // Try to create a new apartment (would be 2nd, but free plan allows only 1)
      const result = await wohnungServerAction(null, validPayload);
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Ihr aktueller Tarif erlaubt nur 1 Wohnung');
    });

    it('allows updating existing apartments without counting against limit', async () => {
      setupSubscriptionPlan('free');
      // Free plan allows 1 apartment, we have 1, and we're updating it
      const result = await wohnungServerAction('w1', { ...validPayload, name: 'Updated Name' });
      expect(result.success).toBe(true);
    });
  });

  describe('wohnungServerAction validation', () => {
    it('should return a validation error if name is missing', async () => {
      const payload = { name: '', groesse: 80, miete: 1200, haus_id: 'h1' };
      const result = await wohnungServerAction(null, payload);
      expect(result).toEqual({ success: false, error: { message: 'Name ist erforderlich.' } });
    });

    it('should return a validation error for non-positive groesse', async () => {
      const payload = { name: 'W1', groesse: 0, miete: 1200, haus_id: 'h1' };
      const result = await wohnungServerAction(null, payload);
      expect(result).toEqual({ success: false, error: { message: 'Größe muss eine positive Zahl sein.' } });
    });

    it('should return a validation error for negative miete', async () => {
      const payload = { name: 'W1', groesse: 80, miete: -1, haus_id: 'h1' };
      const result = await wohnungServerAction(null, payload);
      expect(result).toEqual({ success: false, error: { message: 'Miete muss eine Zahl sein.' } });
    });
  });

  describe('wohnungServerAction database operations', () => {
    const validPayload = { name: 'Wohnung 1', groesse: '80', miete: '1200', haus_id: 'h1' };
    const mockData = { ...validPayload, id: 'new-id', created_at: new Date().toISOString() };

    beforeEach(() => {
        // Setup mock for a successful DB call
        const mockSingle = jest.fn().mockResolvedValue({ data: mockData, error: null });
        const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
        mockSupabase.from.mockReturnValue({
            insert: jest.fn().mockReturnValue({ select: mockSelect }),
            update: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ select: mockSelect }) }),
        });
    });

    it('successfully creates a new apartment', async () => {
      const mockData = { id: 'w1', name: 'Wohnung 1', groesse: 80, miete: 1200, haus_id: 'h1', user_id: 'user123', created_at: '2023-01-01' };
      
      // Mock the count query
      const mockCountSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          data: [],
          error: null,
          count: 0
        })
      });
      
      // Mock the insert query
      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({ data: mockData, error: null });
      
      // First call is for the count query, second is for the insert
      mockSupabase.from
        .mockReturnValueOnce({
          select: mockCountSelect
        })
        .mockReturnValueOnce({
          insert: mockInsert.mockReturnValue({
            select: mockSelect.mockReturnValue({
              single: mockSingle
            })
          })
        });

      const result = await wohnungServerAction(null, { name: 'Wohnung 1', groesse: '80', miete: '1200', haus_id: 'h1' });

      expect(mockSupabase.from).toHaveBeenCalledWith('Wohnungen');
      expect(mockInsert).toHaveBeenCalledWith({ 
        name: 'Wohnung 1', 
        groesse: 80, 
        miete: 1200, 
        haus_id: 'h1',
        user_id: 'user123' 
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith('/wohnungen');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/');
      expect(mockRevalidatePath).toHaveBeenCalledWith('/haeuser/h1');
      expect(result).toEqual({ success: true, data: mockData });
    });

    it('successfully updates an existing apartment', async () => {
      const mockData = { id: 'w1', name: 'Wohnung 1', groesse: 80, miete: 1200, haus_id: 'h1', user_id: 'user123', created_at: '2023-01-01' };
      
      // Mock the method chain
      const mockUpdate = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockResolvedValue({ data: mockData, error: null });
      
      mockSupabase.from.mockReturnValueOnce({
        update: mockUpdate.mockReturnValue({
          eq: mockEq.mockReturnValue({
            select: mockSelect.mockReturnValue({
              single: mockSingle
            })
          })
        })
      });

      const result = await wohnungServerAction('w1', { name: 'Wohnung 1', groesse: '80', miete: '1200', haus_id: 'h1' });

      expect(mockSupabase.from).toHaveBeenCalledWith('Wohnungen');
      expect(mockUpdate).toHaveBeenCalledWith({ 
        name: 'Wohnung 1', 
        groesse: 80, 
        miete: 1200, 
        haus_id: 'h1',
        user_id: 'user123' 
      });
      expect(mockEq).toHaveBeenCalledWith('id', 'w1');
      expect(result).toEqual({ success: true, data: mockData });
    });

    it('handles database error on creation', async () => {
      const dbError = { message: 'Insert failed' };
      
      // Mock the count query
      const mockCountSelect = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          data: [],
          error: null,
          count: 0
        })
      });
      
      // Mock the insert query to reject with an error
      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockReturnThis();
      const mockSingle = jest.fn().mockRejectedValue(dbError);
      
      // First call is for the count query, second is for the insert
      mockSupabase.from
        .mockReturnValueOnce({
          select: mockCountSelect
        })
        .mockReturnValueOnce({
          insert: mockInsert.mockReturnValue({
            select: mockSelect.mockReturnValue({
              single: mockSingle
            })
          })
        });

      const result = await wohnungServerAction(null, validPayload);
      expect(result).toEqual({ success: false, error: dbError });
    });

    it('handles database error on update', async () => {
        const dbError = { message: 'Update failed' };
        const mockSingle = jest.fn().mockResolvedValue({ data: null, error: dbError });
        const mockSelect = jest.fn().mockReturnValue({ single: mockSingle });
        mockSupabase.from.mockReturnValue({ update: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ select: mockSelect }) }) });

        const result = await wohnungServerAction('w1', validPayload);
        expect(result).toEqual({ success: false, error: dbError });
    });
  });

  describe('Subscription Plan Limits', () => {
    const validPayload = { name: 'New Wohnung', groesse: '80', miete: '1200', haus_id: 'h1' };
    
    it('allows creating an apartment within free plan limits', async () => {
      setupSubscriptionPlan('free');
      // Free plan allows 1 apartment, we have 1, but we're updating it
      const result = await wohnungServerAction('w1', validPayload);
      expect(result.success).toBe(true);
    });

    it('prevents creating more apartments than free plan allows', async () => {
      setupSubscriptionPlan('free');
      // Try to create a new apartment (would be 2nd, but free plan allows only 1)
      const result = await wohnungServerAction(null, validPayload);
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Ihr aktueller Tarif erlaubt nur 1 Wohnung');
    });

    it('allows creating apartments within pro plan limits', async () => {
      setupSubscriptionPlan('pro');
      // Pro plan allows 10 apartments, we have 10, but we're updating one
      const result = await wohnungServerAction('w1', validPayload);
      expect(result.success).toBe(true);
    });

    it('prevents creating more apartments than pro plan allows', async () => {
      setupSubscriptionPlan('pro');
      // Add one more apartment to reach the limit
      mockCurrentApartments.push({
        id: 'w11',
        name: 'Extra Wohnung',
        groesse: 80,
        miete: 1200,
        haus_id: 'h1',
        created_at: new Date().toISOString()
      });
      
      // Try to create another apartment (would be 11th, but pro plan allows only 10)
      const result = await wohnungServerAction(null, validPayload);
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Ihr aktueller Tarif erlaubt nur 10 Wohnungen');
    });

    it('allows creating many apartments with business plan', async () => {
      setupSubscriptionPlan('business');
      // Business plan allows 50 apartments, we have 50, but we're updating one
      const result = await wohnungServerAction('w1', validPayload);
      expect(result.success).toBe(true);
    });

    it('handles missing subscription by applying free tier limits', async () => {
      // Simulate no subscription found
      mockSupabase.rpc.mockImplementationOnce(() => ({
        data: null,
        error: { message: 'No subscription found' }
      }));
      
      setupSubscriptionPlan('free');
      // Try to create a new apartment (would be 2nd, but free plan allows only 1)
      const result = await wohnungServerAction(null, validPayload);
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Ihr aktueller Tarif erlaubt nur 1 Wohnung');
    });

    it('allows updating existing apartments without counting against limit', async () => {
      setupSubscriptionPlan('free');
      // Free plan allows 1 apartment, we have 1, and we're updating it
      const result = await wohnungServerAction('w1', { ...validPayload, name: 'Updated Name' });
      expect(result.success).toBe(true);
    });
  });
});
