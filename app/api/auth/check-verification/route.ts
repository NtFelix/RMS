import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export const runtime = 'edge'

/**
 * Check if a user's email has been verified by querying Supabase admin API.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
        return NextResponse.json({ confirmed: false, error: 'Email is required' }, { status: 400 })
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

        // Use admin API to list users and find by email
        // We must paginate because listUsers returns a limited number of results (default 50)
        let user = null
        let page = 1
        const perPage = 1000 // Use max perPage to minimize requests

        while (true) {
            const { data, error: listError } = await supabase.auth.admin.listUsers({ page, perPage })

            if (listError) {
                console.error('Admin listUsers error:', listError)
                return NextResponse.json({ confirmed: false, error: 'Failed to query users' }, { status: 500 })
            }

            const foundUser = data.users.find(u => u.email === email)
            if (foundUser) {
                user = foundUser
                break
            }

            // If we received fewer users than the page limit, we've reached the end
            if (data.users.length < perPage) {
                break
            }

            page++
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
