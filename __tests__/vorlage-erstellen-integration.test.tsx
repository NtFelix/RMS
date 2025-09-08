import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CloudStorageQuickActions } from '@/components/cloud-storage-quick-actions'

// Mock PostHog
jest.mock('posthog-js/react', () => ({
  useFeatureFlagEnabled: jest.fn(() => true)
}))

describe('Vorlage erstellen Integration', () => {
  const mockProps = {
    onUpload: jest.fn(),
    onCreateFolder: jest.fn(),
    onCreateFile: jest.fn(),
    onCreateTemplate: jest.fn(),
    onSearch: jest.fn(),
    onSort: jest.fn(),
    onViewMode: jest.fn(),
    onFilter: jest.fn(),
    viewMode: 'grid' as const,
    searchQuery: '',
    selectedCount: 0
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should display "Vorlage erstellen" option in the dropdown menu', async () => {
    const user = userEvent.setup()
    render(<CloudStorageQuickActions {...mockProps} />)
    
    // Click the "Hinzufügen" dropdown button
    const addButton = screen.getByRole('button', { name: /Hinzufügen/ })
    await user.click(addButton)
    
    // Check if "Vorlage erstellen" option is present
    expect(screen.getByText('Vorlage erstellen')).toBeInTheDocument()
  })

  it('should call onCreateTemplate when "Vorlage erstellen" is clicked', async () => {
    const user = userEvent.setup()
    render(<CloudStorageQuickActions {...mockProps} />)
    
    // Click the "Hinzufügen" dropdown button
    const addButton = screen.getByRole('button', { name: /Hinzufügen/ })
    await user.click(addButton)
    
    // Click "Vorlage erstellen" option
    const createTemplateOption = screen.getByText('Vorlage erstellen')
    await user.click(createTemplateOption)
    
    // Verify the callback was called
    expect(mockProps.onCreateTemplate).toHaveBeenCalledTimes(1)
  })

  it('should not display "Vorlage erstellen" option when onCreateTemplate is not provided', async () => {
    const user = userEvent.setup()
    const propsWithoutTemplate = { ...mockProps }
    delete propsWithoutTemplate.onCreateTemplate
    
    render(<CloudStorageQuickActions {...propsWithoutTemplate} />)
    
    // Click the "Hinzufügen" dropdown button
    const addButton = screen.getByRole('button', { name: /Hinzufügen/ })
    await user.click(addButton)
    
    // Check if "Vorlage erstellen" option is NOT present
    expect(screen.queryByText('Vorlage erstellen')).not.toBeInTheDocument()
  })

  it('should display all expected options in the dropdown', async () => {
    const user = userEvent.setup()
    render(<CloudStorageQuickActions {...mockProps} />)
    
    // Click the "Hinzufügen" dropdown button
    const addButton = screen.getByRole('button', { name: /Hinzufügen/ })
    await user.click(addButton)
    
    // Check all expected options are present
    expect(screen.getByText('Dateien hochladen')).toBeInTheDocument()
    expect(screen.getByText('Ordner erstellen')).toBeInTheDocument()
    expect(screen.getByText('Datei erstellen')).toBeInTheDocument()
    expect(screen.getByText('Vorlage erstellen')).toBeInTheDocument()
  })
})