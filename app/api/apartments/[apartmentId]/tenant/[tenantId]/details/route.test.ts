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
    json: jest.fn((data, init) => ({
      json: () => Promise.resolve(data),
      status: init?.status || 200,
    })),
  },
}));

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockNextResponse = NextResponse as jest.Mocked<typeof NextResponse>;

describe('/api/apartments/[apartmentId]/tenant/[tenantId]/details', () => {
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
    } as unknown as NextResponse));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return apartment and tenant details with financial information', async () => {
    const apartmentId = '550e8400-e29b-41d4-a716-446655440000';
    const tenantId = '660e8400-e29b-41d4-a716-446655440000';
    
    const mockApartment = {
      id: apartmentId,
      name: 'Wohnung 1A',
      groesse: 80,
      miete: 1200,
      haus_id: '770e8400-e29b-41d4-a716-446655440000',
      Haeuser: {
        name: 'Musterhaus',
        strasse: 'Musterstraße 1',
        ort: 'Berlin',
      },
    };

    const mockTenant = {
      id: tenantId,
      name: 'Max Mustermann',
      email: 'max@example.com',
      telefonnummer: '+49123456789',
      einzug: '2023-01-01',
      auszug: null,
      notiz: 'Zuverlässiger Mieter',
      kaution: JSON.stringify({
        amount: 2400,
        paymentDate: '2022-12-15',
        status: 'paid',
      }),
    };

    // Mock apartment fetch
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'Wohnungen') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockApartment,
            error: null,
          }),
        };
      }
      if (table === 'Mieter') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockTenant,
            error: null,
          }),
        };
      }
      return mockSupabase;
    });

    const request = new Request(`http://localhost/api/apartments/${apartmentId}/tenant/${tenantId}/details`);
    const response = await GET(request, { 
      params: Promise.resolve({ apartmentId, tenantId }) 
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      apartment: {
        id: apartmentId,
        name: 'Wohnung 1A',
        groesse: 80,
        miete: 1200,
        hausName: 'Musterhaus',
        hausAddress: 'Musterstraße 1, Berlin',
        pricePerSqm: 15, // 1200 / 80
        amenities: [],
        condition: undefined,
        notes: undefined,
      },
      tenant: {
        id: tenantId,
        name: 'Max Mustermann',
        email: 'max@example.com',
        telefon: '+49123456789',
        einzug: '2023-01-01',
        auszug: undefined,
        leaseTerms: undefined,
        paymentHistory: [],
        notes: 'Zuverlässiger Mieter',
        kautionData: {
          amount: 2400,
          paymentDate: '2022-12-15',
          status: 'paid',
        },
      },
      financialInfo: {
        currentRent: 1200,
        rentPerSqm: 15,
        totalPaidRent: expect.any(Number),
        outstandingAmount: 0,
      },
    });
  });

  it('should return 400 when apartment ID is missing', async () => {
    const tenantId = '660e8400-e29b-41d4-a716-446655440000';
    
    const request = new Request(`http://localhost/api/apartments//tenant/${tenantId}/details`);
    const response = await GET(request, { 
      params: Promise.resolve({ apartmentId: '', tenantId }) 
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Apartment ID und Tenant ID sind erforderlich.');
  });

  it('should return 400 when tenant ID is missing', async () => {
    const apartmentId = '550e8400-e29b-41d4-a716-446655440000';
    
    const request = new Request(`http://localhost/api/apartments/${apartmentId}/tenant//details`);
    const response = await GET(request, { 
      params: Promise.resolve({ apartmentId, tenantId: '' }) 
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Apartment ID und Tenant ID sind erforderlich.');
  });

  it('should return 400 when invalid UUID format provided', async () => {
    const request = new Request('http://localhost/api/apartments/invalid-uuid/tenant/also-invalid/details');
    const response = await GET(request, { 
      params: Promise.resolve({ apartmentId: 'invalid-uuid', tenantId: 'also-invalid' }) 
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Ungültige ID-Formate.');
  });

  it('should return 404 when apartment not found', async () => {
    const apartmentId = '550e8400-e29b-41d4-a716-446655440000';
    const tenantId = '660e8400-e29b-41d4-a716-446655440000';

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'Wohnungen') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        };
      }
      return mockSupabase;
    });

    const request = new Request(`http://localhost/api/apartments/${apartmentId}/tenant/${tenantId}/details`);
    const response = await GET(request, { 
      params: Promise.resolve({ apartmentId, tenantId }) 
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Wohnung nicht gefunden.');
  });

  it('should return 404 when tenant not found', async () => {
    const apartmentId = '550e8400-e29b-41d4-a716-446655440000';
    const tenantId = '660e8400-e29b-41d4-a716-446655440000';
    
    const mockApartment = {
      id: apartmentId,
      name: 'Wohnung 1A',
      groesse: 80,
      miete: 1200,
      haus_id: '770e8400-e29b-41d4-a716-446655440000',
      Haeuser: {
        name: 'Musterhaus',
        strasse: 'Musterstraße 1',
        ort: 'Berlin',
      },
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'Wohnungen') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockApartment,
            error: null,
          }),
        };
      }
      if (table === 'Mieter') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        };
      }
      return mockSupabase;
    });

    const request = new Request(`http://localhost/api/apartments/${apartmentId}/tenant/${tenantId}/details`);
    const response = await GET(request, { 
      params: Promise.resolve({ apartmentId, tenantId }) 
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Mieter nicht gefunden oder nicht dieser Wohnung zugeordnet.');
  });

  it('should handle apartment with no house address', async () => {
    const apartmentId = '550e8400-e29b-41d4-a716-446655440000';
    const tenantId = '660e8400-e29b-41d4-a716-446655440000';
    
    const mockApartment = {
      id: apartmentId,
      name: 'Wohnung 1A',
      groesse: 80,
      miete: 1200,
      haus_id: '770e8400-e29b-41d4-a716-446655440000',
      Haeuser: {
        name: 'Musterhaus',
        strasse: null,
        ort: 'Berlin',
      },
    };

    const mockTenant = {
      id: tenantId,
      name: 'Max Mustermann',
      email: null,
      telefonnummer: null,
      einzug: '2023-01-01',
      auszug: null,
      notiz: null,
      kaution: null,
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'Wohnungen') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockApartment,
            error: null,
          }),
        };
      }
      if (table === 'Mieter') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockTenant,
            error: null,
          }),
        };
      }
      return mockSupabase;
    });

    const request = new Request(`http://localhost/api/apartments/${apartmentId}/tenant/${tenantId}/details`);
    const response = await GET(request, { 
      params: Promise.resolve({ apartmentId, tenantId }) 
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.apartment.hausAddress).toBe('Berlin');
    expect(data.tenant.email).toBeUndefined();
    expect(data.tenant.telefon).toBeUndefined();
    expect(data.tenant.notes).toBeUndefined();
    expect(data.tenant.kautionData).toBeUndefined();
  });

  it('should handle invalid kaution JSON gracefully', async () => {
    const apartmentId = '550e8400-e29b-41d4-a716-446655440000';
    const tenantId = '660e8400-e29b-41d4-a716-446655440000';
    
    const mockApartment = {
      id: apartmentId,
      name: 'Wohnung 1A',
      groesse: 80,
      miete: 1200,
      haus_id: '770e8400-e29b-41d4-a716-446655440000',
      Haeuser: {
        name: 'Musterhaus',
        strasse: 'Musterstraße 1',
        ort: 'Berlin',
      },
    };

    const mockTenant = {
      id: tenantId,
      name: 'Max Mustermann',
      email: 'max@example.com',
      telefonnummer: '+49123456789',
      einzug: '2023-01-01',
      auszug: null,
      notiz: 'Test note',
      kaution: 'invalid-json-string',
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'Wohnungen') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockApartment,
            error: null,
          }),
        };
      }
      if (table === 'Mieter') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockTenant,
            error: null,
          }),
        };
      }
      return mockSupabase;
    });

    const request = new Request(`http://localhost/api/apartments/${apartmentId}/tenant/${tenantId}/details`);
    const response = await GET(request, { 
      params: Promise.resolve({ apartmentId, tenantId }) 
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tenant.kautionData).toBeUndefined();
  });

  it('should handle database errors gracefully', async () => {
    const apartmentId = '550e8400-e29b-41d4-a716-446655440000';
    const tenantId = '660e8400-e29b-41d4-a716-446655440000';

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'Wohnungen') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST500', message: 'Database error' },
          }),
        };
      }
      return mockSupabase;
    });

    const request = new Request(`http://localhost/api/apartments/${apartmentId}/tenant/${tenantId}/details`);
    const response = await GET(request, { 
      params: Promise.resolve({ apartmentId, tenantId }) 
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Fehler beim Laden der Wohnungsdaten.');
  });
});