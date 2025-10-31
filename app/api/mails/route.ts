import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { PAGINATION } from '@/constants'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') ?? '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') ?? PAGINATION.DEFAULT_PAGE_SIZE.toString(), 10)
    
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Calculate range for pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // Fetch emails with pagination
    const { data: emails, error: emailsError, count } = await supabase
      .from('Mail_Metadaten')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('datum_erhalten', { ascending: false })
      .range(from, to)

    if (emailsError) {
      console.error('Error fetching emails:', emailsError)
      return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 })
    }

    return NextResponse.json(emails || [], {
      status: 200,
      headers: {
        'X-Total-Count': count?.toString() || '0',
      }
    })
  } catch (error) {
    console.error('Server error GET /api/mails:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
