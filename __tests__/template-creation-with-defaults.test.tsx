/**
 * Integration test for template creation with default categories
 * Verifies that users can immediately start creating templates using default categories
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { CategorySelectionModal } from '@/components/category-selection-modal'
import { useModalStore } from '@/hooks/use-modal-store'
import { useToast } from '@/hooks/use-toast'

// Mock dependencies
jest.mock('@/hooks/use-modal-store')
jest.mock('@/hooks/use-toast')

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>

describe('Template Creation with Default Categories', () => {
  const mockToast = jest.fn()
  const mockCloseCategorySelectionModal = jest.fn()
  const mockLoadUserCategories = jest.fn()
  const mockClearCategoryCache = jest.fn()
  const mockOnCategorySelected = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseToast.mockReturnValue({ toast: mockToast } as any)
    
    // Mock the modal store with default categories (simulating the improved API response)
    mockUseModalStore.mockReturnValue({
      isCategorySelectionModalOpen: true,
      categorySelectionData: {
        existingCategories: [
          'Mietverträge',
          'Kündigungen', 
          'Nebenkostenabrechnungen',
          'Mängelanzeigen',
          'Schriftverkehr',
          'Sonstiges'
        ],
        onCategorySelected: mockOnCategorySelected,
        onCancel: jest.fn(),
        isLoading: false,
        error: undefined,
        allowNewCategory: false // Template creation mode - no new categories allowed
      },
      closeCategorySelectionModal: mockCloseCategorySelectionModal,
      loadUserCategories: mockLoadUserCategories,
      clearCategoryCache: mockClearCategoryCache,
      categoryCache: new Map(),
      categoryLoadingState: new Map(),
      openCategorySelectionModal: jest.fn(),
    } as any)
  })

  it('should display all default categories for new users', () => {
    render(<CategorySelectionModal />)
    
    // Should show all default categories
    expect(screen.getByText('Mietverträge')).toBeInTheDocument()
    expect(screen.getByText('Kündigungen')).toBeInTheDocument()
    expect(screen.getByText('Nebenkostenabrechnungen')).toBeInTheDocument()
    expect(screen.getByText('Mängelanzeigen')).toBeInTheDocument()
    expect(screen.getByText('Schriftverkehr')).toBeInTheDocument()
    expect(screen.getByText('Sonstiges')).toBeInTheDocument()
    
    // Should show category count
    expect(screen.getByText('Bestehende Kategorien (6)')).toBeInTheDocument()
  })

  it('should not show new category creation section in template creation mode', () => {
    render(<CategorySelectionModal />)
    
    // Should NOT show new category creation section
    expect(screen.queryByText('Neue Kategorie erstellen')).not.toBeInTheDocument()
    expect(screen.queryByText('Neu')).not.toBeInTheDocument()
  })

  it('should show appropriate description for template creation mode', () => {
    render(<CategorySelectionModal />)
    
    expect(screen.getByText(
      'Wählen Sie eine bestehende Kategorie für Ihre Vorlage aus. Nach der Auswahl werden Sie direkt zum Vorlagen-Editor weitergeleitet.'
    )).toBeInTheDocument()
  })

  it('should allow immediate template creation by selecting a default category', async () => {
    const user = userEvent.setup()
    render(<CategorySelectionModal />)
    
    // Select a default category
    await user.click(screen.getByText('Mietverträge'))
    
    // Click continue
    await user.click(screen.getByText('Fortfahren'))
    
    // Should call the callback with the selected category
    expect(mockOnCategorySelected).toHaveBeenCalledWith('Mietverträge')
  })

  it('should work with different default categories', async () => {
    const user = userEvent.setup()
    render(<CategorySelectionModal />)
    
    // Test with different categories
    const categories = ['Kündigungen', 'Nebenkostenabrechnungen', 'Sonstiges']
    
    for (const category of categories) {
      // Reset mock
      mockOnCategorySelected.mockClear()
      
      // Select category
      await user.click(screen.getByText(category))
      await user.click(screen.getByText('Fortfahren'))
      
      // Verify callback
      expect(mockOnCategorySelected).toHaveBeenCalledWith(category)
    }
  })

  it('should enable smooth workflow without empty states', () => {
    render(<CategorySelectionModal />)
    
    // Should never show empty state
    expect(screen.queryByText('Noch keine Kategorien vorhanden')).not.toBeInTheDocument()
    
    // Should have categories immediately available
    expect(screen.getByText('Bestehende Kategorien (6)')).toBeInTheDocument()
    
    // Should be ready for immediate use - categories are clickable elements
    const categoryNames = ['Mietverträge', 'Kündigungen', 'Nebenkostenabrechnungen', 'Mängelanzeigen', 'Schriftverkehr', 'Sonstiges']
    categoryNames.forEach(categoryName => {
      expect(screen.getByText(categoryName)).toBeInTheDocument()
    })
  })
})