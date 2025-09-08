import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileContextMenu } from '@/components/file-context-menu'
import { useModalStore } from '@/hooks/use-modal-store'
import { useToast } from '@/hooks/use-toast'

// Mock dependencies
jest.mock('@/hooks/use-modal-store')
jest.mock('@/hooks/use-toast')
jest.mock('@/hooks/use-cloud-storage-store', () => ({
  useCloudStorageOperations: () => ({
    downloadFile: jest.fn(),
    deleteFile: jest.fn(),
    renameFile: jest.fn(),
    moveFile: jest.fn(),
    isOperationInProgress: false,
  }),
  useCloudStoragePreview: () => ({
    openPreview: jest.fn(),
  }),
  useCloudStorageArchive: () => ({
    archiveFile: jest.fn(),
    openArchiveView: jest.fn(),
  }),
}))

const mockUseModalStore = useModalStore as jest.MockedFunction<typeof useModalStore>
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>

// Mock fetch globally
global.fetch = jest.fn()

describe('FileContextMenu - Template Actions', () => {
  const mockToast = jest.fn()
  const mockOpenTemplateUsageModal = jest.fn()
  const mockOpenMarkdownEditorModal = jest.fn()
  const mockOpenFileMoveModal = jest.fn()

  const mockTemplateFile = {
    id: 'template-1',
    name: 'test-template.vorlage',
    size: 1024,
    metadata: {},
  }

  const mockTemplate = {
    id: 'template-uuid-1',
    titel: 'test-template',
    inhalt: 'Template content with @mieter.name placeholder',
    kategorie: 'mail',
    kontext_anforderungen: ['mieter'],
    user_id: 'user-1',
    erstellungsdatum: '2024-01-01T00:00:00Z',
    aktualisiert_am: '2024-01-01T00:00:00Z'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseToast.mockReturnValue({
      toast: mockToast,
    })

    mockUseModalStore.mockReturnValue({
      openTemplateUsageModal: mockOpenTemplateUsageModal,
      openMarkdownEditorModal: mockOpenMarkdownEditorModal,
      openFileMoveModal: mockOpenFileMoveModal,
    } as any)

    // Mock successful API responses by default
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([mockTemplate]),
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('should show "Template verwenden" option for .vorlage files', async () => {
    const user = userEvent.setup()
    
    render(
      <FileContextMenu file={mockTemplateFile} currentPath="/templates" userId="user-1">
        <div>Template File</div>
      </FileContextMenu>
    )

    // Right-click to open context menu
    const trigger = screen.getByText('Template File')
    await user.pointer({ keys: '[MouseRight]', target: trigger })

    // Should show template usage option
    expect(screen.getByText('Template verwenden')).toBeInTheDocument()
  })

  it('should open template usage modal when "Template verwenden" is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <FileContextMenu file={mockTemplateFile} currentPath="/templates" userId="user-1">
        <div>Template File</div>
      </FileContextMenu>
    )

    // Right-click to open context menu
    const trigger = screen.getByText('Template File')
    await user.pointer({ keys: '[MouseRight]', target: trigger })

    // Click template usage option
    const templateUsageOption = screen.getByText('Template verwenden')
    await user.click(templateUsageOption)

    // Should fetch templates and open modal
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/vorlagen')
      expect(mockOpenTemplateUsageModal).toHaveBeenCalledWith(
        mockTemplate,
        expect.any(Function)
      )
    })
  })

  it('should handle template usage modal callback correctly', async () => {
    const user = userEvent.setup()
    
    render(
      <FileContextMenu file={mockTemplateFile} currentPath="/templates" userId="user-1">
        <div>Template File</div>
      </FileContextMenu>
    )

    // Right-click and click template usage
    const trigger = screen.getByText('Template File')
    await user.pointer({ keys: '[MouseRight]', target: trigger })
    
    const templateUsageOption = screen.getByText('Template verwenden')
    await user.click(templateUsageOption)

    await waitFor(() => {
      expect(mockOpenTemplateUsageModal).toHaveBeenCalled()
    })

    // Get the callback function passed to the modal
    const callback = mockOpenTemplateUsageModal.mock.calls[0][1]
    
    // Call the callback with processed content
    callback('Processed document content')

    // Should show success toast
    expect(mockToast).toHaveBeenCalledWith({
      title: "Dokument erstellt",
      description: "Das Dokument wurde erfolgreich aus dem Template erstellt.",
    })
  })

  it('should show error toast when template is not found', async () => {
    const user = userEvent.setup()
    
    // Mock API to return empty array (template not found)
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })
    
    render(
      <FileContextMenu file={mockTemplateFile} currentPath="/templates" userId="user-1">
        <div>Template File</div>
      </FileContextMenu>
    )

    // Right-click and click template usage
    const trigger = screen.getByText('Template File')
    await user.pointer({ keys: '[MouseRight]', target: trigger })
    
    const templateUsageOption = screen.getByText('Template verwenden')
    await user.click(templateUsageOption)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Template nicht gefunden",
        description: "Das Template konnte nicht gefunden werden.",
        variant: "destructive",
      })
    })
  })

  it('should handle template rename correctly', async () => {
    const user = userEvent.setup()
    
    // Mock successful update response
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockTemplate]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ...mockTemplate, titel: 'new-template-name' }),
      })
    
    render(
      <FileContextMenu file={mockTemplateFile} currentPath="/templates" userId="user-1">
        <div>Template File</div>
      </FileContextMenu>
    )

    // Right-click to open context menu
    const trigger = screen.getByText('Template File')
    await user.pointer({ keys: '[MouseRight]', target: trigger })

    // Click rename option
    const renameOption = screen.getByText('Umbenennen')
    await user.click(renameOption)

    // Wait for rename modal to appear and enter new name
    await waitFor(() => {
      expect(screen.getByDisplayValue('test-template')).toBeInTheDocument()
    })

    const nameInput = screen.getByDisplayValue('test-template')
    await user.clear(nameInput)
    await user.type(nameInput, 'new-template-name')

    // Submit the form
    const submitButton = screen.getByRole('button', { name: 'Umbenennen' })
    await user.click(submitButton)

    // Should call API to update template
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(`/api/vorlagen/${mockTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          titel: 'new-template-name'
        })
      })
    })

    // Should show success toast
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Template umbenannt",
        description: 'Das Template wurde erfolgreich zu "new-template-name" umbenannt.',
      })
    })
  })

  it('should handle template delete correctly', async () => {
    const user = userEvent.setup()
    
    // Mock successful delete response
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockTemplate]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    
    render(
      <FileContextMenu file={mockTemplateFile} currentPath="/templates" userId="user-1">
        <div>Template File</div>
      </FileContextMenu>
    )

    // Right-click to open context menu
    const trigger = screen.getByText('Template File')
    await user.pointer({ keys: '[MouseRight]', target: trigger })

    // Click delete option
    const deleteOption = screen.getByText('Endgültig löschen')
    await user.click(deleteOption)

    // Confirm deletion in the dialog
    await waitFor(() => {
      expect(screen.getByText('Datei löschen')).toBeInTheDocument()
    })

    const confirmButton = screen.getByText('Endgültig löschen')
    await user.click(confirmButton)

    // Should call API to delete template
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(`/api/vorlagen/${mockTemplate.id}`, {
        method: 'DELETE'
      })
    })

    // Should show success toast
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Template gelöscht",
        description: 'Das Template "test-template" wurde erfolgreich gelöscht.',
      })
    })
  })

  it('should handle API errors gracefully', async () => {
    const user = userEvent.setup()
    
    // Mock API error
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))
    
    render(
      <FileContextMenu file={mockTemplateFile} currentPath="/templates" userId="user-1">
        <div>Template File</div>
      </FileContextMenu>
    )

    // Right-click and click template usage
    const trigger = screen.getByText('Template File')
    await user.pointer({ keys: '[MouseRight]', target: trigger })
    
    const templateUsageOption = screen.getByText('Template verwenden')
    await user.click(templateUsageOption)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Fehler",
        description: "Das Template konnte nicht geöffnet werden.",
        variant: "destructive",
      })
    })
  })

  it('should not show template options for non-template files', async () => {
    const user = userEvent.setup()
    
    const regularFile = {
      id: 'file-1',
      name: 'document.pdf',
      size: 1024,
      metadata: {},
    }
    
    render(
      <FileContextMenu file={regularFile} currentPath="/documents" userId="user-1">
        <div>Regular File</div>
      </FileContextMenu>
    )

    // Right-click to open context menu
    const trigger = screen.getByText('Regular File')
    await user.pointer({ keys: '[MouseRight]', target: trigger })

    // Should not show template usage option
    expect(screen.queryByText('Template verwenden')).not.toBeInTheDocument()
  })

  it('should handle template rename with .vorlage extension removal', async () => {
    const user = userEvent.setup()
    
    // Mock successful update response
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockTemplate]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ...mockTemplate, titel: 'new-name' }),
      })
    
    render(
      <FileContextMenu file={mockTemplateFile} currentPath="/templates" userId="user-1">
        <div>Template File</div>
      </FileContextMenu>
    )

    // Right-click to open context menu
    const trigger = screen.getByText('Template File')
    await user.pointer({ keys: '[MouseRight]', target: trigger })

    // Click rename option
    const renameOption = screen.getByText('Umbenennen')
    await user.click(renameOption)

    // Wait for rename modal and enter name with .vorlage extension
    await waitFor(() => {
      expect(screen.getByDisplayValue('test-template')).toBeInTheDocument()
    })

    const nameInput = screen.getByDisplayValue('test-template')
    await user.clear(nameInput)
    await user.type(nameInput, 'new-name')

    // Submit the form
    const submitButton = screen.getByRole('button', { name: 'Umbenennen' })
    await user.click(submitButton)

    // Should call API with clean name (without .vorlage extension)
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(`/api/vorlagen/${mockTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          titel: 'new-name'
        })
      })
    })
  })
})