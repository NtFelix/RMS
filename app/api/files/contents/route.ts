import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from 'next/server'
import { logRpcCall, type FolderContentsResult } from '@/app/(dashboard)/dateien/actions'
import { NO_CACHE_HEADERS } from '@/lib/constants/http'
import { checkStoragePathAccess } from '@/lib/storage-access'
import { STORAGE_ROOT_LABEL } from '@/lib/storage-navigation'


/**
 * API Route for fetching folder contents
 * 
 * This replaces server actions for file navigation to avoid the 404 issue
 * on Cloudflare Pages where server actions POST to dynamic URLs that don't exist.
 * 
 * GET /api/files/contents?path=org_{orgId}/shared/{houseId}/...
 */
export async function GET(request: NextRequest) {
    const startTime = performance.now()
    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')

    if (!path) {
        return NextResponse.json(
            { error: 'Missing path parameter' },
            { status: 400, headers: NO_CACHE_HEADERS }
        )
    }

    try {
        const supabase = await createSupabaseServerClient()

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Nicht authentifiziert' },
                { status: 401, headers: NO_CACHE_HEADERS }
            )
        }

        // Validate path belongs to the active organisation and an accessible house
        const accessError = await checkStoragePathAccess(supabase, user.id, path, { allowLegacyOwnRead: true })
        if (accessError) {
            return NextResponse.json(
                { error: 'Ungültiger Pfad' },
                { status: 403, headers: NO_CACHE_HEADERS }
            )
        }

        // Root of the path is the org folder (org_{orgId})
        const rootPath = path.split('/')[0]

        // Call the unified RPC function
        const { data, error } = await supabase.rpc('get_folder_contents', {
            p_current_path: path
        })

        if (error) {
            await logRpcCall('get_folder_contents', path, startTime, false, { error: error.message })

            return NextResponse.json(
                {
                    files: [],
                    folders: [],
                    breadcrumbs: [{ name: STORAGE_ROOT_LABEL, path: rootPath, type: 'root' }],
                    totalSize: 0,
                    error: `Fehler beim Laden: ${error.message}`
                },
                { status: 500, headers: NO_CACHE_HEADERS }
            )
        }

        const result = data as FolderContentsResult

        // Log result using unified logger
        await logRpcCall('get_folder_contents', path, startTime, true, {
            folderCount: result.folders?.length ?? 0,
            fileCount: result.files?.length ?? 0,
            totalSize: result.totalSize ?? 0,
            error: result.error
        })

        if (result.error) {
            return NextResponse.json(
                {
                    files: [],
                    folders: [],
                    breadcrumbs: [{ name: STORAGE_ROOT_LABEL, path: rootPath, type: 'root' }],
                    totalSize: 0,
                    error: result.error
                },
                { status: 200, headers: NO_CACHE_HEADERS }
            )
        }

        return NextResponse.json({
            files: result.files || [],
            folders: result.folders || [],
            breadcrumbs: result.breadcrumbs || [{ name: STORAGE_ROOT_LABEL, path: rootPath, type: 'root' }],
            totalSize: result.totalSize || 0
        }, { headers: NO_CACHE_HEADERS })

    } catch (error) {
        const duration = Math.round(performance.now() - startTime)
        console.error(`[${new Date().toISOString()}] [ERROR] ❌ API: Unexpected error | ${duration}ms`, error)

        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Unerwarteter Fehler'
            },
            { status: 500, headers: NO_CACHE_HEADERS }
        )
    }
}
