import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BetriebskostenEditModal } from '../betriebskosten-edit-modal'
import { useToast } from '../hooks/use-toast'

// Mock the toast hook
jest.mock('../hooks/use-toast', () => ({
  toast: jest.fn()
}))

// Mock the Supabase client
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn()
}))

// Mock actions
jest.mock('../app/betriebskosten-actions', () => ({
  getNebenkostenDetailsAction: jest.fn(),
  createNebenkosten: jest.fn(),
  updateNebenkosten: jest.fn(),
  createRechnungenBatch: jest.fn(),
  deleteRechnungenByNebenkostenId: jest.fn()
}))

// Mock mieter actions
jest.mock('../app/mieter-actions', () => ({
  getMieterByHausIdAction: jest.fn()
}))

const mockHaeuser = [
  { id: '1', name: 'House 1' },
  { id: '2', name: 'House 2' }
]

describe('BetriebskostenEditModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('State Management', () => {
    it('should handle loading state correctly', async () => {
      const mockOnClose = jest.fn()
      
      // Use act for initial render
      await act(async () => {
        render(
          <BetriebskostenEditModal
            isOpen={true}
            onClose={mockOnClose}
            haeuser={mockHaeuser}
            userId="test-user"
          />
        )
      })

      // Simulate fetching tenants
      await act(async () => {
        // Trigger fetchTenants
        const fetchButton = screen.getByText('Haus auswählen')
        fireEvent.click(fetchButton)
      })

      // Verify loading state
      expect(screen.getByText('Laden...')).toBeInTheDocument()
    })

    it('should handle tenant selection correctly', async () => {
      const mockOnClose = jest.fn()
      
      // Use act for initial render and tenant selection
      await act(async () => {
        render(
          <BetriebskostenEditModal
            isOpen={true}
            onClose={mockOnClose}
            haeuser={mockHaeuser}
            userId="test-user"
          />
        )

        // Select a house
        const houseSelect = screen.getByText('Haus auswählen')
        fireEvent.click(houseSelect)
        const houseOption = screen.getByText(mockHaeuser[0].name)
        fireEvent.click(houseOption)
      })

      // Verify tenant selection
      expect(screen.getByText('Mieter auswählen')).toBeInTheDocument()
    })

    it('should handle saving correctly', async () => {
      const mockOnClose = jest.fn()
      
      // Use act for initial render and saving
      await act(async () => {
        render(
          <BetriebskostenEditModal
            isOpen={true}
            onClose={mockOnClose}
            haeuser={mockHaeuser}
            userId="test-user"
          />
        )

        // Simulate saving
        const saveButton = screen.getByText('Speichern')
        fireEvent.click(saveButton)
      })

      // Verify saving state
      expect(screen.getByText('Speichern...')).toBeInTheDocument()
    })
  })
})
