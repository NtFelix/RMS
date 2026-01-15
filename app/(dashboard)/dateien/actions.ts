'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

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
 * @param userId - The user's UUID
 * @param path - The current storage path (e.g., "user_uuid/house_uuid/apartment_uuid")
 * @returns Complete folder contents including files, folders, breadcrumbs, and total storage size
 */
export async function getFolderContents(userId: string, path?: string): Promise<FolderContentsResult> {
    const targetPath = path || `user_${userId}`
    const startTime = performance.now()

    try {
        const supabase = await createClient()

        // Verify user authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user || user.id !== userId) {
            redirect('/auth/login')
        }

        // Call the unified RPC function
        const { data, error } = await supabase.rpc('get_folder_contents', {
            p_user_id: userId,
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
                breadcrumbs: [{ name: 'Cloud Storage', path: `user_${userId}`, type: 'root' }],
                totalSize: 0,
                error: `Fehler beim Laden der Ordnerinhalte: ${error.message}`
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
                breadcrumbs: [{ name: 'Cloud Storage', path: `user_${userId}`, type: 'root' }],
                totalSize: 0,
                error: result.error
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
            breadcrumbs: result.breadcrumbs || [{ name: 'Cloud Storage', path: `user_${userId}`, type: 'root' }],
            totalSize: result.totalSize || 0
        }

    } catch (error) {
        await logRpcCall('get_folder_contents', targetPath, startTime, false, {
            error: error instanceof Error ? error.message : 'Unknown error'
        })
        console.error('Unexpected error in getFolderContents:', error)
        return {
            files: [],
            folders: [],
            breadcrumbs: [{ name: 'Cloud Storage', path: `user_${userId}`, type: 'root' }],
            totalSize: 0,
            error: error instanceof Error ? error.message : 'Unerwarteter Fehler beim Laden der Ordnerinhalte'
        }
    }
}

/**
 * Backward compatible alias for getFolderContents
 * Used by: dateien pages, cloud-storage.tsx
 */
export async function getPathContents(userId: string, path?: string): Promise<FolderContentsResult> {
    return getFolderContents(userId, path)
}

/**
 * Backward compatible alias for getFolderContents
 * Used by: use-cloud-storage-store.tsx, use-cloud-storage-navigation.tsx
 */
export async function loadFilesForPath(userId: string, path: string): Promise<FolderContentsResult> {
    // Validate that the path belongs to the user
    if (!path.startsWith(`user_${userId}`)) {
        return {
            files: [],
            folders: [],
            breadcrumbs: [{ name: 'Cloud Storage', path: `user_${userId}`, type: 'root' }],
            totalSize: 0,
            error: 'Ungültiger Pfad'
        }
    }

    return getFolderContents(userId, path)
}

/**
 * Get total storage usage for a user
 * This is included in the unified RPC response, but exposed separately for backward compatibility
 */
export async function getTotalStorageUsage(userId: string): Promise<number> {
    try {
        const result = await getFolderContents(userId)
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

        const pathSegments = folderPath.split('/')
        const depth = pathSegments.length

        // Protect system folders at their specific path depths
        // Path format: user_uuid/[segment1]/[segment2]/[segment3]
        // depth 1: user_uuid
        // depth 2: user_uuid/house_uuid OR user_uuid/Miscellaneous
        // depth 3: user_uuid/house_uuid/apartment_uuid OR user_uuid/house_uuid/house_documents
        // depth 4: user_uuid/house_uuid/apartment_uuid/tenant_uuid OR .../apartment_documents

        if (depth === 2 && pathSegments[1] === 'Miscellaneous') {
            return {
                success: false,
                error: 'Der Ordner "Sonstiges" ist ein Systemordner und kann nicht gelöscht werden.'
            }
        }
        if (depth === 3 && pathSegments[2] === 'house_documents') {
            return {
                success: false,
                error: 'Der Ordner "Hausdokumente" ist ein Systemordner und kann nicht gelöscht werden.'
            }
        }
        if (depth === 4 && pathSegments[3] === 'apartment_documents') {
            return {
                success: false,
                error: 'Der Ordner "Wohnungsdokumente" ist ein Systemordner und kann nicht gelöscht werden.'
            }
        }

        // Check for virtual folders (house/apartment/tenant) based on their expected depth
        if (depth === 2) {
            // Potential house folder at user_uuid/house_uuid
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
                    error: 'Hausordner können nicht gelöscht werden, solange das Haus existiert.'
                }
            }
        } else if (depth === 3) {
            // Potential apartment folder at user_uuid/house_uuid/apartment_uuid
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
                    error: 'Wohnungsordner können nicht gelöscht werden, solange die Wohnung existiert.'
                }
            }
        } else if (depth === 4) {
            // Potential tenant folder at user_uuid/house_uuid/apartment_uuid/tenant_uuid
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
                    error: 'Mieterordner können nicht gelöscht werden, solange der Mieter existiert.'
                }
            }
        }

        // Get all files to delete from the database
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

        // Delete files from storage
        if (filesToDelete && filesToDelete.length > 0) {
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
