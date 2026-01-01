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

/**
 * Interface representing a record from the Dokumente_Metadaten database table.
 * Used for type-safe handling of file metadata throughout the application.
 */
export interface DokumenteMetadaten {
  id: string
  dateiname: string
  dateipfad: string
  dateigroesse: number | null
  mime_type: string | null
  user_id: string
  erstellungsdatum: string | null
  aktualisierungsdatum: string | null
  letzter_zugriff: string | null
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

/**
 * Helper function to convert a database record from Dokumente_Metadaten to a StorageFile object.
 * Centralizes the mapping logic to ensure consistency and maintainability (DRY).
 */
function mapDbFileToStorageFile(item: DokumenteMetadaten): StorageFile {
  return {
    name: item.dateiname,
    id: item.id,
    // Use cascading fallbacks: updated_at falls back to erstellungsdatum then Unix epoch
    updated_at: item.aktualisierungsdatum || item.erstellungsdatum || new Date(0).toISOString(),
    created_at: item.erstellungsdatum || new Date(0).toISOString(),
    // last_accessed_at falls back to updated_at then erstellungsdatum then Unix epoch
    last_accessed_at: item.letzter_zugriff || item.aktualisierungsdatum || item.erstellungsdatum || new Date(0).toISOString(),
    metadata: {
      mimetype: item.mime_type,
      size: item.dateigroesse
    },
    size: Number(item.dateigroesse) || 0,
  }
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
    // OPTIMIZATION: Fetch houses, system folder counts, and root files in parallel
    const houseDocsPath = `${targetPath}/house_documents`
    const miscPath = `${targetPath}/Miscellaneous`

    const [housesResult, systemFolderCounts, dbRootFilesResult] = await Promise.all([
      // Get houses and their file counts from RPC
      supabase.rpc('get_virtual_folders', {
        p_user_id: userId,
        p_current_path: targetPath
      }),
      // Get counts for system folders in a single query
      countDirectFilesForPaths(supabase, [houseDocsPath, miscPath], userId),
      // Get root files
      supabase
        .from('Dokumente_Metadaten')
        .select('*')
        .eq('dateipfad', targetPath)
        .eq('user_id', userId)
        .order('dateiname', { ascending: true })
    ])

    const houses = housesResult.data
    const housesError = housesResult.error

    if (housesError) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Could not load houses via RPC:', housesError)
      }
    }

    const folders: VirtualFolder[] = []

    // Add house folders
    if (houses && houses.length > 0) {
      for (const house of houses) {
        folders.push({
          name: house.id,
          path: house.path,
          type: 'house',
          isEmpty: house.file_count === 0,
          children: [],
          fileCount: Number(house.file_count),
          displayName: house.name
        })
      }
    }

    // Add house documents folder (using batch count)
    const houseDocsFileCount = systemFolderCounts.get(houseDocsPath) || 0
    folders.push({
      name: 'house_documents',
      path: houseDocsPath,
      type: 'category',
      isEmpty: houseDocsFileCount === 0,
      children: [],
      fileCount: houseDocsFileCount,
      displayName: 'Hausdokumente'
    })

    // Add miscellaneous folder (using batch count)
    const miscFileCount = systemFolderCounts.get(miscPath) || 0
    folders.push({
      name: 'Miscellaneous',
      path: miscPath,
      type: 'category',
      isEmpty: miscFileCount === 0,
      children: [],
      fileCount: miscFileCount,
      displayName: 'Sonstiges'
    })

    // Process root files from parallel query result
    const dbRootFiles = dbRootFilesResult.data
    const files: StorageFile[] = []
    if (dbRootFiles) {
      dbRootFiles.forEach((item: DokumenteMetadaten) => {
        if (item.dateiname !== '.keep') {
          files.push(mapDbFileToStorageFile(item))
        }
      })
    }

    // Try to discover custom folders by querying the database
    try {
      // Get all distinct paths that start with targetPath/
      const { data: subfolderPaths } = await supabase
        .from('Dokumente_Metadaten')
        .select('dateipfad')
        .like('dateipfad', `${targetPath}/%`)
        .eq('user_id', userId)

      if (subfolderPaths) {
        const discoveredFolders = new Set<string>()

        // Look through all paths to find direct subdirectories
        for (const item of subfolderPaths) {
          const fullPath = item.dateipfad
          // relative path from targetPath
          const relativePath = fullPath.substring(targetPath.length + 1)
          const firstSegment = relativePath.split('/')[0]

          if (firstSegment) {
            discoveredFolders.add(firstSegment)
          }
        }

        // Add discovered folders to the list
        for (const folderName of discoveredFolders) {
          // Skip if already added (e.g. houses or Miscellaneous)
          const exists = folders.some(f => f.name === folderName)
          if (!exists) {
            const folderPath = `${targetPath}/${folderName}`

            // Try to get more info about the folder (count direct files only)
            try {
              const fileCount = await countDirectFiles(supabase, folderPath, userId)
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
              // If we can't count files, still add it
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
    const pathSegments = targetPath.split('/')
    const userId = pathSegments[0].replace('user_', '')

    // 1. Get files from DB
    const { data: dbFiles, error: dbError } = await supabase
      .from('Dokumente_Metadaten')
      .select('*')
      .eq('dateipfad', targetPath)
      .eq('user_id', userId)
      .order('dateiname', { ascending: true })

    if (dbError) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Error querying Dokumente_Metadaten:', dbError)
      }
      return {
        files: [],
        folders: [],
        error: 'Fehler beim Laden der Dateien'
      }
    }

    const files: StorageFile[] = (dbFiles || [])
      .filter((item: DokumenteMetadaten) => item.dateiname !== '.keep')
      .map((item: DokumenteMetadaten) => mapDbFileToStorageFile(item))

    // Check if this is a house or apartment folder - only if they exist in the database
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

    if (isActualHouseFolder) {
      const houseId = pathSegments[1]
      return await getHouseFolderContents(supabase, userId, houseId, targetPath, files)
    }

    if (isActualApartmentFolder) {
      const houseId = pathSegments[1]
      const apartmentId = pathSegments[2]
      return await getApartmentFolderContentsInternal(supabase, userId, houseId, apartmentId, targetPath, files)
    }

    // For other folders, process normally
    const folders: VirtualFolder[] = []

    // 2. Get subfolders
    // Query all dateipfad that start with targetPath + '/'
    // We fetch distinct paths to identify subfolders
    const { data: subfolderPaths } = await supabase
      .from('Dokumente_Metadaten')
      .select('dateipfad')
      .like('dateipfad', `${targetPath}/%`)
      .eq('user_id', userId)

    const discoveredFolderNames = new Set<string>()

    if (subfolderPaths) {
      subfolderPaths.forEach((item: { dateipfad: string }) => {
        const fullPath = item.dateipfad
        const relativePath = fullPath.substring(targetPath.length + 1)
        const firstSegment = relativePath.split('/')[0]
        if (firstSegment) {
          discoveredFolderNames.add(firstSegment)
        }
      })
    }

    // Add discovered folders with proper file counts
    for (const folderName of discoveredFolderNames) {
      const folderPath = `${targetPath}/${folderName}`
      const fileCount = await countDirectFiles(supabase, folderPath, userId)
      folders.push({
        name: folderName,
        path: folderPath,
        type: 'storage',
        isEmpty: fileCount === 0,
        children: [],
        fileCount: fileCount,
        displayName: folderName
      })
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

async function getHouseFolderContents(supabase: any, userId: string, houseId: string, targetPath: string, files: StorageFile[]): Promise<{
  files: StorageFile[]
  folders: VirtualFolder[]
  error?: string
}> {
  try {
    // Get apartments and their file counts from RPC
    const { data: apartments, error: apartmentsError } = await supabase
      .rpc('get_virtual_folders', {
        p_user_id: userId,
        p_current_path: targetPath
      })

    if (apartmentsError) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Could not load apartments via RPC:', apartmentsError)
      }
    }

    const folders: VirtualFolder[] = []

    // Add house documents folder
    const houseDocsPath = `${targetPath}/house_documents`
    const houseDocsFileCount = await countDirectFiles(supabase, houseDocsPath, userId)
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
        folders.push({
          name: apartment.id,
          path: apartment.path,
          type: 'apartment',
          isEmpty: apartment.file_count === 0,
          children: [],
          fileCount: Number(apartment.file_count),
          displayName: apartment.name
        })
      }
    }

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

// Helper function to count direct files only (not recursive, excludes .keep files)
async function countDirectFiles(supabase: any, path: string, userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('Dokumente_Metadaten')
      .select('*', { count: 'exact', head: true })
      .eq('dateipfad', path)
      .neq('dateiname', '.keep')
      .eq('user_id', userId)

    if (error) return 0
    return count || 0
  } catch (error) {
    return 0
  }
}

// OPTIMIZATION: Batch file count for multiple paths in a single query
// This reduces N sequential DB calls to 1 query for folder file counts
async function countDirectFilesForPaths(supabase: any, paths: string[], userId: string): Promise<Map<string, number>> {
  const counts = new Map<string, number>()

  // Initialize all paths to 0
  paths.forEach(path => counts.set(path, 0))

  if (paths.length === 0) return counts

  try {
    // Use a single query to get counts for all paths using GROUP BY
    // We can't use head: true with group by, so we fetch all records and count client-side
    // But this is still more efficient than N separate queries
    const { data, error } = await supabase
      .from('Dokumente_Metadaten')
      .select('dateipfad')
      .in('dateipfad', paths)
      .neq('dateiname', '.keep')
      .eq('user_id', userId)

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Error in batch file count:', error)
      }
      return counts
    }

    // Count occurrences of each path
    if (data) {
      data.forEach((item: { dateipfad: string }) => {
        const current = counts.get(item.dateipfad) || 0
        counts.set(item.dateipfad, current + 1)
      })
    }

    return counts
  } catch (error) {
    return counts
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
async function getApartmentFolderContentsInternal(supabase: any, userId: string, houseId: string, apartmentId: string, targetPath: string, files: StorageFile[]): Promise<{
  files: StorageFile[]
  folders: VirtualFolder[]
  error?: string
}> {
  try {
    // Get tenants and their file counts from RPC
    const { data: tenants, error: tenantsError } = await supabase
      .rpc('get_virtual_folders', {
        p_user_id: userId,
        p_current_path: targetPath
      })

    if (tenantsError) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Could not load tenants via RPC:', tenantsError)
      }
    }

    const folders: VirtualFolder[] = []

    // Add apartment documents folder
    const apartmentDocsPath = `${targetPath}/apartment_documents`
    const apartmentDocsFileCount = await countDirectFiles(supabase, apartmentDocsPath, userId)
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
      for (const tenant of tenants) {
        folders.push({
          name: tenant.id,
          path: tenant.path,
          type: 'tenant',
          isEmpty: tenant.file_count === 0,
          children: [],
          fileCount: Number(tenant.file_count),
          displayName: tenant.name || tenant.id
        })
      }
    }

    // Process any files directly in the apartment folder
    // files argument already contains the StorageFile objects from the DB
    // No need to map or filter storageItems anymore

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

    // Get files from DB
    const { data: dbFiles, error: dbError } = await supabase
      .from('Dokumente_Metadaten')
      .select('*')
      .eq('dateipfad', apartmentPath)
      .eq('user_id', userId)
      .order('dateiname', { ascending: true })

    if (dbError) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Error querying Dokumente_Metadaten:', dbError)
      }
      return {
        files: [],
        folders: [],
        error: 'Fehler beim Laden der Dateien'
      }
    }

    const files: StorageFile[] = (dbFiles || []).map((item: DokumenteMetadaten) => mapDbFileToStorageFile(item))

    return await getApartmentFolderContentsInternal(supabase, userId, houseId, apartmentId, apartmentPath, files)
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

// Server-side breadcrumb builder with friendly names - OPTIMIZED VERSION
// Batches all database queries and resolves entity names in parallel
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

    // OPTIMIZATION: Extract all potential entity IDs first, then batch fetch
    const potentialHouseId = pathSegments[1]
    const potentialApartmentId = pathSegments[2]
    const potentialTenantId = pathSegments[3]

    // Known category names that should not trigger DB lookups
    const categoryNames = ['Miscellaneous', 'house_documents', 'apartment_documents']

    // Batch fetch all entity data in parallel
    const [houseResult, apartmentResult, tenantResult] = await Promise.all([
      // Only fetch house if it's not a known category
      potentialHouseId && !categoryNames.includes(potentialHouseId)
        ? supabase
          .from('Haeuser')
          .select('id, name')
          .eq('id', potentialHouseId)
          .eq('user_id', userId)
          .single()
        : Promise.resolve({ data: null, error: null }),

      // Only fetch apartment if there's a potential apartment ID and parent exists
      potentialApartmentId &&
        potentialHouseId &&
        !categoryNames.includes(potentialApartmentId) &&
        !categoryNames.includes(potentialHouseId)
        ? supabase
          .from('Wohnungen')
          .select('id, name')
          .eq('id', potentialApartmentId)
          .eq('user_id', userId)
          .single()
        : Promise.resolve({ data: null, error: null }),

      // Only fetch tenant if there are valid parent paths
      potentialTenantId &&
        potentialApartmentId &&
        !categoryNames.includes(potentialTenantId) &&
        !categoryNames.includes(potentialApartmentId)
        ? supabase
          .from('Mieter')
          .select('id, name')
          .eq('id', potentialTenantId)
          .eq('user_id', userId)
          .single()
        : Promise.resolve({ data: null, error: null })
    ])

    // Cache the resolved entity names
    const entityNames = new Map<string, { name: string; type: BreadcrumbItem['type'] }>()

    if (houseResult.data) {
      entityNames.set(potentialHouseId, { name: houseResult.data.name, type: 'house' })
    }
    if (apartmentResult.data && houseResult.data) {
      // Only valid if house exists
      entityNames.set(potentialApartmentId, { name: apartmentResult.data.name, type: 'apartment' })
    }
    if (tenantResult.data && apartmentResult.data && houseResult.data) {
      // Only valid if both house and apartment exist
      entityNames.set(potentialTenantId, { name: tenantResult.data.name, type: 'tenant' })
    }

    // Build breadcrumbs using the cached data
    let currentPath = rootPath
    for (let i = 1; i < pathSegments.length; i++) {
      const segment = pathSegments[i]
      currentPath = `${currentPath}/${segment}`

      // Check if this segment is a known category
      if (categoryNames.includes(segment)) {
        crumbs.push({ name: mapCategoryName(segment), path: currentPath, type: 'category' })
        continue
      }

      // Check if we have cached entity data for this segment
      const entityInfo = entityNames.get(segment)
      if (entityInfo) {
        crumbs.push({ name: entityInfo.name || segment, path: currentPath, type: entityInfo.type })
      } else {
        // Unknown segment - treat as custom folder
        crumbs.push({ name: segment, path: currentPath, type: 'category' })
      }
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

export async function deleteFolder(userId: string, folderPath: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()

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

    // List all files in the folder recursively from DB to delete them
    // We need to delete from Storage AND DB.

    // 1. Get all files in this folder and subfolders from DB
    const { data: filesToDelete, error: listError } = await supabase
      .from('Dokumente_Metadaten')
      .select('dateipfad, dateiname')
      .like('dateipfad', `${folderPath}%`)
      .eq('user_id', userId)

    if (listError) {
      return {
        success: false,
        error: `Fehler beim Auflisten der Dateien: ${listError.message}`
      }
    }

    // 2. Delete from Storage
    const storagePaths: string[] = []
    if (filesToDelete && filesToDelete.length > 0) {
      filesToDelete.forEach((file: any) => {
        storagePaths.push(`${file.dateipfad}/${file.dateiname}`)
      })

      const { error: deleteError } = await supabase.storage
        .from('documents')
        .remove(storagePaths)

      if (deleteError) {
        return {
          success: false,
          error: `Fehler beim Löschen der Dateien aus dem Speicher: ${deleteError.message}`
        }
      }
    }

    // 3. Delete from DB
    // This is now handled by the database trigger on storage.objects
    // We keep the code comment to indicate this change
    /*
    const { error: dbDeleteError } = await supabase
      .from('Dokumente_Metadaten')
      .delete()
      .like('dateipfad', `${folderPath}%`)
      .eq('user_id', userId)

    if (dbDeleteError) {
      console.error('Failed to delete files from Dokumente_Metadaten:', dbDeleteError)
    }
    */

    // Also remove the .keep file if it exists (not in DB)
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

export async function getTotalStorageUsage(userId: string): Promise<number> {
  try {
    const supabase = await createClient()

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user || user.id !== userId) {
      return 0
    }

    const { data, error } = await supabase
      .rpc('calculate_storage_usage', { target_user_id: userId })

    if (error) {
      console.error('Error calculating storage usage:', error)
      return 0
    }

    return Number(data) || 0
  } catch (error) {
    console.error('Unexpected error calculating storage usage:', error)
    return 0
  }
}

