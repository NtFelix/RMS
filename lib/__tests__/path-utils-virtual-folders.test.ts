import {
  createKeepFilePath,
  isKeepFile,
  filterKeepFiles,
  isFolderEmpty,
  extractPathSegments,
  buildUserPath,
  buildHousePath,
  buildApartmentPath,
  buildTenantPath
} from '@/lib/path-utils'

describe('Path Utils - Virtual Folders', () => {
  describe('Keep file utilities', () => {
    it('creates correct .keep file path', () => {
      expect(createKeepFilePath('user_123/folder')).toBe('user_123/folder/.keep')
      expect(createKeepFilePath('user_123/haeuser/1/house_documents')).toBe('user_123/haeuser/1/house_documents/.keep')
    })

    it('identifies .keep files correctly', () => {
      expect(isKeepFile('user_123/folder/.keep')).toBe(true)
      expect(isKeepFile('user_123/folder/document.pdf')).toBe(false)
      expect(isKeepFile('folder/.keep')).toBe(true)
      expect(isKeepFile('keep')).toBe(false)
    })

    it('filters out .keep files from file list', () => {
      const files = [
        { name: 'document.pdf' },
        { name: 'user_123/folder/.keep' },
        { name: 'image.jpg' },
        { name: 'user_123/another/.keep' }
      ]

      const filtered = filterKeepFiles(files)
      expect(filtered).toHaveLength(2)
      expect(filtered.map(f => f.name)).toEqual(['document.pdf', 'image.jpg'])
    })

    it('determines if folder is empty', () => {
      const emptyFolder = [{ name: 'user_123/folder/.keep' }]
      const folderWithFiles = [
        { name: 'user_123/folder/.keep' },
        { name: 'document.pdf' }
      ]
      const reallyEmptyFolder: any[] = []

      expect(isFolderEmpty(emptyFolder)).toBe(true)
      expect(isFolderEmpty(folderWithFiles)).toBe(false)
      expect(isFolderEmpty(reallyEmptyFolder)).toBe(true)
    })
  })

  describe('Path segment extraction for virtual folders', () => {
    it('extracts house document path segments', () => {
      const path = 'user_123/house-1/house_documents/contract.pdf'
      const segments = extractPathSegments(path)

      expect(segments).toEqual({
        userId: '123',
        houseId: 'house-1',
        category: 'house_documents',
        filename: 'contract.pdf'
      })
    })

    it('extracts apartment document path segments', () => {
      const path = 'user_456/house-1/apartment-2/apartment_documents/lease.pdf'
      const segments = extractPathSegments(path)

      expect(segments).toEqual({
        userId: '456',
        houseId: 'house-1',
        apartmentId: 'apartment-2',
        category: 'apartment_documents',
        filename: 'lease.pdf'
      })
    })

    it('extracts tenant document path segments', () => {
      const path = 'user_789/house-1/apartment-2/tenant-3/document.pdf'
      const segments = extractPathSegments(path)

      expect(segments).toEqual({
        userId: '789',
        houseId: 'house-1',
        apartmentId: 'apartment-2',
        tenantId: 'tenant-3',
        filename: 'document.pdf'
      })
    })

    it('extracts miscellaneous path segments', () => {
      const path = 'user_123/miscellaneous/general-document.pdf'
      const segments = extractPathSegments(path)

      expect(segments).toEqual({
        userId: '123',
        category: 'miscellaneous',
        filename: 'general-document.pdf'
      })
    })

    it('extracts archive path segments', () => {
      const path = 'user_123/__archive__/2023-12-01/old-document.pdf'
      const segments = extractPathSegments(path)

      expect(segments).toEqual({
        userId: '123',
        category: 'archive',
        filename: 'old-document.pdf'
      })
    })

    it('handles paths without filenames', () => {
      const path = 'user_123/house-1/house_documents'
      const segments = extractPathSegments(path)

      expect(segments).toEqual({
        userId: '123',
        houseId: 'house-1',
        category: 'house_documents'
      })
    })
  })

  describe('Path building for virtual folders', () => {
    it('builds house document paths', () => {
      const path = buildUserPath('123', 'house-1', 'house_documents')
      expect(path).toBe('user_123/house-1/house_documents')
    })

    it('builds apartment document paths', () => {
      const path = buildUserPath('123', 'house-1', 'apartment-2', 'apartment_documents')
      expect(path).toBe('user_123/house-1/apartment-2/apartment_documents')
    })

    it('builds tenant paths', () => {
      const path = buildTenantPath('123', 'house-1', 'apartment-2', 'tenant-3')
      expect(path).toBe('user_123/house-1/apartment-2/tenant-3')
    })

    it('builds miscellaneous paths', () => {
      const path = buildUserPath('123', 'miscellaneous')
      expect(path).toBe('user_123/miscellaneous')
    })

    it('builds archive paths', () => {
      const timestamp = '2023-12-01'
      const path = buildUserPath('123', '__archive__', timestamp)
      expect(path).toBe('user_123/__archive__/2023-12-01')
    })
  })

  describe('Virtual folder hierarchy validation', () => {
    it('validates correct house hierarchy', () => {
      const housePath = buildHousePath('123', 'house-1')
      const houseDocsPath = buildUserPath('123', 'house-1', 'house_documents')
      
      expect(housePath).toBe('user_123/house-1')
      expect(houseDocsPath).toBe('user_123/house-1/house_documents')
      
      // Verify hierarchy relationship
      expect(houseDocsPath.startsWith(housePath)).toBe(true)
    })

    it('validates correct apartment hierarchy', () => {
      const housePath = buildHousePath('123', 'house-1')
      const apartmentPath = buildApartmentPath('123', 'house-1', 'apartment-2')
      const apartmentDocsPath = buildUserPath('123', 'house-1', 'apartment-2', 'apartment_documents')
      
      expect(apartmentPath).toBe('user_123/house-1/apartment-2')
      expect(apartmentDocsPath).toBe('user_123/house-1/apartment-2/apartment_documents')
      
      // Verify hierarchy relationships
      expect(apartmentPath.startsWith(housePath)).toBe(true)
      expect(apartmentDocsPath.startsWith(apartmentPath)).toBe(true)
    })

    it('validates correct tenant hierarchy', () => {
      const apartmentPath = buildApartmentPath('123', 'house-1', 'apartment-2')
      const tenantPath = buildTenantPath('123', 'house-1', 'apartment-2', 'tenant-3')
      
      expect(tenantPath).toBe('user_123/house-1/apartment-2/tenant-3')
      
      // Verify hierarchy relationship
      expect(tenantPath.startsWith(apartmentPath)).toBe(true)
    })
  })

  describe('Edge cases and error handling', () => {
    it('handles empty folder names gracefully', () => {
      const path = buildUserPath('123', '', 'house_documents')
      expect(path).toBe('user_123/house_documents')
    })

    it('handles special characters in folder names', () => {
      const path = buildUserPath('123', 'house-with-special-chars!@#', 'documents')
      expect(path).toBe('user_123/house-with-special-chars/documents')
    })

    it('throws error for invalid path format in extraction', () => {
      expect(() => extractPathSegments('invalid-path')).toThrow('Invalid path format')
      expect(() => extractPathSegments('')).toThrow('Invalid path format')
    })
  })
})