import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { FolderTreeNavigation } from '../folder-tree-navigation'
import { FolderNode } from '@/types/cloud-storage'

// Mock the lucide-react icons
jest.mock('lucide-react', () => ({
  ChevronDown: ({ className }: { className?: string }) => <div className={className} data-testid="chevron-down" />,
  ChevronRight: ({ className }: { className?: string }) => <div className={className} data-testid="chevron-right" />,
  Folder: ({ className }: { className?: string }) => <div className={className} data-testid="folder" />,
  FolderOpen: ({ className }: { className?: string }) => <div className={className} data-testid="folder-open" />,
  Home: ({ className }: { className?: string }) => <div className={className} data-testid="home" />,
  Building: ({ className }: { className?: string }) => <div className={className} data-testid="building" />,
  User: ({ className }: { className?: string }) => <div className={className} data-testid="user" />,
  Plus: ({ className }: { className?: string }) => <div className={className} data-testid="plus" />,
  Edit: ({ className }: { className?: string }) => <div className={className} data-testid="edit" />,
  Trash2: ({ className }: { className?: string }) => <div className={className} data-testid="trash2" />,
  FolderPlus: ({ className }: { className?: string }) => <div className={className} data-testid="folder-plus" />,
}))

const mockFolders: FolderNode[] = [
  {
    id: '1',
    name: 'Häuser',
    path: '/haeuser',
    type: 'category',
    children: [
      {
        id: '1-1',
        name: 'Haus Berlin',
        path: '/haeuser/haus-berlin',
        type: 'entity',
        entityType: 'haus',
        entityId: 'haus-1',
        children: [],
        fileCount: 3,
      },
    ],
    fileCount: 3,
  },
  {
    id: '2',
    name: 'Wohnungen',
    path: '/wohnungen',
    type: 'category',
    children: [
      {
        id: '2-1',
        name: 'Wohnung 1A',
        path: '/wohnungen/wohnung-1a',
        type: 'entity',
        entityType: 'wohnung',
        entityId: 'wohnung-1',
        children: [],
        fileCount: 2,
      },
    ],
    fileCount: 2,
  },
  {
    id: '3',
    name: 'Mieter',
    path: '/mieter',
    type: 'category',
    children: [
      {
        id: '3-1',
        name: 'Max Mustermann',
        path: '/mieter/max-mustermann',
        type: 'entity',
        entityType: 'mieter',
        entityId: 'mieter-1',
        children: [],
        fileCount: 1,
      },
    ],
    fileCount: 1,
  },
  {
    id: '4',
    name: 'Custom Folder',
    path: '/custom-folder',
    type: 'custom',
    children: [],
    fileCount: 0,
  },
]

describe('FolderTreeNavigation', () => {
  const mockOnFolderSelect = jest.fn()
  const mockOnCreateFolder = jest.fn()
  const mockOnRenameFolder = jest.fn()
  const mockOnDeleteFolder = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders folder tree with correct structure', () => {
    render(
      <FolderTreeNavigation
        folders={mockFolders}
        onFolderSelect={mockOnFolderSelect}
        onCreateFolder={mockOnCreateFolder}
        onRenameFolder={mockOnRenameFolder}
        onDeleteFolder={mockOnDeleteFolder}
      />
    )

    expect(screen.getByText('Ordner')).toBeInTheDocument()
    expect(screen.getByText('Häuser')).toBeInTheDocument()
    expect(screen.getByText('Wohnungen')).toBeInTheDocument()
    expect(screen.getByText('Mieter')).toBeInTheDocument()
    expect(screen.getByText('Custom Folder')).toBeInTheDocument()
  })

  it('displays correct icons for different folder types', () => {
    render(
      <FolderTreeNavigation
        folders={mockFolders}
        onFolderSelect={mockOnFolderSelect}
      />
    )

    // Category folders should show appropriate icons
    expect(screen.getAllByTestId('home')).toHaveLength(1) // Häuser category
    expect(screen.getAllByTestId('building')).toHaveLength(1) // Wohnungen category
    expect(screen.getAllByTestId('user')).toHaveLength(1) // Mieter category
    expect(screen.getAllByTestId('folder')).toHaveLength(1) // Custom folder
  })

  it('displays file counts for folders with files', () => {
    render(
      <FolderTreeNavigation
        folders={mockFolders}
        onFolderSelect={mockOnFolderSelect}
      />
    )

    expect(screen.getByText('3')).toBeInTheDocument() // Häuser file count
    expect(screen.getByText('2')).toBeInTheDocument() // Wohnungen file count
    expect(screen.getByText('1')).toBeInTheDocument() // Mieter file count
  })

  it('expands and collapses folders when clicked', () => {
    render(
      <FolderTreeNavigation
        folders={mockFolders}
        onFolderSelect={mockOnFolderSelect}
      />
    )

    // Initially, child folders should not be visible
    expect(screen.queryByText('Haus Berlin')).not.toBeInTheDocument()

    // Click on Häuser folder to expand
    fireEvent.click(screen.getByText('Häuser'))

    // Child folder should now be visible
    expect(screen.getByText('Haus Berlin')).toBeInTheDocument()
  })

  it('calls onFolderSelect when folder is clicked', () => {
    render(
      <FolderTreeNavigation
        folders={mockFolders}
        onFolderSelect={mockOnFolderSelect}
      />
    )

    fireEvent.click(screen.getByText('Häuser'))

    expect(mockOnFolderSelect).toHaveBeenCalledWith(mockFolders[0])
  })

  it('highlights selected folder', () => {
    render(
      <FolderTreeNavigation
        folders={mockFolders}
        selectedFolderPath="/haeuser"
        onFolderSelect={mockOnFolderSelect}
      />
    )

    // Find the clickable folder div that contains the text
    const folderText = screen.getByText('Häuser')
    const selectedFolder = folderText.closest('[role="button"], .cursor-pointer')
    expect(selectedFolder).toHaveClass('bg-accent')
  })

  it('shows context menu on right click', () => {
    render(
      <FolderTreeNavigation
        folders={mockFolders}
        onFolderSelect={mockOnFolderSelect}
        onCreateFolder={mockOnCreateFolder}
        onRenameFolder={mockOnRenameFolder}
        onDeleteFolder={mockOnDeleteFolder}
      />
    )

    // Right-click on custom folder
    fireEvent.contextMenu(screen.getByText('Custom Folder'))

    // Context menu items should be visible
    expect(screen.getByText('Neuer Ordner')).toBeInTheDocument()
    expect(screen.getByText('Umbenennen')).toBeInTheDocument()
    expect(screen.getByText('Löschen')).toBeInTheDocument()
  })

  it('shows limited context menu for system folders', () => {
    render(
      <FolderTreeNavigation
        folders={mockFolders}
        onFolderSelect={mockOnFolderSelect}
        onCreateFolder={mockOnCreateFolder}
        onRenameFolder={mockOnRenameFolder}
        onDeleteFolder={mockOnDeleteFolder}
      />
    )

    // Right-click on category folder
    fireEvent.contextMenu(screen.getByText('Häuser'))

    // Only "Neuer Ordner" should be available for category folders
    expect(screen.getByText('Neuer Ordner')).toBeInTheDocument()
    expect(screen.queryByText('Umbenennen')).not.toBeInTheDocument()
    expect(screen.queryByText('Löschen')).not.toBeInTheDocument()
  })

  it('calls context menu actions correctly', () => {
    render(
      <FolderTreeNavigation
        folders={mockFolders}
        onFolderSelect={mockOnFolderSelect}
        onCreateFolder={mockOnCreateFolder}
        onRenameFolder={mockOnRenameFolder}
        onDeleteFolder={mockOnDeleteFolder}
      />
    )

    // Right-click on custom folder
    fireEvent.contextMenu(screen.getByText('Custom Folder'))

    // Click on rename
    fireEvent.click(screen.getByText('Umbenennen'))
    expect(mockOnRenameFolder).toHaveBeenCalledWith('/custom-folder', 'Custom Folder')

    // Right-click again and click delete
    fireEvent.contextMenu(screen.getByText('Custom Folder'))
    fireEvent.click(screen.getByText('Löschen'))
    expect(mockOnDeleteFolder).toHaveBeenCalledWith('/custom-folder', 'Custom Folder')
  })

  it('shows create folder button in header', () => {
    render(
      <FolderTreeNavigation
        folders={mockFolders}
        onFolderSelect={mockOnFolderSelect}
        onCreateFolder={mockOnCreateFolder}
      />
    )

    const createButton = screen.getByTestId('plus').closest('button')
    expect(createButton).toBeInTheDocument()

    fireEvent.click(createButton!)
    expect(mockOnCreateFolder).toHaveBeenCalledWith('/')
  })

  it('shows empty state when no folders are provided', () => {
    render(
      <FolderTreeNavigation
        folders={[]}
        onFolderSelect={mockOnFolderSelect}
      />
    )

    expect(screen.getByText('Keine Ordner vorhanden')).toBeInTheDocument()
  })

  it('shows entity icons for entity folders when expanded', () => {
    render(
      <FolderTreeNavigation
        folders={mockFolders}
        onFolderSelect={mockOnFolderSelect}
      />
    )

    // Expand Häuser folder
    fireEvent.click(screen.getByText('Häuser'))

    // Entity folder should show home icon
    expect(screen.getAllByTestId('home')).toHaveLength(2) // Category + entity
  })

  it('handles chevron clicks independently from folder clicks', () => {
    render(
      <FolderTreeNavigation
        folders={mockFolders}
        onFolderSelect={mockOnFolderSelect}
      />
    )

    // Click on chevron button specifically
    const chevronButton = screen.getAllByTestId('chevron-right')[0].closest('button')
    fireEvent.click(chevronButton!)

    // Should expand but not call onFolderSelect
    expect(screen.getByText('Haus Berlin')).toBeInTheDocument()
    expect(mockOnFolderSelect).not.toHaveBeenCalled()
  })
})