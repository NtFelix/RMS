import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'
import {
  posthogLogger,
  createRequestLogger,
  logAction,
  withLogging,
  sanitizeAttributes,
  type ActionResult
} from './logger.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const outlookClientId = Deno.env.get('OUTLOOK_CLIENT_ID')!
const outlookClientSecret = Deno.env.get('OUTLOOK_CLIENT_SECRET')!

const BATCH_SIZE = 100 // Number of emails to fetch per page
const VISIBILITY_TIMEOUT = 300 // 5 minutes

// Wrapped action for token refresh with automatic logging
const refreshTokenAction = withLogging(
  'refreshOAuthToken',
  async (supabase: any, account: any, accountId: string): Promise<ActionResult<string>> => {
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
      return {
        success: false,
        error: {
          message: `Token refresh failed: ${errorText.substring(0, 200)}`,
          status: tokenResponse.status,
        },
      }
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

    return {
      success: true,
      data: tokens.access_token,
    }
  },
  { logArgs: false } // Don't log args as they contain sensitive data
)

async function getAccessToken(supabase: any, account: any, accountId: string): Promise<string> {
  let accessToken = account.access_token_encrypted
  const tokenExpiresAt = account.token_expires_at ? new Date(account.token_expires_at) : null
  const now = new Date()

  // Refresh 5 minutes before expiry to avoid edge cases
  const refreshThreshold = new Date(now.getTime() + 5 * 60 * 1000)

  if (!tokenExpiresAt || tokenExpiresAt <= refreshThreshold) {
    logAction('getAccessToken', 'start', {
      account_id: accountId,
      reason: !tokenExpiresAt ? 'no_expiry_set' : 'token_expiring_soon',
      expires_at: tokenExpiresAt?.toISOString() || 'not_set',
    })

    const result = await refreshTokenAction(supabase, account, accountId)

    if (!result.success) {
      throw new Error(result.error?.message || 'Token refresh failed')
    }

    accessToken = result.data

    logAction('getAccessToken', 'success', {
      account_id: accountId,
    })
  }

  return accessToken
}

Deno.serve(async (req) => {
  // Create request-scoped logger
  const reqLogger = createRequestLogger(req)
  const startTime = Date.now()

  reqLogger.info('Edge function invoked', {
    function: 'process-outlook-import-queue',
  })

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Read one message from PGMQ queue with visibility timeout
    logAction('pgmq_read', 'start', {
      queue_name: 'outlook_email_import',
      visibility_timeout: VISIBILITY_TIMEOUT,
    })

    const { data: messages, error: readError } = await supabase
      .rpc('pgmq_read', {
        queue_name: 'outlook_email_import',
        vt: VISIBILITY_TIMEOUT,
        qty: 1
      })

    if (readError) {
      logAction('pgmq_read', 'error', {
        error_code: readError.code,
        error_message: readError.message,
      })

      await reqLogger.flush()
      return new Response(
        JSON.stringify({ error: 'Failed to read from queue' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!messages || messages.length === 0) {
      logAction('pgmq_read', 'success', {
        messages_found: 0,
      })

      reqLogger.debug('No messages in queue')
      await reqLogger.flush()
      return new Response(
        JSON.stringify({ message: 'No messages in queue' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    logAction('pgmq_read', 'success', {
      messages_found: messages.length,
    })

    const message = messages[0]
    const msgId = message.msg_id
    const task = message.message

    reqLogger.info('Processing import queue message', {
      userId: task.user_id,
      msg_id: msgId,
      account_id: task.account_id,
      page_number: task.page_number,
      job_id: task.job_id,
      sync_job_id: task.sync_job_id,
      has_next_link: !!task.next_link,
    })

    // Update job status to processing
    if (task.job_id) {
      logAction('updateJobStatus', 'start', {
        job_id: task.job_id,
        new_status: 'processing',
      })

      await supabase
        .from('Mail_Import_Jobs')
        .update({
          status: 'processing',
          started_at: new Date().toISOString(),
        })
        .eq('id', task.job_id)

      logAction('updateJobStatus', 'success', {
        job_id: task.job_id,
      })
    }

    // Get account details (fetch fresh data to get latest tokens)
    logAction('fetchAccount', 'start', {
      account_id: task.account_id,
    })

    const { data: account, error: accountError } = await supabase
      .from('Mail_Accounts')
      .select('*')
      .eq('id', task.account_id)
      .single()

    if (accountError || !account) {
      logAction('fetchAccount', 'error', {
        account_id: task.account_id,
        error_code: accountError?.code,
        error_message: accountError?.message,
      })

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

      await reqLogger.flush()
      return new Response(
        JSON.stringify({ error: 'Account not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    logAction('fetchAccount', 'success', {
      account_id: task.account_id,
      sync_enabled: account.sync_enabled,
    })

    // Check if sync is still enabled
    if (!account.sync_enabled) {
      reqLogger.warn('Sync disabled for account, aborting import', {
        userId: task.user_id,
        account_id: task.account_id,
        job_id: task.job_id,
      })

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

      await reqLogger.flush()
      return new Response(
        JSON.stringify({ error: 'Sync disabled' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get access token (will refresh if needed)
    let accessToken: string
    try {
      accessToken = await getAccessToken(supabase, account, task.account_id)
      reqLogger.debug('Access token obtained successfully', {
        account_id: task.account_id,
      })
    } catch (error) {
      const errorMessage = error.message || ''
      const isPermanentFailure = errorMessage.includes('AADSTS70000') ||
        errorMessage.includes('AADSTS70008') ||
        errorMessage.includes('invalid_grant') ||
        errorMessage.includes('AADSTS50076') ||
        errorMessage.includes('AADSTS50079') ||
        errorMessage.includes('interaction_required')

      reqLogger.error('Failed to get access token', error as Error, {
        userId: task.user_id,
        account_id: task.account_id,
        is_permanent_failure: isPermanentFailure,
        requires_reauth: isPermanentFailure,
      })

      if (isPermanentFailure) {
        // Disable sync for permanent failures
        await supabase
          .from('Mail_Accounts')
          .update({
            sync_enabled: false,
            last_sync_error: new Date().toISOString(),
          })
          .eq('id', task.account_id)

        reqLogger.warn('Permanent token failure - sync disabled for account', {
          userId: task.user_id,
          account_id: task.account_id,
        })
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

      await reqLogger.flush()
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

    logAction('fetchMsGraphEmails', 'start', {
      account_id: task.account_id,
      page_number: task.page_number,
      is_first_page: !task.next_link,
    })

    const messagesResponse = await fetch(fetchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!messagesResponse.ok) {
      const errorText = await messagesResponse.text()

      logAction('fetchMsGraphEmails', 'error', {
        account_id: task.account_id,
        http_status: messagesResponse.status,
        error_preview: errorText.substring(0, 200),
      })

      // If 401, the token might be invalid even after refresh
      if (messagesResponse.status === 401) {
        reqLogger.warn('Token invalid after refresh - disabling sync', {
          userId: task.user_id,
          account_id: task.account_id,
        })
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

      await reqLogger.flush()
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

    logAction('fetchMsGraphEmails', 'success', {
      account_id: task.account_id,
      page_number: task.page_number,
      emails_count: emails.length,
      has_next_page: !!nextLink,
    })

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
      dateipfad: null,
    }))

    // Insert emails one by one to handle duplicates gracefully
    logAction('insertEmails', 'start', {
      account_id: task.account_id,
      emails_to_insert: emailsToInsert.length,
    })

    let insertedCount = 0
    let duplicateCount = 0
    let errorCount = 0

    // Use bulk upsert with onConflict to efficiently handle duplicates
    // The unique constraint is on (quelle, quelle_id)
    const { data: insertedData, error: bulkInsertError } = await supabase
      .from('Mail_Metadaten')
      .upsert(emailsToInsert, {
        onConflict: 'quelle,quelle_id',
        ignoreDuplicates: true, // Don't update existing records, just skip
      })
      .select('id')

    if (bulkInsertError) {
      // Check if it's a unique constraint violation (shouldn't happen with onConflict)
      // or another type of error
      if (bulkInsertError.code === '23505') {
        // All were duplicates
        duplicateCount = emailsToInsert.length
        reqLogger.debug('All emails were duplicates', {
          userId: task.user_id,
          account_id: task.account_id,
          count: duplicateCount,
        })
      } else {
        errorCount = emailsToInsert.length
        reqLogger.warn('Error inserting email batch', {
          userId: task.user_id,
          account_id: task.account_id,
          error_code: bulkInsertError.code,
          error_message: bulkInsertError.message,
        })
      }
    } else {
      // Count how many were actually inserted
      insertedCount = insertedData?.length || 0
      // The difference is duplicates that were skipped
      duplicateCount = emailsToInsert.length - insertedCount
    }

    logAction('insertEmails', insertedCount > 0 || duplicateCount > 0 ? 'success' : 'failed', {
      account_id: task.account_id,
      page_number: task.page_number,
      emails_inserted: insertedCount,
      duplicates_skipped: duplicateCount,
      errors: errorCount,
    })

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

      reqLogger.debug('Job progress updated', {
        job_id: task.job_id,
        pages_processed: task.page_number,
        total_messages: newTotal,
      })
    }

    if (nextLink) {
      // Queue next page BEFORE deleting current message
      logAction('queueNextPage', 'start', {
        account_id: task.account_id,
        next_page_number: task.page_number + 1,
      })

      const { error: queueError } = await supabase.rpc('queue_email_import', {
        p_account_id: task.account_id,
        p_user_id: task.user_id,
        p_sync_job_id: task.sync_job_id,
        p_next_link: nextLink,
        p_page_number: task.page_number + 1,
      })

      if (queueError) {
        logAction('queueNextPage', 'error', {
          account_id: task.account_id,
          page_number: task.page_number + 1,
          error_code: queueError.code,
          error_message: queueError.message,
        })
      } else {
        logAction('queueNextPage', 'success', {
          account_id: task.account_id,
          next_page_number: task.page_number + 1,
        })
      }

      // Delete processed message from queue
      await supabase.rpc('pgmq_delete', {
        queue_name: 'outlook_email_import',
        msg_id: msgId
      })
    } else {
      // No more pages, mark job as completed
      reqLogger.info('All pages processed - marking job as completed', {
        userId: task.user_id,
        account_id: task.account_id,
        job_id: task.job_id,
        sync_job_id: task.sync_job_id,
      })

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

        logAction('completeImportJob', 'success', {
          job_id: task.job_id,
          total_messages_imported: finalJob?.total_messages_imported || 0,
        })
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

        logAction('completeSyncJob', 'success', {
          sync_job_id: task.sync_job_id,
          messages_synced: job?.total_messages_imported || 0,
        })
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

    const duration = Date.now() - startTime

    reqLogger.info('Page processing completed', {
      userId: task.user_id,
      account_id: task.account_id,
      page_number: task.page_number,
      emails_fetched: emails.length,
      emails_imported: insertedCount,
      duplicates: duplicateCount,
      total_imported: totalImported,
      has_next_page: !!nextLink,
      duration_ms: duration,
      status: nextLink ? 'processing' : 'completed',
    })

    // IMPORTANT: Flush logs before returning!
    await reqLogger.flush()

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
    const duration = Date.now() - startTime

    reqLogger.error('Queue processing error', error as Error, {
      duration_ms: duration,
    })

    // IMPORTANT: Flush logs before returning!
    await reqLogger.flush()

    return new Response(
      JSON.stringify({
        error: error.message || 'Unknown error',
        details: error.toString()
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
