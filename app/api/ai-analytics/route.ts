import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUserForApi } from '@/lib/server/route-access'
import { evaluatePermission } from '@/lib/permissions-core'
import { NO_CACHE_HEADERS } from '@/lib/constants/http'

const POSTHOG_HOST = process.env.POSTHOG_HOST || 'https://eu.posthog.com'
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID || '76914'
const POSTHOG_PERSONAL_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY
const ENDPOINT_ID = 'org_ai_analytics'

interface PostHogRow {
  date: string
  org_id: string
  user_id: string
  model: string | null
  provider: string | null
  feature: string | null
  input_tokens: number | null
  output_tokens: number | null
  total_tokens: number | null
  total_cost_usd: number | null
  messages: number | null
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUserForApi()
    if (auth instanceof NextResponse) return auth

    const { user, supabase } = auth
    const searchParams = request.nextUrl.searchParams
    const dateFrom = searchParams.get('date_from') || '2024-01-01'
    const dateTo = searchParams.get('date_to') || new Date().toISOString().split('T')[0]

    const { data: orgId } = await supabase.rpc('current_organisation_id')

    if (!orgId) {
      return NextResponse.json(
        { error: 'No active organization found' },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    const isAdmin = await evaluatePermission(supabase, user.id, orgId, 'organisation', 'verwalten')

    if (!POSTHOG_PERSONAL_API_KEY) {
      return NextResponse.json(
        { error: 'PostHog not configured' },
        { status: 500, headers: NO_CACHE_HEADERS }
      )
    }

    const posthogUrl = `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/endpoints/${ENDPOINT_ID}/run`

    const posthogResponse = await fetch(posthogUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${POSTHOG_PERSONAL_API_KEY}`,
      },
      body: JSON.stringify({
        variables: {
          date_from: dateFrom,
          date_to: dateTo,
          org_id: orgId,
        },
      }),
    })

    if (!posthogResponse.ok) {
      const errorText = await posthogResponse.text()
      console.error('PostHog endpoint error:', posthogResponse.status, errorText)
      return NextResponse.json(
        { error: 'Failed to fetch analytics data' },
        { status: 502, headers: NO_CACHE_HEADERS }
      )
    }

    const posthogResult = await posthogResponse.json()

    let rows: PostHogRow[] = []
    if (Array.isArray(posthogResult.results)) {
      const columns = posthogResult.columns || []
      rows = posthogResult.results.map((row: unknown[]) => {
        const obj: Record<string, unknown> = {}
        columns.forEach((col: string, idx: number) => {
          obj[col] = row[idx]
        })
        return obj as unknown as PostHogRow
      })
    } else if (Array.isArray(posthogResult)) {
      rows = posthogResult as PostHogRow[]
    }

    if (!isAdmin) {
      rows = rows.filter((row) => row.user_id === user.id)
    }

    const activeUsersCount = isAdmin
      ? new Set(rows.map((r) => r.user_id)).size
      : undefined

    return NextResponse.json(
      {
        rows,
        role: isAdmin ? 'admin' : 'member',
        active_users: activeUsersCount,
        user_id: user.id,
      },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (error) {
    console.error('AI analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}
