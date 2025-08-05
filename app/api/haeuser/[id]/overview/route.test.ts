import { GET } from './route';
import { createClient } from '@/utils/supabase/server';

// Mock the Supabase client
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('/api/haeuser/[id]/overview', () => {
  let mockSupabase: any;

  beforeEach(() => {
    // Create a more comprehensive mock that handles chaining
    const createMockQuery = () => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
    });

    mockSupabase = {
      from: jest.fn(() => createMockQuery()),
    };
    mockCreateClient.mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return Haus overview with Wohnungen successfully', async () => {
    const mockHausData = {
      id: 'haus-1',
      name: 'Test Haus',
      strasse: 'Teststraße 1',
      ort: 'Berlin',
      size: '500'
    };

    const mockWohnungenData = [
      { id: 'wohnung-1', name: 'Wohnung 1', groesse: 50, miete: 800 },
      { id: 'wohnung-2', name: 'Wohnung 2', groesse: 60, miete: 900 }
    ];

    const mockMieterData = [
      { id: 'mieter-1', name: 'Max Mustermann', einzug: '2023-01-01', auszug: null, wohnung_id: 'wohnung-1' }
    ];

    // Mock the three sequential queries
    let callCount = 0;
    mockSupabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call: Haus query
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockHausData,
            error: null
          })
        };
      } else if (callCount === 2) {
        // Second call: Wohnungen query
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: mockWohnungenData,
            error: null
          })
        };
      } else {
        // Third call: Mieter query
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({
            data: mockMieterData,
            error: null
          })
        };
      }
    });

    const request = new Request('http://localhost/api/haeuser/haus-1/overview');
    const response = await GET(request, { params: { id: 'haus-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.haus).toEqual({
      id: 'haus-1',
      name: 'Test Haus',
      strasse: 'Teststraße 1',
      ort: 'Berlin',
      size: '500'
    });
    expect(data.wohnungen).toHaveLength(2);
    expect(data.wohnungen[0].status).toBe('vermietet');
    expect(data.wohnungen[1].status).toBe('frei');
  });

  it('should return 404 when Haus not found', async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' }
    });

    const request = new Request('http://localhost/api/haeuser/nonexistent/overview');
    const response = await GET(request, { params: { id: 'nonexistent' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Haus nicht gefunden.');
  });

  it('should return 400 when no ID provided', async () => {
    const request = new Request('http://localhost/api/haeuser//overview');
    const response = await GET(request, { params: { id: '' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Haus-ID ist erforderlich.');
  });

  it('should handle database errors gracefully', async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST000', message: 'Database error' }
    });

    const request = new Request('http://localhost/api/haeuser/haus-1/overview');
    const response = await GET(request, { params: { id: 'haus-1' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Laden der Hausdaten.');
  });
});