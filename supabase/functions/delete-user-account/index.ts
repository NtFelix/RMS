import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const allowedOrigins = [
  'https://rent-manager.pages.dev',
  'https://mietevo.de',
  'https://www.mietevo.de',
  'https://rms-1g5d48one-felixs-projects-3080273c.vercel.app',
  'https://rms-55zv7n00b-felixs-projects-3080273c.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001'
];

async function deleteStorageFolder(supabaseAdmin: any, bucket: string, folderPath: string) {
  console.log(`[Storage] Checking bucket "${bucket}" for folder "${folderPath}"...`);

  const { data: files, error } = await supabaseAdmin.storage.from(bucket).list(folderPath, {
    limit: 1000,
    recursive: true,
  });

  if (error) {
    console.error(`[Storage] Error listing files in ${bucket}: ${error.message}`);
    return;
  }

  if (files && files.length > 0) {
    const filesToRemove = files.map((f: any) => `${folderPath}/${f.name}`);
    console.log(`[Storage] Deleting ${filesToRemove.length} files from "${bucket}"...`);

    for (let i = 0; i < filesToRemove.length; i += 100) {
      const batch = filesToRemove.slice(i, i + 100);
      await supabaseAdmin.storage.from(bucket).remove(batch);
    }
  }
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  let accessControlAllowOrigin = allowedOrigins[0];
  if (origin && allowedOrigins.includes(origin)) {
    accessControlAllowOrigin = origin;
  }

  const commonCorsHeaders = {
    'Access-Control-Allow-Origin': accessControlAllowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: commonCorsHeaders, status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Server configuration error: Missing environment variables');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const triggerUserId = body.userId;

    const authHeader = req.headers.get('Authorization');
    const apiKeyHeader = req.headers.get('apikey');

    // ─────────────────────────────────────────────────────────────────────────────
    // MODE 1: TRIGGER MODE (Internal Storage Cleanup)
    // ─────────────────────────────────────────────────────────────────────────────
    if (triggerUserId) {
      console.log(`[Auth] Trigger Mode for user: ${triggerUserId}`);

      const cleanServiceKey = serviceRoleKey.trim();
      const cleanAuthHeader = authHeader?.trim() || "";
      const cleanApiKeyHeader = apiKeyHeader?.trim() || "";

      // Check if either header matches the service role key
      const isAuthorized =
        (cleanAuthHeader === `Bearer ${cleanServiceKey}`) ||
        (cleanApiKeyHeader === cleanServiceKey);

      if (!isAuthorized) {
        console.error('[Auth Error] Invalid Service Role Key provided to Trigger Mode');
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          headers: { ...commonCorsHeaders, 'Content-Type': 'application/json' },
          status: 401
        });
      }

      console.log(`[Cleanup] Starting storage deletion for user_${triggerUserId}`);
      const userFolderPath = `user_${triggerUserId}`;
      const bucketsToClean = ['documents', 'mails', 'images'];

      for (const bucket of bucketsToClean) {
        await deleteStorageFolder(supabaseAdmin, bucket, userFolderPath);
      }

      return new Response(JSON.stringify({ message: 'Storage cleanup successful' }), {
        headers: { ...commonCorsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MODE 2: FRONTEND MODE (Account Deletion)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log(`[Auth] Frontend Mode: Validating User JWT...`);
    const userToken = authHeader?.replace('Bearer ', '');

    if (!userToken) {
      return new Response(JSON.stringify({ error: 'Missing auth token' }), {
        headers: { ...commonCorsHeaders, 'Content-Type': 'application/json' },
        status: 401
      });
    }

    // Since Verify JWT is OFF, we MUST verify the user manually using the token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(userToken);

    if (userError || !user) {
      console.error('[Auth Error] Failed to verify user token:', userError?.message);
      return new Response(JSON.stringify({ error: 'User not authenticated or session expired' }), {
        headers: { ...commonCorsHeaders, 'Content-Type': 'application/json' },
        status: 401
      });
    }

    console.log(`[Delete] Initiating account deletion for user: ${user.id}`);

    // Delete the user from auth.users. 
    // This will fire the DB trigger, which calls this function again in Trigger Mode.
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('[Delete Error] Supabase Admin delete failed:', deleteError.message);
      throw new Error(`Account deletion failed: ${deleteError.message}`);
    }

    return new Response(JSON.stringify({ message: 'User account successfully deleted.' }), {
      headers: { ...commonCorsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err: any) {
    console.error('[Fatal Error]', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...commonCorsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
