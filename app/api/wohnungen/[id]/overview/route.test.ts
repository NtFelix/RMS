import { GET } from './route';
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// Mock the Supabase client
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({
      json: () => Promise.resolve(data),
      status: options?.status || 200,
    })),
  },
}));

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('/api/wohnungen/[id]/overview', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn(),
    };
    mockCreateClient.mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return Wohnung overview with Mieter successfully', async () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';
    const mockWohnungData = {
      id: validUuid,
      name: 'Wohnung 1',
      groesse: 50,
      miete: 800,
      Haeuser: [{ name: 'Test Haus' }]
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
    const mockWohnungQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockWohnungData,
        error: null
      })
    };

    // Mock Mieter query
    const mockMieterQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: mockMieterData,
        error: null
      })
    };

    mockSupabase.from
      .mockReturnValueOnce(mockWohnungQuery)
      .mockReturnValueOnce(mockMieterQuery);

    const request = new Request(`http://localhost/api/wohnungen/${validUuid}/overview`);
    const response = await GET(request, { params: Promise.resolve({ id: validUuid }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(validUuid);
    expect(data.name).toBe('Wohnung 1');
    expect(data.groesse).toBe(50);
    expect(data.miete).toBe(800);
    expect(data.hausName).toBe('Test Haus');
    expect(data.mieter).toHaveLength(2);
    expect(data.mieter[0].status).toBe('active');
    expect(data.mieter[1].status).toBe('moved_out');
  });

  it('should return 404 when Wohnung not found', async () => {
    const mockWohnungQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' }
      })
    };

    mockSupabase.from.mockReturnValue(mockWohnungQuery);

    const validUuid = '550e8400-e29b-41d4-a716-446655440000';
    const request = new Request(`http://localhost/api/wohnungen/${validUuid}/overview`);
    const response = await GET(request, { params: Promise.resolve({ id: validUuid }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Wohnung nicht gefunden.');
  });

  it('should return 400 when no ID provided', async () => {
    const request = new Request('http://localhost/api/wohnungen//overview');
    const response = await GET(request, { params: Promise.resolve({ id: '' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Wohnungs-ID ist erforderlich.');
  });

  it('should return 400 when invalid UUID format provided', async () => {
    const request = new Request('http://localhost/api/wohnungen/invalid-uuid/overview');
    const response = await GET(request, { params: Promise.resolve({ id: 'invalid-uuid' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Ungültige Wohnungs-ID Format.');
  });

  it('should handle database errors gracefully', async () => {
    const mockWohnungQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST000', message: 'Database error' }
      })
    };

    mockSupabase.from.mockReturnValue(mockWohnungQuery);

    const validUuid = '550e8400-e29b-41d4-a716-446655440000';
    const request = new Request(`http://localhost/api/wohnungen/${validUuid}/overview`);
    const response = await GET(request, { params: Promise.resolve({ id: validUuid }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Laden der Wohnungsdaten.');
  });

  it('should handle missing Haus name gracefully', async () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';
    const mockWohnungData = {
      id: validUuid,
      name: 'Wohnung 1',
      groesse: 50,
      miete: 800,
      Haeuser: null
    };

    // Mock Wohnung query
    const mockWohnungQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockWohnungData,
        error: null
      })
    };

    // Mock Mieter query
    const mockMieterQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [],
        error: null
      })
    };

    mockSupabase.from
      .mockReturnValueOnce(mockWohnungQuery)
      .mockReturnValueOnce(mockMieterQuery);

    const request = new Request(`http://localhost/api/wohnungen/${validUuid}/overview`);
    const response = await GET(request, { params: Promise.resolve({ id: validUuid }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.hausName).toBe('Unbekannt');
  });
});