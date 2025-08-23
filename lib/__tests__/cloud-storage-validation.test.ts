/**
 * Tests for cloud storage validation utilities
 */

import {
  validateFile,
  validateFiles,
  validateFolderName,
  getStorageQuotaStatus,
  formatFileSize,
  getFileTypeCategory,
  getSubscriptionLimits,
  sanitizeFileName,
  generateUniqueFileName,
  FILE_VALIDATION_CONSTANTS,
} from '../cloud-storage-validation';
import { SubscriptionLimits } from '@/types/cloud-storage';

// Mock file creation helper
function createMockFile(name: string, size: number, type: string): File {
  const file = new File([''], name, { type });
  // Mock the size property since File constructor doesn't set it properly in tests
  Object.defineProperty(file, 'size', {
    value: size,
    writable: false,
  });
  return file;
}

describe('Cloud Storage Validation', () => {
  describe('validateFile', () => {
    const basicLimits: SubscriptionLimits = {
      maxStorageBytes: 100 * 1024 * 1024,
      maxFileSize: 10 * 1024 * 1024,
      allowedFileTypes: FILE_VALIDATION_CONSTANTS.ALLOWED_FILE_TYPES,
      canShare: false,
      canBulkOperations: false,
    };

    it('should validate a correct file', () => {
      const file = createMockFile('test.pdf', 1024 * 1024, 'application/pdf');
      const result = validateFile(file, basicLimits);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject file that is too large', () => {
      const file = createMockFile('large.pdf', 20 * 1024 * 1024, 'application/pdf');
      const result = validateFile(file, basicLimits);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Datei ist zu groß. Maximum: 10 MB');
    });

    it('should reject unsupported file type', () => {
      const file = createMockFile('test.exe', 1024, 'application/x-executable');
      const result = validateFile(file, basicLimits);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Dateityp nicht unterstützt: application/x-executable');
    });

    it('should reject file with name too long', () => {
      const longName = 'a'.repeat(260) + '.pdf';
      const file = createMockFile(longName, 1024, 'application/pdf');
      const result = validateFile(file, basicLimits);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Dateiname ist zu lang (max. 255 Zeichen)');
    });

    it('should reject file with invalid characters', () => {
      const file = createMockFile('test<>file.pdf', 1024, 'application/pdf');
      const result = validateFile(file, basicLimits);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Dateiname enthält ungültige Zeichen');
    });
  });

  describe('validateFiles', () => {
    const basicLimits: SubscriptionLimits = {
      maxStorageBytes: 100 * 1024 * 1024,
      maxFileSize: 10 * 1024 * 1024,
      allowedFileTypes: FILE_VALIDATION_CONSTANTS.ALLOWED_FILE_TYPES,
      canShare: false,
      canBulkOperations: false,
    };

    it('should validate multiple correct files', () => {
      const files = [
        createMockFile('test1.pdf', 1024 * 1024, 'application/pdf'),
        createMockFile('test2.jpg', 2 * 1024 * 1024, 'image/jpeg'),
      ];
      
      const result = validateFiles(files, basicLimits, 0);
      
      expect(result.validFiles).toHaveLength(2);
      expect(result.invalidFiles).toHaveLength(0);
    });

    it('should reject files that would exceed storage quota', () => {
      const files = [
        createMockFile('test1.pdf', 5 * 1024 * 1024, 'application/pdf'), // 5MB - valid
        createMockFile('test2.pdf', 8 * 1024 * 1024, 'application/pdf'), // 8MB - valid individually
      ];
      
      // Start with 90MB already used, so only first file should fit
      const result = validateFiles(files, basicLimits, 90 * 1024 * 1024);
      
      expect(result.validFiles).toHaveLength(1);
      expect(result.invalidFiles).toHaveLength(1);
      expect(result.invalidFiles[0].errors).toContain('Speicherplatz würde überschritten werden');
    });
  });

  describe('validateFolderName', () => {
    it('should validate correct folder name', () => {
      const result = validateFolderName('Mein Ordner');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty folder name', () => {
      const result = validateFolderName('');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Ordnername darf nicht leer sein');
    });

    it('should reject folder name with invalid characters', () => {
      const result = validateFolderName('Ordner<>Name');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Ordnername enthält ungültige Zeichen');
    });

    it('should reject reserved folder names', () => {
      const result = validateFolderName('CON');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Ordnername ist reserviert und nicht erlaubt');
    });

    it('should reject folder name starting or ending with dot', () => {
      const result1 = validateFolderName('.hidden');
      const result2 = validateFolderName('folder.');
      
      expect(result1.isValid).toBe(false);
      expect(result2.isValid).toBe(false);
      expect(result1.errors).toContain('Ordnername darf nicht mit einem Punkt beginnen oder enden');
      expect(result2.errors).toContain('Ordnername darf nicht mit einem Punkt beginnen oder enden');
    });
  });

  describe('getStorageQuotaStatus', () => {
    const limit = 100 * 1024 * 1024; // 100MB

    it('should return ok status for low usage', () => {
      const result = getStorageQuotaStatus(50 * 1024 * 1024, limit);
      
      expect(result.status).toBe('ok');
      expect(result.percentage).toBe(0.5);
    });

    it('should return warning status at 80%', () => {
      const result = getStorageQuotaStatus(85 * 1024 * 1024, limit);
      
      expect(result.status).toBe('warning');
      expect(result.message).toBe('Speicherplatz wird knapp');
    });

    it('should return critical status at 95%', () => {
      const result = getStorageQuotaStatus(96 * 1024 * 1024, limit);
      
      expect(result.status).toBe('critical');
      expect(result.message).toBe('Speicherplatz ist fast vollständig belegt');
    });

    it('should return exceeded status at 100%', () => {
      const result = getStorageQuotaStatus(105 * 1024 * 1024, limit);
      
      expect(result.status).toBe('exceeded');
      expect(result.message).toBe('Speicherplatz ist vollständig belegt');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });
  });

  describe('getFileTypeCategory', () => {
    it('should categorize file types correctly', () => {
      expect(getFileTypeCategory('image/jpeg')).toBe('Bild');
      expect(getFileTypeCategory('application/pdf')).toBe('PDF');
      expect(getFileTypeCategory('application/msword')).toBe('Dokument');
      expect(getFileTypeCategory('application/vnd.ms-excel')).toBe('Tabelle');
      expect(getFileTypeCategory('text/plain')).toBe('Text');
      expect(getFileTypeCategory('application/zip')).toBe('Archiv');
      expect(getFileTypeCategory('application/unknown')).toBe('Datei');
    });
  });

  describe('getSubscriptionLimits', () => {
    it('should return basic limits', () => {
      const limits = getSubscriptionLimits('basic');
      
      expect(limits.maxStorageBytes).toBe(100 * 1024 * 1024);
      expect(limits.maxFileSize).toBe(10 * 1024 * 1024);
      expect(limits.canShare).toBe(false);
      expect(limits.canBulkOperations).toBe(false);
    });

    it('should return premium limits', () => {
      const limits = getSubscriptionLimits('premium');
      
      expect(limits.maxStorageBytes).toBe(1024 * 1024 * 1024);
      expect(limits.maxFileSize).toBe(50 * 1024 * 1024);
      expect(limits.canShare).toBe(true);
      expect(limits.canBulkOperations).toBe(true);
    });
  });

  describe('sanitizeFileName', () => {
    it('should sanitize invalid characters', () => {
      expect(sanitizeFileName('file<>name.pdf')).toBe('file__name.pdf');
      expect(sanitizeFileName('file:name.pdf')).toBe('file_name.pdf');
    });

    it('should handle empty names', () => {
      expect(sanitizeFileName('')).toBe('unnamed_file');
      expect(sanitizeFileName('   ')).toBe('unnamed_file');
    });

    it('should trim dots', () => {
      expect(sanitizeFileName('.hidden.txt')).toBe('hidden.txt');
      expect(sanitizeFileName('file.txt.')).toBe('file.txt');
    });

    it('should limit length', () => {
      const longName = 'a'.repeat(300) + '.pdf';
      const result = sanitizeFileName(longName);
      
      expect(result.length).toBeLessThanOrEqual(255);
      expect(result.endsWith('.pdf')).toBe(true);
    });
  });

  describe('generateUniqueFileName', () => {
    it('should return original name if not duplicate', () => {
      const result = generateUniqueFileName('test.pdf', ['other.pdf']);
      
      expect(result).toBe('test.pdf');
    });

    it('should generate unique name for duplicates', () => {
      const result = generateUniqueFileName('test.pdf', ['test.pdf', 'test (1).pdf']);
      
      expect(result).toBe('test (2).pdf');
    });

    it('should handle multiple duplicates', () => {
      const existing = ['test.pdf', 'test (1).pdf', 'test (2).pdf', 'test (3).pdf'];
      const result = generateUniqueFileName('test.pdf', existing);
      
      expect(result).toBe('test (4).pdf');
    });
  });
});