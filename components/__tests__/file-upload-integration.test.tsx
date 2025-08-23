import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileUpload } from '../file-upload';
import { useToast } from '@/hooks/use-toast';

// Mock only the toast hook, use real validation utilities
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

const mockToast = jest.fn();
const mockOnUpload = jest.fn();

describe('FileUpload Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });
    mockOnUpload.mockResolvedValue(undefined);
  });

  const defaultProps = {
    onUpload: mockOnUpload,
    folderPath: '/test-folder',
    currentStorageUsed: 0,
    subscriptionPlan: 'basic' as const,
    existingFileNames: [],
  };

  it('integrates with real validation utilities for valid PDF file', async () => {
    const user = userEvent.setup();
    render(<FileUpload {...defaultProps} />);
    
    // Create a valid PDF file
    const pdfFile = new File(['%PDF-1.4 test content'], 'test-document.pdf', { 
      type: 'application/pdf' 
    });
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    Object.defineProperty(fileInput, 'files', {
      value: [pdfFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    // Should show success message for valid file
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: '1 Datei(en) hinzugefügt',
        description: 'Klicken Sie auf "Hochladen" um den Upload zu starten.',
      });
    });
    
    // Should show file in queue
    expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
    expect(screen.getByText('Upload-Warteschlange (1)')).toBeInTheDocument();
  });

  it('integrates with real validation utilities for oversized file', async () => {
    render(<FileUpload {...defaultProps} />);
    
    // Create a file that's too large (15MB for basic plan with 10MB limit)
    const largeFile = new File(
      [new ArrayBuffer(15 * 1024 * 1024)], 
      'large-file.pdf', 
      { type: 'application/pdf' }
    );
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    Object.defineProperty(fileInput, 'files', {
      value: [largeFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    // Should show error message for oversized file
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Fehler bei large-file.pdf',
          variant: 'destructive',
        })
      );
    });
    
    // Should not show file in queue
    expect(screen.queryByText('large-file.pdf')).not.toBeInTheDocument();
    expect(screen.queryByText('Upload-Warteschlange')).not.toBeInTheDocument();
  });

  it('integrates with real validation utilities for invalid file type', async () => {
    render(<FileUpload {...defaultProps} />);
    
    // Create an invalid file type
    const invalidFile = new File(['test content'], 'test.exe', { 
      type: 'application/x-executable' 
    });
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    Object.defineProperty(fileInput, 'files', {
      value: [invalidFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    // Should show error message for invalid file type
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Fehler bei test.exe',
          variant: 'destructive',
        })
      );
    });
    
    // Should not show file in queue
    expect(screen.queryByText('test.exe')).not.toBeInTheDocument();
    expect(screen.queryByText('Upload-Warteschlange')).not.toBeInTheDocument();
  });

  it('handles mixed valid and invalid files correctly', async () => {
    render(<FileUpload {...defaultProps} />);
    
    const validFile = new File(['test content'], 'valid.pdf', { 
      type: 'application/pdf' 
    });
    const invalidFile = new File(['test content'], 'invalid.exe', { 
      type: 'application/x-executable' 
    });
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    Object.defineProperty(fileInput, 'files', {
      value: [validFile, invalidFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    await waitFor(() => {
      // Should show error for invalid file
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Fehler bei invalid.exe',
          variant: 'destructive',
        })
      );
      
      // Should show success for valid file
      expect(mockToast).toHaveBeenCalledWith({
        title: '1 Datei(en) hinzugefügt',
        description: 'Klicken Sie auf "Hochladen" um den Upload zu starten.',
      });
    });
    
    // Should only show valid file in queue
    expect(screen.getByText('valid.pdf')).toBeInTheDocument();
    expect(screen.queryByText('invalid.exe')).not.toBeInTheDocument();
    expect(screen.getByText('Upload-Warteschlange (1)')).toBeInTheDocument();
  });

  it('respects subscription limits for premium plan', async () => {
    const premiumProps = {
      ...defaultProps,
      subscriptionPlan: 'premium' as const,
    };
    
    render(<FileUpload {...premiumProps} />);
    
    // Create a file that would be too large for basic but OK for premium (25MB)
    const mediumFile = new File(
      [new ArrayBuffer(25 * 1024 * 1024)], 
      'medium-file.pdf', 
      { type: 'application/pdf' }
    );
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    Object.defineProperty(fileInput, 'files', {
      value: [mediumFile],
      writable: false,
    });
    
    fireEvent.change(fileInput);
    
    // Should accept the file for premium plan
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: '1 Datei(en) hinzugefügt',
        description: 'Klicken Sie auf "Hochladen" um den Upload zu starten.',
      });
    });
    
    expect(screen.getByText('medium-file.pdf')).toBeInTheDocument();
  });
});