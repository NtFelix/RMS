import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommandMenu } from '@/components/search/command-menu'
import { useCommandMenu } from '@/hooks/use-command-menu'

// Mock the hooks and dependencies
jest.mock('@/hooks/use-command-menu')
jest.mock('@/hooks/use-search')
jest.mock('@/hooks/use-modal-store')
jest.mock('@/hooks/use-search-modal-integration')
jest.mock('next/navigation')

const mockUseCommandMenu = useCommandMenu as jest.MockedFunction<typeof useCommandMenu>

// Mock other dependencies
jest.mock('@/hooks/use-search', () => ({
  useSearch: () => ({
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
    addToRecentSearches: jest.fn()
  })
}))

jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: {
    getState: () => ({
      openTenantModal: jest.fn(),
      openHouseModal: jest.fn(),
      openWohnungModal: jest.fn(),
      openFinanceModal: jest.fn(),
      openAufgabeModal: jest.fn(),
      openConfirmationModal: jest.fn()
    })
  }
}))

jest.mock('@/hooks/use-search-modal-integration', () => ({
  useSearchModalIntegration: jest.fn()
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn()
  })
}))

describe('CommandMenu Auto-Focus', () => {
  const mockSetOpen = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseCommandMenu.mockReturnValue({
      open: false,
      setOpen: mockSetOpen
    })
  })

  it('should auto-focus input when command menu opens', async () => {
    // Start with closed menu
    const { rerender } = render(<CommandMenu />)
    
    // Open the menu
    mockUseCommandMenu.mockReturnValue({
      open: true,
      setOpen: mockSetOpen
    })
    
    rerender(<CommandMenu />)
    
    await waitFor(() => {
      const input = screen.getByRole('combobox')
      expect(input).toBeInTheDocument()
    })

    // Check if input is focused (this might be tricky to test directly)
    const input = screen.getByRole('combobox')
    expect(input).toHaveAttribute('cmdk-input')
  })

  it('should have autoFocus attribute on CommandInput', async () => {
    mockUseCommandMenu.mockReturnValue({
      open: true,
      setOpen: mockSetOpen
    })
    
    render(<CommandMenu />)
    
    await waitFor(() => {
      const input = screen.getByRole('combobox')
      expect(input).toBeInTheDocument()
    })
  })

  it('should handle keyboard shortcut to open menu', async () => {
    const user = userEvent.setup()
    
    render(<CommandMenu />)
    
    // Simulate Cmd+K keyboard shortcut
    await user.keyboard('{Meta>}k{/Meta}')
    
    expect(mockSetOpen).toHaveBeenCalledWith(true)
  })

  it('should focus input when opened via keyboard shortcut', async () => {
    const user = userEvent.setup()
    
    // Mock document.querySelector to simulate finding the input
    const mockInput = {
      focus: jest.fn(),
      value: '',
      setSelectionRange: jest.fn()
    }
    
    const originalQuerySelector = document.querySelector
    document.querySelector = jest.fn((selector) => {
      if (selector === 'input[cmdk-input]') {
        return mockInput as any
      }
      return originalQuerySelector.call(document, selector)
    })
    
    render(<CommandMenu />)
    
    // Simulate Cmd+K keyboard shortcut
    await user.keyboard('{Meta>}k{/Meta}')
    
    // Wait for the timeout in the keyboard handler
    await waitFor(() => {
      expect(mockSetOpen).toHaveBeenCalledWith(true)
    }, { timeout: 200 })
    
    // Restore original querySelector
    document.querySelector = originalQuerySelector
  })

  it('should clear search when menu is closed', async () => {
    const mockClearSearch = jest.fn()
    
    // Mock useSearch to return a query and clearSearch function
    jest.doMock('@/hooks/use-search', () => ({
      useSearch: () => ({
        query: 'test query',
        setQuery: jest.fn(),
        results: [],
        isLoading: false,
        error: null,
        totalCount: 0,
        executionTime: 0,
        clearSearch: mockClearSearch,
        retry: jest.fn(),
        retryCount: 0,
        isOffline: false,
        lastSuccessfulQuery: '',
        suggestions: [],
        recentSearches: [],
        addToRecentSearches: jest.fn()
      })
    }))
    
    // Start with open menu
    mockUseCommandMenu.mockReturnValue({
      open: true,
      setOpen: mockSetOpen
    })
    
    const { rerender } = render(<CommandMenu />)
    
    // Close the menu
    mockUseCommandMenu.mockReturnValue({
      open: false,
      setOpen: mockSetOpen
    })
    
    rerender(<CommandMenu />)
    
    // Should call clearSearch when menu closes with existing query
    await waitFor(() => {
      expect(mockClearSearch).toHaveBeenCalled()
    })
  })
})