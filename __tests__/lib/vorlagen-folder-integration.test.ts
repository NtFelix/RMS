/**
 * Tests for Vorlagen Folder Integration
 */

import { 
  templateToVirtualFile, 
  isVorlagenPath, 
  getVorlagenPath,
  extractTemplateId,
  isTemplateFile,
  getTemplateIdFromFile
} from '@/lib/template-system/vorlagen-folder-integration'
import type { Template } from '@/types/template-system'
import type { StorageObject } from '@/hooks/use-cloud-storage-store'

// Mock template data
const mockTemplate: Template = {
  id: 'template-123',
  user_id: 'user-456',
  titel: 'Test Template',
  inhalt: 'This is test content for the template.',
  kategorie: 'mail',
  kontext_anforderungen: ['mieter', 'vermieter'],
  erstellungsdatum: '2024-01-01T00:00:00Z',
  aktualisiert_am: '2024-01-02T00:00:00Z'
}

describe('Vorlagen Folder Integration', () => {
  describe('templateToVirtualFile', () => {
    it('should convert template to virtual file correctly', () => {
      const virtualFile = templateToVirtualFile(mockTemplate)
      
      expect(virtualFile.name).toBe('Test Template.vorlage')
      expect(virtualFile.id).toBe('template_template-123')
      expect(virtualFile.templateId).toBe('template-123')
      expect(virtualFile.kategorie).toBe('mail')
      expect(virtualFile.kontext_anforderungen).toEqual(['mieter', 'vermieter'])
      expect(virtualFile.isTemplate).toBe(true)
      expect(virtualFile.metadata.kategorie).toBe('mail')
      expect(virtualFile.metadata.mimetype).toBe('application/x-vorlage')
      expect(virtualFile.size).toBeGreaterThan(0)
    })

    it('should handle empty content', () => {
      const emptyTemplate = { ...mockTemplate, inhalt: '' }
      const virtualFile = templateToVirtualFile(emptyTemplate)
      
      expect(virtualFile.size).toBe(0)
      expect(virtualFile.metadata.size).toBe(0)
    })
  })

  describe('isVorlagenPath', () => {
    it('should return true for Vorlagen folder path', () => {
      expect(isVorlagenPath('user_123/Vorlagen')).toBe(true)
    })

    it('should return false for non-Vorlagen paths', () => {
      expect(isVorlagenPath('user_123')).toBe(false)
      expect(isVorlagenPath('user_123/Documents')).toBe(false)
      expect(isVorlagenPath('user_123/Vorlagen/subfolder')).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(isVorlagenPath('')).toBe(false)
      expect(isVorlagenPath('Vorlagen')).toBe(false)
      expect(isVorlagenPath('user_123/Vorlagen/file.txt')).toBe(false)
    })
  })

  describe('getVorlagenPath', () => {
    it('should return correct Vorlagen path for user', () => {
      expect(getVorlagenPath('user-123')).toBe('user_user-123/Vorlagen')
    })

    it('should handle different user ID formats', () => {
      expect(getVorlagenPath('123')).toBe('user_123/Vorlagen')
      expect(getVorlagenPath('uuid-456-789')).toBe('user_uuid-456-789/Vorlagen')
    })
  })

  describe('extractTemplateId', () => {
    it('should extract template ID from file ID format', () => {
      expect(extractTemplateId('template_123-456-789')).toBe('123-456-789')
    })

    it('should return null for non-template file IDs', () => {
      expect(extractTemplateId('file_123')).toBe(null)
      expect(extractTemplateId('regular-file-id')).toBe(null)
    })

    it('should return null for template file names', () => {
      // File names need to be looked up by name, not extracted
      expect(extractTemplateId('Template Name.vorlage')).toBe(null)
    })
  })

  describe('isTemplateFile', () => {
    it('should identify template files correctly', () => {
      const templateFile = templateToVirtualFile(mockTemplate)
      expect(isTemplateFile(templateFile)).toBe(true)
    })

    it('should identify non-template files correctly', () => {
      const regularFile: StorageObject = {
        name: 'document.pdf',
        id: 'file-123',
        updated_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        last_accessed_at: '2024-01-01T00:00:00Z',
        metadata: { size: 1000 },
        size: 1000
      }
      expect(isTemplateFile(regularFile)).toBe(false)
    })
  })

  describe('getTemplateIdFromFile', () => {
    it('should get template ID from template file', () => {
      const templateFile = templateToVirtualFile(mockTemplate)
      expect(getTemplateIdFromFile(templateFile)).toBe('template-123')
    })

    it('should return null for non-template files', () => {
      const regularFile: StorageObject = {
        name: 'document.pdf',
        id: 'file-123',
        updated_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        last_accessed_at: '2024-01-01T00:00:00Z',
        metadata: { size: 1000 },
        size: 1000
      }
      expect(getTemplateIdFromFile(regularFile)).toBe(null)
    })

    it('should extract template ID from file ID format', () => {
      const fileWithTemplateId: StorageObject = {
        name: 'some-file.txt',
        id: 'template_456-789-123',
        updated_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        last_accessed_at: '2024-01-01T00:00:00Z',
        metadata: { size: 1000 },
        size: 1000
      }
      expect(getTemplateIdFromFile(fileWithTemplateId)).toBe('456-789-123')
    })
  })
})