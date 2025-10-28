import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const outlookClientId = Deno.env.get('OUTLOOK_CLIENT_ID')!
const outlookClientSecret = Deno.env.get('OUTLOOK_CLIENT_SECRET')!

interface SyncRequest {
  accountId: string
  userId: string
  jobId?: string
}

async function refreshToken(supabase: any, account: any, accountId: string) {
  console.log('Refreshing token...')
  console.log('Using tenant ID:', account.provider_tenant_id || 'common')

  // Use the stored tenant ID, or 'common' if not available
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
      }),
    }
  )

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text()
    console.error('Token refresh failed:', errorText)
    throw new Error('Token refresh failed')
  }

  const tokens = await tokenResponse.json()

  // Update tokens in database
  await supabase
    .from('Mail_Accounts')
    .update({
      access_token_encrypted: tokens.access_token,
      refresh_token_encrypted: tokens.refresh_token || account.refresh_token_encrypted,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })
    .eq('id', accountId)

  console.log('Token refreshed successfully')
  return tokens.access_token
}

Deno.serve(async (req) => {
  let requestBody: SyncRequest | null = null

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Parse request body
    requestBody = await req.json()
    const { accountId, userId, jobId } = requestBody

    console.log(`Starting Outlook sync for account ${accountId}, user ${userId}`)

    if (!accountId || !userId) {
      throw new Error('Missing accountId or userId in request')
    }

    // Create or update job record
    let syncJobId = jobId
    if (!syncJobId) {
      const { data: job, error: jobError } = await supabase
        .from('Mail_Sync_Jobs')
        .insert({
          account_id: accountId,
          status: 'processing',
          start_datum: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (jobError) {
        console.error('Failed to create job:', jobError)
      } else {
        syncJobId = job.id
      }
    } else {
      // Update existing job to processing
      await supabase
        .from('Mail_Sync_Jobs')
        .update({
          status: 'processing',
          start_datum: new Date().toISOString(),
        })
        .eq('id', syncJobId)
    }

    // Get account details
    const { data: account, error: accountError } = await supabase
      .from('Mail_Accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', userId)
      .single()

    console.log('Account query result:', {
      found: !!account,
      error: accountError?.message,
      hasToken: !!account?.access_token_encrypted,
      syncEnabled: account?.sync_enabled
    })

    if (accountError || !account) {
      console.error('Account not found:', accountError)

      if (syncJobId) {
        await supabase
          .from('Mail_Sync_Jobs')
          .update({
            status: 'failed',
            fehler_nachricht: 'Account not found',
            end_datum: new Date().toISOString(),
          })
          .eq('id', syncJobId)
      }

      return new Response(
        JSON.stringify({ error: 'Account not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!account.sync_enabled) {
      console.log('Sync disabled for account:', accountId)

      if (syncJobId) {
        await supabase
          .from('Mail_Sync_Jobs')
          .update({
            status: 'failed',
            fehler_nachricht: 'Sync disabled',
            end_datum: new Date().toISOString(),
          })
          .eq('id', syncJobId)
      }

      return new Response(
        JSON.stringify({ error: 'Sync disabled' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get access token (refresh if needed)
    let accessToken = account.access_token_encrypted
    const tokenExpiresAt = account.token_expires_at ? new Date(account.token_expires_at) : null
    const now = new Date()

    console.log('Token expiration check:', {
      tokenExpiresAt: tokenExpiresAt?.toISOString(),
      now: now.toISOString(),
      isExpired: tokenExpiresAt ? tokenExpiresAt <= now : 'no expiration date',
      hasRefreshToken: !!account.refresh_token_encrypted
    })

    // Refresh token if expired or no expiration date
    if ((!tokenExpiresAt || tokenExpiresAt <= now) && account.refresh_token_encrypted) {
      try {
        accessToken = await refreshToken(supabase, account, accountId)
      } catch (error) {
        await supabase
          .from('Mail_Accounts')
          .update({
            last_sync_error: new Date().toISOString(),
            sync_enabled: false,
          })
          .eq('id', accountId)

        if (syncJobId) {
          await supabase
            .from('Mail_Sync_Jobs')
            .update({
              status: 'failed',
              fehler_nachricht: 'Token refresh failed',
              end_datum: new Date().toISOString(),
            })
            .eq('id', syncJobId)
        }

        return new Response(
          JSON.stringify({ error: 'Token refresh failed' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    // Fetch emails from Microsoft Graph API
    console.log('Fetching emails from Outlook...')
    console.log('Access token length:', accessToken?.length || 0)
    console.log('Token preview:', accessToken ? `${accessToken.substring(0, 20)}...${accessToken.substring(accessToken.length - 20)}` : 'none')
    console.log('Provider tenant ID:', account.provider_tenant_id)

    let messagesResponse = await fetch(
      'https://graph.microsoft.com/v1.0/me/messages?$top=100&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,bodyPreview,isRead,hasAttachments',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    console.log('Messages response status:', messagesResponse.status)

    // If we get 401, try refreshing the token and retry once
    if (messagesResponse.status === 401 && account.refresh_token_encrypted) {
      console.log('Got 401, attempting token refresh and retry...')

      try {
        accessToken = await refreshToken(supabase, account, accountId)

        // Retry the fetch with new token
        messagesResponse = await fetch(
          'https://graph.microsoft.com/v1.0/me/messages?$top=100&$orderby=receivedDateTime desc&$select=id,subject,from,receivedDateTime,bodyPreview,isRead,hasAttachments',
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        )

        console.log('Retry response status:', messagesResponse.status)
      } catch (refreshError) {
        console.error('Token refresh failed during retry:', refreshError)
      }
    }

    if (!messagesResponse.ok) {
      let errorText = ''
      let errorJson = null
      
      try {
        errorText = await messagesResponse.text()
        errorJson = JSON.parse(errorText)
        console.error('Failed to fetch messages (JSON):', errorJson)
      } catch (e) {
        console.error('Failed to fetch messages (text):', errorText)
      }
      
      console.error('Response status:', messagesResponse.status)
      console.error('Response headers:', Object.fromEntries(messagesResponse.headers.entries()))

      await supabase
        .from('Mail_Accounts')
        .update({
          last_sync_error: new Date().toISOString(),
          sync_enabled: messagesResponse.status === 401 ? false : account.sync_enabled,
        })
        .eq('id', accountId)

      if (syncJobId) {
        await supabase
          .from('Mail_Sync_Jobs')
          .update({
            status: 'failed',
            fehler_nachricht: `Failed to fetch emails: ${messagesResponse.status} - ${errorText.substring(0, 200)}`,
            end_datum: new Date().toISOString(),
          })
          .eq('id', syncJobId)
      }

      return new Response(
        JSON.stringify({
          error: 'Failed to fetch emails',
          status: messagesResponse.status,
          details: errorText.substring(0, 500)
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const messagesData = await messagesResponse.json()
    const messages = messagesData.value || []

    console.log(`Fetched ${messages.length} emails`)

    // TODO: Store emails in a separate table (e.g., Emails table)
    // For now, we'll just log the count and update sync status

    // Update last sync time
    const syncedAt = new Date().toISOString()
    await supabase
      .from('Mail_Accounts')
      .update({
        last_sync_at: syncedAt,
        last_sync_error: null,
      })
      .eq('id', accountId)

    // Update job status
    if (syncJobId) {
      await supabase
        .from('Mail_Sync_Jobs')
        .update({
          status: 'completed',
          nachrichten_sync: messages.length,
          end_datum: syncedAt,
        })
        .eq('id', syncJobId)
    }

    console.log(`Sync completed successfully for account ${accountId}`)

    return new Response(
      JSON.stringify({
        success: true,
        messageCount: messages.length,
        syncedAt,
        jobId: syncJobId,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Sync error:', error)
    console.error('Error stack:', error.stack)

    return new Response(
      JSON.stringify({
        error: error.message || 'Unknown error',
        details: error.toString()
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
