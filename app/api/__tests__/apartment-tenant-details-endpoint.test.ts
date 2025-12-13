import { GET } from '../apartments/[apartmentId]/details/route'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

// Mock Supabase client
jest.mock('@/lib/supabase-server')
const mockCreateClient = createSupabaseServerClient as jest.MockedFunction<typeof createSupabaseServerClient>

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({
      json: () => Promise.resolve(data),
      status: options?.status || 200,
    })),
  },
}))

describe('/api/apartments/[apartmentId]/details', () => {
  const mockSupabaseClient = {
    from: jest.fn(),
  }

  const mockApartmentData = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Wohnung 1A',
    groesse: 75,
    miete: 1200,
    haus_id: '123e4567-e89b-12d3-a456-426614174000',
    Haeuser: {
      name: 'Test Haus',
    },
  }

  const mockTenantData = {
    id: '123e4567-e89b-12d3-a456-426614174002',
    name: 'Max Mustermann',
    email: 'max@example.com',
    telefonnummer: '+49123456789',
    einzug: '2023-01-01',
    auszug: null,
    notiz: 'Zuverlässiger Mieter',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateClient.mockResolvedValue(mockSupabaseClient as any)
  })

  it('returns 400 when apartmentId is missing', async () => {
    const request = new Request('http://localhost/api/apartments//details')
    const params = Promise.resolve({ apartmentId: '' })

    await GET(request, { params })

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Apartment ID ist erforderlich.' },
      { status: 400 }
    )
  })

  it('returns 404 when apartment is not found', async () => {
    const mockApartmentQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      }),
    }

    mockSupabaseClient.from.mockReturnValue(mockApartmentQuery)

    const request = new Request('http://localhost/api/apartments/123e4567-e89b-12d3-a456-426614174001/details')
    const params = Promise.resolve({ apartmentId: '123e4567-e89b-12d3-a456-426614174001' })

    await GET(request, { params })

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Wohnung nicht gefunden.' },
      { status: 404 }
    )
  })

  it('returns apartment details with current tenant', async () => {
    const mockApartmentQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockApartmentData,
        error: null,
      }),
    }

    const mockTenantQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: mockTenantData,
        error: null,
      }),
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(mockApartmentQuery) // First call for apartment
      .mockReturnValueOnce(mockTenantQuery) // Second call for tenant

    const request = new Request('http://localhost/api/apartments/123e4567-e89b-12d3-a456-426614174001/details')
    const params = Promise.resolve({ apartmentId: '123e4567-e89b-12d3-a456-426614174001' })

    await GET(request, { params })

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        apartment: expect.objectContaining({
          id: '123e4567-e89b-12d3-a456-426614174001',
          name: 'Wohnung 1A',
          groesse: 75,
          miete: 1200,
          hausName: 'Test Haus',
          amenities: [],
          condition: undefined,
          notes: undefined,
        }),
        tenant: expect.objectContaining({
          id: '123e4567-e89b-12d3-a456-426614174002',
          name: 'Max Mustermann',
          email: 'max@example.com',
          telefon: '+49123456789',
          einzug: '2023-01-01',
          auszug: null,
          leaseTerms: undefined,
          paymentHistory: [],
          notes: 'Zuverlässiger Mieter',
        }),
      }),
      { status: 200 }
    )
  })

  it('returns apartment details without tenant when vacant', async () => {
    const mockApartmentQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockApartmentData,
        error: null,
      }),
    }

    const mockTenantQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(mockApartmentQuery)
      .mockReturnValueOnce(mockTenantQuery)

    const request = new Request('http://localhost/api/apartments/123e4567-e89b-12d3-a456-426614174001/details')
    const params = Promise.resolve({ apartmentId: '123e4567-e89b-12d3-a456-426614174001' })

    await GET(request, { params })

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        apartment: expect.objectContaining({
          id: '123e4567-e89b-12d3-a456-426614174001',
          name: 'Wohnung 1A',
          groesse: 75,
          miete: 1200,
          hausName: 'Test Haus',
        }),
        tenant: undefined,
      }),
      { status: 200 }
    )
  })

  it('continues without tenant data when tenant query fails', async () => {
    const mockApartmentQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockApartmentData,
        error: null,
      }),
    }

    const mockTenantQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST000', message: 'Database error' },
      }),
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(mockApartmentQuery)
      .mockReturnValueOnce(mockTenantQuery)

    const request = new Request('http://localhost/api/apartments/123e4567-e89b-12d3-a456-426614174001/details')
    const params = Promise.resolve({ apartmentId: '123e4567-e89b-12d3-a456-426614174001' })

    await GET(request, { params })

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        apartment: expect.objectContaining({
          id: '123e4567-e89b-12d3-a456-426614174001',
        }),
        tenant: undefined,
      }),
      { status: 200 }
    )
  })

  it('handles missing house name gracefully', async () => {
    const apartmentDataWithoutHouse = {
      ...mockApartmentData,
      Haeuser: null,
    }

    const mockApartmentQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: apartmentDataWithoutHouse,
        error: null,
      }),
    }

    const mockTenantQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(mockApartmentQuery)
      .mockReturnValueOnce(mockTenantQuery)

    const request = new Request('http://localhost/api/apartments/123e4567-e89b-12d3-a456-426614174001/details')
    const params = Promise.resolve({ apartmentId: '123e4567-e89b-12d3-a456-426614174001' })

    await GET(request, { params })

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        apartment: expect.objectContaining({
          hausName: 'Unbekannt',
        }),
      }),
      { status: 200 }
    )
  })

  it('returns 500 on server error', async () => {
    const mockApartmentQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST000', message: 'Database error' },
      }),
    }

    mockSupabaseClient.from.mockReturnValue(mockApartmentQuery)

    const request = new Request('http://localhost/api/apartments/123e4567-e89b-12d3-a456-426614174001/details')
    const params = Promise.resolve({ apartmentId: '123e4567-e89b-12d3-a456-426614174001' })

    await GET(request, { params })

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Fehler beim Laden der Wohnungsdaten.' },
      { status: 500 }
    )
  })

  it('handles unexpected server errors', async () => {
    mockSupabaseClient.from.mockImplementation(() => {
      throw new Error('Unexpected error')
    })

    const request = new Request('http://localhost/api/apartments/123e4567-e89b-12d3-a456-426614174001/details')
    const params = Promise.resolve({ apartmentId: '123e4567-e89b-12d3-a456-426614174001' })

    await GET(request, { params })

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Serverfehler beim Laden der Details.' },
      { status: 500 }
    )
  })

  it('correctly queries for current tenant using date filter', async () => {
    const mockApartmentQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockApartmentData,
        error: null,
      }),
    }

    const mockTenantQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: mockTenantData,
        error: null,
      }),
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(mockApartmentQuery)
      .mockReturnValueOnce(mockTenantQuery)

    const request = new Request('http://localhost/api/apartments/123e4567-e89b-12d3-a456-426614174001/details')
    const params = Promise.resolve({ apartmentId: '123e4567-e89b-12d3-a456-426614174001' })

    await GET(request, { params })

    // Verify that the tenant query includes the date filter
    expect(mockTenantQuery.or).toHaveBeenCalledWith(
      expect.stringMatching(/auszug\.is\.null,auszug\.gt\./)
    )
    expect(mockTenantQuery.order).toHaveBeenCalledWith('einzug', { ascending: false })
    expect(mockTenantQuery.limit).toHaveBeenCalledWith(1)
  })
})