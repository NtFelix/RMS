import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

// Define a type for the environment variables for clarity
interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

// Define a type for the expected user structure (optional, but good practice)
interface User {
  id: string;
  // Add other user properties if needed
}

console.log("Delete user account function initializing.");

Deno.serve(async (req: Request) => {
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS request");
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("Processing request...");
    const env = Deno.env.toObject() as unknown as Env;

    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase URL or Service Role Key in environment variables.");
      return new Response(JSON.stringify({ error: 'Server configuration error: Missing Supabase credentials.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase admin client
    const supabaseAdmin: SupabaseClient = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.warn("Missing Authorization header.");
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');

    // Get user from JWT
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError) {
      console.error("Error getting user from token:", userError.message);
      return new Response(JSON.stringify({ error: `Forbidden: ${userError.message}` }), {
        status: 403, // Or 401 if preferred for invalid token
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!user) {
      console.warn("No user found for the provided token.");
      return new Response(JSON.stringify({ error: 'Forbidden: User not found' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Attempting to delete user with ID: ${user.id}`);

    // Delete the user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error(`Error deleting user ${user.id}:`, deleteError.message);
      return new Response(JSON.stringify({ error: `Failed to delete user: ${deleteError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`User ${user.id} deleted successfully.`);
    return new Response(JSON.stringify({ message: 'User deleted successfully' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error("Unexpected error in function:", e.message);
    return new Response(JSON.stringify({ error: `Internal Server Error: ${e.message}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
