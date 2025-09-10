/**
 * Template System Final Integration Test
 * 
 * This test verifies that the complete template system works end-to-end
 * with proper integration between all components.
 */

import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { render } from './test-utils'

// Mock the template operations hook
const mockOpenCreateTemplateEditor = jest.fn()
const mockOpenEditTemplateEditor = jest.fn()
const mockDuplicateTemplate = jest.fn()
const mockDeleteTemplate = jest.fn()

jest.mock('@/hooks/use-template-operations', () => ({
  useTemplateOperations: () => ({
    openCreateTemplateEditor: mockOpenCreateTemplateEditor,
    openEditTemplateEditor: mockOpenEditTemplateEditor,
    duplicateTemplate: mockDuplicateTemplate,
    deleteTemplate: mockDeleteTemplate,
    isLoading: false
  })
}))

// Mock the modal store
const mockOpenCategorySelectionModal = jest.fn()
const mockOpenTemplateEditorModal = jest.fn()

jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: () => ({
    openCategorySelectionModal: mockOpenCategorySelectionModal,
    openTemplateEditorModal: mockOpenTemplateEditorModal,
    isCategorySelectionModalOpen: false,
    isTemplateEditorModalOpen: false,
    closeCategorySelectionModal: jest.fn(),
    closeTemplateEditorModal: jest.fn()
  })
}))

// Mock the cloud storage components
import { CloudStorageQuickActions } from '@/components/cloud-storage-quick-actions'
import { CategorySelectionModal } from '@/components/category-selection-modal'
import { TemplateEditorModal } from '@/components/template-editor-modal'

describe('Template System Final Integration', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Template Creation Integration', () => {
    it('should integrate template creation button with documents interface', async () => {
      const mockOnCreateTemplate = jest.fn()
      
      render(
        <CloudStorageQuickActions
          onUpload={jest.fn()}
          onCreateFolder={jest.fn()}
          onCreateFile={jest.fn()}
          onCreateTemplate={mockOnCreateTemplate}
          onSearch={jest.fn()}
          onSort={jest.fn()}
          onViewMode={jest.fn()}
          onFilter={jest.fn()}
          viewMode="grid"
          searchQuery=""
          currentPath="user_123/Vorlagen"
        />
      )

      // Find and click the add button
      const addButton = screen.getByRole('button', { name: /hinzufügen/i })
      await user.click(addButton)

      // Should show template creation option
      const templateOption = screen.getByText(/vorlage erstellen/i)
      expect(templateOption).toBeInTheDocument()

      // Click template creation option
      await user.click(templateOption)

      // Should call the template creation handler
      expect(mockOnCreateTemplate).toHaveBeenCalledTimes(1)
    })

    it('should not show template creation outside template folders', async () => {
      render(
        <CloudStorageQuickActions
          onUpload={jest.fn()}
          onCreateFolder={jest.fn()}
          onCreateFile={jest.fn()}
          onCreateTemplate={jest.fn()}
          onSearch={jest.fn()}
          onSort={jest.fn()}
          onViewMode={jest.fn()}
          onFilter={jest.fn()}
          viewMode="grid"
          searchQuery=""
          currentPath="user_123/SomeOtherFolder"
        />
      )

      // Find and click the add button
      const addButton = screen.getByRole('button', { name: /hinzufügen/i })
      await user.click(addButton)

      // Should not show template creation option
      const templateOption = screen.queryByText(/vorlage erstellen/i)
      expect(templateOption).not.toBeInTheDocument()
    })
  })

  describe('Category Selection Integration', () => {
    it('should render category selection modal with proper structure', () => {
      const mockOnCategorySelected = jest.fn()
      const mockOnCancel = jest.fn()

      // Mock the modal store to show the modal as open
      jest.mocked(require('@/hooks/use-modal-store').useModalStore).mockReturnValue({
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: ['Mietverträge', 'Kündigungen', 'Sonstiges'],
          onCategorySelected: mockOnCategorySelected,
          onCancel: mockOnCancel,
          isLoading: false,
          error: null,
          allowNewCategory: false
        },
        closeCategorySelectionModal: jest.fn(),
        openTemplateEditorModal: jest.fn(),
        closeTemplateEditorModal: jest.fn(),
        loadUserCategories: jest.fn(),
        clearCategoryCache: jest.fn()
      })

      render(<CategorySelectionModal />)

      // Should show modal title
      expect(screen.getByText('Kategorie auswählen')).toBeInTheDocument()

      // Should show existing categories
      expect(screen.getByText('Mietverträge')).toBeInTheDocument()
      expect(screen.getByText('Kündigungen')).toBeInTheDocument()
      expect(screen.getByText('Sonstiges')).toBeInTheDocument()

      // Should show action buttons
      expect(screen.getByRole('button', { name: /abbrechen/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /fortfahren/i })).toBeInTheDocument()
    })
  })

  describe('Template Editor Integration', () => {
    it('should render template editor modal with proper structure', () => {
      const mockOnSave = jest.fn()
      const mockOnCancel = jest.fn()

      // Mock the modal store to show the modal as open
      jest.mocked(require('@/hooks/use-modal-store').useModalStore).mockReturnValue({
        isTemplateEditorModalOpen: true,
        templateEditorData: {
          isNewTemplate: true,
          initialCategory: 'Mietverträge',
          onSave: mockOnSave,
          onCancel: mockOnCancel
        },
        isTemplateEditorModalDirty: false,
        closeTemplateEditorModal: jest.fn(),
        setTemplateEditorModalDirty: jest.fn(),
        isCategorySelectionModalOpen: false,
        closeCategorySelectionModal: jest.fn()
      })

      render(<TemplateEditorModal />)

      // Should show modal title
      expect(screen.getByText('Neue Vorlage erstellen')).toBeInTheDocument()

      // Should show category badge
      expect(screen.getByText('Mietverträge')).toBeInTheDocument()

      // Should show title input
      expect(screen.getByLabelText(/titel der vorlage/i)).toBeInTheDocument()

      // Should show action buttons
      expect(screen.getByRole('button', { name: /abbrechen/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /speichern/i })).toBeInTheDocument()
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle template creation errors gracefully', async () => {
      const mockOnCreateTemplate = jest.fn().mockRejectedValue(new Error('Template creation failed'))
      
      render(
        <CloudStorageQuickActions
          onUpload={jest.fn()}
          onCreateFolder={jest.fn()}
          onCreateFile={jest.fn()}
          onCreateTemplate={mockOnCreateTemplate}
          onSearch={jest.fn()}
          onSort={jest.fn()}
          onViewMode={jest.fn()}
          onFilter={jest.fn()}
          viewMode="grid"
          searchQuery=""
          currentPath="user_123/Vorlagen"
        />
      )

      // Find and click the add button
      const addButton = screen.getByRole('button', { name: /hinzufügen/i })
      await user.click(addButton)

      // Click template creation option
      const templateOption = screen.getByText(/vorlage erstellen/i)
      await user.click(templateOption)

      // Should handle the error gracefully (no crash)
      expect(mockOnCreateTemplate).toHaveBeenCalledTimes(1)
    })
  })

  describe('Performance Integration', () => {
    it('should handle large numbers of categories efficiently', () => {
      const largeCategories = Array.from({ length: 100 }, (_, i) => `Category ${i + 1}`)
      
      // Mock the modal store with many categories
      jest.mocked(require('@/hooks/use-modal-store').useModalStore).mockReturnValue({
        isCategorySelectionModalOpen: true,
        categorySelectionData: {
          existingCategories: largeCategories,
          onCategorySelected: jest.fn(),
          onCancel: jest.fn(),
          isLoading: false,
          error: null,
          allowNewCategory: false
        },
        closeCategorySelectionModal: jest.fn(),
        openTemplateEditorModal: jest.fn(),
        closeTemplateEditorModal: jest.fn(),
        loadUserCategories: jest.fn(),
        clearCategoryCache: jest.fn()
      })

      const startTime = performance.now()
      render(<CategorySelectionModal />)
      const endTime = performance.now()

      // Should render quickly even with many categories
      expect(endTime - startTime).toBeLessThan(100) // Less than 100ms

      // Should show the first few categories
      expect(screen.getByText('Category 1')).toBeInTheDocument()
      expect(screen.getByText('Category 2')).toBeInTheDocument()
    })
  })

  describe('Accessibility Integration', () => {
    it('should provide proper accessibility features', () => {
      render(
        <CloudStorageQuickActions
          onUpload={jest.fn()}
          onCreateFolder={jest.fn()}
          onCreateFile={jest.fn()}
          onCreateTemplate={jest.fn()}
          onSearch={jest.fn()}
          onSort={jest.fn()}
          onViewMode={jest.fn()}
          onFilter={jest.fn()}
          viewMode="grid"
          searchQuery=""
          currentPath="user_123/Vorlagen"
        />
      )

      // Should have proper ARIA labels
      const addButton = screen.getByRole('button', { name: /hinzufügen/i })
      expect(addButton).toBeInTheDocument()

      // Should have proper keyboard navigation
      expect(addButton).toHaveAttribute('type', 'button')
    })
  })
})