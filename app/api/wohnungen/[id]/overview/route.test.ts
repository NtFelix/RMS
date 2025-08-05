import { GET } from './route';
import { createClient } from '@/utils/supabase/server';

// Mock the Supabase client
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('/api/wohnungen/[id]/overview', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };
    mockCreateClient.mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return Wohnung overview with Mieter successfully', async () => {
    const mockWohnungData = {
      id: 'wohnung-1',
      name: 'Wohnung 1',
      groesse: 50,
      miete: 800,
      Haeuser: { name: 'Test Haus' }
    };

    const mockMieterData = [
      {
        id: 'mieter-1',
        name: 'Max Mustermann',
        email: 'max@example.com',
        telefonnummer: '123456789',
        einzug: '2023-01-01',
        auszug: null
      },
      {
        id: 'mieter-2',
        name: 'Anna Schmidt',
        email: 'anna@example.com',
        telefonnummer: '987654321',
        einzug: '2022-01-01',
        auszug: '2022-12-31'
      }
    ];

    // Mock Wohnung query
    mockSupabase.single.mockResolvedValueOnce({
      data: mockWohnungData,
      error: null
    });

    // Mock Mieter query
    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: mockMieterData,
        error: null
      })
    });

    const request = new Request('http://localhost/api/wohnungen/wohnung-1/overview');
    const response = await GET(request, { params: { id: 'wohnung-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.wohnung).toEqual({
      id: 'wohnung-1',
      name: 'Wohnung 1',
      groesse: 50,
      miete: 800,
      hausName: 'Test Haus'
    });
    expect(data.mieter).toHaveLength(2);
    expect(data.mieter[0].status).toBe('active');
    expect(data.mieter[1].status).toBe('moved_out');
  });

  it('should return 404 when Wohnung not found', async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116', message: 'No rows found' }
    });

    const request = new Request('http://localhost/api/wohnungen/nonexistent/overview');
    const response = await GET(request, { params: { id: 'nonexistent' } });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Wohnung nicht gefunden.');
  });

  it('should return 400 when no ID provided', async () => {
    const request = new Request('http://localhost/api/wohnungen//overview');
    const response = await GET(request, { params: { id: '' } });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Wohnungs-ID ist erforderlich.');
  });

  it('should handle database errors gracefully', async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST000', message: 'Database error' }
    });

    const request = new Request('http://localhost/api/wohnungen/wohnung-1/overview');
    const response = await GET(request, { params: { id: 'wohnung-1' } });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Laden der Wohnungsdaten.');
  });

  it('should handle missing Haus name gracefully', async () => {
    const mockWohnungData = {
      id: 'wohnung-1',
      name: 'Wohnung 1',
      groesse: 50,
      miete: 800,
      Haeuser: null
    };

    mockSupabase.single.mockResolvedValueOnce({
      data: mockWohnungData,
      error: null
    });

    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [],
        error: null
      })
    });

    const request = new Request('http://localhost/api/wohnungen/wohnung-1/overview');
    const response = await GET(request, { params: { id: 'wohnung-1' } });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.wohnung.hausName).toBe('Unbekannt');
  });
});