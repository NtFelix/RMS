import { describe, it, expect, vi } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MentionList } from '../mention-list'
import { MentionItem } from '../mention-extension'

// Mock data for testing
const mockVariables: MentionItem[] = [
  {
    id: 'tenant_name',
    label: 'Mieter Name',
    category: 'Mieter',
    description: 'Vollständiger Name des Mieters'
  },
  {
    id: 'property_address',
    label: 'Immobilien Adresse',
    category: 'Immobilie',
    description: 'Vollständige Adresse der Immobilie'
  }
]

describe('MentionList', () => {
  it('renders mention list items', () => {
    const mockProps = {
      items: mockVariables,
      command: vi.fn(),
      variables: mockVariables,
      onVariableInsert: vi.fn()
    }

    render(<MentionList {...mockProps} />)
    
    expect(screen.getByText('Mieter Name')).toBeInTheDocument()
    expect(screen.getByText('Immobilien Adresse')).toBeInTheDocument()
  })
})