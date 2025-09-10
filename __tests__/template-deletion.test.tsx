import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TemplateContextMenu } from '@/components/template-context-menu'
import { useToast } from '@/hooks/use-toast'
import type { TemplateItem } from '@/types/template'

// Mock dependencies
jest.mock('@/hooks/use-toast')
jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: () => ({
    openTemplateEditorModal: jest.fn()
  })
}))

// Mock the entire template service module
jest.mock('@/lib/template-service', () => ({
  templateService: {
    deleteTemplate: jest.fn(),
    createTemplate: jest.fn(),
    updateTemplate: jest.fn()
  }
}))

// Mock fetch for user profile API
global.fetch = jest.fn()

const mockToast = jest.fn()
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>

describe('Template Deletion', () => {
  const mockTemplate: TemplateItem = {
    id: 'template-1',
    name: 'Test Template',
    category: 'Test Category',
    content: '{"type":"doc","content":[]}',
    variables: ['tenant_name', 'property_address'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    size: 100,
    type: 'template'
  }

  const mockOnTemplateDeleted = jest.fn()
  const mockOnTemplateUpdated = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseToast.mockReturnValue({ toast: mockToast })
    
    // Mock fetch for user profile
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'user-123' })
    })
  })

  it('should show delete option in context menu', async () => {
    render(
      <TemplateContextMenu
        template={mockTemplate}
        onTemplateDeleted={mockOnTemplateDeleted}
        onTemplateUpdated={mockOnTemplateUpdated}
      >
        <div>Template Item</div>
      </TemplateContextMenu>
    )

    // Right-click to open context menu
    const templateItem = screen.getByText('Template Item')
    fireEvent.contextMenu(templateItem)

    // Check if delete option is present
    expect(screen.getByText('Löschen')).toBeInTheDocument()
  })

  it('should show confirmation dialog when delete is clicked', async () => {
    render(
      <TemplateContextMenu
        template={mockTemplate}
        onTemplateDeleted={mockOnTemplateDeleted}
        onTemplateUpdated={mockOnTemplateUpdated}
      >
        <div>Template Item</div>
      </TemplateContextMenu>
    )

    // Right-click to open context menu
    const templateItem = screen.getByText('Template Item')
    fireEvent.contextMenu(templateItem)

    // Click delete option
    const deleteOption = screen.getByText('Löschen')
    fireEvent.click(deleteOption)

    // Check if confirmation dialog appears
    expect(screen.getByText('Vorlage löschen')).toBeInTheDocument()
    expect(screen.getByText('Test Template')).toBeInTheDocument()
    expect(screen.getByText(/wirklich dauerhaft löschen/)).toBeInTheDocument()
    expect(screen.getByText('Endgültig löschen')).toBeInTheDocument()
    expect(screen.getByText('Abbrechen')).toBeInTheDocument()
  })

  it('should show template variables in confirmation dialog', async () => {
    render(
      <TemplateContextMenu
        template={mockTemplate}
        onTemplateDeleted={mockOnTemplateDeleted}
        onTemplateUpdated={mockOnTemplateUpdated}
      >
        <div>Template Item</div>
      </TemplateContextMenu>
    )

    // Right-click to open context menu
    const templateItem = screen.getByText('Template Item')
    fireEvent.contextMenu(templateItem)

    // Click delete option
    const deleteOption = screen.getByText('Löschen')
    fireEvent.click(deleteOption)

    // Check if variables are shown in the dialog
    expect(screen.getByText(/2 Variablen.*tenant_name, property_address/)).toBeInTheDocument()
  })

  it('should cancel deletion when cancel button is clicked', async () => {
    render(
      <TemplateContextMenu
        template={mockTemplate}
        onTemplateDeleted={mockOnTemplateDeleted}
        onTemplateUpdated={mockOnTemplateUpdated}
      >
        <div>Template Item</div>
      </TemplateContextMenu>
    )

    // Right-click to open context menu
    const templateItem = screen.getByText('Template Item')
    fireEvent.contextMenu(templateItem)

    // Click delete option
    const deleteOption = screen.getByText('Löschen')
    fireEvent.click(deleteOption)

    // Cancel deletion
    const cancelButton = screen.getByText('Abbrechen')
    fireEvent.click(cancelButton)

    // Check that callback was not called
    expect(mockOnTemplateDeleted).not.toHaveBeenCalled()

    // Check that dialog is closed
    await waitFor(() => {
      expect(screen.queryByText('Vorlage löschen')).not.toBeInTheDocument()
    })
  })
})