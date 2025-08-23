import React from 'react'
import { render, screen } from '@testing-library/react'
import { CloudStoragePage } from './client-wrapper'

// Mock the dependencies
jest.mock('@/components/folder-tree-navigation', () => ({
  FolderTreeNavigation: ({ folders, onFolderSelect }: any) => (
    <div data-testid="folder-tree">
      {folders.map((folder: any) => (
        <div key={folder.id} onClick={() => onFolderSelect(folder)}>
          {folder.name}
        </div>
      ))}
    </div>
  )
}))

jest.mock('@/components/file-list-display', () => ({
  FileListDisplay: ({ files }: any) => (
    <div data-testid="file-list">
      {files.map((file: any) => (
        <div key={file.id}>{file.name}</div>
      ))}
    </div>
  )
}))

jest.mock('@/components/file-upload', () => ({
  FileUpload: ({ onUpload, folderPath }: any) => (
    <div data-testid="file-upload">Upload to {folderPath}</div>
  )
}))

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}))

describe('CloudStoragePage', () => {
  it('renders the main cloud storage interface', () => {
    render(<CloudStoragePage />)
    
    // Check for main elements
    expect(screen.getByText('Cloud Storage')).toBeInTheDocument()
    expect(screen.getByTestId('folder-tree')).toBeInTheDocument()
    expect(screen.getByText('Willkommen bei Cloud Storage')).toBeInTheDocument()
  })

  it('shows folder structure with mock data', () => {
    render(<CloudStoragePage />)
    
    // Check for folder categories
    expect(screen.getByText('Häuser')).toBeInTheDocument()
    expect(screen.getByText('Wohnungen')).toBeInTheDocument()
    expect(screen.getByText('Mieter')).toBeInTheDocument()
    expect(screen.getByText('Sonstiges')).toBeInTheDocument()
  })

  it('displays storage quota information', () => {
    render(<CloudStoragePage />)
    
    // Check for storage information
    expect(screen.getByText(/von.*verwendet/)).toBeInTheDocument()
    expect(screen.getAllByText('10%')).toHaveLength(2) // Desktop and mobile versions
  })
})