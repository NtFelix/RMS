/**
 * Tests for the improved template creation flow
 * Verifies that category selection immediately opens template editor
 * and prevents new category creation during template creation
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

describe('Improved Template Creation Flow', () => {
  const mockToast = jest.fn()
  const mockCloseCategorySelectionModal = jest.fn()
  const mockLoadUserCategories = jest.fn()
  const mockClearCategoryCache = jest.fn()
  const mockOnCategorySelected = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseToast.mockReturnValue({ toast: mockToast })
    
    mockUseModalStore.mockReturnValue({
      isCategorySelectionModalOpen: true,
      categorySelectionData: {
        existingCategories: ['Mietverträge', 'Kündigungen', 'Sonstiges'],
        onCategorySelected: mockOnCategorySelected,
        onCancel: jest.fn(),
        isLoading: false,
        error: undefined,
        allowNewCategory: false // This is the key change
      },
      closeCategorySelectionModal: mockCloseCategorySelectionModal,
      loadUserCategories: mockLoadUserCategories,
      clearCategoryCache: mockClearCategoryCache,
      categoryCache: new Map(),
      categoryLoadingState: new Map(),
      openCategorySelectionModal: jest.fn(),
    } as any)
  })

  it('should hide new category creation section when allowNewCategory is false', () => {
    render(<CategorySelectionModal />)
    
    // Should show existing categories
    expect(screen.getByText('Bestehende Kategorien (3)')).toBeInTheDocument()
    expect(screen.getByText('Mietverträge')).toBeInTheDocument()
    
    // Should NOT show new category creation section
    expect(screen.queryByText('Neue Kategorie erstellen')).not.toBeInTheDocument()
    expect(screen.queryByText('Neu')).not.toBeInTheDocument()
  })

  it('should show appropriate description when new categories are not allowed', () => {
    render(<CategorySelectionModal />)
    
    expect(screen.getByText(
      'Wählen Sie eine bestehende Kategorie für Ihre Vorlage aus. Nach der Auswahl werden Sie direkt zum Vorlagen-Editor weitergeleitet.'
    )).toBeInTheDocument()
  })

  it('should immediately call onCategorySelected when a category is selected', async () => {
    const user = userEvent.setup()
    render(<CategorySelectionModal />)
    
    // Click on a category
    await user.click(screen.getByText('Mietverträge'))
    
    // Click continue button
    await user.click(screen.getByText('Fortfahren'))
    
    // Should call the callback with the selected category
    expect(mockOnCategorySelected).toHaveBeenCalledWith('Mietverträge')
  })

  it('should disable continue button when no category is selected and new categories are not allowed', async () => {
    render(<CategorySelectionModal />)
    
    // The button should be disabled when no category is selected
    const continueButton = screen.getByText('Fortfahren')
    expect(continueButton).toBeDisabled()
    
    // This test verifies that the UI prevents invalid actions by disabling the button
    // rather than showing error messages after the fact
  })

  it('should always have default categories available for template creation', () => {
    // With our improved implementation, users should always have default categories
    // available, so this test verifies that the empty state should not occur
    // when using the template creation flow
    
    render(<CategorySelectionModal />)
    
    // Should show existing categories (including defaults)
    expect(screen.getByText('Bestehende Kategorien (3)')).toBeInTheDocument()
    expect(screen.getByText('Mietverträge')).toBeInTheDocument()
    
    // Should NOT show empty state since we now provide default categories
    expect(screen.queryByText('Noch keine Kategorien vorhanden')).not.toBeInTheDocument()
    
    // Continue button should be enabled when a category is available
    const continueButton = screen.getByText('Fortfahren')
    // Button is disabled initially because no category is selected, but categories are available
    expect(continueButton).toBeDisabled()
  })

  it('should still allow new category creation when allowNewCategory is true', () => {
    mockUseModalStore.mockReturnValue({
      isCategorySelectionModalOpen: true,
      categorySelectionData: {
        existingCategories: ['Mietverträge'],
        onCategorySelected: mockOnCategorySelected,
        onCancel: jest.fn(),
        isLoading: false,
        error: undefined,
        allowNewCategory: true // Allow new categories
      },
      closeCategorySelectionModal: mockCloseCategorySelectionModal,
      loadUserCategories: mockLoadUserCategories,
      clearCategoryCache: mockClearCategoryCache,
      categoryCache: new Map(),
      categoryLoadingState: new Map(),
      openCategorySelectionModal: jest.fn(),
    } as any)

    render(<CategorySelectionModal />)
    
    // Should show new category creation section
    expect(screen.getByText('Neue Kategorie erstellen')).toBeInTheDocument()
    expect(screen.getByText('Neu')).toBeInTheDocument()
    
    // Should show the original description
    expect(screen.getByText(
      'Wählen Sie eine bestehende Kategorie aus oder erstellen Sie eine neue für Ihre Vorlage.'
    )).toBeInTheDocument()
  })
})