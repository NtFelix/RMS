import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export const runtime = 'edge'

/**
 * Check if a user's email has been verified by querying Supabase admin API.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const id = searchParams.get('id')

    if (!email && !id) {
        return NextResponse.json({ confirmed: false, error: 'Email or ID is required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
        console.error('Missing SUPABASE_SERVICE_ROLE_KEY')
        return NextResponse.json({ confirmed: false, error: 'Server config error' }, { status: 500 })
    }

    try {
        const supabase = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        })

        let user = null;

        if (id) {
            // If ID is provided, use the efficient getUserById method (O(1) lookup)
            const { data, error } = await supabase.auth.admin.getUserById(id)
            if (error) {
                // If user not found or other error, strictly return confirmed: false
                // to avoid leaking any existence information if not necessary (though ID is hard to guess)
                if (error.status !== 404) {
                    console.error('Admin getUserById error:', error)
                }
                return NextResponse.json({ confirmed: false })
            }
            user = data.user
        } else if (email) {
            // Fallback to pagination is removed for security and performance reasons.
            // We require ID for verification checks to ensure O(1) lookup.
            // If we strictly need email support without ID, we would need a secure RPC or exact match capability,
            // but for now we enforce using ID which is provided in the registration flow.
            console.warn('Check verification requested with only email - this is no longer supported for performance reasons.')
            return NextResponse.json({ confirmed: false, error: 'User ID is required' }, { status: 400 })
        }

        if (!user) {
            // User not found: Return same structure as unverified to prevent user enumeration
            return NextResponse.json({ confirmed: false })
        }

        return NextResponse.json({
            confirmed: !!user.email_confirmed_at,
            email_confirmed_at: user.email_confirmed_at || null
        })
    } catch (error) {
        console.error('Check verification error:', error)
        return NextResponse.json({ confirmed: false, error: 'An unexpected error occurred' }, { status: 500 })
    }
}
