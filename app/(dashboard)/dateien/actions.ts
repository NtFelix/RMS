'use server'

import { ensureAuth } from '@/lib/auth-utils'
import { checkStoragePathAccess, getActiveOrgId } from '@/lib/storage-access'
import { STORAGE_ROOT_LABEL } from '@/lib/storage-navigation'
import { FOLDER_NOT_AVAILABLE_MESSAGE, isPermissionDeniedMessage, mapFolderRpcError } from '@/lib/storage-messages'
import { folderMetadataFilter, isPathInFolder, orgRoot, parseStoragePath } from '@/lib/storage-paths'
import { unstable_rethrow } from 'next/navigation'

/**
 * Unified Document Navigation Actions
 * 
 * This module provides a simplified, reliable approach to document navigation
 * by delegating all folder/file fetching logic to a single database RPC function.
 * 
 * Benefits:
 * - Single source of truth (database)
 * - Consistent behavior between local and production
 * - Reduced network round-trips
 * - Atomic, reliable operations
 */

// Unified logging for RPC calls (matches the project's logger format)
export async function logRpcCall(
    functionName: string,
    path: string,
    startTime: number,
    success: boolean,
    options?: {
        folderCount?: number
        fileCount?: number
        totalSize?: number
        error?: string | null
    }
) {
    const duration = Math.round(performance.now() - startTime)
    const timestamp = new Date().toISOString()
    const status = success ? '✅' : '❌'
    const level = success ? 'INFO' : 'ERROR'

    // Truncate path for display
    const displayPath = path.length > 60 ? '...' + path.slice(-57) : path

    // Build context object
    const context: Record<string, unknown> = {
        functionName,
        path: displayPath,
        executionTime: `${duration}ms`,
        success
    }

    if (options?.folderCount !== undefined) context.folders = options.folderCount
    if (options?.fileCount !== undefined) context.files = options.fileCount
    if (options?.totalSize && options.totalSize > 0) context.totalSize = formatBytes(options.totalSize)
    if (options?.error) context.error = options.error

    // Format like the project's logger: timestamp, level, message, then context on new line
    const message = `${status} RPC: ${functionName} completed in ${duration}ms`
    const contextString = `\nContext: ${JSON.stringify(context, null, 2)}`

    console.log(`[${timestamp}] [${level}] ${message}${contextString}`)
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export interface StorageFile {
    name: string
    id: string
    updated_at: string
    created_at: string
    last_accessed_at: string
    metadata: Record<string, unknown>
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

export interface FolderContentsResult {
    files: StorageFile[]
    folders: VirtualFolder[]
    breadcrumbs: BreadcrumbItem[]
    totalSize: number
    error?: string
}

/**
 * Unified function to get all folder contents via the database RPC.
 * This is the ONLY function needed to load files, folders, and breadcrumbs.
 * 
 * The user is always the one of the session (ensureAuth), it is never passed in by the caller.
 *
 * @param path - The current storage path (e.g., "org_{orgId}/shared/{houseId}/{apartmentId}"), default: the organisation root
 * @returns Complete folder contents including files, folders, breadcrumbs, and total storage size
 */
export async function getFolderContents(path?: string): Promise<FolderContentsResult> {
    const startTime = performance.now()

    try {
        const { user, supabase } = await ensureAuth()

        // Validate that the path belongs to the active organisation and an accessible house (the single
        // access check of all folder loads, loadFilesForPath goes through here). Without a path the
        // organisation root is loaded, which is derived from the active organisation below.
        if (path) {
            const accessError = await checkStoragePathAccess(supabase, user.id, path, { allowLegacyOwnRead: true })
            if (accessError) {
                return {
                    files: [],
                    folders: [],
                    breadcrumbs: [],
                    totalSize: 0,
                    error: FOLDER_NOT_AVAILABLE_MESSAGE
                }
            }
        }

        const orgId = await getActiveOrgId(supabase)
        if (!orgId) {
            return {
                files: [],
                folders: [],
                breadcrumbs: [],
                totalSize: 0,
                error: 'Keine aktive Organisation'
            }
        }
        const rootPath = orgRoot(orgId)
        const targetPath = path || rootPath

        // Call the unified RPC function
        const { data, error } = await supabase.rpc('get_folder_contents', {
            p_current_path: targetPath
        })

        if (error) {
            await logRpcCall('get_folder_contents', targetPath, startTime, false, {
                error: error.message
            })
            console.error('Error calling get_folder_contents RPC:', error)
            return {
                files: [],
                folders: [],
                breadcrumbs: [{ name: STORAGE_ROOT_LABEL, path: rootPath, type: 'root' }],
                totalSize: 0,
                // A refusal by the database (RLS / missing privilege) gets the same text as a refused path
                error: isPermissionDeniedMessage(error.message) || error.code === '42501'
                    ? FOLDER_NOT_AVAILABLE_MESSAGE
                    : `Fehler beim Laden der Ordnerinhalte: ${error.message}`
            }
        }

        // The RPC returns a JSONB object, parse it
        const result = data as {
            files: StorageFile[]
            folders: VirtualFolder[]
            breadcrumbs: BreadcrumbItem[]
            totalSize: number
            error: string | null
        }

        if (result.error) {
            await logRpcCall('get_folder_contents', targetPath, startTime, false, {
                error: result.error
            })
            return {
                files: [],
                folders: [],
                breadcrumbs: [{ name: STORAGE_ROOT_LABEL, path: rootPath, type: 'root' }],
                totalSize: 0,
                // `Invalid path: house not accessible` and the like come from the database in English
                error: mapFolderRpcError(result.error)
            }
        }

        // Log successful RPC call
        await logRpcCall('get_folder_contents', targetPath, startTime, true, {
            folderCount: result.folders?.length ?? 0,
            fileCount: result.files?.length ?? 0,
            totalSize: result.totalSize ?? 0
        })

        return {
            files: result.files || [],
            folders: result.folders || [],
            breadcrumbs: result.breadcrumbs || [{ name: STORAGE_ROOT_LABEL, path: rootPath, type: 'root' }],
            totalSize: result.totalSize || 0
        }

    } catch (error) {
        unstable_rethrow(error)

        await logRpcCall('get_folder_contents', path ?? '', startTime, false, {
            error: error instanceof Error ? error.message : 'Unknown error'
        })
        console.error('Unexpected error in getFolderContents:', error)
        return {
            files: [],
            folders: [],
            breadcrumbs: [],
            totalSize: 0,
            error: error instanceof Error ? error.message : 'Unerwarteter Fehler beim Laden der Ordnerinhalte'
        }
    }
}

/**
 * Backward compatible alias for getFolderContents
 * Used by: dateien pages, cloud-storage.tsx
 */
export async function getPathContents(path?: string): Promise<FolderContentsResult> {
    return getFolderContents(path)
}

/**
 * Backward compatible alias for getFolderContents
 * Used by: use-cloud-storage-store.tsx, use-cloud-storage-navigation.tsx
 */
export async function loadFilesForPath(path: string): Promise<FolderContentsResult> {
    // The path check (organisation and house scope) is part of getFolderContents
    return getFolderContents(path)
}

/**
 * Get total storage usage for a user
 * This is included in the unified RPC response, but exposed separately for backward compatibility
 */
export async function getTotalStorageUsage(): Promise<number> {
    try {
        const result = await getFolderContents()
        return result.totalSize
    } catch (error) {
        console.error('Error getting storage usage:', error)
        return 0
    }
}

/**
 * Delete a folder and all its contents
 * NOTE: This operation is separate from the navigation RPC for safety
 */
export async function deleteFolder(folderPath: string): Promise<{
    success: boolean
    error?: string
}> {
    try {
        const { user, supabase } = await ensureAuth()

        const { hasPermission } = await import('@/lib/permissions')
        if (!(await hasPermission('dokumente', 'loeschen'))) {
            return {
                success: false,
                error: 'Keine Berechtigung'
            }
        }

        // Validate that the path belongs to the active organisation and an accessible house
        const accessError = await checkStoragePathAccess(supabase, user.id, folderPath, { mode: 'write' })
        if (accessError) {
            return {
                success: false,
                error: 'Ungültiger Pfad'
            }
        }

        // Protect zone roots, house folders and system folders at their structural position
        const parsed = parseStoragePath(folderPath)
        const rest = parsed.rest
        if (parsed.zone === 'root' || rest.length === 0) {
            return { success: false, error: 'Dieser Ordner ist ein Systemordner und kann nicht gelöscht werden.' }
        }
        if (parsed.zone === 'private' && rest[0] === 'Miscellaneous' && rest.length === 1) {
            return { success: false, error: 'Der Ordner "Sonstiges" ist ein Systemordner und kann nicht gelöscht werden.' }
        }
        if (parsed.zone === 'shared' && rest.length === 1 && rest[0] === 'house_documents') {
            return { success: false, error: 'Der Ordner "Hausdokumente" ist ein Systemordner und kann nicht gelöscht werden.' }
        }
        if (parsed.zone === 'shared' && rest.length === 2 && rest[1] === 'apartment_documents') {
            return { success: false, error: 'Der Ordner "Wohnungsdokumente" ist ein Systemordner und kann nicht gelöscht werden.' }
        }

        // Check for virtual folders (apartment/tenant) based on their position below the house
        if (parsed.zone === 'shared' && rest.length === 1) {
            // Potential apartment folder at org/shared/house/apartment
            const apartmentId = rest[0]
            const { data: apartment } = await supabase
                .from('Wohnungen')
                .select('id, haus_id')
                .eq('id', apartmentId)
                .maybeSingle()

            if (apartment) {
                const { verifyWohnungInScope } = await import('@/lib/api-permissions')
                if (!(await verifyWohnungInScope(apartmentId))) {
                    return {
                        success: false,
                        error: 'Zugriff verweigert (Wohnung nicht im Scope)'
                    }
                }
                return {
                    success: false,
                    error: 'Wohnungsordner können nicht gelöscht werden, solange die Wohnung existiert.'
                }
            }
        } else if (parsed.zone === 'shared' && rest.length === 2) {
            // Potential tenant folder at org/shared/house/apartment/tenant
            const tenantId = rest[1]
            const { data: tenant } = await supabase
                .from('Mieter')
                .select('id, wohnung_id')
                .eq('id', tenantId)
                .maybeSingle()

            if (tenant) {
                const { verifyWohnungInScope } = await import('@/lib/api-permissions')
                if (tenant.wohnung_id && !(await verifyWohnungInScope(tenant.wohnung_id))) {
                    return {
                        success: false,
                        error: 'Zugriff verweigert (Mieter nicht im Scope)'
                    }
                }
                return {
                    success: false,
                    error: 'Mieterordner können nicht gelöscht werden, solange der Mieter existiert.'
                }
            }
        }

        // Get all files to delete from the database: exactly this folder and its sub-folders, never a
        // sibling with the same prefix (Rechnungen vs. Rechnungen2) and no LIKE wildcards from the name
        const { data: folderRows, error: listError } = await supabase
            .from('Dokumente_Metadaten')
            .select('dateipfad, dateiname')
            .or(folderMetadataFilter(folderPath))

        if (listError) {
            return {
                success: false,
                error: `Fehler beim Auflisten der Dateien: ${listError.message}`
            }
        }
        // PostgREST turns a literal `*` of a LIKE value into a wildcard: the exact check is repeated on the rows
        const filesToDelete = (folderRows ?? []).filter(file => isPathInFolder(file.dateipfad, folderPath))

        // Delete files from storage
        if (filesToDelete.length > 0) {
            const storagePaths = filesToDelete.map(file => `${file.dateipfad}/${file.dateiname}`)

            const { error: deleteError } = await supabase.storage
                .from('documents')
                .remove(storagePaths)

            if (deleteError) {
                return {
                    success: false,
                    error: `Fehler beim Löschen der Dateien: ${deleteError.message}`
                }
            }
        }

        // Also remove any .keep files
        await supabase.storage
            .from('documents')
            .remove([`${folderPath}/.keep`])

        // Note: Deletion of metadata from the 'Dokumente_Metadaten' table is handled
        // automatically by a database trigger that observes deletions from 'storage.objects'.
        return { success: true }

    } catch (error) {
        console.error('Error in deleteFolder:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unerwarteter Fehler beim Löschen des Ordners'
        }
    }
}
