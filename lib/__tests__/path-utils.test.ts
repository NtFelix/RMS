/**
 * Unit tests for path utilities
 */

import {
  sanitizePathSegment,
  buildUserPath,
  buildHousePath,
  buildApartmentPath,
  buildTenantPath,
  sanitizePath,
  extractPathSegments,
  validatePath,
  isUserPath,
  pathUtils,
} from '../path-utils';

describe('Path Utils', () => {
  describe('sanitizePathSegment', () => {
    it('should sanitize dangerous characters', () => {
      expect(sanitizePathSegment('test<>:"|?*file')).toBe('testfile');
    });

    it('should remove path traversal attempts', () => {
      expect(sanitizePathSegment('../../../etc/passwd')).toBe('etcpasswd');
    });

    it('should convert to lowercase and replace spaces with hyphens', () => {
      expect(sanitizePathSegment('Test File Name')).toBe('test-file-name');
    });

    it('should remove non-alphanumeric characters except hyphens and underscores', () => {
      expect(sanitizePathSegment('test@#$%file_name-123')).toBe('testfile_name-123');
    });

    it('should limit segment length to 255 characters', () => {
      const longString = 'a'.repeat(300);
      expect(sanitizePathSegment(longString)).toHaveLength(255);
    });
  });

  describe('buildUserPath', () => {
    it('should build a basic user path', () => {
      expect(buildUserPath('user123', 'folder1', 'file.txt')).toBe('user_user123/folder1/file.txt');
    });

    it('should sanitize all segments', () => {
      expect(buildUserPath('User@123', 'Folder One', 'File Name.txt')).toBe('user_user123/folder-one/file-name.txt');
    });

    it('should throw error for paths that are too long', () => {
      const longSegment = 'a'.repeat(1000);
      expect(() => buildUserPath('user123', longSegment)).toThrow('Path too long');
    });
  });

  describe('buildHousePath', () => {
    it('should build a house path', () => {
      expect(buildHousePath('user123', 'house456')).toBe('user_user123/house456');
    });
  });

  describe('buildApartmentPath', () => {
    it('should build an apartment path', () => {
      expect(buildApartmentPath('user123', 'house456', 'apt789')).toBe('user_user123/house456/apt789');
    });
  });

  describe('buildTenantPath', () => {
    it('should build a tenant path', () => {
      expect(buildTenantPath('user123', 'house456', 'apt789', 'tenant101')).toBe('user_user123/house456/apt789/tenant101');
    });
  });

  describe('sanitizePath', () => {
    it('should remove leading and trailing slashes', () => {
      expect(sanitizePath('/path/to/file/')).toBe('path/to/file');
    });

    it('should normalize multiple slashes', () => {
      expect(sanitizePath('path//to///file')).toBe('path/to/file');
    });

    it('should sanitize each segment', () => {
      expect(sanitizePath('User@123/Folder One/File Name.txt')).toBe('user123/folder-one/file-name.txt');
    });
  });

  describe('extractPathSegments', () => {
    it('should extract basic user path segments', () => {
      const segments = extractPathSegments('user_123/house456/apt789/tenant101/file.txt');
      expect(segments).toEqual({
        userId: '123',
        houseId: 'house456',
        apartmentId: 'apt789',
        tenantId: 'tenant101',
        filename: 'file.txt'
      });
    });

    it('should extract house documents path', () => {
      const segments = extractPathSegments('user_123/house456/house_documents/file.txt');
      expect(segments).toEqual({
        userId: '123',
        houseId: 'house456',
        category: 'house_documents',
        filename: 'file.txt'
      });
    });

    it('should extract apartment documents path', () => {
      const segments = extractPathSegments('user_123/house456/apt789/apartment_documents/file.txt');
      expect(segments).toEqual({
        userId: '123',
        houseId: 'house456',
        apartmentId: 'apt789',
        category: 'apartment_documents',
        filename: 'file.txt'
      });
    });

    it('should extract miscellaneous path', () => {
      const segments = extractPathSegments('user_123/miscellaneous/file.txt');
      expect(segments).toEqual({
        userId: '123',
        category: 'miscellaneous',
        filename: 'file.txt'
      });
    });

    it('should extract archive path', () => {
      const segments = extractPathSegments('user_123/__archive__/2024-01-01/file.txt');
      expect(segments).toEqual({
        userId: '123',
        category: 'archive',
        filename: 'file.txt'
      });
    });

    it('should throw error for invalid path format', () => {
      expect(() => extractPathSegments('invalid/path')).toThrow('Invalid path format');
    });
  });

  describe('validatePath', () => {
    it('should validate correct user paths', () => {
      expect(validatePath('user_123/house456/file.txt')).toBe(true);
    });

    it('should reject paths without user prefix', () => {
      expect(validatePath('house456/file.txt')).toBe(false);
    });

    it('should reject paths with dangerous characters', () => {
      expect(validatePath('user_123/house<>456/file.txt')).toBe(false);
    });

    it('should reject paths with path traversal', () => {
      expect(validatePath('user_123/../../../etc/passwd')).toBe(false);
    });

    it('should reject paths that are too long', () => {
      const longPath = 'user_123/' + 'a'.repeat(1000);
      expect(validatePath(longPath)).toBe(false);
    });
  });

  describe('isUserPath', () => {
    it('should return true for paths belonging to user', () => {
      expect(isUserPath('user_123/house456/file.txt', '123')).toBe(true);
    });

    it('should return false for paths not belonging to user', () => {
      expect(isUserPath('user_456/house456/file.txt', '123')).toBe(false);
    });

    it('should handle user ID sanitization', () => {
      expect(isUserPath('user_user123/house456/file.txt', 'User@123')).toBe(true);
    });
  });

  describe('pathUtils object', () => {
    it('should export all utility functions', () => {
      expect(pathUtils.buildUserPath).toBeDefined();
      expect(pathUtils.buildHousePath).toBeDefined();
      expect(pathUtils.buildApartmentPath).toBeDefined();
      expect(pathUtils.buildTenantPath).toBeDefined();
      expect(pathUtils.sanitizePath).toBeDefined();
      expect(pathUtils.extractPathSegments).toBeDefined();
      expect(pathUtils.validatePath).toBeDefined();
      expect(pathUtils.isUserPath).toBeDefined();
    });
  });
});