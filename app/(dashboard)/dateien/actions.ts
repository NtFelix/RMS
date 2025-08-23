'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export interface StorageFile {
  name: string
  id: string
  updated_at: string
  created_at: string
  last_accessed_at: string
  metadata: Record<string, any>
  size: number
}

export interface VirtualFolder {
  name: string
  path: string
  type: 'house' | 'apartment' | 'category' | 'storage' | 'tenant' | 'archive'
  isEmpty: boolean
  children: VirtualFolder[]
  fileCount: number
  displayName?: string
}

export interface BreadcrumbItem {
  name: string
  path: string
  type: 'root' | 'house' | 'apartment' | 'tenant' | 'category'
}

export async function getInitialFiles(userId: string, path?: string): Promise<{
  files: StorageFile[]
  folders: VirtualFolder[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user || user.id !== userId) {
      redirect('/auth/login')
    }

    const targetPath = path || `user_${userId}`
    
    // If we're at the root level, create virtual folders based on database data
    if (targetPath === `user_${userId}`) {
      return await getRootLevelFolders(supabase, userId, targetPath)
    }
    
    // For other paths, list actual storage contents
    return await getStorageContents(supabase, targetPath)
  } catch (error) {
    console.error('Error in getInitialFiles:', error)
    return {
      files: [],
      folders: [],
      error: 'Unerwarteter Fehler beim Laden der Dateien'
    }
  }
}

async function getRootLevelFolders(supabase: any, userId: string, targetPath: string): Promise<{
  files: StorageFile[]
  folders: VirtualFolder[]
  error?: string
}> {
  try {
    // Get houses from database
    const { data: houses, error: housesError } = await supabase
      .from('Haeuser')
      .select('id, name')
      .eq('user_id', userId)
    
    if (housesError) {
      console.error('Error loading houses:', housesError)
    }

    const folders: VirtualFolder[] = []
    
    // Add house folders
    if (houses && houses.length > 0) {
      for (const house of houses) {
        // Check if house folder has any files
        const housePath = `${targetPath}/${house.id}`
        const { data: houseContents } = await supabase.storage
          .from('documents')
          .list(housePath, { limit: 1 })
        
        const hasFiles = houseContents && houseContents.length > 0
        
        folders.push({
          name: house.id,
          path: housePath,
          type: 'house',
          isEmpty: !hasFiles,
          children: [],
          fileCount: hasFiles ? houseContents.length : 0,
          displayName: house.name
        })
      }
    }
    
    // Add miscellaneous folder
    const miscPath = `${targetPath}/Miscellaneous`
    const { data: miscContents } = await supabase.storage
      .from('documents')
      .list(miscPath, { limit: 1 })
    
    const miscHasFiles = miscContents && miscContents.length > 0
    
    folders.push({
      name: 'Miscellaneous',
      path: miscPath,
      type: 'category',
      isEmpty: !miscHasFiles,
      children: [],
      fileCount: miscHasFiles ? miscContents.length : 0,
      displayName: 'Sonstiges'
    })

    // Check for any files directly in the root
    const { data: rootFiles } = await supabase.storage
      .from('documents')
      .list(targetPath, { limit: 100 })
    
    const files: StorageFile[] = []
    if (rootFiles) {
      rootFiles.forEach((item: any) => {
        if (item.name !== '.keep' && item.metadata?.size) {
          files.push({
            name: item.name,
            id: item.id || item.name,
            updated_at: item.updated_at || new Date().toISOString(),
            created_at: item.created_at || new Date().toISOString(),
            last_accessed_at: item.last_accessed_at || new Date().toISOString(),
            metadata: item.metadata || {},
            size: item.metadata?.size || 0,
          })
        }
      })
    }

    return { files, folders }
  } catch (error) {
    console.error('Error in getRootLevelFolders:', error)
    return {
      files: [],
      folders: [],
      error: 'Fehler beim Laden der Ordnerstruktur'
    }
  }
}

async function getStorageContents(supabase: any, targetPath: string): Promise<{
  files: StorageFile[]
  folders: VirtualFolder[]
  error?: string
}> {
  try {
    // List files from Supabase Storage for the specific directory
    const { data, error } = await supabase.storage
      .from('documents')
      .list(targetPath, {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' }
      })

    if (error) {
      console.error('Error loading files:', error)
      return {
        files: [],
        folders: [],
        error: 'Fehler beim Laden der Dateien'
      }
    }

    // Check if this is a house folder - if so, create apartment subfolders
    const pathSegments = targetPath.split('/')
    const userId = pathSegments[0].replace('user_', '')
    const isHouseFolder = pathSegments.length === 2 && pathSegments[1] !== 'Miscellaneous'
    const isApartmentFolder = pathSegments.length === 3 && pathSegments[1] !== 'Miscellaneous'
    
    if (isHouseFolder) {
      const houseId = pathSegments[1]
      return await getHouseFolderContents(supabase, userId, houseId, targetPath, data || [])
    }
    
    if (isApartmentFolder) {
      const houseId = pathSegments[1]
      const apartmentId = pathSegments[2]
      return await getApartmentFolderContentsInternal(supabase, userId, houseId, apartmentId, targetPath, data || [])
    }

    // For other folders, process normally
    const files: StorageFile[] = []
    const folders: VirtualFolder[] = []

    ;(data || []).forEach((item: any) => {
      // Skip placeholder files
      if (item.name === '.keep') return
      
      // Check if it's a folder (no metadata.size indicates a folder in Supabase)
      if (!item.metadata?.size && !item.name.includes('.')) {
        folders.push({
          name: item.name,
          path: `${targetPath}/${item.name}`,
          type: 'storage',
          isEmpty: true, // Default to true, will be updated by the client
          children: [], // Add children property
          fileCount: 0   // Default to 0, will be updated by the client
        })
      } else {
        // It's a file
        files.push({
          name: item.name,
          id: item.id || item.name,
          updated_at: item.updated_at || new Date().toISOString(),
          created_at: item.created_at || new Date().toISOString(),
          last_accessed_at: item.last_accessed_at || new Date().toISOString(),
          metadata: item.metadata || {},
          size: item.metadata?.size || 0,
        })
      }
    })

    return { files, folders }
  } catch (error) {
    console.error('Error in getStorageContents:', error)
    return {
      files: [],
      folders: [],
      error: 'Fehler beim Laden der Dateien'
    }
  }
}

async function getHouseFolderContents(supabase: any, userId: string, houseId: string, targetPath: string, storageItems: any[]): Promise<{
  files: StorageFile[]
  folders: VirtualFolder[]
  error?: string
}> {
  try {
    // Get apartments for this house from database
    const { data: apartments, error: apartmentsError } = await supabase
      .from('Wohnungen')
      .select('id, name')
      .eq('haus_id', houseId)
      .eq('user_id', userId)
    
    if (apartmentsError) {
      console.error('Error loading apartments:', apartmentsError)
    }

    const folders: VirtualFolder[] = []
    
    // Add house documents folder
    const houseDocsPath = `${targetPath}/house_documents`
    const { data: houseDocsContents } = await supabase.storage
      .from('documents')
      .list(houseDocsPath, { limit: 1 })
    
    const houseDocsHasFiles = houseDocsContents && houseDocsContents.length > 0
    
    folders.push({
      name: 'house_documents',
      path: houseDocsPath,
      type: 'category',
      isEmpty: !houseDocsHasFiles,
      children: [],
      fileCount: houseDocsHasFiles ? houseDocsContents.length : 0,
      displayName: 'Hausdokumente'
    })
    
    // Add apartment folders
    if (apartments && apartments.length > 0) {
      for (const apartment of apartments) {
        // Count files recursively in apartment folder and subfolders
        const apartmentPath = `${targetPath}/${apartment.id}`
        const fileCount = await countFilesRecursively(supabase, apartmentPath)
        
        folders.push({
          name: apartment.id,
          path: apartmentPath,
          type: 'apartment',
          isEmpty: fileCount === 0,
          children: [],
          fileCount: fileCount,
          displayName: apartment.name
        })
      }
    }

    // Process any files directly in the house folder
    const files: StorageFile[] = []
    storageItems.forEach((item: any) => {
      if (item.name !== '.keep' && item.metadata?.size) {
        files.push({
          name: item.name,
          id: item.id || item.name,
          updated_at: item.updated_at || new Date().toISOString(),
          created_at: item.created_at || new Date().toISOString(),
          last_accessed_at: item.last_accessed_at || new Date().toISOString(),
          metadata: item.metadata || {},
          size: item.metadata?.size || 0,
        })
      }
    })

    return { files, folders }
  } catch (error) {
    console.error('Error in getHouseFolderContents:', error)
    return {
      files: [],
      folders: [],
      error: 'Fehler beim Laden der Wohnungsordner'
    }
  }
}

// Helper function to count files recursively
async function countFilesRecursively(supabase: any, path: string): Promise<number> {
  try {
    const { data: contents } = await supabase.storage
      .from('documents')
      .list(path, { limit: 100 })
    
    if (!contents) return 0
    
    let fileCount = 0
    
    for (const item of contents) {
      if (item.name === '.keep') continue
      
      if (item.metadata?.size) {
        // It's a file
        fileCount++
      } else if (!item.name.includes('.')) {
        // It's a folder, count recursively
        const subPath = `${path}/${item.name}`
        fileCount += await countFilesRecursively(supabase, subPath)
      }
    }
    
    return fileCount
  } catch (error) {
    console.error('Error counting files recursively:', error)
    return 0
  }
}

export async function getFilesForPath(userId: string, path: string): Promise<{
  files: StorageFile[]
  folders: VirtualFolder[]
  error?: string
}> {
  return getInitialFiles(userId, path)
}

export async function loadFilesForPath(userId: string, path: string): Promise<{
  files: StorageFile[]
  folders: VirtualFolder[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user || user.id !== userId) {
      return {
        files: [],
        folders: [],
        error: 'Nicht authentifiziert'
      }
    }

    // Validate that the path belongs to the user
    if (!path.startsWith(`user_${userId}`)) {
      return {
        files: [],
        folders: [],
        error: 'Ungültiger Pfad'
      }
    }
    
    return await getInitialFiles(userId, path)
  } catch (error) {
    console.error('Error in loadFilesForPath:', error)
    return {
      files: [],
      folders: [],
      error: 'Unerwarteter Fehler beim Laden der Dateien'
    }
  }
}

// Internal function to handle apartment folder contents (used by getStorageContents)
async function getApartmentFolderContentsInternal(supabase: any, userId: string, houseId: string, apartmentId: string, targetPath: string, storageItems: any[]): Promise<{
  files: StorageFile[]
  folders: VirtualFolder[]
  error?: string
}> {
  try {
    // Get tenants for this apartment from database
    const { data: tenants, error: tenantsError } = await supabase
      .from('Mieter')
      .select('id, name')
      .eq('wohnung_id', apartmentId)
      .eq('user_id', userId)
    
    if (tenantsError) {
      console.error('Error loading tenants:', tenantsError)
    }

    const folders: VirtualFolder[] = []
    
    // Add apartment documents folder
    const apartmentDocsPath = `${targetPath}/apartment_documents`
    const { data: apartmentDocsContents } = await supabase.storage
      .from('documents')
      .list(apartmentDocsPath, { limit: 1 })
    
    const apartmentDocsHasFiles = apartmentDocsContents && apartmentDocsContents.length > 0
    
    folders.push({
      name: 'apartment_documents',
      path: apartmentDocsPath,
      type: 'category',
      isEmpty: !apartmentDocsHasFiles,
      children: [],
      fileCount: apartmentDocsHasFiles ? apartmentDocsContents.length : 0,
      displayName: 'Wohnungsdokumente'
    })
    
    // Add tenant folders
    if (tenants && tenants.length > 0) {
      for (const tenant of tenants) {
        // Count files recursively in tenant folder
        const tenantPath = `${targetPath}/${tenant.id}`
        const fileCount = await countFilesRecursively(supabase, tenantPath)
        
        folders.push({
          name: tenant.id,
          path: tenantPath,
          type: 'tenant',
          isEmpty: fileCount === 0,
          children: [],
          fileCount: fileCount,
          displayName: tenant.name
        })
      }
    }

    // Process any files directly in the apartment folder
    const files: StorageFile[] = []
    storageItems.forEach((item: any) => {
      if (item.name !== '.keep' && item.metadata?.size) {
        files.push({
          name: item.name,
          id: item.id || item.name,
          updated_at: item.updated_at || new Date().toISOString(),
          created_at: item.created_at || new Date().toISOString(),
          last_accessed_at: item.last_accessed_at || new Date().toISOString(),
          metadata: item.metadata || {},
          size: item.metadata?.size || 0,
        })
      }
    })

    return { files, folders }
  } catch (error) {
    console.error('Error in getApartmentFolderContentsInternal:', error)
    return {
      files: [],
      folders: [],
      error: 'Fehler beim Laden der Mieterordner'
    }
  }
}

// New function to handle apartment folder contents (public API)
export async function getApartmentFolderContents(userId: string, houseId: string, apartmentId: string): Promise<{
  files: StorageFile[]
  folders: VirtualFolder[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user || user.id !== userId) {
      return {
        files: [],
        folders: [],
        error: 'Nicht authentifiziert'
      }
    }

    const apartmentPath = `user_${userId}/${houseId}/${apartmentId}`
    
    // Get storage contents for the apartment folder
    const { data: storageItems } = await supabase.storage
      .from('documents')
      .list(apartmentPath, { limit: 100 })
    
    return await getApartmentFolderContentsInternal(supabase, userId, houseId, apartmentId, apartmentPath, storageItems || [])
  } catch (error) {
    console.error('Error in getApartmentFolderContents:', error)
    return {
      files: [],
      folders: [],
      error: 'Fehler beim Laden der Mieterordner'
    }
  }
}

// Server-side breadcrumb builder with friendly names
export async function getBreadcrumbs(userId: string, path: string): Promise<BreadcrumbItem[]> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user || user.id !== userId) {
      redirect('/auth/login')
    }

    const pathSegments = path.split('/').filter(Boolean)
    const crumbs: BreadcrumbItem[] = []

    // Root
    const rootPath = `user_${userId}`
    crumbs.push({ name: 'Cloud Storage', path: rootPath, type: 'root' })

    // Nothing more to do if at root
    if (pathSegments.length <= 1) {
      return crumbs
    }

    // Helper to map known category folder names to display labels
    const mapCategoryName = (segment: string): string => {
      if (segment === 'Miscellaneous') return 'Sonstiges'
      if (segment === 'house_documents') return 'Hausdokumente'
      if (segment === 'apartment_documents') return 'Wohnungsdokumente'
      return segment
    }

    let currentPath = rootPath
    for (let i = 1; i < pathSegments.length; i++) {
      const segment = pathSegments[i]
      currentPath = `${currentPath}/${segment}`

      // Try to resolve friendly names depending on depth
      if (i === 1) {
        // House level
        try {
          const { data: house } = await supabase
            .from('Haeuser')
            .select('name')
            .eq('id', segment)
            .single()
          crumbs.push({ name: house?.name || mapCategoryName(segment), path: currentPath, type: 'house' })
        } catch {
          crumbs.push({ name: mapCategoryName(segment), path: currentPath, type: 'house' })
        }
        continue
      }

      if (i === 2) {
        // Apartment level or category under house
        if (segment === 'house_documents' || segment === 'Miscellaneous') {
          crumbs.push({ name: mapCategoryName(segment), path: currentPath, type: 'category' })
        } else {
          try {
            const { data: apartment } = await supabase
              .from('Wohnungen')
              .select('name')
              .eq('id', segment)
              .single()
            crumbs.push({ name: apartment?.name || mapCategoryName(segment), path: currentPath, type: 'apartment' })
          } catch {
            crumbs.push({ name: mapCategoryName(segment), path: currentPath, type: 'apartment' })
          }
        }
        continue
      }

      if (i === 3) {
        // Tenant level or category under apartment
        if (segment === 'apartment_documents') {
          crumbs.push({ name: mapCategoryName(segment), path: currentPath, type: 'category' })
        } else {
          try {
            const { data: tenant } = await supabase
              .from('Mieter')
              .select('name, vorname')
              .eq('id', segment)
              .single()
            const tenantName = tenant ? `${tenant.vorname ?? ''} ${tenant.name ?? ''}`.trim() : null
            crumbs.push({ name: tenantName || mapCategoryName(segment), path: currentPath, type: 'tenant' })
          } catch {
            crumbs.push({ name: mapCategoryName(segment), path: currentPath, type: 'tenant' })
          }
        }
        continue
      }

      // Any deeper levels treated as categories
      crumbs.push({ name: mapCategoryName(segment), path: currentPath, type: 'category' })
    }

    return crumbs
  } catch (error) {
    console.error('Error in getBreadcrumbs:', error)
    // Fallback: only root
    return [{ name: 'Cloud Storage', path: `user_${userId}`, type: 'root' }]
  }
}

// Unified server loader to fetch files, folders, and breadcrumbs for any path
export async function getPathContents(userId: string, path?: string): Promise<{
  files: StorageFile[]
  folders: VirtualFolder[]
  breadcrumbs: BreadcrumbItem[]
  error?: string
}> {
  try {
    const targetPath = path || `user_${userId}`
    const [{ files, folders, error }, breadcrumbs] = await Promise.all([
      getInitialFiles(userId, targetPath),
      getBreadcrumbs(userId, targetPath)
    ])
    return { files, folders, breadcrumbs, error }
  } catch (e) {
    console.error('Error in getPathContents:', e)
    return {
      files: [],
      folders: [],
      breadcrumbs: [{ name: 'Cloud Storage', path: `user_${userId}`, type: 'root' }],
      error: 'Unerwarteter Fehler beim Laden der Dateien'
    }
  }
}