import { GET as documentationGET } from '../dokumentation/route'
import { GET as categoriesGET } from '../dokumentation/categories/route'
import { GET as searchGET } from '../dokumentation/search/route'
import { createDocumentationService } from '@/lib/documentation-service'
import { NextResponse } from 'next/server'

// Mock dependencies
jest.mock('@/lib/documentation-service')
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({
      json: () => Promise.resolve(data),
      status: options?.status || 200,
    })),
  },
}))

const mockCreateDocumentationService = createDocumentationService as jest.MockedFunction<typeof createDocumentationService>

describe('Documentation API Routes', () => {
  const mockDocumentationService = {
    getAllArticles: jest.fn(),
    getCategories: jest.fn(),
    searchArticles: jest.fn(),
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
  })

  describe('GET /api/dokumentation', () => {
    it('returns all articles without filters', async () => {
      mockDocumentationService.getAllArticles.mockResolvedValue(mockArticles)

      const request = new Request('http://localhost/api/dokumentation')
      await documentationGET(request)

      expect(mockDocumentationService.getAllArticles).toHaveBeenCalledWith({})
      expect(NextResponse.json).toHaveBeenCalledWith(mockArticles, expect.objectContaining({ status: 200 }))
    })

    it('returns articles with category filter', async () => {
      mockDocumentationService.getAllArticles.mockResolvedValue([mockArticles[0]])

      const request = new Request('http://localhost/api/dokumentation?kategorie=Getting%20Started')
      await documentationGET(request)

      expect(mockDocumentationService.getAllArticles).toHaveBeenCalledWith({
        kategorie: 'Getting Started',
      })
      expect(NextResponse.json).toHaveBeenCalledWith([mockArticles[0]], expect.objectContaining({ status: 200 }))
    })

    it('returns articles with search query', async () => {
      mockDocumentationService.getAllArticles.mockResolvedValue(mockSearchResults)

      const request = new Request('http://localhost/api/dokumentation?q=test')
      await documentationGET(request)

      expect(mockDocumentationService.getAllArticles).toHaveBeenCalledWith({
        searchQuery: 'test',
      })
      expect(NextResponse.json).toHaveBeenCalledWith(mockSearchResults, expect.objectContaining({ status: 200 }))
    })

    it('returns articles with pagination', async () => {
      mockDocumentationService.getAllArticles.mockResolvedValue([mockArticles[0]])

      const request = new Request('http://localhost/api/dokumentation?limit=10&offset=0')
      await documentationGET(request)

      expect(mockDocumentationService.getAllArticles).toHaveBeenCalledWith({
        limit: 10,
        offset: 0,
      })
      expect(NextResponse.json).toHaveBeenCalledWith([mockArticles[0]], expect.objectContaining({ status: 200 }))
    })

    it('handles service errors gracefully', async () => {
      mockDocumentationService.getAllArticles.mockRejectedValue(new Error('Database error'))

      const request = new Request('http://localhost/api/dokumentation')
      await documentationGET(request)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Fehler beim Abrufen der Dokumentation. Bitte versuchen Sie es erneut.', retryable: true },
        { status: 500 }
      )
    })
  })

  describe('GET /api/dokumentation/categories', () => {
    it('returns all categories with article counts', async () => {
      mockDocumentationService.getCategories.mockResolvedValue(mockCategories)

      await categoriesGET()

      expect(mockDocumentationService.getCategories).toHaveBeenCalled()
      expect(NextResponse.json).toHaveBeenCalledWith(mockCategories, expect.objectContaining({ status: 200 }))
    })

    it('handles service errors gracefully', async () => {
      mockDocumentationService.getCategories.mockRejectedValue(new Error('Database error'))

      await categoriesGET()

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Fehler beim Abrufen der Kategorien. Bitte versuchen Sie es erneut.', retryable: true },
        { status: 500 }
      )
    })
  })

  describe('GET /api/dokumentation/search', () => {
    it('returns search results for valid query', async () => {
      mockDocumentationService.searchArticles.mockResolvedValue(mockSearchResults)

      const request = new Request('http://localhost/api/dokumentation/search?q=test')
      await searchGET(request)

      expect(mockDocumentationService.searchArticles).toHaveBeenCalledWith('test')
      expect(NextResponse.json).toHaveBeenCalledWith(mockSearchResults, expect.objectContaining({ status: 200 }))
    })

    it('returns 400 for missing query parameter', async () => {
      const request = new Request('http://localhost/api/dokumentation/search')
      await searchGET(request)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Suchbegriff ist erforderlich' },
        { status: 400 }
      )
    })

    it('returns 400 for empty query parameter', async () => {
      const request = new Request('http://localhost/api/dokumentation/search?q=')
      await searchGET(request)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Suchbegriff ist erforderlich' },
        { status: 400 }
      )
    })

    it('trims whitespace from query', async () => {
      mockDocumentationService.searchArticles.mockResolvedValue(mockSearchResults)

      const request = new Request('http://localhost/api/dokumentation/search?q=%20%20test%20%20')
      await searchGET(request)

      expect(mockDocumentationService.searchArticles).toHaveBeenCalledWith('test')
    })

    it('handles service errors gracefully', async () => {
      mockDocumentationService.searchArticles.mockRejectedValue(new Error('Search error'))

      const request = new Request('http://localhost/api/dokumentation/search?q=test')
      await searchGET(request)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Fehler bei der Suche. Bitte versuchen Sie es erneut.', retryable: true },
        { status: 500 }
      )
    })
  })
})