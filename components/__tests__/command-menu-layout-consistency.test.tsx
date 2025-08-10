import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CommandMenu } from '@/components/command-menu'
import { useCommandMenu } from '@/hooks/use-command-menu'
import { useSearch } from '@/hooks/use-search'
import { useModalStore } from '@/hooks/use-modal-store'

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock the hooks
jest.mock('@/hooks/use-command-menu')
jest.mock('@/hooks/use-search')
jest.mock('@/hooks/use-modal-store')
jest.mock('@/hooks/use-search-modal-integration', () => ({
  useSearchModalIntegration: jest.fn(),
}))
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}))
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

// Mock the user actions
jest.mock('@/app/user-actions', () => ({
  getUserSubscriptionContext: jest.fn(),
  getPlanApartmentLimit: jest.fn(),
  getUserApartmentCount: jest.fn(),
}))

const mockUseCommandMenu = useCommandMenu as jest.MockedFunction<typeof useCommandMenu>
const mockUseSearch = useSearch as jest.MockedFunction<typeof useSearch>
const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>

describe('CommandMenu Layout Consistency', () => {
  const mockModalStore = {
    openTenantModal: jest.fn(),
    openHouseModal: jest.fn(),
    openWohnungModal: jest.fn(),
    openFinanceModal: jest.fn(),
    openAufgabeModal: jest.fn(),
    openConfirmationModal: jest.fn(),
  }

  beforeEach(() => {
    mockUseCommandMenu.mockReturnValue({
      open: true,
      setOpen: jest.fn(),
    })

    mockUseModalStore.mockReturnValue(mockModalStore)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should show info bar in normal state (no search)', () => {
    mockUseSearch.mockReturnValue({
      query: '',
      setQuery: jest.fn(),
      results: [],
      isLoading: false,
      error: null,
      totalCount: 0,
      executionTime: 0,
      clearSearch: jest.fn(),
      retry: jest.fn(),
      retryCount: 0,
      isOffline: false,
      lastSuccessfulQuery: '',
      suggestions: [],
      recentSearches: [],
      addToRecentSearches: jest.fn(),
    })

    render(<CommandMenu />)

    // Check that info bar is present
    expect(screen.getByText('Schnellsuche:')).toBeInTheDocument()
    expect(screen.getByText('⌘M')).toBeInTheDocument()
    expect(screen.getByText('Mieter')).toBeInTheDocument()
    expect(screen.getByText('⌘H')).toBeInTheDocument()
    expect(screen.getByText('Häuser')).toBeInTheDocument()
  })

  it('should show info bar in loading state', () => {
    mockUseSearch.mockReturnValue({
      query: 'test query',
      setQuery: jest.fn(),
      results: [],
      isLoading: true,
      error: null,
      totalCount: 0,
      executionTime: 0,
      clearSearch: jest.fn(),
      retry: jest.fn(),
      retryCount: 0,
      isOffline: false,
      lastSuccessfulQuery: '',
      suggestions: [],
      recentSearches: [],
      addToRecentSearches: jest.fn(),
    })

    render(<CommandMenu />)

    // Check that loading indicator is present
    expect(screen.getByText('Suche nach "test query"...')).toBeInTheDocument()
    
    // Check that info bar is still present for consistent layout
    expect(screen.getByText('Schnellsuche:')).toBeInTheDocument()
    expect(screen.getByText('⌘M')).toBeInTheDocument()
    expect(screen.getByText('Mieter')).toBeInTheDocument()
  })

  it('should show info bar in no results state', () => {
    mockUseSearch.mockReturnValue({
      query: 'no results query',
      setQuery: jest.fn(),
      results: [],
      isLoading: false,
      error: null,
      totalCount: 0,
      executionTime: 100,
      clearSearch: jest.fn(),
      retry: jest.fn(),
      retryCount: 0,
      isOffline: false,
      lastSuccessfulQuery: '',
      suggestions: [],
      recentSearches: [],
      addToRecentSearches: jest.fn(),
    })

    render(<CommandMenu />)

    // Check that no results message is present
    expect(screen.getByText('Keine Ergebnisse für "no results query"')).toBeInTheDocument()
    
    // Check that info bar is still present for consistent layout
    expect(screen.getByText('Schnellsuche:')).toBeInTheDocument()
    expect(screen.getByText('⌘M')).toBeInTheDocument()
    expect(screen.getByText('Mieter')).toBeInTheDocument()
  })

  it('should show info bar in error state', () => {
    mockUseSearch.mockReturnValue({
      query: 'error query',
      setQuery: jest.fn(),
      results: [],
      isLoading: false,
      error: new Error('Search failed'),
      totalCount: 0,
      executionTime: 0,
      clearSearch: jest.fn(),
      retry: jest.fn(),
      retryCount: 1,
      isOffline: false,
      lastSuccessfulQuery: 'previous query',
      suggestions: [],
      recentSearches: [],
      addToRecentSearches: jest.fn(),
    })

    render(<CommandMenu />)

    // Check that error message is present
    expect(screen.getByText('Bei der Suche ist ein Fehler aufgetreten')).toBeInTheDocument()
    
    // Check that info bar is still present for consistent layout
    expect(screen.getByText('Schnellsuche:')).toBeInTheDocument()
    expect(screen.getByText('⌘M')).toBeInTheDocument()
    expect(screen.getByText('Mieter')).toBeInTheDocument()
  })

  it('should show info bar with search results', () => {
    mockUseSearch.mockReturnValue({
      query: 'test',
      setQuery: jest.fn(),
      results: [
        {
          id: '1',
          type: 'tenant',
          title: 'Test Tenant',
          subtitle: 'test@example.com',
          description: 'Test description',
          metadata: {},
          actions: [],
        },
      ],
      isLoading: false,
      error: null,
      totalCount: 1,
      executionTime: 50,
      clearSearch: jest.fn(),
      retry: jest.fn(),
      retryCount: 0,
      isOffline: false,
      lastSuccessfulQuery: '',
      suggestions: [],
      recentSearches: [],
      addToRecentSearches: jest.fn(),
    })

    render(<CommandMenu />)

    // Check that search results are present
    expect(screen.getByText('Test Tenant')).toBeInTheDocument()
    
    // Check that info bar is still present for consistent layout
    expect(screen.getByText('Schnellsuche:')).toBeInTheDocument()
    expect(screen.getByText('⌘M')).toBeInTheDocument()
    expect(screen.getByText('Mieter')).toBeInTheDocument()
  })

  it('should show info bar in search suggestions state', () => {
    mockUseSearch.mockReturnValue({
      query: 'te', // Short query to trigger suggestions
      setQuery: jest.fn(),
      results: [],
      isLoading: false,
      error: null,
      totalCount: 0,
      executionTime: 0,
      clearSearch: jest.fn(),
      retry: jest.fn(),
      retryCount: 0,
      isOffline: false,
      lastSuccessfulQuery: '',
      suggestions: ['tenant', 'test'],
      recentSearches: ['previous search'],
      addToRecentSearches: jest.fn(),
    })

    render(<CommandMenu />)

    // Check that suggestions are present
    expect(screen.getByText('Letzte Suchen')).toBeInTheDocument()
    expect(screen.getByText('previous search')).toBeInTheDocument()
    
    // Check that info bar is still present for consistent layout
    expect(screen.getByText('Schnellsuche:')).toBeInTheDocument()
    expect(screen.getByText('⌘M')).toBeInTheDocument()
    expect(screen.getByText('Mieter')).toBeInTheDocument()
  })
})