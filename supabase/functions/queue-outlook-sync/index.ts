import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'
import { decryptToken, encryptToken } from './encryption.ts'

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

  // Decrypt the refresh token before using it
  const decryptedRefreshToken = await decryptToken(account.refresh_token_encrypted)

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
        refresh_token: decryptedRefreshToken,
        grant_type: 'refresh_token',
        scope: 'openid profile email offline_access Mail.Read Mail.ReadWrite Mail.Send User.Read',
      }),
    }
  )

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text()
    console.error('Token refresh failed:', errorText)
    throw new Error('Token refresh failed')
  }

  const tokens = await tokenResponse.json()

  // Encrypt tokens before storing
  const encryptedAccessToken = await encryptToken(tokens.access_token)
  const encryptedRefreshToken = tokens.refresh_token
    ? await encryptToken(tokens.refresh_token)
    : account.refresh_token_encrypted // Keep existing if not returned

  // Update tokens in database
  await supabase
    .from('Mail_Accounts')
    .update({
      access_token_encrypted: encryptedAccessToken,
      refresh_token_encrypted: encryptedRefreshToken,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })
    .eq('id', accountId)

  console.log('Token refreshed successfully')
  // Return the plaintext access token for immediate use
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
    // Decrypt the stored access token
    let accessToken = await decryptToken(account.access_token_encrypted)
    const tokenExpiresAt = account.token_expires_at ? new Date(account.token_expires_at) : null
    const now = new Date()

    // Refresh 5 minutes before expiry to avoid edge cases
    const refreshThreshold = new Date(now.getTime() + 5 * 60 * 1000)

    console.log('Token expiration check:', {
      tokenExpiresAt: tokenExpiresAt?.toISOString(),
      now: now.toISOString(),
      refreshThreshold: refreshThreshold.toISOString(),
      shouldRefresh: tokenExpiresAt ? tokenExpiresAt <= refreshThreshold : 'no expiration date',
      hasRefreshToken: !!account.refresh_token_encrypted
    })

    // Refresh token if expired/expiring soon or no expiration date
    if ((!tokenExpiresAt || tokenExpiresAt <= refreshThreshold) && account.refresh_token_encrypted) {
      try {
        accessToken = await refreshToken(supabase, account, accountId)
      } catch (error) {
        console.error('Token refresh error:', error)

        // Check if this is a permanent failure (invalid_grant means re-auth needed)
        const errorMessage = error.message || ''
        const isPermanentFailure = errorMessage.includes('AADSTS70000') ||
          errorMessage.includes('AADSTS70008') ||
          errorMessage.includes('invalid_grant') ||
          errorMessage.includes('AADSTS50076') ||
          errorMessage.includes('AADSTS50079') ||
          errorMessage.includes('interaction_required')

        // Only disable sync on permanent failures, not temporary network issues
        const updateData: any = {
          last_sync_error: new Date().toISOString(),
        }

        if (isPermanentFailure) {
          updateData.sync_enabled = false
          console.log('Permanent token failure detected, disabling sync')
        } else {
          console.log('Temporary token refresh failure, keeping sync enabled')
        }

        await supabase
          .from('Mail_Accounts')
          .update(updateData)
          .eq('id', accountId)

        if (syncJobId) {
          await supabase
            .from('Mail_Sync_Jobs')
            .update({
              status: 'failed',
              fehler_nachricht: isPermanentFailure
                ? 'Token refresh failed - re-authentication required'
                : 'Token refresh failed - will retry',
              end_datum: new Date().toISOString(),
            })
            .eq('id', syncJobId)
        }

        return new Response(
          JSON.stringify({
            error: 'Token refresh failed',
            requiresReauth: isPermanentFailure
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    // Queue email import task using PGMQ
    console.log('Queuing email import task...')
    console.log('Queue params:', {
      p_account_id: accountId,
      p_user_id: userId,
      p_sync_job_id: syncJobId,
      p_next_link: null,
      p_page_number: 1,
    })

    const { data: importJobId, error: queueError } = await supabase
      .rpc('queue_email_import', {
        p_account_id: accountId,
        p_user_id: userId,
        p_sync_job_id: syncJobId,
        p_next_link: null,
        p_page_number: 1,
      })

    console.log('Queue RPC result:', { importJobId, queueError })

    if (queueError) {
      console.error('Failed to queue import task:', queueError)
      console.error('Queue error details:', JSON.stringify(queueError, null, 2))

      if (syncJobId) {
        await supabase
          .from('Mail_Sync_Jobs')
          .update({
            status: 'failed',
            fehler_nachricht: `Failed to queue import task: ${queueError.message || JSON.stringify(queueError)}`,
            end_datum: new Date().toISOString(),
          })
          .eq('id', syncJobId)
      }

      return new Response(
        JSON.stringify({
          error: 'Failed to queue import task',
          details: queueError.message || JSON.stringify(queueError)
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Queued import task with job ID: ${importJobId}`)

    // Update sync job to processing (will be completed by queue processor)
    if (syncJobId) {
      await supabase
        .from('Mail_Sync_Jobs')
        .update({
          status: 'processing',
        })
        .eq('id', syncJobId)
    }

    // Update last sync time
    const syncedAt = new Date().toISOString()
    await supabase
      .from('Mail_Accounts')
      .update({
        last_sync_at: syncedAt,
        last_sync_error: null,
      })
      .eq('id', accountId)

    console.log(`Sync initiated successfully for account ${accountId}`)

    return new Response(
      JSON.stringify({
        success: true,
        importJobId: importJobId,
        syncJobId: syncJobId,
        syncedAt,
        message: 'Email import queued successfully',
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
