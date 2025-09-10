import { createSupabaseServerClient } from './supabase-server'
import { templateService } from './template-service'
import { templateToTemplateItem, templatesToTemplateItems } from './template-utils'
import type { Template, TemplateItem } from '../types/template'
import type { VirtualFolder, StorageFile } from '../app/(dashboard)/dateien/actions'

/**
 * Template Virtual Folder Provider
 * Provides virtual folder structure for templates in the documents interface
 */
export class TemplateVirtualFolderProvider {
  private getSupabaseClient() {
    return createSupabaseServerClient()
  }

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
        type: 'template_root',
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
        type: 'template_root',
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
          type: 'template_category',
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
          type: 'template_category',
          isEmpty: false,
          children: [],
          fileCount: uncategorizedCount,
          displayName: 'Sonstiges'
        })
      }

      // Sort categories alphabetically, but put 'Sonstiges' at the end
      return folders.sort((a, b) => {
        if (a.name === 'Sonstiges') return 1
        if (b.name === 'Sonstiges') return -1
        return a.displayName!.localeCompare(b.displayName!)
      })
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

      return templatesToTemplateItems(templates)
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
      return templatesToTemplateItems(templates)
    } catch (error) {
      console.error('Error getting all templates:', error)
      return []
    }
  }



  /**
   * Get total template count for a user
   */
  private async getTotalTemplateCount(userId: string): Promise<number> {
    try {
      const { count, error } = await this.getSupabaseClient()
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
      const { count, error } = await this.getSupabaseClient()
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
      const { data: templates, error } = await this.getSupabaseClient()
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

// Export a lazy-loaded singleton instance to avoid cookies() calls during build
let _templateVirtualFolderProvider: TemplateVirtualFolderProvider | null = null

export function getTemplateVirtualFolderProvider(): TemplateVirtualFolderProvider {
  if (!_templateVirtualFolderProvider) {
    _templateVirtualFolderProvider = new TemplateVirtualFolderProvider()
  }
  return _templateVirtualFolderProvider
}

// Export singleton for backward compatibility
export const templateVirtualFolderProvider = {
  get getTemplateRootFolder() { return getTemplateVirtualFolderProvider().getTemplateRootFolder.bind(getTemplateVirtualFolderProvider()) },
  get getTemplateCategoryFolders() { return getTemplateVirtualFolderProvider().getTemplateCategoryFolders.bind(getTemplateVirtualFolderProvider()) },
  get getTemplatesForCategory() { return getTemplateVirtualFolderProvider().getTemplatesForCategory.bind(getTemplateVirtualFolderProvider()) },
  get getAllTemplatesAsItems() { return getTemplateVirtualFolderProvider().getAllTemplatesAsItems.bind(getTemplateVirtualFolderProvider()) }
}