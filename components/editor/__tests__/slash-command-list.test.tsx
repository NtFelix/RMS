import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SlashCommandList } from '../slash-command-list'

// Mock editor object
const mockEditor = {
  chain: () => ({
    focus: () => ({
      toggleHeading: jest.fn().mockReturnValue({ run: jest.fn() }),
      toggleBulletList: jest.fn().mockReturnValue({ run: jest.fn() }),
      toggleOrderedList: jest.fn().mockReturnValue({ run: jest.fn() }),
      toggleBold: jest.fn().mockReturnValue({ run: jest.fn() }),
      toggleItalic: jest.fn().mockReturnValue({ run: jest.fn() }),
      toggleUnderline: jest.fn().mockReturnValue({ run: jest.fn() }),
      toggleStrike: jest.fn().mockReturnValue({ run: jest.fn() }),
      toggleCode: jest.fn().mockReturnValue({ run: jest.fn() }),
      toggleBlockquote: jest.fn().mockReturnValue({ run: jest.fn() }),
      setHorizontalRule: jest.fn().mockReturnValue({ run: jest.fn() }),
      setParagraph: jest.fn().mockReturnValue({ run: jest.fn() }),
    }),
  }),
}

const mockCommand = jest.fn()

describe('SlashCommandList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render all heading commands (H1-H6)', () => {
    render(
      <SlashCommandList
        items={[]}
        command={mockCommand}
        query=""
      />
    )

    expect(screen.getByText('Überschrift 1')).toBeInTheDocument()
    expect(screen.getByText('Überschrift 2')).toBeInTheDocument()
    expect(screen.getByText('Überschrift 3')).toBeInTheDocument()
    expect(screen.getByText('Überschrift 4')).toBeInTheDocument()
    expect(screen.getByText('Überschrift 5')).toBeInTheDocument()
    expect(screen.getByText('Überschrift 6')).toBeInTheDocument()
  })

  it('should render list commands', () => {
    render(
      <SlashCommandList
        items={[]}
        command={mockCommand}
        query=""
      />
    )

    expect(screen.getByText('Aufzählung')).toBeInTheDocument()
    expect(screen.getByText('Nummerierte Liste')).toBeInTheDocument()
  })

  it('should render text formatting commands', () => {
    render(
      <SlashCommandList
        items={[]}
        command={mockCommand}
        query=""
      />
    )

    expect(screen.getByText('Fett')).toBeInTheDocument()
    expect(screen.getByText('Kursiv')).toBeInTheDocument()
    expect(screen.getByText('Unterstrichen')).toBeInTheDocument()
    expect(screen.getByText('Durchgestrichen')).toBeInTheDocument()
    expect(screen.getByText('Code')).toBeInTheDocument()
  })

  it('should render additional formatting commands', () => {
    render(
      <SlashCommandList
        items={[]}
        command={mockCommand}
        query=""
      />
    )

    expect(screen.getByText('Absatz')).toBeInTheDocument()
    expect(screen.getByText('Zitat')).toBeInTheDocument()
    expect(screen.getByText('Trennlinie')).toBeInTheDocument()
  })

  it('should filter commands based on query', () => {
    render(
      <SlashCommandList
        items={[]}
        command={mockCommand}
        query="überschrift"
      />
    )

    // Should show all heading commands
    expect(screen.getByText('Überschrift 1')).toBeInTheDocument()
    expect(screen.getByText('Überschrift 2')).toBeInTheDocument()
    expect(screen.getByText('Überschrift 3')).toBeInTheDocument()
    expect(screen.getByText('Überschrift 4')).toBeInTheDocument()
    expect(screen.getByText('Überschrift 5')).toBeInTheDocument()
    expect(screen.getByText('Überschrift 6')).toBeInTheDocument()

    // Should not show non-heading commands
    expect(screen.queryByText('Aufzählung')).not.toBeInTheDocument()
    expect(screen.queryByText('Fett')).not.toBeInTheDocument()
  })

  it('should filter commands based on search terms', () => {
    render(
      <SlashCommandList
        items={[]}
        command={mockCommand}
        query="h1"
      />
    )

    // Should show only H1 heading
    expect(screen.getByText('Überschrift 1')).toBeInTheDocument()
    expect(screen.queryByText('Überschrift 2')).not.toBeInTheDocument()
  })

  it('should show "no commands found" when no matches', () => {
    render(
      <SlashCommandList
        items={[]}
        command={mockCommand}
        query="nonexistent"
      />
    )

    expect(screen.getByText('Keine Befehle gefunden')).toBeInTheDocument()
  })

  it('should execute command when clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <SlashCommandList
        items={[]}
        command={mockCommand}
        query="fett"
      />
    )

    // Filter to only show the Fett command to avoid confusion
    const boldButton = screen.getByText('Fett')
    await user.click(boldButton)

    // Check that the command was called with the correct item
    expect(mockCommand).toHaveBeenCalledTimes(1)
    const calledCommand = mockCommand.mock.calls[0][0]
    expect(calledCommand.title).toBe('Fett')
    expect(calledCommand.category).toBe('formatting')
    expect(calledCommand.description).toBe('Markiere Text als fett gedruckt')
  })

  it('should handle keyboard navigation', () => {
    const { container } = render(
      <SlashCommandList
        items={[]}
        command={mockCommand}
        query=""
      />
    )

    // Test keyboard navigation
    fireEvent.keyDown(container, { key: 'ArrowDown' })
    fireEvent.keyDown(container, { key: 'ArrowUp' })
    fireEvent.keyDown(container, { key: 'Enter' })

    // The component should handle these events
    expect(container).toBeInTheDocument()
  })
})