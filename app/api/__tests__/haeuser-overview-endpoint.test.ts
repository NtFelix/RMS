import { GET } from '../haeuser/[id]/overview/route'
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

describe('/api/haeuser/[id]/overview', () => {
  const mockSupabaseClient = {
    from: jest.fn(),
  }

  const mockHausData = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Haus',
    strasse: 'Teststraße 1',
    ort: 'Teststadt',
    groesse: '200',
    Wohnungen: [
      {
        id: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Wohnung 1A',
        groesse: 75,
        miete: 1200,
        Mieter: [
          {
            id: '123e4567-e89b-12d3-a456-426614174002',
            name: 'Max Mustermann',
            einzug: '2023-01-01',
            auszug: null,
          },
        ],
      },
      {
        id: '123e4567-e89b-12d3-a456-426614174003',
        name: 'Wohnung 2B',
        groesse: 60,
        miete: 1000,
        Mieter: [],
      },
    ],
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateClient.mockResolvedValue(mockSupabaseClient as any)
  })

  it('returns 400 when hausId is missing', async () => {
    const request = new Request('http://localhost/api/haeuser//overview')
    const params = Promise.resolve({ id: '' })

    await GET(request, { params })

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Haus-ID ist erforderlich.' },
      { status: 400 }
    )
  })

  it('returns 400 when hausId is not a valid UUID', async () => {
    const request = new Request('http://localhost/api/haeuser/invalid-id/overview')
    const params = Promise.resolve({ id: 'invalid-id' })

    await GET(request, { params })

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Ungültiges Haus-ID-Format.' },
      { status: 400 }
    )
  })

  it('returns 404 when haus is not found', async () => {
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      }),
    }

    mockSupabaseClient.from.mockReturnValue(mockQuery)

    const request = new Request('http://localhost/api/haeuser/123e4567-e89b-12d3-a456-426614174000/overview')
    const params = Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' })

    await GET(request, { params })

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Haus nicht gefunden.' },
      { status: 404 }
    )
  })

  it('returns 500 on database error', async () => {
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST000', message: 'Database error' },
      }),
    }

    mockSupabaseClient.from.mockReturnValue(mockQuery)

    const request = new Request('http://localhost/api/haeuser/123e4567-e89b-12d3-a456-426614174000/overview')
    const params = Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' })

    await GET(request, { params })

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: 'Fehler beim Laden der Hausübersicht.' },
      { status: 500 }
    )
  })

  it('returns correct overview data with summary statistics', async () => {
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockHausData,
        error: null,
      }),
    }

    mockSupabaseClient.from.mockReturnValue(mockQuery)

    const request = new Request('http://localhost/api/haeuser/123e4567-e89b-12d3-a456-426614174000/overview')
    const params = Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' })

    await GET(request, { params })

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Haus',
        strasse: 'Teststraße 1',
        ort: 'Teststadt',
        size: '200',
        totalArea: 200, // Uses house.groesse when available
        totalRent: 1200, // Only from occupied apartment
        apartmentCount: 2,
        tenantCount: 1,
        summaryStats: expect.objectContaining({
          averageRent: 1100, // (1200 + 1000) / 2
          medianRent: 1100,
          averageSize: 67.5, // (75 + 60) / 2
          medianSize: 67.5,
          occupancyRate: 50, // 1/2 * 100
          vacancyRate: 50,
          averageRentPerSqm: expect.any(Number),
          totalPotentialRent: 2200, // 1200 + 1000
        }),
        wohnungen: expect.arrayContaining([
          expect.objectContaining({
            id: '123e4567-e89b-12d3-a456-426614174001',
            name: 'Wohnung 1A',
            groesse: 75,
            miete: 1200,
            status: 'vermietet',
            currentTenant: expect.objectContaining({
              id: '123e4567-e89b-12d3-a456-426614174002',
              name: 'Max Mustermann',
              einzug: '2023-01-01',
            }),
          }),
          expect.objectContaining({
            id: '123e4567-e89b-12d3-a456-426614174003',
            name: 'Wohnung 2B',
            groesse: 60,
            miete: 1000,
            status: 'frei',
            currentTenant: undefined,
          }),
        ]),
      }),
      { status: 200 }
    )
  })

  it('handles empty wohnungen array', async () => {
    const emptyHausData = {
      ...mockHausData,
      Wohnungen: [],
    }

    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: emptyHausData,
        error: null,
      }),
    }

    mockSupabaseClient.from.mockReturnValue(mockQuery)

    const request = new Request('http://localhost/api/haeuser/123e4567-e89b-12d3-a456-426614174000/overview')
    const params = Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' })

    await GET(request, { params })

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        totalArea: 200, // Uses house.groesse even when no apartments
        totalRent: 0,
        apartmentCount: 0,
        tenantCount: 0,
        wohnungen: [],
        summaryStats: expect.objectContaining({
          averageRent: 0,
          medianRent: 0,
          averageSize: 0,
          medianSize: 0,
          occupancyRate: 0,
          vacancyRate: 0,
        }),
      }),
      { status: 200 }
    )
  })

  it('correctly identifies current tenants based on move-out dates', async () => {
    const hausDataWithMovedOutTenant = {
      ...mockHausData,
      Wohnungen: [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          name: 'Wohnung 1A',
          groesse: 75,
          miete: 1200,
          Mieter: [
            {
              id: '123e4567-e89b-12d3-a456-426614174002',
              name: 'Max Mustermann',
              einzug: '2023-01-01',
              auszug: '2022-12-31', // Moved out in the past
            },
          ],
        },
      ],
    }

    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: hausDataWithMovedOutTenant,
        error: null,
      }),
    }

    mockSupabaseClient.from.mockReturnValue(mockQuery)

    const request = new Request('http://localhost/api/haeuser/123e4567-e89b-12d3-a456-426614174000/overview')
    const params = Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' })

    await GET(request, { params })

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantCount: 0, // No current tenants
        totalRent: 0, // No rent from current tenants
        wohnungen: expect.arrayContaining([
          expect.objectContaining({
            status: 'frei',
            currentTenant: undefined,
          }),
        ]),
      }),
      { status: 200 }
    )
  })

  it('calculates rent per square meter correctly', async () => {
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockHausData,
        error: null,
      }),
    }

    mockSupabaseClient.from.mockReturnValue(mockQuery)

    const request = new Request('http://localhost/api/haeuser/123e4567-e89b-12d3-a456-426614174000/overview')
    const params = Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' })

    await GET(request, { params })

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        wohnungen: expect.arrayContaining([
          expect.objectContaining({
            name: 'Wohnung 1A',
            rentPerSqm: 16, // 1200 / 75 = 16
          }),
          expect.objectContaining({
            name: 'Wohnung 2B',
            rentPerSqm: 16.67, // 1000 / 60 = 16.67 (rounded)
          }),
        ]),
      }),
      { status: 200 }
    )
  })
})