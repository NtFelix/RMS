import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Define allowed origins
const allowedOrigins = [
  'https://rms-1g5d48one-felixs-projects-3080273c.vercel.app', // Your Vercel deployment
  'http://localhost:3000', // Common local development URL
  'http://localhost:3001'  // Often used by Vercel CLI local dev
];

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  let accessControlAllowOrigin = allowedOrigins[0]; // Default to your primary deployment URL

  if (origin && allowedOrigins.includes(origin)) {
    accessControlAllowOrigin = origin;
  } else if (origin) { // If origin is present but not in allowed list, log it
    console.warn(`Origin ${origin} not in allowedOrigins. Defaulting to ${allowedOrigins[0]} for Access-Control-Allow-Origin header.`);
  }


  const commonCorsHeaders = {
    'Access-Control-Allow-Origin': accessControlAllowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', // Ensure all necessary headers are listed
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: commonCorsHeaders, status: 200 });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase environment variables in Edge Function.');
      return new Response(JSON.stringify({ error: 'Server configuration error: Missing Supabase environment variables' }), {
        headers: { ...commonCorsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const userToken = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!userToken) {
      return new Response(JSON.stringify({ error: 'Authentication error: Missing auth token' }), {
        headers: { ...commonCorsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(userToken);

    if (userError || !user) {
      console.error('User auth error in Edge Function:', userError?.message);
      return new Response(JSON.stringify({ error: userError?.message || 'User not authenticated or token invalid' }), {
        headers: { ...commonCorsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('Supabase admin.deleteUser error in Edge Function:', deleteError.message, deleteError.stack);
      return new Response(JSON.stringify({ error: `Failed to delete user: ${deleteError.message}` }), {
        headers: { ...commonCorsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ message: 'User deleted successfully' }), {
      headers: { ...commonCorsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    console.error('Catch-all error in Edge Function:', err.message, err.stack);
    return new Response(JSON.stringify({ error: `An unexpected error occurred: ${err.message}` }), {
      headers: { ...commonCorsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
