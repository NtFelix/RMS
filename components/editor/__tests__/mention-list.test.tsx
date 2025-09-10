import { describe, it, expect, beforeEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MentionList } from '../mention-list'
import { MentionItem } from '../mention-extension'

// Mock the template variables functions
jest.mock('@/lib/template-variables', () => ({
  getCategoryColor: jest.fn((category: string) => 'bg-blue-100 text-blue-800'),
  getCategoryIcon: jest.fn((category: string) => '🏢')
}))

// Mock data for testing
const mockVariables: MentionItem[] = [
  {
    id: 'tenant_name',
    label: 'Mieter Name',
    category: 'Mieter',
    description: 'Vollständiger Name des Mieters',
    context: ['tenant']
  },
  {
    id: 'property_address',
    label: 'Immobilien Adresse',
    category: 'Immobilie',
    description: 'Vollständige Adresse der Immobilie',
    context: ['property']
  },
  {
    id: 'landlord_name',
    label: 'Vermieter Name',
    category: 'Vermieter',
    description: 'Name des Vermieters',
    context: ['landlord']
  }
]

describe('Enhanced MentionList', () => {
  const defaultProps = {
    items: mockVariables,
    command: jest.fn(),
    variables: mockVariables,
    onVariableInsert: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders enhanced mention list with search functionality', () => {
    render(<MentionList {...defaultProps} />)
    
    expect(screen.getByText('Variablen einfügen')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Variablen durchsuchen...')).toBeInTheDocument()
    expect(screen.getByText('3 verfügbar')).toBeInTheDocument()
  })

  it('displays categorized variables with counts', () => {
    render(<MentionList {...defaultProps} />)
    
    expect(screen.getByText('Mieter')).toBeInTheDocument()
    expect(screen.getByText('Immobilie')).toBeInTheDocument()
    expect(screen.getByText('Vermieter')).toBeInTheDocument()
  })

  it('filters variables based on search query', async () => {
    const user = userEvent.setup()
    render(<MentionList {...defaultProps} />)
    
    const searchInput = screen.getByPlaceholderText('Variablen durchsuchen...')
    await user.type(searchInput, 'tenant_name')
    
    await waitFor(() => {
      expect(screen.getByText('1 verfügbar')).toBeInTheDocument()
    })
  })

  it('handles category expansion and collapse', async () => {
    const user = userEvent.setup()
    render(<MentionList {...defaultProps} />)
    
    // Mieter category should be expanded by default (first category)
    expect(screen.getByText('Mieter Name')).toBeInTheDocument()
    
    // Click to collapse
    const mieterCategory = screen.getByText('Mieter')
    await user.click(mieterCategory)
    
    // Should be collapsed now
    expect(screen.queryByText('Mieter Name')).not.toBeInTheDocument()
  })

  it('calls command and onVariableInsert when item is selected', async () => {
    const user = userEvent.setup()
    const mockCommand = jest.fn()
    const mockOnVariableInsert = jest.fn()
    
    render(<MentionList {...defaultProps} command={mockCommand} onVariableInsert={mockOnVariableInsert} />)
    
    // Mieter Name should be visible by default (first category expanded)
    const mieterItem = screen.getByText('Mieter Name')
    await user.click(mieterItem)
    
    expect(mockCommand).toHaveBeenCalledWith(mockVariables[0])
    expect(mockOnVariableInsert).toHaveBeenCalledWith(mockVariables[0])
  })

  it('shows empty state when no items match search', async () => {
    const user = userEvent.setup()
    render(<MentionList {...defaultProps} />)
    
    const searchInput = screen.getByPlaceholderText('Variablen durchsuchen...')
    await user.type(searchInput, 'nonexistent')
    
    await waitFor(() => {
      expect(screen.getByText('Keine Variablen gefunden')).toBeInTheDocument()
      expect(screen.getByText('Versuchen Sie einen anderen Suchbegriff')).toBeInTheDocument()
    })
  })

  it('displays context tags for variables', async () => {
    render(<MentionList {...defaultProps} />)
    
    // Mieter category should be expanded by default, so tenant context should be visible
    expect(screen.getByText('tenant')).toBeInTheDocument()
  })

  it('shows enhanced visual feedback on hover', async () => {
    const user = userEvent.setup()
    render(<MentionList {...defaultProps} />)
    
    // Mieter Name should be visible by default
    const mieterItem = screen.getByText('Mieter Name')
    await user.hover(mieterItem)
    
    // Should show description in both the item and tooltip (multiple instances expected)
    const descriptions = screen.getAllByText('Vollständiger Name des Mieters')
    expect(descriptions.length).toBeGreaterThan(0)
  })
})