import { createSupabaseServerClient } from './supabase-server'
import { templateService } from './template-service'
import type { Template, TemplateItem } from '../types/template'
import type { VirtualFolder, StorageFile } from '../app/(dashboard)/dateien/actions'

/**
 * Template Virtual Folder Provider
 * Provides virtual folder structure for templates in the documents interface
 */
export class TemplateVirtualFolderProvider {
  private supabase = createSupabaseServerClient()

  /**
   * Get the template root folder with category subfolders
   */
  async getTemplateRootFolder(userId: string): Promise<VirtualFolder> {
    try {
      const categories = await templateService.getUserCategories(userId)
      const totalTemplates = await this.getTotalTemplateCount(userId)

      return {
        name: 'Vorlagen',
        path: `user_${userId}/Vorlagen`,
        type: 'category',
        isEmpty: totalTemplates === 0,
        children: [],
        fileCount: totalTemplates,
        displayName: 'Vorlagen'
      }
    } catch (error) {
      console.error('Error getting template root folder:', error)
      return {
        name: 'Vorlagen',
        path: `user_${userId}/Vorlagen`,
        type: 'category',
        isEmpty: true,
        children: [],
        fileCount: 0,
        displayName: 'Vorlagen'
      }
    }
  }

  /**
   * Get template category folders
   */
  async getTemplateCategoryFolders(userId: string): Promise<VirtualFolder[]> {
    try {
      const categories = await templateService.getUserCategories(userId)
      const folders: VirtualFolder[] = []

      // Create folders for each category
      for (const category of categories) {
        const templateCount = await templateService.getCategoryTemplateCount(userId, category)
        
        folders.push({
          name: category,
          path: `user_${userId}/Vorlagen/${category}`,
          type: 'category',
          isEmpty: templateCount === 0,
          children: [],
          fileCount: templateCount,
          displayName: category
        })
      }

      // Add uncategorized folder if there are templates without category
      const uncategorizedCount = await this.getUncategorizedTemplateCount(userId)
      if (uncategorizedCount > 0) {
        folders.push({
          name: 'Sonstiges',
          path: `user_${userId}/Vorlagen/Sonstiges`,
          type: 'category',
          isEmpty: false,
          children: [],
          fileCount: uncategorizedCount,
          displayName: 'Sonstiges'
        })
      }

      return folders.sort((a, b) => a.displayName!.localeCompare(b.displayName!))
    } catch (error) {
      console.error('Error getting template category folders:', error)
      return []
    }
  }

  /**
   * Get templates for a specific category as virtual files
   */
  async getTemplatesForCategory(userId: string, category: string): Promise<TemplateItem[]> {
    try {
      let templates: Template[]

      if (category === 'Sonstiges') {
        // Get uncategorized templates (null or empty category)
        templates = await this.getUncategorizedTemplates(userId)
      } else {
        templates = await templateService.getTemplatesByCategory(userId, category)
      }

      return templates.map(template => this.convertTemplateToItem(template))
    } catch (error) {
      console.error('Error getting templates for category:', error)
      return []
    }
  }

  /**
   * Get all templates for the root Vorlagen folder
   */
  async getAllTemplatesAsItems(userId: string): Promise<TemplateItem[]> {
    try {
      const templates = await templateService.getUserTemplates(userId)
      return templates.map(template => this.convertTemplateToItem(template))
    } catch (error) {
      console.error('Error getting all templates:', error)
      return []
    }
  }

  /**
   * Convert Template database record to TemplateItem for UI
   */
  private convertTemplateToItem(template: Template): TemplateItem {
    const contentString = JSON.stringify(template.inhalt)
    
    return {
      id: template.id,
      name: template.titel,
      category: template.kategorie,
      content: contentString,
      variables: template.kontext_anforderungen || [],
      createdAt: new Date(template.erstellungsdatum),
      updatedAt: template.aktualisiert_am ? new Date(template.aktualisiert_am) : null,
      size: contentString.length,
      type: 'template'
    }
  }

  /**
   * Get total template count for a user
   */
  private async getTotalTemplateCount(userId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('Vorlagen')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      if (error) {
        console.error('Error counting templates:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('Error counting templates:', error)
      return 0
    }
  }

  /**
   * Get count of uncategorized templates
   */
  private async getUncategorizedTemplateCount(userId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('Vorlagen')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .or('kategorie.is.null,kategorie.eq.')

      if (error) {
        console.error('Error counting uncategorized templates:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('Error counting uncategorized templates:', error)
      return 0
    }
  }

  /**
   * Get uncategorized templates
   */
  private async getUncategorizedTemplates(userId: string): Promise<Template[]> {
    try {
      const { data: templates, error } = await this.supabase
        .from('Vorlagen')
        .select('*')
        .eq('user_id', userId)
        .or('kategorie.is.null,kategorie.eq.')
        .order('erstellungsdatum', { ascending: false })

      if (error) {
        console.error('Error getting uncategorized templates:', error)
        return []
      }

      return templates || []
    } catch (error) {
      console.error('Error getting uncategorized templates:', error)
      return []
    }
  }

  /**
   * Check if a path is a template-related path
   */
  static isTemplatePath(path: string): boolean {
    const segments = path.split('/').filter(Boolean)
    if (segments.length < 2) return false
    
    // Check if second segment is 'Vorlagen'
    return segments[1] === 'Vorlagen'
  }

  /**
   * Parse template path to extract user ID and category
   */
  static parseTemplatePath(path: string): { userId: string; category?: string } | null {
    const segments = path.split('/').filter(Boolean)
    
    if (segments.length < 2 || segments[1] !== 'Vorlagen') {
      return null
    }

    const userSegment = segments[0]
    const userIdMatch = userSegment.match(/^user_(.+)$/)
    
    if (!userIdMatch) {
      return null
    }

    const userId = userIdMatch[1]
    const category = segments.length > 2 ? segments[2] : undefined

    return { userId, category }
  }
}

// Export singleton instance
export const templateVirtualFolderProvider = new TemplateVirtualFolderProvider()