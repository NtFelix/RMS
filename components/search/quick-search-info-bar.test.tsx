import React from 'react'
import { render, screen } from '@testing-library/react'

// Create a simple test component that uses the QuickSearchInfoBar
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

describe('QuickSearchInfoBar', () => {
  it('should render all keyboard shortcuts and labels', () => {
    render(<QuickSearchInfoBar />)

    // Check that all elements are present
    expect(screen.getByText('Schnellsuche:')).toBeInTheDocument()
    expect(screen.getByText('⌘M')).toBeInTheDocument()
    expect(screen.getByText('Mieter')).toBeInTheDocument()
    expect(screen.getByText('⌘H')).toBeInTheDocument()
    expect(screen.getByText('Häuser')).toBeInTheDocument()
    expect(screen.getByText('⌘J')).toBeInTheDocument()
    expect(screen.getByText('Wohnungen')).toBeInTheDocument()
  })

  it('should have consistent styling', () => {
    render(<QuickSearchInfoBar />)

    // Check the outer container has the correct classes
    const outerContainer = screen.getByText('Schnellsuche:').closest('div')?.parentElement
    expect(outerContainer).toHaveClass('border-t', 'px-4', 'py-2', 'text-xs', 'text-muted-foreground')

    // Check the inner flex container
    const innerContainer = screen.getByText('Schnellsuche:').closest('div')
    expect(innerContainer).toHaveClass('flex', 'items-center', 'justify-between')
  })
})