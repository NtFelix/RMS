/**
 * Tests for path utilities
 */

import {
  buildUserPath,
  buildHousePath,
  buildApartmentPath,
  buildTenantPath,
  sanitizePath,
  sanitizePathSegment,
  extractPathSegments,
  validatePath,
  isUserPath,
  buildArchivePath,
  isArchivePath,
  extractArchiveTimestamp,
  reconstructOriginalPath,
  isKeepFile,
  filterKeepFiles,
  isFolderEmpty,
} from '@/lib/path-utils';

describe('Path Utils', () => {
  describe('buildUserPath', () => {
    it('builds basic user path', () => {
      const path = buildUserPath('123');
      expect(path).toBe('user_123');
    });

    it('builds user path with segments', () => {
      const path = buildUserPath('123', 'house1', 'documents');
      expect(path).toBe('user_123/house1/documents');
    });

    it('sanitizes dangerous characters', () => {
      const path = buildUserPath('123', 'house<>1', 'doc:uments');
      expect(path).toBe('user_123/house1/documents');
    });

    it('filters out empty segments', () => {
      const path = buildUserPath('123', '', 'house1', '', 'documents');
      expect(path).toBe('user_123/house1/documents');
    });

    it('throws error for paths that are too long', () => {
      const longSegment = 'a'.repeat(1000);
      expect(() => buildUserPath('123', longSegment)).toThrow('Path too long');
    });
  });

  describe('buildHousePath', () => {
    it('builds house path correctly', () => {
      const path = buildHousePath('123', 'house-abc');
      expect(path).toBe('user_123/house-abc');
    });
  });

  describe('buildApartmentPath', () => {
    it('builds apartment path correctly', () => {
      const path = buildApartmentPath('123', 'house-abc', 'apt-1');
      expect(path).toBe('user_123/house-abc/apt-1');
    });
  });

  describe('buildTenantPath', () => {
    it('builds tenant path correctly', () => {
      const path = buildTenantPath('123', 'house-abc', 'apt-1', 'tenant-xyz');
      expect(path).toBe('user_123/house-abc/apt-1/tenant-xyz');
    });
  });

  describe('sanitizePath', () => {
    it('removes leading and trailing slashes', () => {
      const path = sanitizePath('/user_123/house1/');
      expect(path).toBe('user_123/house1');
    });

    it('normalizes multiple slashes', () => {
      const path = sanitizePath('user_123//house1///documents');
      expect(path).toBe('user_123/house1/documents');
    });

    it('removes dangerous characters', () => {
      const path = sanitizePath('user_123/house<>1/doc:uments');
      expect(path).toBe('user_123/house1/documents');
    });

    it('preserves file extensions', () => {
      const path = sanitizePath('user_123/house1/document.pdf');
      expect(path).toBe('user_123/house1/document.pdf');
    });

    it('preserves user_ prefix', () => {
      const path = sanitizePath('user_123/house1');
      expect(path).toBe('user_123/house1');
    });
  });

  describe('sanitizePathSegment', () => {
    it('preserves user_ prefix', () => {
      const segment = sanitizePathSegment('user_123');
      expect(segment).toBe('user_123');
    });

    it('removes dangerous characters from regular segments', () => {
      const segment = sanitizePathSegment('house<>1');
      expect(segment).toBe('house1');
    });

    it('limits segment length', () => {
      const longSegment = 'a'.repeat(300);
      const sanitized = sanitizePathSegment(longSegment);
      expect(sanitized.length).toBeLessThanOrEqual(255);
    });
  });

  describe('extractPathSegments', () => {
    it('extracts user ID from basic path', () => {
      const segments = extractPathSegments('user_123');
      expect(segments.userId).toBe('123');
    });

    it('extracts house ID', () => {
      const segments = extractPathSegments('user_123/house-abc');
      expect(segments.userId).toBe('123');
      expect(segments.houseId).toBe('house-abc');
    });

    it('extracts apartment ID', () => {
      const segments = extractPathSegments('user_123/house-abc/apt-1');
      expect(segments.userId).toBe('123');
      expect(segments.houseId).toBe('house-abc');
      expect(segments.apartmentId).toBe('apt-1');
    });

    it('extracts tenant ID', () => {
      const segments = extractPathSegments('user_123/house-abc/apt-1/tenant-xyz');
      expect(segments.userId).toBe('123');
      expect(segments.houseId).toBe('house-abc');
      expect(segments.apartmentId).toBe('apt-1');
      expect(segments.tenantId).toBe('tenant-xyz');
    });

    it('extracts filename', () => {
      const segments = extractPathSegments('user_123/house-abc/document.pdf');
      expect(segments.filename).toBe('document.pdf');
    });

    it('identifies archive category', () => {
      const segments = extractPathSegments('user_123/__archive__/2024-01-01/house-abc');
      expect(segments.category).toBe('archive');
    });

    it('identifies miscellaneous category', () => {
      const segments = extractPathSegments('user_123/miscellaneous/document.pdf');
      expect(segments.category).toBe('miscellaneous');
    });

    it('throws error for invalid path format', () => {
      expect(() => extractPathSegments('invalid/path')).toThrow('Invalid path format');
    });
  });

  describe('validatePath', () => {
    it('validates correct user path', () => {
      expect(validatePath('user_123')).toBe(true);
      expect(validatePath('user_123/house1')).toBe(true);
    });

    it('rejects path without user_ prefix', () => {
      expect(validatePath('123/house1')).toBe(false);
    });

    it('rejects path with dangerous characters', () => {
      expect(validatePath('user_123/house<>1')).toBe(false);
    });

    it('rejects path with path traversal', () => {
      expect(validatePath('user_123/../house1')).toBe(false);
    });

    it('rejects paths that are too long', () => {
      const longPath = 'user_123/' + 'a'.repeat(1000);
      expect(validatePath(longPath)).toBe(false);
    });
  });

  describe('isUserPath', () => {
    it('returns true for user path', () => {
      expect(isUserPath('user_123/house1', '123')).toBe(true);
    });

    it('returns false for different user', () => {
      expect(isUserPath('user_123/house1', '456')).toBe(false);
    });

    it('returns true for exact user path', () => {
      expect(isUserPath('user_123', '123')).toBe(true);
    });
  });

  describe('Archive paths', () => {
    it('builds archive path', () => {
      const path = buildArchivePath('123', '2024-01-01', 'house1', 'document.pdf');
      expect(path).toBe('user_123/__archive__/2024-01-01/house1/document.pdf');
    });

    it('identifies archive path', () => {
      expect(isArchivePath('user_123/__archive__/2024-01-01/house1')).toBe(true);
      expect(isArchivePath('user_123/house1')).toBe(false);
    });

    it('extracts archive timestamp', () => {
      const timestamp = extractArchiveTimestamp('user_123/__archive__/2024-01-01/house1');
      expect(timestamp).toBe('2024-01-01');
    });

    it('returns null for non-archive path', () => {
      const timestamp = extractArchiveTimestamp('user_123/house1');
      expect(timestamp).toBeNull();
    });

    it('reconstructs original path from archive', () => {
      const original = reconstructOriginalPath('user_123/__archive__/2024-01-01/house1/document.pdf');
      expect(original).toBe('user_123/house1/document.pdf');
    });
  });

  describe('Keep files', () => {
    it('identifies keep files', () => {
      expect(isKeepFile('user_123/house1/.keep')).toBe(true);
      expect(isKeepFile('user_123/house1/document.pdf')).toBe(false);
    });

    it('filters keep files from list', () => {
      const files = [
        { name: 'document.pdf' },
        { name: 'user_123/house1/.keep' },
        { name: 'image.jpg' },
      ];
      const filtered = filterKeepFiles(files);
      expect(filtered).toHaveLength(2);
      expect(filtered.map(f => f.name)).toEqual(['document.pdf', 'image.jpg']);
    });

    it('identifies empty folder', () => {
      const emptyFolder = [{ name: 'user_123/house1/.keep' }];
      const nonEmptyFolder = [{ name: 'user_123/house1/.keep' }, { name: 'document.pdf' }];
      
      expect(isFolderEmpty(emptyFolder)).toBe(true);
      expect(isFolderEmpty(nonEmptyFolder)).toBe(false);
      expect(isFolderEmpty([])).toBe(true);
    });
  });
});
