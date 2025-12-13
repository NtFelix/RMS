'use server'

import { createSupabaseServerClient } from "@/lib/supabase-server"
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

// Cache for preventing concurrent requests to the same path
const requestCache = new Map<string, Promise<any>>()

// Helper function to check if a folder ID exists in the database
async function isValidHouseId(supabase: any, userId: string, houseId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('Haeuser')
      .select('id')
      .eq('id', houseId)
      .eq('user_id', userId)
      .single()
    
    return !error && data
  } catch {
    return false
  }
}

async function isValidApartmentId(supabase: any, userId: string, apartmentId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('Wohnungen')
      .select('id')
      .eq('id', apartmentId)
      .eq('user_id', userId)
      .single()
    
    return !error && data
  } catch {
    return false
  }
}

// Helper function to discover subdirectories by trying to list them directly
async function discoverSubdirectories(supabase: any, targetPath: string): Promise<VirtualFolder[]> {
  // For now, let's disable this function and rely on the normal listing
  // The issue seems to be that Supabase storage doesn't list empty directories
  // But when we create folders with .keep files, they should appear in the normal list
  return []
}

export async function getInitialFiles(userId: string, path?: string): Promise<{
  files: StorageFile[]
  folders: VirtualFolder[]
  error?: string
}> {
  const targetPath = path || `user_${userId}`
  const cacheKey = `${userId}:${targetPath}`
  
  // Check if there's already a request in progress for this path
  if (requestCache.has(cacheKey)) {
    try {
      return await requestCache.get(cacheKey)!
    } catch (error) {
      requestCache.delete(cacheKey)
      throw error
    }
  }
  
  // Create new request
  const request = (async () => {
    try {
      const supabase = await createSupabaseServerClient()
      
      // Verify user authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user || user.id !== userId) {
        redirect('/auth/login')
      }
      
      // If we're at the root level, create virtual folders based on database data
      if (targetPath === `user_${userId}`) {
        return await getRootLevelFolders(supabase, userId, targetPath)
      }
      
      // For other paths, list actual storage contents
      return await getStorageContents(supabase, targetPath)
    } catch (error) {
      // Log error only in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('Error in getInitialFiles:', error)
      }
      return {
        files: [],
        folders: [],
        error: error instanceof Error ? error.message : 'Unerwarteter Fehler beim Laden der Dateien'
      }
    } finally {
      // Clean up cache after request completes
      setTimeout(() => {
        requestCache.delete(cacheKey)
      }, 1000)
    }
  })()
  
  // Cache the request
  requestCache.set(cacheKey, request)
  
  return request
}

async function getRootLevelFolders(supabase: any, userId: string, targetPath: string): Promise<{
  files: StorageFile[]
  folders: VirtualFolder[]
  error?: string
}> {
  try {
    // Get houses from database with timeout
    const housesPromise = supabase
      .from('Haeuser')
      .select('id, name')
      .eq('user_id', userId)
    
    // Add timeout to prevent hanging requests
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 10000)
    })
    
    const { data: houses, error: housesError } = await Promise.race([
      housesPromise,
      timeoutPromise
    ]) as any
    
    if (housesError) {
      // Log error only in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('Could not load houses:', housesError)
      }
      // Continue with empty houses array instead of failing completely
    }

    const folders: VirtualFolder[] = []
    
    // Add house folders
    if (houses && houses.length > 0) {
      for (const house of houses) {
        // Check if house folder has any files (direct files only)
        const housePath = `${targetPath}/${house.id}`
        const fileCount = await countDirectFiles(supabase, housePath)
        const hasFiles = fileCount > 0
        
        folders.push({
          name: house.id,
          path: housePath,
          type: 'house',
          isEmpty: !hasFiles,
          children: [],
          fileCount: fileCount,
          displayName: house.name
        })
      }
    }
    
    // Add miscellaneous folder
    const miscPath = `${targetPath}/Miscellaneous`
    const miscFileCount = await countDirectFiles(supabase, miscPath)
    const miscHasFiles = miscFileCount > 0
    
    folders.push({
      name: 'Miscellaneous',
      path: miscPath,
      type: 'category',
      isEmpty: !miscHasFiles,
      children: [],
      fileCount: miscFileCount,
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

    // Try to discover custom folders by listing all files under the user directory
    try {
      // Get all files under the user directory (recursive)
      const { data: userFiles, error: userFilesError } = await supabase.storage
        .from('documents')
        .list(targetPath, {
          limit: 10000 // High limit to get all files
        })

      if (!userFilesError && userFiles) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Debug - Discovered custom folders:', {
            totalFiles: userFiles.length,
            targetPath
          })
        }

        const discoveredFolders = new Set<string>()

        // Look through all files to find directory indicators
        for (const file of userFiles) {
          if (file.name && file.name.includes('/')) {
            // This file is in a subdirectory
            const folderName = file.name.split('/')[0]
            discoveredFolders.add(folderName)
            

          } else if (file.name && !file.metadata && !file.name.includes('.')) {
            // This might be a directory itself
            discoveredFolders.add(file.name)
            

          }
        }

        // Add discovered folders to the list
        for (const folderName of discoveredFolders) {
          const exists = folders.some(f => f.name === folderName)
          if (!exists) {
            const folderPath = `${targetPath}/${folderName}`
            
            // Try to get more info about the folder (count direct files only)
            try {
              const fileCount = await countDirectFiles(supabase, folderPath)
              const isEmpty = fileCount === 0
              
              folders.push({
                name: folderName,
                path: folderPath,
                type: 'storage',
                isEmpty: isEmpty,
                children: [],
                fileCount: fileCount,
                displayName: folderName
              })


            } catch (error) {
              // If we can't list the folder contents, still add it
              folders.push({
                name: folderName,
                path: folderPath,
                type: 'storage',
                isEmpty: true,
                children: [],
                fileCount: 0,
                displayName: folderName
              })
            }
          }
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Debug - Error in root folder discovery:', error)
      }
    }

    return { files, folders }
  } catch (error) {
    // Log error only in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Error in getRootLevelFolders:', error)
    }
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
      // Log error only in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('Could not load storage contents for path:', targetPath, error)
      }
      return {
        files: [],
        folders: [],
        error: 'Fehler beim Laden der Dateien'
      }
    }



    // Check if this is a house or apartment folder - only if they exist in the database
    const pathSegments = targetPath.split('/')
    const userId = pathSegments[0].replace('user_', '')
    
    // Check if this could be a house folder (depth 2, not Miscellaneous)
    const couldBeHouseFolder = pathSegments.length === 2 && pathSegments[1] !== 'Miscellaneous'
    const couldBeApartmentFolder = pathSegments.length === 3 && pathSegments[1] !== 'Miscellaneous'
    
    let isActualHouseFolder = false
    let isActualApartmentFolder = false
    
    if (couldBeHouseFolder) {
      const houseId = pathSegments[1]
      isActualHouseFolder = await isValidHouseId(supabase, userId, houseId)
    }
    
    if (couldBeApartmentFolder) {
      const houseId = pathSegments[1]
      const apartmentId = pathSegments[2]
      // Only check if apartment is valid if the house is also valid
      const isValidHouse = await isValidHouseId(supabase, userId, houseId)
      if (isValidHouse) {
        isActualApartmentFolder = await isValidApartmentId(supabase, userId, apartmentId)
      }
    }
    
    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Debug - Path analysis:', {
        targetPath,
        pathSegments,
        userId,
        couldBeHouseFolder,
        couldBeApartmentFolder,
        isActualHouseFolder,
        isActualApartmentFolder,
        segmentCount: pathSegments.length
      })
    }
    
    if (isActualHouseFolder) {
      const houseId = pathSegments[1]
      return await getHouseFolderContents(supabase, userId, houseId, targetPath, data || [])
    }
    
    if (isActualApartmentFolder) {
      const houseId = pathSegments[1]
      const apartmentId = pathSegments[2]
      return await getApartmentFolderContentsInternal(supabase, userId, houseId, apartmentId, targetPath, data || [])
    }

    // For other folders, process normally
    const files: StorageFile[] = []
    const folders: VirtualFolder[] = []

    // First, process the items returned by Supabase
    ;(data || []).forEach((item: any) => {
      // Skip placeholder files
      if (item.name === '.keep') return
      
      // Check if it's a folder - Supabase returns folders as items with null metadata or no size
      // The key indicator is that folders have null metadata, not just size 0
      const isFolder = (item.metadata === null || item.metadata === undefined) && 
                      item.name !== '.keep'
      
      if (isFolder) {
        folders.push({
          name: item.name,
          path: `${targetPath}/${item.name}`,
          type: 'storage',
          isEmpty: true, // Default to true, will be updated by the client
          children: [], // Add children property
          fileCount: 0   // Default to 0, will be updated by the client
        })
      } else if (item.metadata?.size > 0) {
        // It's a file with actual content
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

    // Try to discover folders using search functionality
    try {
      const { data: searchResults, error: searchError } = await supabase.storage
        .from('documents')
        .list('', {
          limit: 1000,
          search: targetPath
        })

      if (!searchError && searchResults) {


        const targetPrefix = `${targetPath}/`
        const discoveredFolders = new Set<string>()

        for (const result of searchResults) {
          if (result.name && result.name.startsWith(targetPrefix)) {
            const relativePath = result.name.substring(targetPrefix.length)
            const pathParts = relativePath.split('/')
            
            if (pathParts.length >= 2) {
              const folderName = pathParts[0]
              discoveredFolders.add(folderName)
            }
          }
        }

        // Add discovered folders to the list
        for (const folderName of discoveredFolders) {
          const exists = folders.some(f => f.name === folderName)
          if (!exists) {
            const folderPath = `${targetPath}/${folderName}`
            
            // Try to get more info about the folder
            try {
              const { data: folderContents } = await supabase.storage
                .from('documents')
                .list(folderPath, { limit: 100 })
              
              folders.push({
                name: folderName,
                path: folderPath,
                type: 'storage',
                isEmpty: !folderContents || folderContents.filter((item: any) => item.name !== '.keep').length === 0,
                children: [],
                fileCount: folderContents ? folderContents.filter((item: any) => item.name !== '.keep').length : 0,
                displayName: folderName
              })

              if (process.env.NODE_ENV === 'development') {
                console.log('Debug - Added discovered folder:', {
                  folderName,
                  folderPath,
                  fileCount: folderContents ? folderContents.length : 0
                })
              }
            } catch (error) {
              // If we can't list the folder contents, still add it
              folders.push({
                name: folderName,
                path: folderPath,
                type: 'storage',
                isEmpty: true,
                children: [],
                fileCount: 0,
                displayName: folderName
              })
            }
          }
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Debug - Error in folder discovery:', error)
      }
    }

    return { files, folders }
  } catch (error) {
    // Log error only in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Unexpected error in getStorageContents:', error)
    }
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
    // Get apartments for this house from database with timeout
    const apartmentsPromise = supabase
      .from('Wohnungen')
      .select('id, name')
      .eq('haus_id', houseId)
      .eq('user_id', userId)
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database query timeout')), 8000)
    })
    
    const { data: apartments, error: apartmentsError } = await Promise.race([
      apartmentsPromise,
      timeoutPromise
    ]) as any
    
    if (apartmentsError) {
      // Log error only in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('Could not load apartments for house:', houseId, apartmentsError)
      }
      // Continue with empty apartments array
    }

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Debug - House apartment loading:', {
        houseId,
        userId,
        apartmentsFound: apartments?.length || 0,
        apartments: apartments?.map((a: any) => ({ id: a.id, name: a.name })) || [],
        error: apartmentsError
      })
    }

    const folders: VirtualFolder[] = []
    
    // Add house documents folder
    const houseDocsPath = `${targetPath}/house_documents`
    const houseDocsFileCount = await countDirectFiles(supabase, houseDocsPath)
    const houseDocsHasFiles = houseDocsFileCount > 0
    
    folders.push({
      name: 'house_documents',
      path: houseDocsPath,
      type: 'category',
      isEmpty: !houseDocsHasFiles,
      children: [],
      fileCount: houseDocsFileCount,
      displayName: 'Hausdokumente'
    })
    
    // Add apartment folders
    if (apartments && apartments.length > 0) {
      for (const apartment of apartments) {
        // Count direct files in apartment folder
        const apartmentPath = `${targetPath}/${apartment.id}`
        const fileCount = await countDirectFiles(supabase, apartmentPath)
        
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
    // Log error only in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Error in getHouseFolderContents:', error)
    }
    return {
      files: [],
      folders: [],
      error: 'Fehler beim Laden der Wohnungsordner'
    }
  }
}

// Helper function to count direct files only (not recursive)
async function countDirectFiles(supabase: any, path: string): Promise<number> {
  try {
    const { data: contents, error } = await supabase.storage
      .from('documents')
      .list(path, { limit: 100 })
    
    if (error || !contents) return 0
    
    let fileCount = 0
    
    for (const item of contents) {
      if (item.name === '.keep') continue
      
      try {
        if (item.metadata?.size) {
          // It's a file - count it
          fileCount++
        }
        // Don't count folders or recurse into them
      } catch (itemError) {
        // Skip problematic items instead of failing
        continue
      }
    }
    
    return fileCount
  } catch (error) {
    // Silently return 0 instead of logging errors
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
    const supabase = await createSupabaseServerClient()
    
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
    // Log error only in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Error in loadFilesForPath:', error)
    }
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
    // Get tenants for this apartment from database - simplified approach
    let tenants = []
    let tenantsError = null
    
    try {
      const { data: tenantsData, error } = await supabase
        .from('Mieter')
        .select('id, name, wohnung_id, user_id')
        .eq('wohnung_id', apartmentId)
        .eq('user_id', userId)
      
      tenants = tenantsData || []
      tenantsError = error
      
      // Debug logging in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Debug - Apartment tenant loading:', {
          apartmentId,
          houseId,
          userId,
          query: `wohnung_id=${apartmentId}, user_id=${userId}`,
          tenantsFound: tenants.length,
          tenants: tenants.map((t: any) => ({ 
            id: t.id, 
            name: t.name,
            wohnung_id: t.wohnung_id,
            user_id: t.user_id
          })),
          error: tenantsError
        })
      }
      
    } catch (error) {
      tenantsError = error
      tenants = []
      
      if (process.env.NODE_ENV === 'development') {
        console.warn('Could not load tenants for apartment:', apartmentId, error)
      }
    }

    const folders: VirtualFolder[] = []
    
    // Add apartment documents folder
    const apartmentDocsPath = `${targetPath}/apartment_documents`
    const apartmentDocsFileCount = await countDirectFiles(supabase, apartmentDocsPath)
    const apartmentDocsHasFiles = apartmentDocsFileCount > 0
    
    folders.push({
      name: 'apartment_documents',
      path: apartmentDocsPath,
      type: 'category',
      isEmpty: !apartmentDocsHasFiles,
      children: [],
      fileCount: apartmentDocsFileCount,
      displayName: 'Wohnungsdokumente'
    })
    
    // Add tenant folders
    if (tenants && tenants.length > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Debug - Processing tenants for folders:', tenants.length)
      }
      
      for (const tenant of tenants) {
        try {
          // Count files recursively in tenant folder
          const tenantPath = `${targetPath}/${tenant.id}`
          let fileCount = 0
          
          try {
            fileCount = await countDirectFiles(supabase, tenantPath)
          } catch (countError) {
            // If file counting fails, still create the folder
            if (process.env.NODE_ENV === 'development') {
              console.warn(`Could not count files for tenant ${tenant.id}:`, countError)
            }
            fileCount = 0
          }
          
          // Create display name from name field
          const displayName = tenant.name || tenant.id
          
          const tenantFolder = {
            name: tenant.id,
            path: tenantPath,
            type: 'tenant' as const,
            isEmpty: fileCount === 0,
            children: [],
            fileCount: fileCount,
            displayName: displayName
          }
          
          folders.push(tenantFolder)
          
          if (process.env.NODE_ENV === 'development') {
            console.log('Debug - Added tenant folder:', {
              tenantId: tenant.id,
              displayName,
              path: tenantPath,
              fileCount,
              isEmpty: fileCount === 0
            })
          }
          
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error(`Error processing tenant ${tenant.id}:`, error)
          }
          // Continue with other tenants
        }
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('Debug - No tenants found for apartment:', apartmentId)
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
    // Log error only in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Error in getApartmentFolderContentsInternal:', error)
    }
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
    const supabase = await createSupabaseServerClient()
    
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
    // Log error only in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Error in getApartmentFolderContents:', error)
    }
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
    const supabase = await createSupabaseServerClient()
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
        // Potential house level - check if it's actually a house in the database
        if (segment === 'Miscellaneous') {
          crumbs.push({ name: mapCategoryName(segment), path: currentPath, type: 'category' })
        } else {
          // Check if this is a valid house ID
          const isValidHouse = await isValidHouseId(supabase, userId, segment)
          if (isValidHouse) {
            try {
              const { data: house } = await supabase
                .from('Haeuser')
                .select('name')
                .eq('id', segment)
                .single()
              crumbs.push({ name: house?.name || segment, path: currentPath, type: 'house' })
            } catch {
              crumbs.push({ name: segment, path: currentPath, type: 'house' })
            }
          } else {
            // It's a custom folder, treat as category
            crumbs.push({ name: mapCategoryName(segment), path: currentPath, type: 'category' })
          }
        }
        continue
      }

      if (i === 2) {
        // Potential apartment level or category under house/custom folder
        if (segment === 'house_documents' || segment === 'Miscellaneous') {
          crumbs.push({ name: mapCategoryName(segment), path: currentPath, type: 'category' })
        } else {
          // Check if the parent is a valid house and this is a valid apartment
          const parentSegment = pathSegments[i - 1]
          const isParentValidHouse = await isValidHouseId(supabase, userId, parentSegment)
          
          if (isParentValidHouse) {
            const isValidApartment = await isValidApartmentId(supabase, userId, segment)
            if (isValidApartment) {
              try {
                const { data: apartment } = await supabase
                  .from('Wohnungen')
                  .select('name')
                  .eq('id', segment)
                  .single()
                crumbs.push({ name: apartment?.name || segment, path: currentPath, type: 'apartment' })
              } catch {
                crumbs.push({ name: segment, path: currentPath, type: 'apartment' })
              }
            } else {
              // It's a custom folder under a house
              crumbs.push({ name: mapCategoryName(segment), path: currentPath, type: 'category' })
            }
          } else {
            // Parent is not a house, so this is just a custom folder
            crumbs.push({ name: mapCategoryName(segment), path: currentPath, type: 'category' })
          }
        }
        continue
      }

      if (i === 3) {
        // Potential tenant level or category under apartment/custom folder
        if (segment === 'apartment_documents') {
          crumbs.push({ name: mapCategoryName(segment), path: currentPath, type: 'category' })
        } else {
          // Check if we're under a valid apartment
          const grandParentSegment = pathSegments[i - 2]
          const parentSegment = pathSegments[i - 1]
          const isGrandParentValidHouse = await isValidHouseId(supabase, userId, grandParentSegment)
          const isParentValidApartment = isGrandParentValidHouse && await isValidApartmentId(supabase, userId, parentSegment)
          
          if (isParentValidApartment) {
            try {
              const { data: tenant } = await supabase
                .from('Mieter')
                .select('name')
                .eq('id', segment)
                .single()
              const tenantName = tenant ? tenant.name : null
              crumbs.push({ name: tenantName || segment, path: currentPath, type: 'tenant' })
            } catch {
              // Not a valid tenant, treat as custom folder
              crumbs.push({ name: mapCategoryName(segment), path: currentPath, type: 'category' })
            }
          } else {
            // Not under a valid apartment, treat as custom folder
            crumbs.push({ name: mapCategoryName(segment), path: currentPath, type: 'category' })
          }
        }
        continue
      }

      // Any deeper levels treated as categories
      crumbs.push({ name: mapCategoryName(segment), path: currentPath, type: 'category' })
    }

    return crumbs
  } catch (error) {
    // Log error only in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Error in getBreadcrumbs:', error)
    }
    // Fallback: only root
    return [{ name: 'Cloud Storage', path: `user_${userId}`, type: 'root' }]
  }
}

// Debug function to check tenant data
export async function debugTenantData(userId: string, apartmentId: string): Promise<{
  tenants: any[]
  error?: string
}> {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user || user.id !== userId) {
      return { tenants: [], error: 'Not authenticated' }
    }

    // Get tenants for this apartment
    const { data: tenants, error: tenantsError } = await supabase
      .from('Mieter')
      .select('id, name, wohnung_id, user_id')
      .eq('wohnung_id', apartmentId)
      .eq('user_id', userId)

    if (tenantsError) {
      console.error('Debug - Tenant query error:', tenantsError)
      return { tenants: [], error: tenantsError.message }
    }

    console.log('Debug - Tenant query result:', {
      apartmentId,
      userId,
      tenants: tenants || [],
      count: tenants?.length || 0
    })

    return { tenants: tenants || [] }
  } catch (error) {
    console.error('Debug - Unexpected error:', error)
    return { tenants: [], error: error instanceof Error ? error.message : 'Unknown error' }
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
    // Log error only in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('Error in getPathContents:', e)
    }
    return {
      files: [],
      folders: [],
      breadcrumbs: [{ name: 'Cloud Storage', path: `user_${userId}`, type: 'root' }],
      error: 'Unerwarteter Fehler beim Laden der Dateien'
    }
  }
}

export async function deleteFolder(userId: string, folderPath: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createSupabaseServerClient()
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user || user.id !== userId) {
      return {
        success: false,
        error: 'Nicht authentifiziert'
      }
    }

    // Validate that the path belongs to the user
    if (!folderPath.startsWith(`user_${userId}`)) {
      return {
        success: false,
        error: 'Ungültiger Pfad'
      }
    }

    // Check if it's a protected system folder (house, apartment, tenant, or category folders)
    const pathSegments = folderPath.split('/')
    
    // Protect system folders and category folders
    if (pathSegments.length === 2) {
      // Root level folders - could be house folders or Miscellaneous
      if (pathSegments[1] === 'Miscellaneous') {
        return {
          success: false,
          error: 'Der Ordner "Sonstiges" ist ein Systemordner und kann nicht gelöscht werden'
        }
      }
    } else if (pathSegments.length === 3) {
      // Could be apartment folders or category folders like house_documents
      if (pathSegments[2] === 'house_documents') {
        return {
          success: false,
          error: 'Der Ordner "Hausdokumente" ist ein Systemordner und kann nicht gelöscht werden'
        }
      }
    } else if (pathSegments.length === 4) {
      // Could be tenant folders or category folders like apartment_documents
      if (pathSegments[3] === 'apartment_documents') {
        return {
          success: false,
          error: 'Der Ordner "Wohnungsdokumente" ist ein Systemordner und kann nicht gelöscht werden'
        }
      }
    }

    // Check if it's a system folder that exists in the database
    const isSystemFolder = pathSegments.length <= 4 && pathSegments[1] !== 'Miscellaneous'
    
    if (isSystemFolder) {
      // For system folders (house/apartment/tenant), we need to check if they exist in the database
      if (pathSegments.length === 2) {
        // House folder - check if house exists
        const houseId = pathSegments[1]
        const { data: house } = await supabase
          .from('Haeuser')
          .select('id')
          .eq('id', houseId)
          .eq('user_id', userId)
          .single()
        
        if (house) {
          return {
            success: false,
            error: 'Hausordner können nicht gelöscht werden, solange das Haus in der Datenbank existiert'
          }
        }
      } else if (pathSegments.length === 3) {
        // Apartment folder - check if apartment exists
        const apartmentId = pathSegments[2]
        const { data: apartment } = await supabase
          .from('Wohnungen')
          .select('id')
          .eq('id', apartmentId)
          .eq('user_id', userId)
          .single()
        
        if (apartment) {
          return {
            success: false,
            error: 'Wohnungsordner können nicht gelöscht werden, solange die Wohnung in der Datenbank existiert'
          }
        }
      } else if (pathSegments.length === 4) {
        // Tenant folder - check if tenant exists
        const tenantId = pathSegments[3]
        const { data: tenant } = await supabase
          .from('Mieter')
          .select('id')
          .eq('id', tenantId)
          .eq('user_id', userId)
          .single()
        
        if (tenant) {
          return {
            success: false,
            error: 'Mieterordner können nicht gelöscht werden, solange der Mieter in der Datenbank existiert'
          }
        }
      }
    }

    // List all files in the folder recursively
    const { data: allFiles, error: listError } = await supabase.storage
      .from('documents')
      .list(folderPath, {
        limit: 1000
      })

    if (listError) {
      return {
        success: false,
        error: `Fehler beim Auflisten der Dateien: ${listError.message}`
      }
    }

    // Collect all file paths to delete
    const filesToDelete: string[] = []
    
    if (allFiles && allFiles.length > 0) {
      // Get all files in the folder
      for (const item of allFiles) {
        if (item.name !== '.keep') {
          filesToDelete.push(`${folderPath}/${item.name}`)
        }
      }

      // Also check for nested folders by searching for files with the folder prefix
      const { data: nestedFiles, error: nestedError } = await supabase.storage
        .from('documents')
        .list('', {
          limit: 10000,
          search: folderPath
        })

      if (!nestedError && nestedFiles) {
        const folderPrefix = `${folderPath}/`
        for (const file of nestedFiles) {
          if (file.name && file.name.startsWith(folderPrefix) && file.name !== `${folderPath}/.keep`) {
            filesToDelete.push(file.name)
          }
        }
      }
    }

    // Delete all files in the folder
    if (filesToDelete.length > 0) {
      const { error: deleteError } = await supabase.storage
        .from('documents')
        .remove(filesToDelete)

      if (deleteError) {
        return {
          success: false,
          error: `Fehler beim Löschen der Dateien: ${deleteError.message}`
        }
      }
    }

    // Also remove the .keep file if it exists
    const { error: keepError } = await supabase.storage
      .from('documents')
      .remove([`${folderPath}/.keep`])

    // Don't fail if .keep file doesn't exist
    if (keepError && !keepError.message.includes('not found')) {
      console.warn('Could not remove .keep file:', keepError)
    }

    return {
      success: true
    }
  } catch (error) {
    console.error('Error in deleteFolder:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unerwarteter Fehler beim Löschen des Ordners'
    }
  }
}

