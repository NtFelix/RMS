import { GET } from '../wohnungen/[id]/overview/route'
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

// Mock Supabase client
jest.mock('@/utils/supabase/server')
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({
      json: () => Promise.resolve(data),
      status: options?.status || 200,
    })),
  },
}))

describe('/api/wohnungen/[id]/overview', () => {
  const mockSupabaseClient = {
    from: jest.fn(),
  }

  const mockWohnungData = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Wohnung 1A',
    groesse: 75,
    miete: 1200,
    haus_id: '123e4567-e89b-12d3-a456-426614174000',
    Haeuser: [{
      name: 'Test Haus',
    }],
  }

  const mockMieterData = [
    {
      id: '123e4567-e89b-12d3-a456-426614174002',
      name: 'Max Mustermann',
      email: 'max@example.com',
      telefonnummer: '+49123456789',
      einzug: '2023-01-01',
      auszug: null,
    },
    {
      id: '123e4567-e89b-12d3-a456-426614174003',
      name: 'Anna Schmidt',
      email: 'anna@example.com',
      telefonnummer: null,
      einzug: '2022-01-01',
      auszug: '2022-12-31',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateClient.mockResolvedValue(mockSupabaseClient as any)
  })

  it('returns 400 when wohnungId is missing', async () => {
    const request = new Request('http://localhost/api/wohnungen//overview')
    const params = Promise.resolve({ id: '' })

    await GET(request, { params })

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Wohnungs-ID ist erforderlich.' },
      { status: 400 }
    )
  })

  it('returns 400 when wohnungId is not a valid UUID', async () => {
    const request = new Request('http://localhost/api/wohnungen/invalid-id/overview')
    const params = Promise.resolve({ id: 'invalid-id' })

    await GET(request, { params })

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Ungültige Wohnungs-ID Format.' },
      { status: 400 }
    )
  })

  it('returns 404 when wohnung is not found', async () => {
    const mockWohnungQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      }),
    }

    mockSupabaseClient.from.mockReturnValue(mockWohnungQuery)

    const request = new Request('http://localhost/api/wohnungen/123e4567-e89b-12d3-a456-426614174001/overview')
    const params = Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174001' })

    await GET(request, { params })

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Wohnung nicht gefunden.' },
      { status: 404 }
    )
  })

  it('returns 500 on wohnung database error', async () => {
    const mockWohnungQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST000', message: 'Database error' },
      }),
    }

    mockSupabaseClient.from.mockReturnValue(mockWohnungQuery)

    const request = new Request('http://localhost/api/wohnungen/123e4567-e89b-12d3-a456-426614174001/overview')
    const params = Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174001' })

    await GET(request, { params })

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Fehler beim Laden der Wohnungsdaten.' },
      { status: 500 }
    )
  })

  it('returns 500 on mieter database error', async () => {
    const mockWohnungQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockWohnungData,
        error: null,
      }),
    }

    const mockMieterQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST000', message: 'Database error' },
      }),
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(mockWohnungQuery) // First call for Wohnungen
      .mockReturnValueOnce(mockMieterQuery) // Second call for Mieter

    const request = new Request('http://localhost/api/wohnungen/123e4567-e89b-12d3-a456-426614174001/overview')
    const params = Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174001' })

    await GET(request, { params })

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Fehler beim Laden der Mieterdaten.' },
      { status: 500 }
    )
  })

  it('returns correct overview data with mieter list', async () => {
    const mockWohnungQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockWohnungData,
        error: null,
      }),
    }

    const mockMieterQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: mockMieterData,
        error: null,
      }),
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(mockWohnungQuery)
      .mockReturnValueOnce(mockMieterQuery)

    const request = new Request('http://localhost/api/wohnungen/123e4567-e89b-12d3-a456-426614174001/overview')
    const params = Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174001' })

    await GET(request, { params })

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Wohnung 1A',
        groesse: 75,
        miete: 1200,
        hausName: 'Test Haus',
        mieter: expect.arrayContaining([
          expect.objectContaining({
            id: '123e4567-e89b-12d3-a456-426614174002',
            name: 'Max Mustermann',
            email: 'max@example.com',
            telefon: '+49123456789',
            einzug: '2023-01-01',
            auszug: undefined,
            status: 'active',
          }),
          expect.objectContaining({
            id: '123e4567-e89b-12d3-a456-426614174003',
            name: 'Anna Schmidt',
            email: 'anna@example.com',
            telefon: undefined, // null converted to undefined
            einzug: '2022-01-01',
            auszug: '2022-12-31',
            status: 'moved_out',
          }),
        ]),
      }),
      { status: 200 }
    )
  })

  it('handles empty mieter array', async () => {
    const mockWohnungQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockWohnungData,
        error: null,
      }),
    }

    const mockMieterQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(mockWohnungQuery)
      .mockReturnValueOnce(mockMieterQuery)

    const request = new Request('http://localhost/api/wohnungen/123e4567-e89b-12d3-a456-426614174001/overview')
    const params = Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174001' })

    await GET(request, { params })

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        mieter: [],
      }),
      { status: 200 }
    )
  })

  it('correctly determines tenant status based on move-out dates', async () => {
    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)

    const mieterWithFutureAuszug = [
      {
        id: '123e4567-e89b-12d3-a456-426614174002',
        name: 'Max Mustermann',
        email: 'max@example.com',
        telefonnummer: '+49123456789',
        einzug: '2023-01-01',
        auszug: futureDate.toISOString().split('T')[0], // Future date
      },
    ]

    const mockWohnungQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockWohnungData,
        error: null,
      }),
    }

    const mockMieterQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: mieterWithFutureAuszug,
        error: null,
      }),
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(mockWohnungQuery)
      .mockReturnValueOnce(mockMieterQuery)

    const request = new Request('http://localhost/api/wohnungen/123e4567-e89b-12d3-a456-426614174001/overview')
    const params = Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174001' })

    await GET(request, { params })

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        mieter: expect.arrayContaining([
          expect.objectContaining({
            status: 'active', // Future move-out date means still active
          }),
        ]),
      }),
      { status: 200 }
    )
  })

  it('handles missing wohnung data gracefully', async () => {
    const wohnungDataWithMissingFields = {
      id: '123e4567-e89b-12d3-a456-426614174001',
      name: null,
      groesse: null,
      miete: null,
      haus_id: '123e4567-e89b-12d3-a456-426614174000',
      Haeuser: null,
    }

    const mockWohnungQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: wohnungDataWithMissingFields,
        error: null,
      }),
    }

    const mockMieterQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(mockWohnungQuery)
      .mockReturnValueOnce(mockMieterQuery)

    const request = new Request('http://localhost/api/wohnungen/123e4567-e89b-12d3-a456-426614174001/overview')
    const params = Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174001' })

    await GET(request, { params })

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Unbekannt',
        groesse: 0,
        miete: 0,
        hausName: 'Unbekannt',
      }),
      { status: 200 }
    )
  })

  it('handles missing mieter data gracefully', async () => {
    const mieterDataWithMissingFields = [
      {
        id: '123e4567-e89b-12d3-a456-426614174002',
        name: null,
        email: null,
        telefonnummer: null,
        einzug: null,
        auszug: null,
      },
    ]

    const mockWohnungQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockWohnungData,
        error: null,
      }),
    }

    const mockMieterQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: mieterDataWithMissingFields,
        error: null,
      }),
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(mockWohnungQuery)
      .mockReturnValueOnce(mockMieterQuery)

    const request = new Request('http://localhost/api/wohnungen/123e4567-e89b-12d3-a456-426614174001/overview')
    const params = Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174001' })

    await GET(request, { params })

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        mieter: expect.arrayContaining([
          expect.objectContaining({
            name: 'Unbekannt',
            email: undefined,
            telefon: undefined,
            einzug: undefined,
            auszug: undefined,
            status: 'active', // Default when no auszug
          }),
        ]),
      }),
      { status: 200 }
    )
  })
})