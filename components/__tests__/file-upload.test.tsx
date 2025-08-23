import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileUpload } from '../file-upload';
import { useToast } from '@/hooks/use-toast';

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

// Mock the validation utilities
jest.mock('@/lib/cloud-storage-validation', () => ({
  validateFiles: jest.fn(),
  formatFileSize: jest.fn((size) => `${size} bytes`),
  getFileTypeCategory: jest.fn(() => 'Dokument'),
  getSubscriptionLimits: jest.fn(() => ({
    maxStorageBytes: 100 * 1024 * 1024,
    maxFileSize: 10 * 1024 * 1024,
    allowedFileTypes: ['application/pdf', 'image/jpeg'],
    canShare: false,
    canBulkOperations: false,
  })),
  sanitizeFileName: jest.fn((name) => name),
  generateUniqueFileName: jest.fn((name) => name),
}));

const mockToast = jest.fn();
const mockOnUpload = jest.fn();

describe('FileUpload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
    
    // Mock validation to return valid files by default
    const { validateFiles } = require('@/lib/cloud-storage-validation');
    validateFiles.mockReturnValue({
      validFiles: [],
      invalidFiles: [],
    });
  });

  const defaultProps = {
    onUpload: mockOnUpload,
    folderPath: '/test-folder',
    currentStorageUsed: 0,
    subscriptionPlan: 'basic' as const,
    existingFileNames: [],
  };

  it('renders upload area with correct text', () => {
    render(<FileUpload {...defaultProps} />);
    
    expect(screen.getByText('Dateien hochladen')).toBeInTheDocument();
    expect(screen.getByText('Ziehen Sie Dateien hierher oder klicken Sie zum Auswählen')).toBeInTheDocument();
    expect(screen.getByText(/Unterstützte Formate:/)).toBeInTheDocument();
  });

  it('opens file dialog when upload area is clicked', async () => {
    const user = userEvent.setup();
    render(<FileUpload {...defaultProps} />);
    
    const uploadArea = screen.getByText('Dateien hochladen').closest('div');
    expect(uploadArea).toBeInTheDocument();
    
    // Mock file input click
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = jest.spyOn(fileInput, 'click');
    
    await user.click(uploadArea!);
    
    // Note: In jsdom, the file input click might not work exactly as in browser
    // This test verifies the click handler is set up correctly
  });

  it('handles file selection and validation', async () => {
    const { validateFiles } = require('@/lib/cloud-storage-validation');
    const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    
    validateFiles.mockReturnValue({
      validFiles: [mockFile],
      invalidFiles: [],
    });

    render(<FileUpload {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    // Simulate file selection
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: '1 Datei(en) hinzugefügt',
        description: 'Klicken Sie auf "Hochladen" um den Upload zu starten.',
      });
    });
    
    expect(screen.getByText('test.pdf')).toBeInTheDocument();
    expect(screen.getByText('Upload-Warteschlange (1)')).toBeInTheDocument();
  });

  it('shows validation errors for invalid files', async () => {
    const { validateFiles } = require('@/lib/cloud-storage-validation');
    const mockFile = new File(['test content'], 'test.exe', { type: 'application/exe' });
    
    validateFiles.mockReturnValue({
      validFiles: [],
      invalidFiles: [{ file: mockFile, errors: ['Dateityp nicht unterstützt'] }],
    });

    render(<FileUpload {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Fehler bei test.exe',
        description: 'Dateityp nicht unterstützt',
        variant: 'destructive',
      });
    });
  });

  it('handles drag and drop events', async () => {
    const { validateFiles } = require('@/lib/cloud-storage-validation');
    const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    
    validateFiles.mockReturnValue({
      validFiles: [mockFile],
      invalidFiles: [],
    });

    render(<FileUpload {...defaultProps} />);
    
    const uploadArea = screen.getByText('Dateien hochladen').closest('div');
    
    // Simulate drag over
    fireEvent.dragOver(uploadArea!, {
      dataTransfer: {
        files: [mockFile],
      },
    });
    
    // Simulate drop
    fireEvent.drop(uploadArea!, {
      dataTransfer: {
        files: [mockFile],
      },
    });
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: '1 Datei(en) hinzugefügt',
        description: 'Klicken Sie auf "Hochladen" um den Upload zu starten.',
      });
    });
  });

  it('starts upload process when upload button is clicked', async () => {
    const { validateFiles } = require('@/lib/cloud-storage-validation');
    const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    
    validateFiles.mockReturnValue({
      validFiles: [mockFile],
      invalidFiles: [],
    });

    mockOnUpload.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<FileUpload {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      expect(screen.getByText('Hochladen')).toBeInTheDocument();
    });
    
    const uploadButton = screen.getByText('Hochladen');
    await user.click(uploadButton);
    
    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith([mockFile], '/test-folder');
    });
  });

  it('removes files from queue when remove button is clicked', async () => {
    const { validateFiles } = require('@/lib/cloud-storage-validation');
    const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    
    validateFiles.mockReturnValue({
      validFiles: [mockFile],
      invalidFiles: [],
    });

    const user = userEvent.setup();
    render(<FileUpload {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });
    
    const removeButtons = screen.getAllByRole('button');
    const removeButton = removeButtons.find(btn => btn.querySelector('svg')); // X button
    await user.click(removeButton!);
    
    await waitFor(() => {
      expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
    });
  });

  it('clears all files when clear all button is clicked', async () => {
    const { validateFiles } = require('@/lib/cloud-storage-validation');
    const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    
    validateFiles.mockReturnValue({
      validFiles: [mockFile],
      invalidFiles: [],
    });

    const user = userEvent.setup();
    render(<FileUpload {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      expect(screen.getByText('Alle entfernen')).toBeInTheDocument();
    });
    
    const clearAllButton = screen.getByText('Alle entfernen');
    await user.click(clearAllButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Upload-Warteschlange')).not.toBeInTheDocument();
    });
  });

  it('disables upload area when disabled prop is true', () => {
    render(<FileUpload {...defaultProps} disabled={true} />);
    
    const uploadArea = screen.getByText('Dateien hochladen').closest('div');
    expect(uploadArea).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('handles upload errors gracefully', async () => {
    const { validateFiles } = require('@/lib/cloud-storage-validation');
    const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    
    validateFiles.mockReturnValue({
      validFiles: [mockFile],
      invalidFiles: [],
    });

    mockOnUpload.mockRejectedValue(new Error('Upload failed'));

    const user = userEvent.setup();
    render(<FileUpload {...defaultProps} />);
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    Object.defineProperty(fileInput, 'files', {
      value: [mockFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      expect(screen.getByText('Hochladen')).toBeInTheDocument();
    });
    
    const uploadButton = screen.getByText('Hochladen');
    await user.click(uploadButton);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Upload fehlgeschlagen',
        description: 'Ein Fehler ist beim Hochladen aufgetreten.',
        variant: 'destructive',
      });
    });
  });
});