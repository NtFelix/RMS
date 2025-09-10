import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BubbleMenu } from '@/components/editor/bubble-menu'
import { Editor } from '@tiptap/core'

// Mock the UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  )
}))

jest.mock('@/components/ui/separator', () => ({
  Separator: ({ className }: any) => <div className={`separator ${className}`} />
}))

jest.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div>{children}</div>
}))

// Mock TipTap BubbleMenu
jest.mock('@tiptap/react', () => ({
  BubbleMenu: ({ children, editor, shouldShow, className, tippyOptions, ...props }: any) => {
    // Only render if editor is available and shouldShow returns true
    if (!editor || !shouldShow) return null
    
    // Mock a text selection scenario
    const mockShouldShowResult = shouldShow({
      editor,
      view: {},
      state: { selection: { empty: false } },
      oldState: {},
      from: 0,
      to: 5
    })
    
    if (!mockShouldShowResult) return null
    
    // Only pass through safe props, exclude tippyOptions
    const safeProps = { className, ...props }
    delete safeProps.tippyOptions
    
    return <div data-testid="bubble-menu" {...safeProps}>{children}</div>
  }
}))

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Bold: () => <span data-testid="bold-icon">Bold</span>,
  Italic: () => <span data-testid="italic-icon">Italic</span>,
  Underline: () => <span data-testid="underline-icon">Underline</span>,
  Strikethrough: () => <span data-testid="strikethrough-icon">Strikethrough</span>,
  Code: () => <span data-testid="code-icon">Code</span>,
  AtSign: () => <span data-testid="at-sign-icon">AtSign</span>,
  Type: () => <span data-testid="type-icon">Type</span>,
  Heading1: () => <span data-testid="heading1-icon">Heading1</span>,
  Heading2: () => <span data-testid="heading2-icon">Heading2</span>,
  Heading3: () => <span data-testid="heading3-icon">Heading3</span>,
  Quote: () => <span data-testid="quote-icon">Quote</span>,
  List: () => <span data-testid="list-icon">List</span>,
  ListOrdered: () => <span data-testid="list-ordered-icon">ListOrdered</span>
}))

describe('BubbleMenu', () => {
  let mockEditor: Partial<Editor>
  let mockChain: any
  let mockCommands: any

  beforeEach(() => {
    mockCommands = {
      toggleBold: jest.fn().mockReturnThis(),
      toggleItalic: jest.fn().mockReturnThis(),
      toggleUnderline: jest.fn().mockReturnThis(),
      toggleStrike: jest.fn().mockReturnThis(),
      toggleCode: jest.fn().mockReturnThis(),
      setParagraph: jest.fn().mockReturnThis(),
      toggleHeading: jest.fn().mockReturnThis(),
      toggleBulletList: jest.fn().mockReturnThis(),
      toggleOrderedList: jest.fn().mockReturnThis(),
      toggleBlockquote: jest.fn().mockReturnThis(),
      insertContent: jest.fn().mockReturnThis(),
      focus: jest.fn().mockReturnThis(),
      run: jest.fn()
    }

    mockChain = {
      focus: jest.fn().mockReturnValue(mockCommands)
    }

    mockEditor = {
      isActive: jest.fn().mockReturnValue(false),
      isEditable: true,
      chain: jest.fn().mockReturnValue(mockChain)
    }
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render bubble menu when editor is available', () => {
      render(<BubbleMenu editor={mockEditor as Editor} />)
      
      expect(screen.getByTestId('bubble-menu')).toBeInTheDocument()
    })

    it('should not render when editor is null', () => {
      render(<BubbleMenu editor={null as any} />)
      
      expect(screen.queryByTestId('bubble-menu')).not.toBeInTheDocument()
    })

    it('should not render when editor lacks isActive method', () => {
      const invalidEditor = { ...mockEditor }
      delete invalidEditor.isActive
      
      render(<BubbleMenu editor={invalidEditor as Editor} />)
      
      expect(screen.queryByTestId('bubble-menu')).not.toBeInTheDocument()
    })

    it('should render all formatting buttons', () => {
      render(<BubbleMenu editor={mockEditor as Editor} />)
      
      // Text formatting buttons
      expect(screen.getByTestId('bold-icon')).toBeInTheDocument()
      expect(screen.getByTestId('italic-icon')).toBeInTheDocument()
      expect(screen.getByTestId('underline-icon')).toBeInTheDocument()
      expect(screen.getByTestId('strikethrough-icon')).toBeInTheDocument()
      expect(screen.getByTestId('code-icon')).toBeInTheDocument()
      
      // Heading buttons
      expect(screen.getByTestId('type-icon')).toBeInTheDocument()
      expect(screen.getByTestId('heading1-icon')).toBeInTheDocument()
      expect(screen.getByTestId('heading2-icon')).toBeInTheDocument()
      expect(screen.getByTestId('heading3-icon')).toBeInTheDocument()
      
      // List and block buttons
      expect(screen.getByTestId('list-icon')).toBeInTheDocument()
      expect(screen.getByTestId('list-ordered-icon')).toBeInTheDocument()
      expect(screen.getByTestId('quote-icon')).toBeInTheDocument()
      
      // Variable insertion button
      expect(screen.getByTestId('at-sign-icon')).toBeInTheDocument()
    })
  })

  describe('Button Interactions', () => {
    it('should call toggleBold when bold button is clicked', async () => {
      const user = userEvent.setup()
      render(<BubbleMenu editor={mockEditor as Editor} />)
      
      const boldButton = screen.getByTestId('bold-icon').closest('button')!
      await user.click(boldButton)
      
      expect(mockEditor.chain).toHaveBeenCalled()
      expect(mockChain.focus).toHaveBeenCalled()
      expect(mockCommands.toggleBold).toHaveBeenCalled()
      expect(mockCommands.run).toHaveBeenCalled()
    })

    it('should call toggleItalic when italic button is clicked', async () => {
      const user = userEvent.setup()
      render(<BubbleMenu editor={mockEditor as Editor} />)
      
      const italicButton = screen.getByTestId('italic-icon').closest('button')!
      await user.click(italicButton)
      
      expect(mockEditor.chain).toHaveBeenCalled()
      expect(mockChain.focus).toHaveBeenCalled()
      expect(mockCommands.toggleItalic).toHaveBeenCalled()
      expect(mockCommands.run).toHaveBeenCalled()
    })

    it('should call toggleHeading with level 1 when H1 button is clicked', async () => {
      const user = userEvent.setup()
      render(<BubbleMenu editor={mockEditor as Editor} />)
      
      const h1Button = screen.getByTestId('heading1-icon').closest('button')!
      await user.click(h1Button)
      
      expect(mockEditor.chain).toHaveBeenCalled()
      expect(mockChain.focus).toHaveBeenCalled()
      expect(mockCommands.toggleHeading).toHaveBeenCalledWith({ level: 1 })
      expect(mockCommands.run).toHaveBeenCalled()
    })

    it('should call insertContent with @ when variable button is clicked', async () => {
      const user = userEvent.setup()
      const mockOnVariableInsert = jest.fn()
      
      render(
        <BubbleMenu 
          editor={mockEditor as Editor} 
          onVariableInsert={mockOnVariableInsert}
        />
      )
      
      const variableButton = screen.getByTestId('at-sign-icon').closest('button')!
      await user.click(variableButton)
      
      expect(mockEditor.chain).toHaveBeenCalled()
      expect(mockChain.focus).toHaveBeenCalled()
      expect(mockCommands.insertContent).toHaveBeenCalledWith('@')
      expect(mockCommands.run).toHaveBeenCalled()
      expect(mockOnVariableInsert).toHaveBeenCalled()
    })
  })

  describe('Active States', () => {
    it('should show active state for bold when text is bold', () => {
      (mockEditor.isActive as jest.Mock).mockImplementation((name) => name === 'bold')
      
      render(<BubbleMenu editor={mockEditor as Editor} />)
      
      const boldButton = screen.getByTestId('bold-icon').closest('button')!
      expect(boldButton).toHaveClass('bg-blue-500')
    })

    it('should show active state for heading when heading is active', () => {
      (mockEditor.isActive as jest.Mock).mockImplementation((name, attrs) => 
        name === 'heading' && attrs?.level === 2
      )
      
      render(<BubbleMenu editor={mockEditor as Editor} />)
      
      const h2Button = screen.getByTestId('heading2-icon').closest('button')!
      expect(h2Button).toHaveClass('bg-blue-500')
    })
  })

  describe('Error Handling', () => {
    it('should handle editor command errors gracefully', async () => {
      const user = userEvent.setup()
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      // Mock editor command to throw error
      mockCommands.toggleBold.mockImplementation(() => {
        throw new Error('Command failed')
      })
      
      render(<BubbleMenu editor={mockEditor as Editor} />)
      
      const boldButton = screen.getByTestId('bold-icon').closest('button')!
      await user.click(boldButton)
      
      expect(consoleSpy).toHaveBeenCalledWith('Error executing editor command:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('should handle isActive errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      // Create a new mock editor with isActive that throws
      const errorEditor = {
        ...mockEditor,
        isActive: jest.fn().mockImplementation(() => {
          throw new Error('isActive failed')
        })
      }
      
      render(<BubbleMenu editor={errorEditor as Editor} />)
      
      expect(consoleSpy).toHaveBeenCalledWith('Error checking editor active state:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      render(<BubbleMenu editor={mockEditor as Editor} className="custom-class" />)
      
      const bubbleMenu = screen.getByTestId('bubble-menu')
      expect(bubbleMenu).toHaveClass('custom-class')
    })
  })
})