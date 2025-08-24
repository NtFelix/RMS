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

// Cache for preventing concurrent requests to the same path
const requestCache = new Map<string, Promise<any>>()

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
      const supabase = await createClient()
      
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

    // Check if this is a house folder - if so, create apartment subfolders
    const pathSegments = targetPath.split('/')
    const userId = pathSegments[0].replace('user_', '')
    const isHouseFolder = pathSegments.length === 2 && pathSegments[1] !== 'Miscellaneous'
    const isApartmentFolder = pathSegments.length === 3 && pathSegments[1] !== 'Miscellaneous'
    
    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Debug - Path analysis:', {
        targetPath,
        pathSegments,
        userId,
        isHouseFolder,
        isApartmentFolder,
        segmentCount: pathSegments.length
      })
    }
    
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

// Helper function to count files recursively
async function countFilesRecursively(supabase: any, path: string): Promise<number> {
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
          // It's a file
          fileCount++
        } else if (!item.name.includes('.')) {
          // It's a folder, count recursively (with depth limit to prevent infinite loops)
          const depth = (path.match(/\//g) || []).length
          if (depth < 10) { // Limit recursion depth
            const subPath = `${path}/${item.name}`
            fileCount += await countFilesRecursively(supabase, subPath)
          }
        }
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
    let apartmentDocsContents = null
    try {
      const result = await supabase.storage
        .from('documents')
        .list(apartmentDocsPath, { limit: 1 })
      apartmentDocsContents = result.data
    } catch (error) {
      // Silently handle storage errors
      apartmentDocsContents = []
    }
    
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
      if (process.env.NODE_ENV === 'development') {
        console.log('Debug - Processing tenants for folders:', tenants.length)
      }
      
      for (const tenant of tenants) {
        try {
          // Count files recursively in tenant folder
          const tenantPath = `${targetPath}/${tenant.id}`
          let fileCount = 0
          
          try {
            fileCount = await countFilesRecursively(supabase, tenantPath)
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
    const supabase = await createClient()
    
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