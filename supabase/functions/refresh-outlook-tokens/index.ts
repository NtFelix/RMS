import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const outlookClientId = Deno.env.get('OUTLOOK_CLIENT_ID')!
const outlookClientSecret = Deno.env.get('OUTLOOK_CLIENT_SECRET')!

async function refreshToken(supabase: any, account: any) {
  console.log(`Refreshing token for account ${account.id}`)

  const tenantEndpoint = account.provider_tenant_id || 'common'

  const tokenResponse = await fetch(
    `https://login.microsoftonline.com/${tenantEndpoint}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: outlookClientId,
        client_secret: outlookClientSecret,
        refresh_token: account.refresh_token_encrypted,
        grant_type: 'refresh_token',
        scope: 'openid profile email offline_access Mail.Read Mail.ReadWrite Mail.Send User.Read',
      }),
    }
  )

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text()
    console.error(`Token refresh failed for account ${account.id}:`, errorText)

    // Check if permanent failure (requires re-authentication)
    // AADSTS70000: invalid_grant means refresh token is expired/revoked
    // AADSTS50076/50079: interaction_required means MFA or consent needed
    // AADSTS900144: invalid_request (missing scope) is NOT permanent
    const isPermanentFailure = errorText.includes('AADSTS70000') ||
      errorText.includes('AADSTS70008') ||
      errorText.includes('invalid_grant') ||
      errorText.includes('AADSTS50076') ||
      errorText.includes('AADSTS50079') ||
      errorText.includes('interaction_required')

    if (isPermanentFailure) {
      // Disable sync for this account
      await supabase
        .from('Mail_Accounts')
        .update({
          sync_enabled: false,
          last_sync_error: new Date().toISOString(),
        })
        .eq('id', account.id)

      console.log(`Disabled sync for account ${account.id} due to permanent token failure`)
    }

    throw new Error(`Token refresh failed: ${errorText.substring(0, 200)}`)
  }

  const tokens = await tokenResponse.json()

  // Update tokens in database
  await supabase
    .from('Mail_Accounts')
    .update({
      access_token_encrypted: tokens.access_token,
      refresh_token_encrypted: tokens.refresh_token || account.refresh_token_encrypted,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      last_sync_error: null,
    })
    .eq('id', account.id)

  console.log(`Token refreshed successfully for account ${account.id}`)
  return true
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    console.log('Starting scheduled token refresh...')

    // Get all accounts that need token refresh (expiring in next 24 hours)
    const refreshThreshold = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const { data: accounts, error: accountsError } = await supabase
      .from('Mail_Accounts')
      .select('*')
      .eq('sync_enabled', true)
      .not('refresh_token_encrypted', 'is', null)
      .lt('token_expires_at', refreshThreshold)

    if (accountsError) {
      console.error('Failed to fetch accounts:', accountsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch accounts' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${accounts?.length || 0} accounts needing token refresh`)

    const results = {
      total: accounts?.length || 0,
      refreshed: 0,
      failed: 0,
      errors: [] as string[],
    }

    if (accounts && accounts.length > 0) {
      for (const account of accounts) {
        try {
          await refreshToken(supabase, account)
          results.refreshed++
        } catch (error) {
          results.failed++
          results.errors.push(`Account ${account.id}: ${error.message}`)
        }
      }
    }

    console.log('Token refresh completed:', results)

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Scheduled token refresh error:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
