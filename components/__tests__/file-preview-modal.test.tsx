import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilePreviewModal } from '../file-preview-modal';
import { FileItem, FolderNode, SubscriptionLimits } from '@/types/cloud-storage';
import { toast } from '@/hooks/use-toast';

// Mock the toast hook
jest.mock('@/hooks/use-toast');
const mockToast = toast as jest.MockedFunction<typeof toast>;

// Mock the format utility
jest.mock('@/utils/format', () => ({
  formatNumber: (num: number, decimals?: number) => {
    return decimals ? num.toFixed(decimals) : num.toString();
  }
}));

// Mock the modal store
jest.mock('@/hooks/use-modal-store', () => ({
  useModalStore: () => ({
    // Mock implementation if needed
  })
}));

describe('FilePreviewModal', () => {
  const mockFile: FileItem = {
    id: '1',
    name: 'test-document.pdf',
    size: 1024000, // 1MB
    mimeType: 'application/pdf',
    uploadedAt: '2024-01-15T10:30:00Z',
    path: '/test/path',
    url: 'https://example.com/test-document.pdf',
    storagePath: '/storage/test-document.pdf'
  };

  const mockImageFile: FileItem = {
    id: '2',
    name: 'test-image.jpg',
    size: 512000, // 512KB
    mimeType: 'image/jpeg',
    uploadedAt: '2024-01-15T11:00:00Z',
    path: '/test/path',
    url: 'https://example.com/test-image.jpg',
    storagePath: '/storage/test-image.jpg'
  };

  const mockFolders: FolderNode[] = [
    {
      id: '1',
      name: 'Häuser',
      path: '/haeuser',
      type: 'category',
      children: [],
      fileCount: 0
    },
    {
      id: '2',
      name: 'Wohnungen',
      path: '/wohnungen',
      type: 'category',
      children: [],
      fileCount: 0
    }
  ];

  const mockSubscriptionLimits: SubscriptionLimits = {
    maxStorageBytes: 1024 * 1024 * 1024, // 1GB
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    canShare: true,
    canBulkOperations: true
  };

  const mockBasicSubscriptionLimits: SubscriptionLimits = {
    maxStorageBytes: 100 * 1024 * 1024, // 100MB
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    canShare: false,
    canBulkOperations: false
  };

  const mockOnFileAction = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnFileAction.mockResolvedValue(undefined);
  });

  it('renders file preview modal with PDF file', () => {
    render(
      <FilePreviewModal
        file={mockFile}
        isOpen={true}
        onClose={mockOnClose}
        onFileAction={mockOnFileAction}
        availableFolders={mockFolders}
        subscriptionLimits={mockSubscriptionLimits}
      />
    );

    expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('1.000,0 KB')).toBeInTheDocument();
    expect(screen.getByText('Herunterladen')).toBeInTheDocument();
    expect(screen.getByText('Umbenennen')).toBeInTheDocument();
    expect(screen.getByText('Verschieben')).toBeInTheDocument();
    expect(screen.getByText('Teilen')).toBeInTheDocument();
    expect(screen.getByText('Löschen')).toBeInTheDocument();
  });

  it('renders file preview modal with image file', () => {
    render(
      <FilePreviewModal
        file={mockImageFile}
        isOpen={true}
        onClose={mockOnClose}
        onFileAction={mockOnFileAction}
        availableFolders={mockFolders}
        subscriptionLimits={mockSubscriptionLimits}
      />
    );

    expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
    expect(screen.getByText('Bild')).toBeInTheDocument();
    expect(screen.getByText('500,0 KB')).toBeInTheDocument();
  });

  it('disables share button for basic subscription', () => {
    render(
      <FilePreviewModal
        file={mockFile}
        isOpen={true}
        onClose={mockOnClose}
        onFileAction={mockOnFileAction}
        availableFolders={mockFolders}
        subscriptionLimits={mockBasicSubscriptionLimits}
      />
    );

    const shareButton = screen.getByRole('button', { name: /teilen/i });
    expect(shareButton).toBeDisabled();
    expect(screen.getByText('Premium Feature')).toBeInTheDocument();
    expect(screen.getByText('Datei-Freigabe ist nur für Premium-Nutzer verfügbar.')).toBeInTheDocument();
  });

  it('handles download action', async () => {
    const user = userEvent.setup();
    
    render(
      <FilePreviewModal
        file={mockFile}
        isOpen={true}
        onClose={mockOnClose}
        onFileAction={mockOnFileAction}
        availableFolders={mockFolders}
        subscriptionLimits={mockSubscriptionLimits}
      />
    );

    const downloadButton = screen.getByRole('button', { name: /herunterladen/i });
    await user.click(downloadButton);

    expect(mockOnFileAction).toHaveBeenCalledWith('download', '1');
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Download gestartet",
        description: "test-document.pdf wird heruntergeladen.",
      });
    });
  });

  it('handles rename action', async () => {
    const user = userEvent.setup();
    
    render(
      <FilePreviewModal
        file={mockFile}
        isOpen={true}
        onClose={mockOnClose}
        onFileAction={mockOnFileAction}
        availableFolders={mockFolders}
        subscriptionLimits={mockSubscriptionLimits}
      />
    );

    const renameButton = screen.getByRole('button', { name: /umbenennen/i });
    await user.click(renameButton);

    // Rename dialog should open
    expect(screen.getByText('Datei umbenennen')).toBeInTheDocument();
    
    const fileNameInput = screen.getByLabelText('Dateiname');
    await user.clear(fileNameInput);
    await user.type(fileNameInput, 'new-name.pdf');

    const confirmButton = screen.getByRole('button', { name: /umbenennen/i });
    await user.click(confirmButton);

    expect(mockOnFileAction).toHaveBeenCalledWith('rename', '1', { newName: 'new-name.pdf' });
  });

  it('handles move action', async () => {
    const user = userEvent.setup();
    
    render(
      <FilePreviewModal
        file={mockFile}
        isOpen={true}
        onClose={mockOnClose}
        onFileAction={mockOnFileAction}
        availableFolders={mockFolders}
        subscriptionLimits={mockSubscriptionLimits}
      />
    );

    const moveButton = screen.getByRole('button', { name: /verschieben/i });
    await user.click(moveButton);

    // Move dialog should open
    expect(screen.getByText('Datei verschieben')).toBeInTheDocument();
    
    // Select a folder
    const folderSelect = screen.getByRole('combobox');
    await user.click(folderSelect);
    
    const folderOption = screen.getByText('Häuser');
    await user.click(folderOption);

    const confirmButton = screen.getByRole('button', { name: /verschieben/i });
    await user.click(confirmButton);

    expect(mockOnFileAction).toHaveBeenCalledWith('move', '1', { newFolderPath: '/haeuser' });
  });

  it('handles delete action', async () => {
    const user = userEvent.setup();
    
    render(
      <FilePreviewModal
        file={mockFile}
        isOpen={true}
        onClose={mockOnClose}
        onFileAction={mockOnFileAction}
        availableFolders={mockFolders}
        subscriptionLimits={mockSubscriptionLimits}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /löschen/i });
    await user.click(deleteButton);

    // Delete dialog should open
    expect(screen.getByText('Datei löschen')).toBeInTheDocument();
    expect(screen.getByText(/sind sie sicher.*test-document\.pdf.*löschen/i)).toBeInTheDocument();

    const confirmButton = screen.getByRole('button', { name: /löschen/i });
    await user.click(confirmButton);

    expect(mockOnFileAction).toHaveBeenCalledWith('delete', '1');
  });

  it('handles share action for premium users', async () => {
    const user = userEvent.setup();
    mockOnFileAction.mockResolvedValue({ shareUrl: 'https://example.com/share/abc123' });
    
    render(
      <FilePreviewModal
        file={mockFile}
        isOpen={true}
        onClose={mockOnClose}
        onFileAction={mockOnFileAction}
        availableFolders={mockFolders}
        subscriptionLimits={mockSubscriptionLimits}
      />
    );

    const shareButton = screen.getByRole('button', { name: /teilen/i });
    await user.click(shareButton);

    // Wait for share dialog to open
    await waitFor(() => {
      expect(screen.getByText('Datei teilen')).toBeInTheDocument();
    });
    
    // Check that the share dialog has the expected elements
    expect(screen.getByText('Erstellen Sie einen Freigabe-Link für diese Datei.')).toBeInTheDocument();
    expect(screen.getByText('Gültigkeitsdauer')).toBeInTheDocument();
    
    const createLinkButton = screen.getByRole('button', { name: /link erstellen/i });
    await user.click(createLinkButton);

    expect(mockOnFileAction).toHaveBeenCalledWith('share', '1', { expiry: '24h' });
  });

  it('handles errors gracefully', async () => {
    const user = userEvent.setup();
    mockOnFileAction.mockRejectedValue(new Error('Network error'));
    
    render(
      <FilePreviewModal
        file={mockFile}
        isOpen={true}
        onClose={mockOnClose}
        onFileAction={mockOnFileAction}
        availableFolders={mockFolders}
        subscriptionLimits={mockSubscriptionLimits}
      />
    );

    const downloadButton = screen.getByRole('button', { name: /herunterladen/i });
    await user.click(downloadButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "Download fehlgeschlagen",
        description: "Die Datei konnte nicht heruntergeladen werden.",
        variant: "destructive",
      });
    });
  });

  it('closes modal when close button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <FilePreviewModal
        file={mockFile}
        isOpen={true}
        onClose={mockOnClose}
        onFileAction={mockOnFileAction}
        availableFolders={mockFolders}
        subscriptionLimits={mockSubscriptionLimits}
      />
    );

    const closeButton = screen.getByRole('button', { name: '' }); // X button has no text
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not render when file is null', () => {
    render(
      <FilePreviewModal
        file={null}
        isOpen={true}
        onClose={mockOnClose}
        onFileAction={mockOnFileAction}
        availableFolders={mockFolders}
        subscriptionLimits={mockSubscriptionLimits}
      />
    );

    expect(screen.queryByText('Herunterladen')).not.toBeInTheDocument();
  });

  it('shows no preview message for unsupported file types', () => {
    const unsupportedFile: FileItem = {
      ...mockFile,
      name: 'document.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };

    render(
      <FilePreviewModal
        file={unsupportedFile}
        isOpen={true}
        onClose={mockOnClose}
        onFileAction={mockOnFileAction}
        availableFolders={mockFolders}
        subscriptionLimits={mockSubscriptionLimits}
      />
    );

    expect(screen.getByText('Keine Vorschau verfügbar für diesen Dateityp')).toBeInTheDocument();
  });
});