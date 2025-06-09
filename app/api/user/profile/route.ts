import { NextResponse } from 'next/server';
import { fetchUserProfile } from '@/lib/data-fetching';
import { createSupabaseServerClient } from '@/lib/supabase-server'; // Ensure this is the correct path

export async function GET() {
  const supabase = createSupabaseServerClient(); // Needed for auth context if fetchUserProfile relies on it implicitly
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const profile = await fetchUserProfile(); // fetchUserProfile should handle its own Supabase client and user fetching.
                                            // Or, if it expects user object: await fetchUserProfile(user);
                                            // Based on its current implementation, it gets user itself.

    if (!profile) {
      return new NextResponse(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error in /api/user/profile:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
