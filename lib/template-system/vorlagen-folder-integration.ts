/**
 * Vorlagen Folder Integration
 * Handles the integration of template database records with the file management system
 */

import { createClient } from '@/utils/supabase/client'
import type { Template } from '@/types/template-system'
import type { StorageObject, VirtualFolder } from '@/hooks/use-cloud-storage-store'

export interface VorlagenFile extends StorageObject {
  templateId: string
  kategorie: string
  kontext_anforderungen: string[]
  isTemplate: true
}

/**
 * Convert template database record to virtual file object
 */
export function templateToVirtualFile(template: Template): VorlagenFile {
  return {
    name: `${template.titel}.vorlage`,
    id: `template_${template.id}`,
    templateId: template.id,
    kategorie: template.kategorie,
    kontext_anforderungen: template.kontext_anforderungen,
    updated_at: template.aktualisiert_am,
    created_at: template.erstellungsdatum,
    last_accessed_at: template.aktualisiert_am,
    metadata: {
      size: new Blob([template.inhalt]).size,
      mimetype: 'application/x-vorlage',
      kategorie: template.kategorie,
      kontext_anforderungen: template.kontext_anforderungen
    },
    size: new Blob([template.inhalt]).size,
    isTemplate: true
  }
}

/**
 * Check if a path is the Vorlagen folder
 */
export function isVorlagenPath(path: string): boolean {
  const segments = path.split('/').filter(Boolean)
  return segments.length === 2 && segments[1] === 'Vorlagen'
}

/**
 * Get the Vorlagen folder path for a user
 */
export function getVorlagenPath(userId: string): string {
  return `user_${userId}/Vorlagen`
}

/**
 * Load templates as virtual files for the Vorlagen folder
 */
export async function loadVorlagenFiles(userId: string): Promise<{
  files: VorlagenFile[]
  error?: string
}> {
  try {
    const supabase = createClient()
    
    // Fetch templates for the user
    const { data: templates, error } = await supabase
      .from('Vorlagen')
      .select('*')
      .eq('user_id', userId)
      .order('aktualisiert_am', { ascending: false })

    if (error) {
      console.error('Error fetching templates:', error)
      return {
        files: [],
        error: 'Fehler beim Laden der Vorlagen'
      }
    }

    // Convert templates to virtual files
    const files = (templates || []).map(templateToVirtualFile)

    return { files }
  } catch (error) {
    console.error('Error in loadVorlagenFiles:', error)
    return {
      files: [],
      error: 'Unerwarteter Fehler beim Laden der Vorlagen'
    }
  }
}

/**
 * Create the Vorlagen virtual folder
 */
export function createVorlagenFolder(userId: string, fileCount: number): VirtualFolder {
  return {
    name: 'Vorlagen',
    path: getVorlagenPath(userId),
    type: 'category',
    isEmpty: fileCount === 0,
    children: [],
    fileCount,
    displayName: 'Vorlagen'
  }
}

/**
 * Get template content by template ID
 */
export async function getTemplateContent(templateId: string, userId: string): Promise<{
  content: string
  template: Template | null
  error?: string
}> {
  try {
    const supabase = createClient()
    
    const { data: template, error } = await supabase
      .from('Vorlagen')
      .select('*')
      .eq('id', templateId)
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Error fetching template:', error)
      return {
        content: '',
        template: null,
        error: 'Template nicht gefunden'
      }
    }

    return {
      content: template.inhalt || '',
      template
    }
  } catch (error) {
    console.error('Error in getTemplateContent:', error)
    return {
      content: '',
      template: null,
      error: 'Fehler beim Laden des Template-Inhalts'
    }
  }
}

/**
 * Update template content
 */
export async function updateTemplateContent(
  templateId: string, 
  userId: string, 
  content: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('Vorlagen')
      .update({ 
        inhalt: content,
        aktualisiert_am: new Date().toISOString()
      })
      .eq('id', templateId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error updating template:', error)
      return {
        success: false,
        error: 'Fehler beim Speichern des Templates'
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in updateTemplateContent:', error)
    return {
      success: false,
      error: 'Unerwarteter Fehler beim Speichern'
    }
  }
}

/**
 * Rename template (update titel field)
 */
export async function renameTemplate(
  templateId: string, 
  userId: string, 
  newName: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Remove .vorlage extension if present
    const cleanName = newName.replace(/\.vorlage$/, '')
    
    const supabase = createClient()
    
    // Check if name already exists
    const { data: existingTemplate, error: checkError } = await supabase
      .from('Vorlagen')
      .select('id')
      .eq('user_id', userId)
      .eq('titel', cleanName)
      .neq('id', templateId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing template:', checkError)
      return {
        success: false,
        error: 'Fehler beim Prüfen des Template-Namens'
      }
    }

    if (existingTemplate) {
      return {
        success: false,
        error: 'Ein Template mit diesem Namen existiert bereits'
      }
    }

    // Update template name
    const { error } = await supabase
      .from('Vorlagen')
      .update({ 
        titel: cleanName,
        aktualisiert_am: new Date().toISOString()
      })
      .eq('id', templateId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error renaming template:', error)
      return {
        success: false,
        error: 'Fehler beim Umbenennen des Templates'
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in renameTemplate:', error)
    return {
      success: false,
      error: 'Unerwarteter Fehler beim Umbenennen'
    }
  }
}

/**
 * Delete template
 */
export async function deleteTemplate(
  templateId: string, 
  userId: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('Vorlagen')
      .delete()
      .eq('id', templateId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting template:', error)
      return {
        success: false,
        error: 'Fehler beim Löschen des Templates'
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in deleteTemplate:', error)
    return {
      success: false,
      error: 'Unerwarteter Fehler beim Löschen'
    }
  }
}

/**
 * Extract template ID from virtual file name or ID
 */
export function extractTemplateId(fileNameOrId: string): string | null {
  // Handle file ID format: template_<uuid>
  if (fileNameOrId.startsWith('template_')) {
    return fileNameOrId.substring(9) // Remove 'template_' prefix
  }
  
  // Handle file name format: <name>.vorlage
  // This is more complex as we need to look up by name
  return null
}

/**
 * Check if a file is a template file
 */
export function isTemplateFile(file: StorageObject): file is VorlagenFile {
  return 'isTemplate' in file && file.isTemplate === true
}

/**
 * Get template ID from file object
 */
export function getTemplateIdFromFile(file: StorageObject): string | null {
  if (isTemplateFile(file)) {
    return file.templateId
  }
  
  return extractTemplateId(file.id)
}