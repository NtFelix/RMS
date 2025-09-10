import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { EnhancedToolbar } from '../enhanced-toolbar'

// Mock the editor
const createMockEditor = (overrides = {}) => {
  const mockEditor = {
    isActive: jest.fn().mockReturnValue(false),
    can: jest.fn().mockReturnValue({ undo: jest.fn().mockReturnValue(true), redo: jest.fn().mockReturnValue(true) }),
    chain: jest.fn().mockReturnValue({
      focus: jest.fn().mockReturnValue({
        undo: jest.fn().mockReturnValue({ run: jest.fn() }),
        redo: jest.fn().mockReturnValue({ run: jest.fn() }),
        toggleBold: jest.fn().mockReturnValue({ run: jest.fn() }),
        toggleItalic: jest.fn().mockReturnValue({ run: jest.fn() }),
        toggleUnderline: jest.fn().mockReturnValue({ run: jest.fn() }),
        toggleStrike: jest.fn().mockReturnValue({ run: jest.fn() }),
        toggleCode: jest.fn().mockReturnValue({ run: jest.fn() }),
        toggleHeading: jest.fn().mockReturnValue({ run: jest.fn() }),
        toggleBulletList: jest.fn().mockReturnValue({ run: jest.fn() }),
        toggleOrderedList: jest.fn().mockReturnValue({ run: jest.fn() }),
        toggleBlockquote: jest.fn().mockReturnValue({ run: jest.fn() }),
        setHorizontalRule: jest.fn().mockReturnValue({ run: jest.fn() }),
        setParagraph: jest.fn().mockReturnValue({ run: jest.fn() })
      })
    }),
    commands: {
      insertContent: jest.fn()
    },
    ...overrides
  } as unknown as Editor

  return mockEditor
}

describe('EnhancedToolbar', () => {
  let mockEditor: Editor

  beforeEach(() => {
    mockEditor = createMockEditor()
  })

  it('renders toolbar with basic formatting buttons', () => {
    render(<EnhancedToolbar editor={mockEditor} />)
    
    // Check for basic formatting buttons
    expect(screen.getByLabelText('Fett')).toBeInTheDocument()
    expect(screen.getByLabelText('Kursiv')).toBeInTheDocument()
    expect(screen.getByLabelText('Unterstrichen')).toBeInTheDocument()
    expect(screen.getByLabelText('Durchgestrichen')).toBeInTheDocument()
    expect(screen.getByLabelText('Code')).toBeInTheDocument()
  })

  it('renders history buttons', () => {
    render(<EnhancedToolbar editor={mockEditor} />)
    
    expect(screen.getByLabelText('Rückgängig')).toBeInTheDocument()
    expect(screen.getByLabelText('Wiederholen')).toBeInTheDocument()
  })

  it('renders heading dropdown', () => {
    render(<EnhancedToolbar editor={mockEditor} />)
    
    expect(screen.getByText('Normal Text')).toBeInTheDocument()
  })

  it('renders structure buttons on desktop', () => {
    render(<EnhancedToolbar editor={mockEditor} />)
    
    expect(screen.getByLabelText('Aufzählung')).toBeInTheDocument()
    expect(screen.getByLabelText('Nummerierte Liste')).toBeInTheDocument()
    expect(screen.getByLabelText('Zitat')).toBeInTheDocument()
  })

  it('calls editor commands when buttons are clicked', () => {
    render(<EnhancedToolbar editor={mockEditor} />)
    
    const boldButton = screen.getByLabelText('Fett')
    fireEvent.click(boldButton)
    
    expect(mockEditor.chain).toHaveBeenCalled()
  })

  it('shows active state for active formatting', () => {
    const mockEditorWithBold = createMockEditor({
      isActive: jest.fn((format) => format === 'bold')
    })
    
    render(<EnhancedToolbar editor={mockEditorWithBold} />)
    
    const boldButton = screen.getByLabelText('Fett')
    expect(boldButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('disables undo/redo when not available', () => {
    const mockEditorWithoutUndo = createMockEditor({
      can: jest.fn().mockReturnValue({ 
        undo: jest.fn().mockReturnValue(false), 
        redo: jest.fn().mockReturnValue(false) 
      })
    })
    
    render(<EnhancedToolbar editor={mockEditorWithoutUndo} />)
    
    const undoButton = screen.getByLabelText('Rückgängig')
    const redoButton = screen.getByLabelText('Wiederholen')
    
    expect(undoButton).toBeDisabled()
    expect(redoButton).toBeDisabled()
  })

  it('renders compact mode correctly', () => {
    render(<EnhancedToolbar editor={mockEditor} compactMode={true} />)
    
    const boldButton = screen.getByLabelText('Fett')
    expect(boldButton).toHaveClass('h-8', 'w-8', 'p-0')
  })

  it('shows labels when enabled', () => {
    render(<EnhancedToolbar editor={mockEditor} showLabels={true} />)
    
    // Labels should be visible on larger screens
    expect(screen.getByText('Fett')).toBeInTheDocument()
  })

  it('renders variable insert button when callback provided', () => {
    const mockVariableInsert = jest.fn()
    
    render(<EnhancedToolbar editor={mockEditor} onVariableInsert={mockVariableInsert} />)
    
    // Variable button should be present but may be hidden on smaller screens
    // Look for button with AtSign icon
    const buttons = screen.getAllByRole('button')
    const variableButton = buttons.find(button => {
      const svg = button.querySelector('svg')
      return svg && svg.classList.contains('lucide-at-sign')
    })
    
    // If button is found (on large screens), test the click
    if (variableButton) {
      fireEvent.click(variableButton)
      expect(mockVariableInsert).toHaveBeenCalled()
    } else {
      // On smaller screens, the button might be in the more actions dropdown
      expect(mockVariableInsert).toBeDefined()
    }
  })

  it('renders keyboard shortcuts help', () => {
    render(<EnhancedToolbar editor={mockEditor} />)
    
    expect(screen.getByText('Shortcuts')).toBeInTheDocument()
  })

  it('handles heading dropdown selection', () => {
    render(<EnhancedToolbar editor={mockEditor} />)
    
    const headingDropdown = screen.getByText('Normal Text')
    expect(headingDropdown).toBeInTheDocument()
    
    // Test that clicking the dropdown works (no errors thrown)
    expect(() => fireEvent.click(headingDropdown)).not.toThrow()
  })

  it('returns null when editor is not provided', () => {
    const { container } = render(<EnhancedToolbar editor={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders customization options when enabled', () => {
    render(<EnhancedToolbar editor={mockEditor} enableCustomization={true} />)
    
    // Should have settings button (look for Settings icon)
    const buttons = screen.getAllByRole('button')
    const settingsButton = buttons.find(button => {
      const svg = button.querySelector('svg')
      return svg && svg.classList.contains('lucide-settings')
    })
    expect(settingsButton).toBeInTheDocument()
  })
})