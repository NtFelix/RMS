import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { SlashCommandList } from '../slash-command-list'
import type { SlashCommandItem } from '../slash-command-extension'

// Mock icons
jest.mock('lucide-react', () => ({
  Heading1: ({ className }: { className?: string }) => <div className={className} data-testid="heading1-icon" />,
  Heading2: ({ className }: { className?: string }) => <div className={className} data-testid="heading2-icon" />,
  Heading3: ({ className }: { className?: string }) => <div className={className} data-testid="heading3-icon" />,
  List: ({ className }: { className?: string }) => <div className={className} data-testid="list-icon" />,
  ListOrdered: ({ className }: { className?: string }) => <div className={className} data-testid="list-ordered-icon" />,
  Bold: ({ className }: { className?: string }) => <div className={className} data-testid="bold-icon" />,
  Italic: ({ className }: { className?: string }) => <div className={className} data-testid="italic-icon" />,
  Type: ({ className }: { className?: string }) => <div className={className} data-testid="type-icon" />,
  Quote: ({ className }: { className?: string }) => <div className={className} data-testid="quote-icon" />,
}))

describe('SlashCommandList', () => {
  const mockCommand = jest.fn()
  const mockItems: SlashCommandItem[] = []

  const defaultProps = {
    items: mockItems,
    command: mockCommand,
    query: '',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all default commands when query is empty', () => {
    render(<SlashCommandList {...defaultProps} />)

    // Check for some key commands
    expect(screen.getByText('Überschrift 1')).toBeInTheDocument()
    expect(screen.getByText('Aufzählung')).toBeInTheDocument()
    expect(screen.getByText('Fett')).toBeInTheDocument()
    expect(screen.getByText('Kursiv')).toBeInTheDocument()
  })

  it('filters commands based on query', () => {
    render(<SlashCommandList {...defaultProps} query="überschrift" />)

    // Should show heading commands
    expect(screen.getByText('Überschrift 1')).toBeInTheDocument()
    expect(screen.getByText('Überschrift 2')).toBeInTheDocument()
    expect(screen.getByText('Überschrift 3')).toBeInTheDocument()

    // Should not show non-heading commands
    expect(screen.queryByText('Aufzählung')).not.toBeInTheDocument()
    expect(screen.queryByText('Fett')).not.toBeInTheDocument()
  })

  it('shows no results message when no commands match query', () => {
    render(<SlashCommandList {...defaultProps} query="nonexistent" />)

    expect(screen.getByText('Keine Befehle gefunden')).toBeInTheDocument()
  })

  it('handles click on command item', async () => {
    const user = userEvent.setup()
    render(<SlashCommandList {...defaultProps} />)

    const headingButton = screen.getByText('Überschrift 1').closest('button')
    if (headingButton) {
      await user.click(headingButton)
      expect(mockCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Überschrift 1',
          description: 'Große Überschrift',
        })
      )
    }
  })

  it('handles keyboard navigation', () => {
    const ref = { current: { onKeyDown: jest.fn() } }
    
    render(<SlashCommandList {...defaultProps} ref={ref} />)

    // Test arrow down
    const result = ref.current.onKeyDown({ event: { key: 'ArrowDown' } })
    expect(result).toBe(true)

    // Test arrow up
    const result2 = ref.current.onKeyDown({ event: { key: 'ArrowUp' } })
    expect(result2).toBe(true)

    // Test enter
    const result3 = ref.current.onKeyDown({ event: { key: 'Enter' } })
    expect(result3).toBe(true)

    // Test other key
    const result4 = ref.current.onKeyDown({ event: { key: 'a' } })
    expect(result4).toBe(false)
  })

  it('displays command icons correctly', () => {
    render(<SlashCommandList {...defaultProps} />)

    expect(screen.getByTestId('heading1-icon')).toBeInTheDocument()
    expect(screen.getByTestId('list-icon')).toBeInTheDocument()
    expect(screen.getByTestId('bold-icon')).toBeInTheDocument()
  })

  it('highlights selected item on mouse enter', async () => {
    const user = userEvent.setup()
    render(<SlashCommandList {...defaultProps} />)

    const firstButton = screen.getByText('Überschrift 1').closest('button')
    const secondButton = screen.getByText('Überschrift 2').closest('button')

    // Initially first item should be selected (has selected styling)
    expect(firstButton).toHaveClass('bg-gray-100')

    // Hover over second item
    if (secondButton) {
      await user.hover(secondButton)
      // After hover, second item should be selected
      expect(secondButton).toHaveClass('bg-gray-100')
    }
  })

  it('filters by search terms correctly', () => {
    render(<SlashCommandList {...defaultProps} query="h1" />)

    // Should find heading 1 by search term
    expect(screen.getByText('Überschrift 1')).toBeInTheDocument()
    expect(screen.queryByText('Überschrift 2')).not.toBeInTheDocument()
  })

  it('filters by description correctly', () => {
    render(<SlashCommandList {...defaultProps} query="große" />)

    // Should find heading 1 by description
    expect(screen.getByText('Überschrift 1')).toBeInTheDocument()
    expect(screen.queryByText('Überschrift 2')).not.toBeInTheDocument()
  })
})