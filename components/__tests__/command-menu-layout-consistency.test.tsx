import React from 'react'
import { render, screen, within } from '@testing-library/react'
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

    // Check that navigation sections are present
    expect(screen.getByText('Schnellsuche')).toBeInTheDocument()
    expect(screen.getByText('Mieter suchen')).toBeInTheDocument()
    expect(screen.getByText('Häuser suchen')).toBeInTheDocument()

    // Verify shortcuts are correctly associated with their command items
    const mieterSuchenItem = screen.getByText('Mieter suchen').closest('[cmdk-item]') as HTMLElement
    expect(mieterSuchenItem).toBeTruthy()
    expect(within(mieterSuchenItem).getByText('M')).toBeInTheDocument()

    const haeuserSuchenItem = screen.getByText('Häuser suchen').closest('[cmdk-item]') as HTMLElement
    expect(haeuserSuchenItem).toBeTruthy()
    expect(within(haeuserSuchenItem).getByText('H')).toBeInTheDocument()

    // Verify command symbol is present (appears multiple times for different shortcuts)
    expect(screen.getAllByText('⌘').length).toBeGreaterThan(1)
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
    expect(screen.getByText('Suche wird durchgeführt...')).toBeInTheDocument()
    expect(screen.getByText('Suche nach "test query"...')).toBeInTheDocument()
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

    // Check that no results message is present - look for the actual text in the empty state
    expect(screen.getByText(/Keine Ergebnisse gefunden/)).toBeInTheDocument()
  })

  it('should show info bar in error state', () => {
    mockUseSearch.mockReturnValue({
      query: 'error query',
      setQuery: jest.fn(),
      results: [],
      isLoading: false,
      error: 'Search failed',
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
    expect(screen.getByText('Fehler bei der Suche')).toBeInTheDocument()
    expect(screen.getByText('Bei der Suche ist ein unerwarteter Fehler aufgetreten.')).toBeInTheDocument()
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

    // Check that search status bar is present
    expect(screen.getByText('1 Ergebnis für "test"')).toBeInTheDocument()
    // Use getAllByText with regex to match both "Mieter" title and "Mieter: 1" in status bar
    expect(screen.getAllByText(/Mieter/)).toHaveLength(2)
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
  })
})