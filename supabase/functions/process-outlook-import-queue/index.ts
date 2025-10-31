import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const outlookClientId = Deno.env.get('OUTLOOK_CLIENT_ID')!
const outlookClientSecret = Deno.env.get('OUTLOOK_CLIENT_SECRET')!

const BATCH_SIZE = 100 // Number of emails to fetch per page
const VISIBILITY_TIMEOUT = 300 // 5 minutes

async function refreshToken(supabase: any, account: any, accountId: string) {
  console.log('Refreshing token...')

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
    console.error(`Token refresh failed (${tokenResponse.status}):`, errorText)
    throw new Error(`Token refresh failed: ${errorText.substring(0, 200)}`)
  }

  const tokens = await tokenResponse.json()

  await supabase
    .from('Mail_Accounts')
    .update({
      access_token_encrypted: tokens.access_token,
      refresh_token_encrypted: tokens.refresh_token || account.refresh_token_encrypted,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })
    .eq('id', accountId)

  return tokens.access_token
}

async function getAccessToken(supabase: any, account: any, accountId: string) {
  let accessToken = account.access_token_encrypted
  const tokenExpiresAt = account.token_expires_at ? new Date(account.token_expires_at) : null
  const now = new Date()

  // Refresh 5 minutes before expiry to avoid edge cases
  const refreshThreshold = new Date(now.getTime() + 5 * 60 * 1000)

  if (!tokenExpiresAt || tokenExpiresAt <= refreshThreshold) {
    console.log('Token expired or expiring soon, refreshing...')
    accessToken = await refreshToken(supabase, account, accountId)
  }

  return accessToken
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Read one message from PGMQ queue with visibility timeout
    const { data: messages, error: readError } = await supabase
      .rpc('pgmq_read', {
        queue_name: 'outlook_email_import',
        vt: VISIBILITY_TIMEOUT,
        qty: 1
      })

    if (readError) {
      console.error('Error reading from queue:', readError)
      return new Response(
        JSON.stringify({ error: 'Failed to read from queue' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!messages || messages.length === 0) {
      console.log('No messages in queue')
      return new Response(
        JSON.stringify({ message: 'No messages in queue' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const message = messages[0]
    const msgId = message.msg_id
    const task = message.message

    console.log('='.repeat(60))
    console.log(`Processing message ${msgId}`)
    console.log(`Account: ${task.account_id}`)
    console.log(`Page: ${task.page_number}`)
    console.log(`Job ID: ${task.job_id}`)
    console.log(`Sync Job ID: ${task.sync_job_id}`)
    console.log(`Has next_link: ${!!task.next_link}`)
    console.log('='.repeat(60))

    // Update job status to processing
    if (task.job_id) {
      await supabase
        .from('Mail_Import_Jobs')
        .update({
          status: 'processing',
          started_at: new Date().toISOString(),
        })
        .eq('id', task.job_id)
    }

    // Get account details (fetch fresh data to get latest tokens)
    const { data: account, error: accountError } = await supabase
      .from('Mail_Accounts')
      .select('*')
      .eq('id', task.account_id)
      .single()

    if (accountError || !account) {
      console.error('Account not found:', accountError)

      // Delete message from queue
      await supabase.rpc('pgmq_delete', {
        queue_name: 'outlook_email_import',
        msg_id: msgId
      })

      if (task.job_id) {
        await supabase
          .from('Mail_Import_Jobs')
          .update({
            status: 'failed',
            fehler_nachricht: 'Account not found',
            completed_at: new Date().toISOString(),
          })
          .eq('id', task.job_id)
      }

      return new Response(
        JSON.stringify({ error: 'Account not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check if sync is still enabled
    if (!account.sync_enabled) {
      console.log('Sync disabled for account, aborting')

      // Delete message from queue
      await supabase.rpc('pgmq_delete', {
        queue_name: 'outlook_email_import',
        msg_id: msgId
      })

      if (task.job_id) {
        await supabase
          .from('Mail_Import_Jobs')
          .update({
            status: 'failed',
            fehler_nachricht: 'Sync disabled',
            completed_at: new Date().toISOString(),
          })
          .eq('id', task.job_id)
      }

      return new Response(
        JSON.stringify({ error: 'Sync disabled' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get access token (will refresh if needed)
    let accessToken: string
    try {
      accessToken = await getAccessToken(supabase, account, task.account_id)
      console.log('Access token obtained successfully')
    } catch (error) {
      console.error('Failed to get access token:', error)

      // Check if this is a permanent failure
      const errorMessage = error.message || ''
      const isPermanentFailure = errorMessage.includes('AADSTS70000') ||
        errorMessage.includes('AADSTS70008') ||
        errorMessage.includes('invalid_grant') ||
        errorMessage.includes('AADSTS50076') ||
        errorMessage.includes('AADSTS50079') ||
        errorMessage.includes('interaction_required')

      if (isPermanentFailure) {
        // Disable sync for permanent failures
        await supabase
          .from('Mail_Accounts')
          .update({
            sync_enabled: false,
            last_sync_error: new Date().toISOString(),
          })
          .eq('id', task.account_id)

        console.log('Permanent token failure, disabled sync')
      }

      // Delete message from queue
      await supabase.rpc('pgmq_delete', {
        queue_name: 'outlook_email_import',
        msg_id: msgId
      })

      if (task.job_id) {
        await supabase
          .from('Mail_Import_Jobs')
          .update({
            status: 'failed',
            fehler_nachricht: isPermanentFailure
              ? 'Token refresh failed - re-authentication required'
              : 'Failed to get access token',
            completed_at: new Date().toISOString(),
          })
          .eq('id', task.job_id)
      }

      // Update sync job
      if (task.sync_job_id) {
        await supabase
          .from('Mail_Sync_Jobs')
          .update({
            status: 'failed',
            fehler_nachricht: 'Token refresh failed',
            end_datum: new Date().toISOString(),
          })
          .eq('id', task.sync_job_id)
      }

      return new Response(
        JSON.stringify({
          error: 'Failed to get access token',
          requiresReauth: isPermanentFailure
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Fetch emails from Microsoft Graph API
    let fetchUrl = task.next_link

    if (!fetchUrl) {
      // First page
      fetchUrl = `https://graph.microsoft.com/v1.0/me/messages?$top=${BATCH_SIZE}&$orderby=receivedDateTime desc&$select=id,subject,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,bodyPreview,isRead,hasAttachments,importance,categories`
    }

    console.log('Fetching emails from:', fetchUrl.substring(0, 100) + '...')

    const messagesResponse = await fetch(fetchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!messagesResponse.ok) {
      const errorText = await messagesResponse.text()
      console.error(`Failed to fetch messages (${messagesResponse.status}):`, errorText)

      // If 401, the token might be invalid even after refresh
      if (messagesResponse.status === 401) {
        console.error('Token appears to be invalid, disabling sync')
        await supabase
          .from('Mail_Accounts')
          .update({
            sync_enabled: false,
            last_sync_error: new Date().toISOString(),
          })
          .eq('id', task.account_id)
      }

      // Delete message from queue
      await supabase.rpc('pgmq_delete', {
        queue_name: 'outlook_email_import',
        msg_id: msgId
      })

      if (task.job_id) {
        await supabase
          .from('Mail_Import_Jobs')
          .update({
            status: 'failed',
            fehler_nachricht: `Failed to fetch emails: ${messagesResponse.status} - ${errorText.substring(0, 200)}`,
            completed_at: new Date().toISOString(),
          })
          .eq('id', task.job_id)
      }

      // Update sync job as failed
      if (task.sync_job_id) {
        await supabase
          .from('Mail_Sync_Jobs')
          .update({
            status: 'failed',
            fehler_nachricht: `Failed to fetch emails: ${messagesResponse.status}`,
            end_datum: new Date().toISOString(),
          })
          .eq('id', task.sync_job_id)
      }

      return new Response(
        JSON.stringify({
          error: 'Failed to fetch emails',
          status: messagesResponse.status,
          details: errorText.substring(0, 200)
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const messagesData = await messagesResponse.json()
    const emails = messagesData.value || []
    const nextLink = messagesData['@odata.nextLink']

    console.log(`Fetched ${emails.length} emails, has next page: ${!!nextLink}`)

    // Store emails in Mail_Metadaten table
    const emailsToInsert = emails.map((msg: any) => ({
      mail_account_id: task.account_id,
      user_id: task.user_id,
      quelle: 'outlook',
      quelle_id: msg.id,
      betreff: msg.subject || '(Kein Betreff)',
      absender: msg.from?.emailAddress?.address || 'unknown@unknown.com',
      empfaenger: msg.toRecipients?.[0]?.emailAddress?.address || '',
      cc_mails: msg.ccRecipients?.map((r: any) => r.emailAddress?.address).filter(Boolean) || [],
      bcc_mails: msg.bccRecipients?.map((r: any) => r.emailAddress?.address).filter(Boolean) || [],
      datum_erhalten: msg.receivedDateTime,
      ist_gelesen: msg.isRead || false,
      hat_anhang: msg.hasAttachments || false,
      ordner: 'inbox',
    }))

    // Insert emails one by one to handle duplicates gracefully
    let insertedCount = 0
    let duplicateCount = 0
    let errorCount = 0

    for (const email of emailsToInsert) {
      const { error: insertError } = await supabase
        .from('Mail_Metadaten')
        .insert(email)
        .select()
        .single()

      if (insertError) {
        if (insertError.code === '23505') {
          // Duplicate key constraint violation
          duplicateCount++
          if (duplicateCount <= 3) {
            console.log(`Email ${email.quelle_id} already exists, skipping`)
          }
        } else {
          errorCount++
          console.error('Error inserting email:', insertError)
        }
      } else {
        insertedCount++
      }
    }

    console.log(`Page ${task.page_number} results: ${insertedCount} new, ${duplicateCount} duplicates, ${errorCount} errors`)

    // Continue to next page even if all emails were duplicates
    // This is important because newer emails might exist on later pages

    // Update job tracking with current progress
    if (task.job_id) {
      // Get current total to increment it
      const { data: currentJob } = await supabase
        .from('Mail_Import_Jobs')
        .select('total_messages_imported')
        .eq('id', task.job_id)
        .single()

      const newTotal = (currentJob?.total_messages_imported || 0) + insertedCount

      await supabase
        .from('Mail_Import_Jobs')
        .update({
          total_pages_processed: task.page_number,
          total_messages_imported: newTotal,
          aktualisiert_am: new Date().toISOString(),
        })
        .eq('id', task.job_id)

      console.log(`Job progress: ${task.page_number} pages, ${newTotal} total messages`)
    }

    if (nextLink) {
      // Queue next page BEFORE deleting current message
      console.log(`Queuing next page ${task.page_number + 1}`)

      const { error: queueError } = await supabase.rpc('queue_email_import', {
        p_account_id: task.account_id,
        p_user_id: task.user_id,
        p_sync_job_id: task.sync_job_id,
        p_next_link: nextLink,
        p_page_number: task.page_number + 1,
      })

      if (queueError) {
        console.error('Failed to queue next page:', queueError)
        // Don't fail the whole job, just log it
      } else {
        console.log(`Successfully queued page ${task.page_number + 1}`)
      }

      // Delete processed message from queue
      await supabase.rpc('pgmq_delete', {
        queue_name: 'outlook_email_import',
        msg_id: msgId
      })
    } else {
      // No more pages, mark job as completed
      console.log('All pages processed, marking job as completed')

      // Delete processed message from queue
      await supabase.rpc('pgmq_delete', {
        queue_name: 'outlook_email_import',
        msg_id: msgId
      })

      if (task.job_id) {
        // Get final total
        const { data: finalJob } = await supabase
          .from('Mail_Import_Jobs')
          .select('total_messages_imported')
          .eq('id', task.job_id)
          .single()

        await supabase
          .from('Mail_Import_Jobs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', task.job_id)

        console.log(`Import job completed: ${finalJob?.total_messages_imported || 0} total messages imported`)
      }

      // Update sync job
      if (task.sync_job_id) {
        const { data: job } = await supabase
          .from('Mail_Import_Jobs')
          .select('total_messages_imported')
          .eq('id', task.job_id)
          .single()

        await supabase
          .from('Mail_Sync_Jobs')
          .update({
            status: 'completed',
            nachrichten_sync: job?.total_messages_imported || 0,
            end_datum: new Date().toISOString(),
          })
          .eq('id', task.sync_job_id)

        console.log(`Sync job completed: ${job?.total_messages_imported || 0} messages synced`)
      }
    }

    // Get updated job stats for response
    let totalImported = insertedCount
    if (task.job_id) {
      const { data: jobStats } = await supabase
        .from('Mail_Import_Jobs')
        .select('total_messages_imported, total_pages_processed')
        .eq('id', task.job_id)
        .single()

      if (jobStats) {
        totalImported = jobStats.total_messages_imported
      }
    }

    console.log('='.repeat(60))
    console.log(`✓ Page ${task.page_number} completed`)
    console.log(`  - Fetched: ${emails.length} emails`)
    console.log(`  - Imported: ${insertedCount} new emails`)
    console.log(`  - Duplicates: ${emails.length - insertedCount}`)
    console.log(`  - Total imported so far: ${totalImported}`)
    console.log(`  - Has next page: ${!!nextLink ? 'Yes' : 'No'}`)
    console.log('='.repeat(60))

    return new Response(
      JSON.stringify({
        success: true,
        messageId: msgId,
        pageNumber: task.page_number,
        messagesImported: insertedCount,
        messagesFetched: emails.length,
        totalImported: totalImported,
        hasNextPage: !!nextLink,
        status: nextLink ? 'processing' : 'completed',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Queue processing error:', error)

    return new Response(
      JSON.stringify({
        error: error.message || 'Unknown error',
        details: error.toString()
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
