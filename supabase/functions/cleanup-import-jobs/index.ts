import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async () => {
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
  const nowIso = new Date().toISOString()

  const { data: jobs, error: jobsError } = await supabase
    .from('import_jobs')
    .select('id, storage_path')
    .lt('expires_at', nowIso)
    .limit(1000)

  if (jobsError) {
    return new Response(JSON.stringify({ error: jobsError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const jobIds = (jobs || []).map((job) => job.id)
  const paths = (jobs || [])
    .map((job) => job.storage_path)
    .filter((path): path is string => !!path)

  let removedFiles = 0
  if (paths.length > 0) {
    const { data: removed, error: removeError } = await supabase.storage
      .from('file-processing')
      .remove(paths)

    if (removeError) {
      return new Response(JSON.stringify({ error: removeError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    removedFiles = removed?.length || 0
  }

  let deletedJobs = 0
  if (jobIds.length > 0) {
    const { error: deleteError, count } = await supabase
      .from('import_jobs')
      .delete({ count: 'exact' })
      .in('id', jobIds)

    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    deletedJobs = count || jobIds.length
  }

  return new Response(
    JSON.stringify({
      deletedJobs,
      removedFiles,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
