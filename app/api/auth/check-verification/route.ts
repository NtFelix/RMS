import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export const runtime = 'edge'

/**
 * Check if a user's email has been verified by querying Supabase admin API using their ID.
 * Email lookup is no longer supported for performance and security reasons.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
        // Return 400 if ID is missing (we strictly require it now)
        return NextResponse.json({ confirmed: false, error: 'User ID is required' }, { status: 400 })
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

        // Use efficient O(1) getUserById method
        const { data, error } = await supabase.auth.admin.getUserById(id)

        if (error) {
            // If user not found (404) or other error, strictly return confirmed: false
            if (error.status !== 404) {
                console.error('Admin getUserById error:', error)
            }
            return NextResponse.json({ confirmed: false })
        }

        const user = data.user

        if (!user) {
            // User not found (double check): Return same structure as unverified
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
