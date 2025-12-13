import { GET } from './route';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// Mock the Supabase client
jest.mock('@/lib/supabase-server', () => ({
  createSupabaseServerClient: jest.fn(),
}));

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: () => Promise.resolve(data),
      status: init?.status || 200,
    })),
  },
}));

const mockCreateClient = createSupabaseServerClient as jest.MockedFunction<typeof createSupabaseServerClient>;
const mockNextResponse = NextResponse as jest.Mocked<typeof NextResponse>;

describe('/api/haeuser/[id]/overview', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };
    mockCreateClient.mockResolvedValue(mockSupabase);
    
    // Reset NextResponse mock
    mockNextResponse.json.mockImplementation((data, init) => ({
      json: () => Promise.resolve(data),
      status: init?.status || 200,
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return Haus overview with enhanced summary statistics', async () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';
    const mockHausData = {
      id: validUuid,
      name: 'Test Haus',
      strasse: 'Teststraße 1',
      ort: 'Berlin',
      groesse: '500',
      Wohnungen: [
        {
          id: '660e8400-e29b-41d4-a716-446655440001',
          name: 'Wohnung 1',
          groesse: 80,
          miete: 1200,
          Mieter: [
            {
              id: '770e8400-e29b-41d4-a716-446655440001',
              name: 'Max Mustermann',
              einzug: '2023-01-01',
              auszug: null,
            },
          ],
        },
        {
          id: '660e8400-e29b-41d4-a716-446655440002',
          name: 'Wohnung 2',
          groesse: 60,
          miete: 900,
          Mieter: [],
        },
        {
          id: '660e8400-e29b-41d4-a716-446655440003',
          name: 'Wohnung 3',
          groesse: 100,
          miete: 1500,
          Mieter: [
            {
              id: '770e8400-e29b-41d4-a716-446655440002',
              name: 'Anna Schmidt',
              einzug: '2023-06-01',
              auszug: null,
            },
          ],
        },
      ],
    };

    mockSupabase.single.mockResolvedValue({
      data: mockHausData,
      error: null,
    });

    const request = new Request(`http://localhost/api/haeuser/${validUuid}/overview`);
    const response = await GET(request, { params: Promise.resolve({ id: validUuid }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      id: validUuid,
      name: 'Test Haus',
      strasse: 'Teststraße 1',
      ort: 'Berlin',
      size: '500',
      totalArea: 500, // Uses house.groesse when available
      totalRent: 2700, // 1200 + 1500 (only occupied apartments)
      apartmentCount: 3,
      tenantCount: 2,
      summaryStats: {
        averageRent: 1200, // (1200 + 900 + 1500) / 3
        medianRent: 1200,
        averageSize: 80, // (80 + 60 + 100) / 3
        medianSize: 80,
        occupancyRate: 66.67, // 2/3 * 100
        averageRentPerSqm: expect.any(Number),
        totalPotentialRent: 3600, // 1200 + 900 + 1500
        vacancyRate: 33.33, // 1/3 * 100
      },
      wohnungen: expect.arrayContaining([
        expect.objectContaining({
          id: '660e8400-e29b-41d4-a716-446655440001',
          name: 'Wohnung 1',
          groesse: 80,
          miete: 1200,
          status: 'vermietet',
          rentPerSqm: 15,
          currentTenant: {
            id: '770e8400-e29b-41d4-a716-446655440001',
            name: 'Max Mustermann',
            einzug: '2023-01-01',
          },
        }),
        expect.objectContaining({
          id: '660e8400-e29b-41d4-a716-446655440002',
          name: 'Wohnung 2',
          groesse: 60,
          miete: 900,
          status: 'frei',
          rentPerSqm: 15,
          currentTenant: undefined,
        }),
      ]),
    });
  });

  it('should return 404 when Haus not found', async () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116' },
    });

    const request = new Request(`http://localhost/api/haeuser/${validUuid}/overview`);
    const response = await GET(request, { params: Promise.resolve({ id: validUuid }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Haus nicht gefunden.');
  });

  it('should return 400 when no ID provided', async () => {
    const request = new Request('http://localhost/api/haeuser//overview');
    const response = await GET(request, { params: Promise.resolve({ id: '' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Haus-ID ist erforderlich.');
  });

  it('should return 400 when invalid UUID format provided', async () => {
    const request = new Request('http://localhost/api/haeuser/invalid-uuid/overview');
    const response = await GET(request, { params: Promise.resolve({ id: 'invalid-uuid' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Ungültiges Haus-ID-Format.');
  });

  it('should handle database errors gracefully', async () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: { code: 'PGRST500', message: 'Database error' },
    });

    const request = new Request(`http://localhost/api/haeuser/${validUuid}/overview`);
    const response = await GET(request, { params: Promise.resolve({ id: validUuid }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Laden der Hausübersicht.');
  });

  it('should handle empty Wohnungen array correctly', async () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';
    const mockHausData = {
      id: validUuid,
      name: 'Empty Haus',
      strasse: 'Teststraße 1',
      ort: 'Berlin',
      groesse: null,
      Wohnungen: [],
    };

    mockSupabase.single.mockResolvedValue({
      data: mockHausData,
      error: null,
    });

    const request = new Request(`http://localhost/api/haeuser/${validUuid}/overview`);
    const response = await GET(request, { params: Promise.resolve({ id: validUuid }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      id: validUuid,
      name: 'Empty Haus',
      totalArea: 0,
      totalRent: 0,
      apartmentCount: 0,
      tenantCount: 0,
      summaryStats: {
        averageRent: 0,
        medianRent: 0,
        averageSize: 0,
        medianSize: 0,
        occupancyRate: 0,
        averageRentPerSqm: 0,
        totalPotentialRent: 0,
        vacancyRate: 0,
      },
      wohnungen: [],
    });
  });

  it('should calculate statistics correctly with mixed occupancy', async () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';
    const mockHausData = {
      id: validUuid,
      name: 'Mixed Haus',
      strasse: 'Teststraße 1',
      ort: 'Berlin',
      groesse: 300,
      Wohnungen: [
        {
          id: '660e8400-e29b-41d4-a716-446655440001',
          name: 'Wohnung 1',
          groesse: 50,
          miete: 800,
          Mieter: [
            {
              id: '770e8400-e29b-41d4-a716-446655440001',
              name: 'Current Tenant',
              einzug: '2023-01-01',
              auszug: null,
            },
          ],
        },
        {
          id: '660e8400-e29b-41d4-a716-446655440002',
          name: 'Wohnung 2',
          groesse: 70,
          miete: 1000,
          Mieter: [
            {
              id: '770e8400-e29b-41d4-a716-446655440002',
              name: 'Former Tenant',
              einzug: '2022-01-01',
              auszug: '2023-12-31',
            },
          ],
        },
      ],
    };

    mockSupabase.single.mockResolvedValue({
      data: mockHausData,
      error: null,
    });

    const request = new Request(`http://localhost/api/haeuser/${validUuid}/overview`);
    const response = await GET(request, { params: Promise.resolve({ id: validUuid }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tenantCount).toBe(1); // Only current tenant
    expect(data.totalRent).toBe(800); // Only current tenant's rent
    expect(data.summaryStats.occupancyRate).toBe(50); // 1/2 * 100
    expect(data.summaryStats.vacancyRate).toBe(50); // 1/2 * 100
    expect(data.summaryStats.totalPotentialRent).toBe(1800); // 800 + 1000
  });
});