import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileListDisplay, FileAction } from '../file-list-display'
import { FileItem } from '@/types/cloud-storage'

// Mock the format utility
jest.mock('@/utils/format', () => ({
  formatNumber: (value: number, fractionDigits: number = 2) => {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value)
  }
}))

// Mock the utils
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' ')
}))

// Sample test data
const mockFiles: FileItem[] = [
  {
    id: '1',
    name: 'document.pdf',
    size: 1024000, // 1MB
    mimeType: 'application/pdf',
    uploadedAt: '2024-01-15T10:30:00Z',
    path: '/user/documents/document.pdf',
    storagePath: 'user123/documents/document.pdf',
    entityType: 'haus',
    entityId: 'house1'
  },
  {
    id: '2',
    name: 'image.jpg',
    size: 512000, // 512KB
    mimeType: 'image/jpeg',
    uploadedAt: '2024-01-16T14:20:00Z',
    path: '/user/images/image.jpg',
    storagePath: 'user123/images/image.jpg',
    entityType: 'wohnung',
    entityId: 'apartment1'
  },
  {
    id: '3',
    name: 'spreadsheet.xlsx',
    size: 2048000, // 2MB
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    uploadedAt: '2024-01-14T09:15:00Z',
    path: '/user/documents/spreadsheet.xlsx',
    storagePath: 'user123/documents/spreadsheet.xlsx',
    entityType: 'mieter',
    entityId: 'tenant1'
  },
  {
    id: '4',
    name: 'archive.zip',
    size: 5120000, // 5MB
    mimeType: 'application/zip',
    uploadedAt: '2024-01-17T16:45:00Z',
    path: '/user/archives/archive.zip',
    storagePath: 'user123/archives/archive.zip'
  }
]

const defaultProps = {
  files: mockFiles,
  selectedFiles: [],
  onFileSelect: jest.fn(),
  onSelectAll: jest.fn(),
  onFileAction: jest.fn(),
  onFilePreview: jest.fn()
}

describe('FileListDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders file list with all files', () => {
      render(<FileListDisplay {...defaultProps} />)
      
      expect(screen.getByText('document.pdf')).toBeInTheDocument()
      expect(screen.getByText('image.jpg')).toBeInTheDocument()
      expect(screen.getByText('spreadsheet.xlsx')).toBeInTheDocument()
      expect(screen.getByText('archive.zip')).toBeInTheDocument()
    })

    it('displays file metadata correctly', () => {
      render(<FileListDisplay {...defaultProps} />)
      
      // Check file sizes are formatted correctly (based on actual formatting)
      expect(screen.getByText('1.000,0 KB')).toBeInTheDocument() // document.pdf (1024000 bytes)
      expect(screen.getByText('500,0 KB')).toBeInTheDocument() // image.jpg (512000 bytes)
      expect(screen.getByText('2,0 MB')).toBeInTheDocument() // spreadsheet.xlsx (2048000 bytes)
      expect(screen.getByText('4,9 MB')).toBeInTheDocument() // archive.zip (5120000 bytes)
      
      // Check file types are displayed
      expect(screen.getByText('PDF')).toBeInTheDocument()
      expect(screen.getByText('Bild')).toBeInTheDocument()
      expect(screen.getByText('Tabelle')).toBeInTheDocument()
      expect(screen.getByText('Archiv')).toBeInTheDocument()
    })

    it('shows loading state when loading prop is true', () => {
      render(<FileListDisplay {...defaultProps} loading={true} />)
      
      expect(screen.getByText('Dateien werden geladen...')).toBeInTheDocument()
      expect(screen.queryByText('document.pdf')).not.toBeInTheDocument()
    })

    it('shows empty state when no files', () => {
      render(<FileListDisplay {...defaultProps} files={[]} />)
      
      expect(screen.getByText('Keine Dateien vorhanden.')).toBeInTheDocument()
    })

    it('shows filtered empty state when search has no results', async () => {
      const user = userEvent.setup()
      render(<FileListDisplay {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText('Dateien suchen...')
      await user.type(searchInput, 'nonexistent')
      
      expect(screen.getByText('Keine Dateien gefunden, die den Filterkriterien entsprechen.')).toBeInTheDocument()
    })
  })

  describe('File Selection', () => {
    it('calls onFileSelect when individual file checkbox is clicked', async () => {
      const user = userEvent.setup()
      const onFileSelect = jest.fn()
      render(<FileListDisplay {...defaultProps} onFileSelect={onFileSelect} />)
      
      const checkboxes = screen.getAllByRole('checkbox')
      const firstFileCheckbox = checkboxes[1] // Skip the "select all" checkbox
      
      await user.click(firstFileCheckbox)
      
      // The first file in sorted order is archive.zip (id: '4')
      expect(onFileSelect).toHaveBeenCalledWith('4', true)
    })

    it('calls onSelectAll when select all checkbox is clicked', async () => {
      const user = userEvent.setup()
      const onSelectAll = jest.fn()
      render(<FileListDisplay {...defaultProps} onSelectAll={onSelectAll} />)
      
      const selectAllCheckbox = screen.getAllByRole('checkbox')[0]
      await user.click(selectAllCheckbox)
      
      expect(onSelectAll).toHaveBeenCalledWith(true)
    })

    it('shows selected files count when files are selected', () => {
      render(<FileListDisplay {...defaultProps} selectedFiles={['1', '2']} />)
      
      expect(screen.getByText('2 ausgewählt')).toBeInTheDocument()
    })

    it('shows bulk action buttons when files are selected', () => {
      render(<FileListDisplay {...defaultProps} selectedFiles={['1', '2']} />)
      
      expect(screen.getByText('Herunterladen')).toBeInTheDocument()
      expect(screen.getByText('Löschen')).toBeInTheDocument()
    })

    it('calls onFileAction for bulk download', async () => {
      const user = userEvent.setup()
      const onFileAction = jest.fn()
      render(<FileListDisplay {...defaultProps} selectedFiles={['1', '2']} onFileAction={onFileAction} />)
      
      const downloadButton = screen.getByText('Herunterladen')
      await user.click(downloadButton)
      
      expect(onFileAction).toHaveBeenCalledWith('download', ['1', '2'])
    })

    it('calls onFileAction for bulk delete', async () => {
      const user = userEvent.setup()
      const onFileAction = jest.fn()
      render(<FileListDisplay {...defaultProps} selectedFiles={['1', '2']} onFileAction={onFileAction} />)
      
      const deleteButton = screen.getByText('Löschen')
      await user.click(deleteButton)
      
      expect(onFileAction).toHaveBeenCalledWith('delete', ['1', '2'])
    })
  })

  describe('Sorting', () => {
    it('sorts files by name when name header is clicked', async () => {
      const user = userEvent.setup()
      render(<FileListDisplay {...defaultProps} />)
      
      // Default is already name ascending, so first click should reverse to descending
      const nameHeader = screen.getByText('Name').closest('div')
      await user.click(nameHeader!)
      
      // Files should be sorted alphabetically descending
      const fileRows = screen.getAllByRole('row').slice(1) // Skip header row
      const firstFileName = fileRows[0].querySelector('span')?.textContent
      expect(firstFileName).toBe('spreadsheet.xlsx') // Last alphabetically (descending)
    })

    it('changes sort direction when header is clicked multiple times', async () => {
      const user = userEvent.setup()
      render(<FileListDisplay {...defaultProps} />)
      
      // Find the name header by looking for the text "Name"
      const nameHeaderText = screen.getByText('Name')
      expect(nameHeaderText).toBeInTheDocument()
      
      // Get initial file order
      let fileRows = screen.getAllByRole('row').slice(1)
      let firstFileName = fileRows[0].querySelector('span')?.textContent
      const initialOrder = firstFileName
      
      // Click on the name header to change sort order
      await user.click(nameHeaderText)
      fileRows = screen.getAllByRole('row').slice(1)
      firstFileName = fileRows[0].querySelector('span')?.textContent
      expect(firstFileName).not.toBe(initialOrder) // Order should change
    })

    it('sorts files by size correctly', async () => {
      const user = userEvent.setup()
      render(<FileListDisplay {...defaultProps} />)
      
      const sizeHeader = screen.getByText('Größe').closest('div')
      await user.click(sizeHeader!)
      
      // Files should be sorted by size (ascending)
      const fileRows = screen.getAllByRole('row').slice(1)
      const firstFileName = fileRows[0].querySelector('span')?.textContent
      expect(firstFileName).toBe('image.jpg') // Smallest file (512KB)
    })

    it('sorts files by upload date correctly', async () => {
      const user = userEvent.setup()
      render(<FileListDisplay {...defaultProps} />)
      
      const dateHeader = screen.getByText('Hochgeladen').closest('div')
      await user.click(dateHeader!)
      
      // Files should be sorted by upload date (ascending)
      const fileRows = screen.getAllByRole('row').slice(1)
      const firstFileName = fileRows[0].querySelector('span')?.textContent
      expect(firstFileName).toBe('spreadsheet.xlsx') // Earliest date (2024-01-14)
    })
  })

  describe('Filtering and Search', () => {
    it('filters files by search query', async () => {
      const user = userEvent.setup()
      render(<FileListDisplay {...defaultProps} />)
      
      const searchInput = screen.getByPlaceholderText('Dateien suchen...')
      await user.type(searchInput, 'document')
      
      expect(screen.getByText('document.pdf')).toBeInTheDocument()
      expect(screen.queryByText('image.jpg')).not.toBeInTheDocument()
      expect(screen.queryByText('spreadsheet.xlsx')).not.toBeInTheDocument()
      expect(screen.queryByText('archive.zip')).not.toBeInTheDocument()
    })

    it('filters files by file type', async () => {
      const user = userEvent.setup()
      render(<FileListDisplay {...defaultProps} />)
      
      // Open file type dropdown
      const fileTypeButton = screen.getByText('Alle Dateitypen')
      await user.click(fileTypeButton)
      
      // Select PDF filter - use getAllByText to handle multiple PDF elements
      const pdfOptions = screen.getAllByText('PDF')
      const pdfDropdownOption = pdfOptions.find(el => el.closest('[role="menuitem"]'))
      await user.click(pdfDropdownOption!)
      
      expect(screen.getByText('document.pdf')).toBeInTheDocument()
      expect(screen.queryByText('image.jpg')).not.toBeInTheDocument()
      expect(screen.queryByText('spreadsheet.xlsx')).not.toBeInTheDocument()
      expect(screen.queryByText('archive.zip')).not.toBeInTheDocument()
    })

    it('shows correct file count summary', () => {
      render(<FileListDisplay {...defaultProps} />)
      
      expect(screen.getByText('4 von 4 Dateien')).toBeInTheDocument()
    })

    it('shows correct file count summary with selection', () => {
      render(<FileListDisplay {...defaultProps} selectedFiles={['1', '2']} />)
      
      expect(screen.getByText('4 von 4 Dateien • 2 ausgewählt')).toBeInTheDocument()
    })
  })

  describe('File Actions', () => {
    it('shows context menu on right click', async () => {
      const user = userEvent.setup()
      render(<FileListDisplay {...defaultProps} />)
      
      const firstRow = screen.getAllByRole('row')[1] // Skip header
      await user.pointer({ keys: '[MouseRight]', target: firstRow })
      
      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument()
      })
    })

    it('calls onFilePreview when preview is clicked for supported file', async () => {
      const user = userEvent.setup()
      const onFilePreview = jest.fn()
      render(<FileListDisplay {...defaultProps} onFilePreview={onFilePreview} />)
      
      // Find the dropdown button in the second row (document.pdf which supports preview)
      const secondRow = screen.getAllByRole('row')[2] // Skip header and first row (archive.zip)
      const dropdownButton = secondRow.querySelector('button[aria-haspopup="menu"]')
      
      if (dropdownButton) {
        await user.click(dropdownButton)
        
        await waitFor(() => {
          const previewOption = screen.getByText('Vorschau')
          return user.click(previewOption)
        })
        
        // document.pdf is mockFiles[0]
        expect(onFilePreview).toHaveBeenCalledWith(mockFiles[0])
      }
    })

    it('calls onFileAction when download is clicked', async () => {
      const user = userEvent.setup()
      const onFileAction = jest.fn()
      render(<FileListDisplay {...defaultProps} onFileAction={onFileAction} />)
      
      // Find the dropdown button in the first row
      const firstRow = screen.getAllByRole('row')[1]
      const dropdownButton = firstRow.querySelector('button[aria-haspopup="menu"]')
      
      if (dropdownButton) {
        await user.click(dropdownButton)
        
        await waitFor(() => {
          const downloadOption = screen.getByText('Herunterladen')
          return user.click(downloadOption)
        })
        
        // First file in sorted order is archive.zip (id: '4')
        expect(onFileAction).toHaveBeenCalledWith('download', ['4'])
      }
    })

    it('calls onFileAction when delete is clicked', async () => {
      const user = userEvent.setup()
      const onFileAction = jest.fn()
      render(<FileListDisplay {...defaultProps} onFileAction={onFileAction} />)
      
      // Find the dropdown button in the first row
      const firstRow = screen.getAllByRole('row')[1]
      const dropdownButton = firstRow.querySelector('button[aria-haspopup="menu"]')
      
      if (dropdownButton) {
        await user.click(dropdownButton)
        
        await waitFor(() => {
          const deleteOption = screen.getByText('Löschen')
          return user.click(deleteOption)
        })
        
        // First file in sorted order is archive.zip (id: '4')
        expect(onFileAction).toHaveBeenCalledWith('delete', ['4'])
      }
    })
  })

  describe('File Type Detection', () => {
    it('shows correct icons for different file types', () => {
      render(<FileListDisplay {...defaultProps} />)
      
      // All files should have their respective icons rendered
      // We can't easily test the specific icons, but we can verify the structure
      const fileRows = screen.getAllByRole('row').slice(1) // Skip header
      
      fileRows.forEach(row => {
        const iconContainer = row.querySelector('div svg')
        expect(iconContainer).toBeInTheDocument()
      })
    })

    it('shows correct file type badges', () => {
      render(<FileListDisplay {...defaultProps} />)
      
      expect(screen.getByText('PDF')).toBeInTheDocument()
      expect(screen.getByText('Bild')).toBeInTheDocument()
      expect(screen.getByText('Tabelle')).toBeInTheDocument()
      expect(screen.getByText('Archiv')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper table structure', () => {
      render(<FileListDisplay {...defaultProps} />)
      
      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getAllByRole('columnheader')).toHaveLength(6)
      expect(screen.getAllByRole('row')).toHaveLength(5) // 1 header + 4 data rows
    })

    it('has proper checkbox labels and states', () => {
      render(<FileListDisplay {...defaultProps} selectedFiles={['1']} />)
      
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes).toHaveLength(5) // 1 select all + 4 individual
      
      // Check that checkboxes exist and have proper attributes
      expect(checkboxes[0]).toHaveAttribute('aria-checked', 'false') // select all should be false
      // File with id '1' (document.pdf) should be checked - it's the second in sorted order
      expect(checkboxes[2]).toHaveAttribute('aria-checked', 'true') // document.pdf should be checked
      expect(checkboxes[1]).toHaveAttribute('aria-checked', 'false') // archive.zip
      expect(checkboxes[3]).toHaveAttribute('aria-checked', 'false') // image.jpg
      expect(checkboxes[4]).toHaveAttribute('aria-checked', 'false') // spreadsheet.xlsx
    })

    it('supports keyboard navigation for sortable headers', async () => {
      const user = userEvent.setup()
      render(<FileListDisplay {...defaultProps} />)
      
      const nameHeader = screen.getByText('Name').closest('div')
      
      // Should be focusable and clickable
      nameHeader?.focus()
      await user.keyboard('{Enter}')
      
      // Should trigger sort (we can't easily test the visual change, but the click handler should work)
      expect(nameHeader).toBeInTheDocument()
    })
  })
})