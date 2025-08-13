import { GET } from './route';
import { NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Mock the Supabase client
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error;
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.log = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
});

describe('/api/search', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the search pattern cache
    jest.resetModules();
    
    // Mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    };
    
    mockCreateClient.mockResolvedValue(mockSupabase);
  });

  describe('Query validation', () => {
    it('should return 400 for empty query', async () => {
      const request = new NextRequest('http://localhost/api/search?q=');
      const response = await GET(request);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Search query is required');
    });

    it('should return 400 for missing query parameter', async () => {
      const request = new NextRequest('http://localhost/api/search');
      const response = await GET(request);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Search query is required');
    });

    it('should return 400 for query that is too long', async () => {
      const longQuery = 'a'.repeat(101);
      const request = new NextRequest(`http://localhost/api/search?q=${longQuery}`);
      const response = await GET(request);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Search query too long');
    });

    it('should return 400 for invalid limit', async () => {
      const request = new NextRequest('http://localhost/api/search?q=test&limit=0');
      const response = await GET(request);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Limit must be between 1 and 20');
    });

    it('should return 400 for limit too high', async () => {
      const request = new NextRequest('http://localhost/api/search?q=test&limit=25');
      const response = await GET(request);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Limit must be between 1 and 20');
    });
  });

  describe('Successful searches', () => {
    it('should search tenants successfully', async () => {
      const mockTenantData = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          telefonnummer: '123456789',
          einzug: '2023-01-01',
          auszug: null,
          Wohnungen: {
            name: 'Apartment 1',
            Haeuser: {
              name: 'House 1'
            }
          }
        }
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'Mieter') {
          return {
            ...mockSupabase,
            limit: jest.fn().mockResolvedValue({ data: mockTenantData, error: null })
          };
        }
        return {
          ...mockSupabase,
          limit: jest.fn().mockResolvedValue({ data: [], error: null })
        };
      });

      const request = new NextRequest('http://localhost/api/search?q=John&categories=tenant');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.results.tenant).toHaveLength(1);
      expect(data.results.tenant[0].name).toBe('John Doe');
      expect(data.results.tenant[0].status).toBe('active');
      expect(data.totalCount).toBe(1);
    });

    it('should search houses successfully', async () => {
      const mockHouseData = [
        {
          id: '1',
          name: 'House 1',
          strasse: 'Main Street 1',
          ort: 'Berlin',
          Wohnungen: [
            { id: '1', miete: 800, Mieter: [] },
            { id: '2', miete: 900, Mieter: [{ auszug: null }] }
          ]
        }
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'Haeuser') {
          return {
            ...mockSupabase,
            limit: jest.fn().mockResolvedValue({ data: mockHouseData, error: null })
          };
        }
        return {
          ...mockSupabase,
          limit: jest.fn().mockResolvedValue({ data: [], error: null })
        };
      });

      const request = new NextRequest('http://localhost/api/search?q=House&categories=houses');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.results.houses).toHaveLength(1);
      expect(data.results.houses[0].name).toBe('House 1');
      expect(data.results.houses[0].apartment_count).toBe(2);
      expect(data.results.houses[0].total_rent).toBe(1700);
    });

    it('should search apartments successfully', async () => {
      const mockApartmentData = [
        {
          id: '1',
          name: 'Apartment 1',
          groesse: 75,
          miete: 800,
          Haeuser: { name: 'House 1' },
          Mieter: [{ name: 'John Doe', einzug: '2023-01-01', auszug: null }]
        }
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'Wohnungen') {
          return {
            ...mockSupabase,
            limit: jest.fn().mockResolvedValue({ data: mockApartmentData, error: null })
          };
        }
        return {
          ...mockSupabase,
          limit: jest.fn().mockResolvedValue({ data: [], error: null })
        };
      });

      const request = new NextRequest('http://localhost/api/search?q=Apartment&categories=apartments');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.results.apartments).toHaveLength(1);
      expect(data.results.apartments[0].name).toBe('Apartment 1');
      expect(data.results.apartments[0].status).toBe('rented');
      expect(data.results.apartments[0].current_tenant?.name).toBe('John Doe');
    });

    it('should search finances successfully', async () => {
      const mockFinanceData = [
        {
          id: '1',
          name: 'Rent Payment',
          betrag: 800,
          datum: '2023-12-01',
          ist_einnahmen: true,
          notiz: 'Monthly rent',
          Wohnungen: {
            name: 'Apartment 1',
            Haeuser: { name: 'House 1' }
          }
        }
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'Finanzen') {
          return {
            ...mockSupabase,
            limit: jest.fn().mockResolvedValue({ data: mockFinanceData, error: null })
          };
        }
        return {
          ...mockSupabase,
          limit: jest.fn().mockResolvedValue({ data: [], error: null })
        };
      });

      const request = new NextRequest('http://localhost/api/search?q=Rent&categories=finances');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.results.finances).toHaveLength(1);
      expect(data.results.finances[0].name).toBe('Rent Payment');
      expect(data.results.finances[0].type).toBe('income');
      expect(data.results.finances[0].amount).toBe(800);
    });

    it('should search tasks successfully', async () => {
      const mockTaskData = [
        {
          id: '1',
          name: 'Fix heating',
          beschreibung: 'Repair heating system in apartment 1',
          ist_erledigt: false,
          erstellungsdatum: '2023-12-01'
        }
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'Aufgaben') {
          return {
            ...mockSupabase,
            limit: jest.fn().mockResolvedValue({ data: mockTaskData, error: null })
          };
        }
        return {
          ...mockSupabase,
          limit: jest.fn().mockResolvedValue({ data: [], error: null })
        };
      });

      const request = new NextRequest('http://localhost/api/search?q=heating&categories=tasks');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.results.tasks).toHaveLength(1);
      expect(data.results.tasks[0].name).toBe('Fix heating');
      expect(data.results.tasks[0].completed).toBe(false);
    });

    it('should handle numeric queries for finances', async () => {
      const mockFinanceData = [
        {
          id: '1',
          name: 'Rent Payment',
          betrag: 800,
          datum: '2023-12-01',
          ist_einnahmen: true,
          notiz: null,
          Wohnungen: null
        }
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'Finanzen') {
          return {
            ...mockSupabase,
            limit: jest.fn().mockResolvedValue({ data: mockFinanceData, error: null })
          };
        }
        return {
          ...mockSupabase,
          limit: jest.fn().mockResolvedValue({ data: [], error: null })
        };
      });

      const request = new NextRequest('http://localhost/api/search?q=800&categories=finances');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.results.finances).toHaveLength(1);
      expect(data.results.finances[0].amount).toBe(800);
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockImplementation(() => ({
        ...mockSupabase,
        limit: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Database connection failed' } 
        })
      }));

      const request = new NextRequest('http://localhost/api/search?q=test');
      const response = await GET(request);
      
      // Should return partial results (206) or success with empty results
      expect([200, 206]).toContain(response.status);
      const data = await response.json();
      expect(data.results).toBeDefined();
    });

    it('should handle timeout errors', async () => {
      // Mock a slow response that exceeds timeout
      mockSupabase.from.mockImplementation(() => ({
        ...mockSupabase,
        limit: jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(resolve, 20000)) // 20 second delay
        )
      }));

      const request = new NextRequest('http://localhost/api/search?q=test');
      
      // The request should timeout and return an error
      const response = await GET(request);
      expect(response.status).toBe(408);
      const data = await response.json();
      expect(data.error).toContain('dauert zu lange');
    });

    it('should return proper error response format', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const request = new NextRequest('http://localhost/api/search?q=test');
      const response = await GET(request);
      
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.timestamp).toBeDefined();
      expect(data.requestId).toBeDefined();
    });
  });

  describe('Performance and caching', () => {
    it('should include execution time in response', async () => {
      mockSupabase.from.mockImplementation(() => ({
        ...mockSupabase,
        limit: jest.fn().mockResolvedValue({ data: [], error: null })
      }));

      const request = new NextRequest('http://localhost/api/search?q=test');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(typeof data.executionTime).toBe('number');
      expect(data.executionTime).toBeGreaterThan(0);
    });

    it('should include cache headers for successful responses', async () => {
      mockSupabase.from.mockImplementation(() => ({
        ...mockSupabase,
        limit: jest.fn().mockResolvedValue({ data: [], error: null })
      }));

      const request = new NextRequest('http://localhost/api/search?q=test');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=60');
    });

    it.skip('should handle partial results with warning headers', async () => {
      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'Mieter' && callCount === 1) {
          return {
            ...mockSupabase,
            limit: jest.fn().mockResolvedValue({ 
              data: [{ id: '1', name: 'John', email: 'john@test.com' }], 
              error: null 
            })
          };
        }
        return {
          ...mockSupabase,
          limit: jest.fn().mockImplementation(() => Promise.reject(new Error('Database error')))
        };
      });

      const request = new NextRequest('http://localhost/api/search?q=test');
      const response = await GET(request);
      
      // Should return partial results
      expect([200, 206]).toContain(response.status);
      const data = await response.json();
      expect(data.totalCount).toBeGreaterThan(0);
    });
  });

  describe('Query sanitization', () => {
    it('should sanitize special characters in queries', async () => {
      mockSupabase.from.mockImplementation(() => ({
        ...mockSupabase,
        limit: jest.fn().mockResolvedValue({ data: [], error: null })
      }));

      const request = new NextRequest('http://localhost/api/search?q=test%25_query');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      // The query should be processed without errors
      const data = await response.json();
      expect(data.results).toBeDefined();
    });

    it('should handle empty results gracefully', async () => {
      mockSupabase.from.mockImplementation(() => ({
        ...mockSupabase,
        limit: jest.fn().mockResolvedValue({ data: [], error: null })
      }));

      const request = new NextRequest('http://localhost/api/search?q=nonexistent');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.totalCount).toBe(0);
      expect(data.results.tenants).toEqual([]);
      expect(data.results.houses).toEqual([]);
      expect(data.results.apartments).toEqual([]);
      expect(data.results.finances).toEqual([]);
      expect(data.results.tasks).toEqual([]);
    });
  });

  describe('Category filtering', () => {
    it('should respect category filters', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'Mieter') {
          return {
            ...mockSupabase,
            limit: jest.fn().mockResolvedValue({ 
              data: [{ id: '1', name: 'John', email: 'john@test.com' }], 
              error: null 
            })
          };
        }
        return {
          ...mockSupabase,
          limit: jest.fn().mockResolvedValue({ data: [], error: null })
        };
      });

      const request = new NextRequest('http://localhost/api/search?q=test&categories=tenants');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // Only tenants should be searched
      expect(data.results.tenants.length).toBeGreaterThan(0);
      expect(data.results.houses).toEqual([]);
      expect(data.results.apartments).toEqual([]);
      expect(data.results.finances).toEqual([]);
      expect(data.results.tasks).toEqual([]);
    });

    it('should handle multiple categories', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'Mieter' || table === 'Haeuser') {
          return {
            ...mockSupabase,
            limit: jest.fn().mockResolvedValue({ 
              data: [{ id: '1', name: 'Test' }], 
              error: null 
            })
          };
        }
        return {
          ...mockSupabase,
          limit: jest.fn().mockResolvedValue({ data: [], error: null })
        };
      });

      const request = new NextRequest('http://localhost/api/search?q=test&categories=tenants,houses');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.results.tenants.length).toBeGreaterThan(0);
      expect(data.results.houses.length).toBeGreaterThan(0);
      expect(data.results.apartments).toEqual([]);
      expect(data.results.finances).toEqual([]);
      expect(data.results.tasks).toEqual([]);
    });
  });
});