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
        return NextResponse.json({ confirmed: false, error: 'Email is required' })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
        console.error('Missing SUPABASE_SERVICE_ROLE_KEY')
        return NextResponse.json({ confirmed: false, error: 'Server config error' })
    }

    try {
        const supabase = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        })

        // Use admin API to list users and find by email
        const { data, error } = await supabase.auth.admin.listUsers({ perPage: 50 })

        if (error) {
            console.error('Admin listUsers error:', error)
            return NextResponse.json({ confirmed: false })
        }

        const user = data.users.find(u => u.email === email)

        if (!user) {
            return NextResponse.json({ confirmed: false, reason: 'user_not_found' })
        }

        return NextResponse.json({
            confirmed: !!user.email_confirmed_at,
            email_confirmed_at: user.email_confirmed_at || null
        })
    } catch (error) {
        console.error('Check verification error:', error)
        return NextResponse.json({ confirmed: false })
    }
}
