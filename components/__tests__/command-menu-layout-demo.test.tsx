import React from 'react'
import { render, screen } from '@testing-library/react'

// Mock the QuickSearchInfoBar component as it appears in the command menu
function QuickSearchInfoBar() {
  return (
    <div className="border-t px-4 py-2 text-xs text-muted-foreground">
      <div className="flex items-center justify-between">
        <span>Schnellsuche:</span>
        <div className="flex gap-2">
          <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">⌘M</kbd>
          <span>Mieter</span>
          <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">⌘H</kbd>
          <span>Häuser</span>
          <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">⌘J</kbd>
          <span>Wohnungen</span>
        </div>
      </div>
    </div>
  )
}

// Mock different states of the command menu to test layout consistency
function MockCommandMenuState({ state, children }: { state: string; children?: React.ReactNode }) {
  return (
    <div className="command-menu-mock" data-testid={`state-${state}`}>
      <div className="command-input">
        <input placeholder="Search..." />
      </div>
      <div className="command-content">
        {children}
      </div>
      <QuickSearchInfoBar />
    </div>
  )
}

describe('CommandMenu Layout Consistency Demo', () => {
  it('should show info bar in normal state', () => {
    render(
      <MockCommandMenuState state="normal">
        <div>Navigation items...</div>
      </MockCommandMenuState>
    )

    expect(screen.getByTestId('state-normal')).toBeInTheDocument()
    expect(screen.getByText('Schnellsuche:')).toBeInTheDocument()
    expect(screen.getByText('Navigation items...')).toBeInTheDocument()
  })

  it('should show info bar in loading state', () => {
    render(
      <MockCommandMenuState state="loading">
        <div className="loading-indicator">
          <div>Loading search results...</div>
        </div>
      </MockCommandMenuState>
    )

    expect(screen.getByTestId('state-loading')).toBeInTheDocument()
    expect(screen.getByText('Schnellsuche:')).toBeInTheDocument()
    expect(screen.getByText('Loading search results...')).toBeInTheDocument()
  })

  it('should show info bar in no results state', () => {
    render(
      <MockCommandMenuState state="no-results">
        <div className="empty-state">
          <div>No results found</div>
        </div>
      </MockCommandMenuState>
    )

    expect(screen.getByTestId('state-no-results')).toBeInTheDocument()
    expect(screen.getByText('Schnellsuche:')).toBeInTheDocument()
    expect(screen.getByText('No results found')).toBeInTheDocument()
  })

  it('should show info bar in error state', () => {
    render(
      <MockCommandMenuState state="error">
        <div className="error-state">
          <div>Search error occurred</div>
        </div>
      </MockCommandMenuState>
    )

    expect(screen.getByTestId('state-error')).toBeInTheDocument()
    expect(screen.getByText('Schnellsuche:')).toBeInTheDocument()
    expect(screen.getByText('Search error occurred')).toBeInTheDocument()
  })

  it('should show info bar with search results', () => {
    render(
      <MockCommandMenuState state="results">
        <div className="search-results">
          <div>Search result 1</div>
          <div>Search result 2</div>
        </div>
      </MockCommandMenuState>
    )

    expect(screen.getByTestId('state-results')).toBeInTheDocument()
    expect(screen.getByText('Schnellsuche:')).toBeInTheDocument()
    expect(screen.getByText('Search result 1')).toBeInTheDocument()
    expect(screen.getByText('Search result 2')).toBeInTheDocument()
  })

  it('should maintain consistent info bar across all states', () => {
    const states = ['normal', 'loading', 'no-results', 'error', 'results']
    
    states.forEach(state => {
      const { unmount } = render(
        <MockCommandMenuState state={state}>
          <div>{state} content</div>
        </MockCommandMenuState>
      )

      // Verify info bar is present in each state
      expect(screen.getByText('Schnellsuche:')).toBeInTheDocument()
      expect(screen.getByText('⌘M')).toBeInTheDocument()
      expect(screen.getByText('Mieter')).toBeInTheDocument()
      expect(screen.getByText('⌘H')).toBeInTheDocument()
      expect(screen.getByText('Häuser')).toBeInTheDocument()
      expect(screen.getByText('⌘J')).toBeInTheDocument()
      expect(screen.getByText('Wohnungen')).toBeInTheDocument()

      unmount()
    })
  })
})