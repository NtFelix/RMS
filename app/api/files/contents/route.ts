import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

/**
 * API Route for fetching folder contents
 * 
 * This replaces server actions for file navigation to avoid the 404 issue
 * on Cloudflare Pages where server actions POST to dynamic URLs that don't exist.
 * 
 * GET /api/files/contents?path=user_uuid/house_uuid/apartment_uuid
 */
export async function GET(request: NextRequest) {
    const startTime = performance.now()
    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')

    if (!path) {
        return NextResponse.json(
            { error: 'Missing path parameter' },
            { status: 400 }
        )
    }

    try {
        const supabase = await createClient()

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Nicht authentifiziert' },
                { status: 401 }
            )
        }

        // Validate path belongs to user
        const expectedPrefix = `user_${user.id}`
        if (!path.startsWith(expectedPrefix)) {
            return NextResponse.json(
                { error: 'Ungültiger Pfad' },
                { status: 403 }
            )
        }

        // Call the unified RPC function
        const { data, error } = await supabase.rpc('get_folder_contents', {
            p_user_id: user.id,
            p_current_path: path
        })

        const duration = Math.round(performance.now() - startTime)

        if (error) {
            console.log(`[${new Date().toISOString()}] [ERROR] ❌ API: get_folder_contents | ${duration}ms
Context: ${JSON.stringify({ path, error: error.message }, null, 2)}`)

            return NextResponse.json(
                {
                    files: [],
                    folders: [],
                    breadcrumbs: [{ name: 'Cloud Storage', path: expectedPrefix, type: 'root' }],
                    totalSize: 0,
                    error: `Fehler beim Laden: ${error.message}`
                },
                { status: 500 }
            )
        }

        // Log successful call
        const result = data as {
            files: unknown[]
            folders: unknown[]
            breadcrumbs: unknown[]
            totalSize: number
            error: string | null
        }

        console.log(`[${new Date().toISOString()}] [INFO] ✅ API: get_folder_contents | ${duration}ms
Context: ${JSON.stringify({
            path: path.length > 60 ? '...' + path.slice(-57) : path,
            folders: result.folders?.length ?? 0,
            files: result.files?.length ?? 0,
            executionTime: `${duration}ms`
        }, null, 2)}`)

        if (result.error) {
            return NextResponse.json(
                {
                    files: [],
                    folders: [],
                    breadcrumbs: [{ name: 'Cloud Storage', path: expectedPrefix, type: 'root' }],
                    totalSize: 0,
                    error: result.error
                },
                { status: 200 }
            )
        }

        return NextResponse.json({
            files: result.files || [],
            folders: result.folders || [],
            breadcrumbs: result.breadcrumbs || [{ name: 'Cloud Storage', path: expectedPrefix, type: 'root' }],
            totalSize: result.totalSize || 0
        })

    } catch (error) {
        const duration = Math.round(performance.now() - startTime)
        console.error(`[${new Date().toISOString()}] [ERROR] ❌ API: Unexpected error | ${duration}ms`, error)

        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Unerwarteter Fehler'
            },
            { status: 500 }
        )
    }
}
