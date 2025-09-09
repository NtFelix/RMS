import { GET as documentationGET } from '../documentation/route'
import { GET as categoriesGET } from '../documentation/categories/route'
import { GET as searchGET } from '../documentation/search/route'
import { POST as syncPOST } from '../documentation/sync/route'
import { createDocumentationService } from '@/lib/documentation-service'
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

// Mock dependencies
jest.mock('@/lib/documentation-service')
jest.mock('@/utils/supabase/server')
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({
      json: () => Promise.resolve(data),
      status: options?.status || 200,
    })),
  },
}))

const mockCreateDocumentationService = createDocumentationService as jest.MockedFunction<typeof createDocumentationService>
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe('Documentation API Routes', () => {
  const mockDocumentationService = {
    getAllArticles: jest.fn(),
    getCategories: jest.fn(),
    searchArticles: jest.fn(),
  }

  const mockSupabaseClient = {
    auth: {
      getUser: jest.fn(),
    },
    functions: {
      invoke: jest.fn(),
    },
  }

  const mockArticles = [
    {
      id: '1',
      titel: 'Test Article 1',
      kategorie: 'Getting Started',
      seiteninhalt: 'This is test content for article 1',
      meta: { author: 'Test Author' },
    },
    {
      id: '2',
      titel: 'Test Article 2',
      kategorie: 'Advanced',
      seiteninhalt: 'This is test content for article 2',
      meta: { author: 'Test Author 2' },
    },
  ]

  const mockCategories = [
    { name: 'Getting Started', articleCount: 5 },
    { name: 'Advanced', articleCount: 3 },
  ]

  const mockSearchResults = [
    {
      ...mockArticles[0],
      relevanceScore: 0.8,
      highlightedTitle: 'Test <mark>Article</mark> 1',
      highlightedContent: 'This is test content for <mark>article</mark> 1',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateDocumentationService.mockReturnValue(mockDocumentationService as any)
    mockCreateClient.mockResolvedValue(mockSupabaseClient as any)
  })

  describe('GET /api/documentation', () => {
    it('returns all articles without filters', async () => {
      mockDocumentationService.getAllArticles.mockResolvedValue(mockArticles)

      const request = new Request('http://localhost/api/documentation')
      await documentationGET(request)

      expect(mockDocumentationService.getAllArticles).toHaveBeenCalledWith({
        kategorie: undefined,
        searchQuery: undefined,
        limit: undefined,
        offset: undefined,
      })
      expect(NextResponse.json).toHaveBeenCalledWith(mockArticles, { status: 200 })
    })

    it('returns articles with category filter', async () => {
      mockDocumentationService.getAllArticles.mockResolvedValue([mockArticles[0]])

      const request = new Request('http://localhost/api/documentation?kategorie=Getting%20Started')
      await documentationGET(request)

      expect(mockDocumentationService.getAllArticles).toHaveBeenCalledWith({
        kategorie: 'Getting Started',
        searchQuery: undefined,
        limit: undefined,
        offset: undefined,
      })
      expect(NextResponse.json).toHaveBeenCalledWith([mockArticles[0]], { status: 200 })
    })

    it('returns articles with search query', async () => {
      mockDocumentationService.getAllArticles.mockResolvedValue(mockSearchResults)

      const request = new Request('http://localhost/api/documentation?q=test')
      await documentationGET(request)

      expect(mockDocumentationService.getAllArticles).toHaveBeenCalledWith({
        kategorie: undefined,
        searchQuery: 'test',
        limit: undefined,
        offset: undefined,
      })
      expect(NextResponse.json).toHaveBeenCalledWith(mockSearchResults, { status: 200 })
    })

    it('returns articles with pagination', async () => {
      mockDocumentationService.getAllArticles.mockResolvedValue([mockArticles[0]])

      const request = new Request('http://localhost/api/documentation?limit=10&offset=0')
      await documentationGET(request)

      expect(mockDocumentationService.getAllArticles).toHaveBeenCalledWith({
        kategorie: undefined,
        searchQuery: undefined,
        limit: 10,
        offset: 0,
      })
      expect(NextResponse.json).toHaveBeenCalledWith([mockArticles[0]], { status: 200 })
    })

    it('handles service errors gracefully', async () => {
      mockDocumentationService.getAllArticles.mockRejectedValue(new Error('Database error'))

      const request = new Request('http://localhost/api/documentation')
      await documentationGET(request)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Fehler beim Abrufen der Dokumentation.' },
        { status: 500 }
      )
    })
  })

  describe('GET /api/documentation/categories', () => {
    it('returns all categories with article counts', async () => {
      mockDocumentationService.getCategories.mockResolvedValue(mockCategories)

      await categoriesGET()

      expect(mockDocumentationService.getCategories).toHaveBeenCalled()
      expect(NextResponse.json).toHaveBeenCalledWith(mockCategories, { status: 200 })
    })

    it('handles service errors gracefully', async () => {
      mockDocumentationService.getCategories.mockRejectedValue(new Error('Database error'))

      await categoriesGET()

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Fehler beim Abrufen der Kategorien.' },
        { status: 500 }
      )
    })
  })

  describe('GET /api/documentation/search', () => {
    it('returns search results for valid query', async () => {
      mockDocumentationService.searchArticles.mockResolvedValue(mockSearchResults)

      const request = new Request('http://localhost/api/documentation/search?q=test')
      await searchGET(request)

      expect(mockDocumentationService.searchArticles).toHaveBeenCalledWith('test')
      expect(NextResponse.json).toHaveBeenCalledWith(mockSearchResults, { status: 200 })
    })

    it('returns 400 for missing query parameter', async () => {
      const request = new Request('http://localhost/api/documentation/search')
      await searchGET(request)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Suchbegriff ist erforderlich.' },
        { status: 400 }
      )
    })

    it('returns 400 for empty query parameter', async () => {
      const request = new Request('http://localhost/api/documentation/search?q=')
      await searchGET(request)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Suchbegriff ist erforderlich.' },
        { status: 400 }
      )
    })

    it('trims whitespace from query', async () => {
      mockDocumentationService.searchArticles.mockResolvedValue(mockSearchResults)

      const request = new Request('http://localhost/api/documentation/search?q=%20%20test%20%20')
      await searchGET(request)

      expect(mockDocumentationService.searchArticles).toHaveBeenCalledWith('test')
    })

    it('handles service errors gracefully', async () => {
      mockDocumentationService.searchArticles.mockRejectedValue(new Error('Search error'))

      const request = new Request('http://localhost/api/documentation/search?q=test')
      await searchGET(request)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Fehler bei der Suche in der Dokumentation.' },
        { status: 500 }
      )
    })
  })

  describe('POST /api/documentation/sync', () => {
    it('successfully triggers sync for authenticated user', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: { success: true, processed: 5 },
        error: null,
      })

      await syncPOST()

      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith('sync-notion-docs', {
        body: { manual: true },
      })
      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          message: 'Synchronisation erfolgreich gestartet.',
          result: { success: true, processed: 5 },
        },
        { status: 200 }
      )
    })

    it('returns 401 for unauthenticated user', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      await syncPOST()

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Authentifizierung erforderlich.' },
        { status: 401 }
      )
    })

    it('returns 401 for auth error', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error' },
      })

      await syncPOST()

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Authentifizierung erforderlich.' },
        { status: 401 }
      )
    })

    it('handles sync function errors gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      })
      mockSupabaseClient.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Function error' },
      })

      await syncPOST()

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Fehler beim Synchronisieren der Dokumentation.' },
        { status: 500 }
      )
    })

    it('handles unexpected errors gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Unexpected error'))

      await syncPOST()

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Serverfehler beim Starten der Synchronisation.' },
        { status: 500 }
      )
    })
  })
})