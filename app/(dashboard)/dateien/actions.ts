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
  type: 'house' | 'apartment' | 'category' | 'storage'
  isEmpty: boolean
  fileCount: number
  displayName?: string
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
      fileCount: miscHasFiles ? miscContents.length : 0,
      displayName: 'Sonstiges'
    })

    // Check for any files directly in the root
    const { data: rootFiles } = await supabase.storage
      .from('documents')
      .list(targetPath, { limit: 100 })
    
    const files: StorageFile[] = []
    if (rootFiles) {
      rootFiles.forEach(item => {
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
    
    if (isHouseFolder) {
      const houseId = pathSegments[1]
      return await getHouseFolderContents(supabase, userId, houseId, targetPath, data || [])
    }

    // For other folders, process normally
    const files: StorageFile[] = []
    const folders: VirtualFolder[] = []

    ;(data || []).forEach(item => {
      // Skip placeholder files
      if (item.name === '.keep') return
      
      // Check if it's a folder (no metadata.size indicates a folder in Supabase)
      if (!item.metadata?.size && !item.name.includes('.')) {
        folders.push({
          name: item.name,
          path: `${targetPath}/${item.name}`,
          type: 'storage',
          isEmpty: true,
          fileCount: 0
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
      fileCount: houseDocsHasFiles ? houseDocsContents.length : 0,
      displayName: 'Hausdokumente'
    })
    
    // Add apartment folders
    if (apartments && apartments.length > 0) {
      for (const apartment of apartments) {
        // Check if apartment folder has any files
        const apartmentPath = `${targetPath}/${apartment.id}`
        const { data: apartmentContents } = await supabase.storage
          .from('documents')
          .list(apartmentPath, { limit: 1 })
        
        const hasFiles = apartmentContents && apartmentContents.length > 0
        
        folders.push({
          name: apartment.id,
          path: apartmentPath,
          type: 'apartment',
          isEmpty: !hasFiles,
          fileCount: hasFiles ? apartmentContents.length : 0,
          displayName: apartment.name
        })
      }
    }

    // Process any files directly in the house folder
    const files: StorageFile[] = []
    storageItems.forEach(item => {
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

// New function to handle apartment folder contents
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
    const apartmentDocsPath = `${apartmentPath}/apartment_documents`
    const { data: apartmentDocsContents } = await supabase.storage
      .from('documents')
      .list(apartmentDocsPath, { limit: 1 })
    
    const apartmentDocsHasFiles = apartmentDocsContents && apartmentDocsContents.length > 0
    
    folders.push({
      name: 'apartment_documents',
      path: apartmentDocsPath,
      type: 'category',
      isEmpty: !apartmentDocsHasFiles,
      fileCount: apartmentDocsHasFiles ? apartmentDocsContents.length : 0,
      displayName: 'Wohnungsdokumente'
    })
    
    // Add tenant folders
    if (tenants && tenants.length > 0) {
      for (const tenant of tenants) {
        // Check if tenant folder has any files
        const tenantPath = `${apartmentPath}/${tenant.id}`
        const { data: tenantContents } = await supabase.storage
          .from('documents')
          .list(tenantPath, { limit: 1 })
        
        const hasFiles = tenantContents && tenantContents.length > 0
        
        folders.push({
          name: tenant.id,
          path: tenantPath,
          type: 'category',
          isEmpty: !hasFiles,
          fileCount: hasFiles ? tenantContents.length : 0,
          displayName: tenant.name
        })
      }
    }

    // Get any files directly in the apartment folder
    const { data: apartmentFiles } = await supabase.storage
      .from('documents')
      .list(apartmentPath, { limit: 100 })
    
    const files: StorageFile[] = []
    if (apartmentFiles) {
      apartmentFiles.forEach(item => {
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
    console.error('Error in getApartmentFolderContents:', error)
    return {
      files: [],
      folders: [],
      error: 'Fehler beim Laden der Mieterordner'
    }
  }
}