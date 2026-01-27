import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: Request) {
    const formData = await request.formData();
    const decision = formData.get('decision');
    const authorizationId = formData.get('authorization_id') as string;

    if (!authorizationId) {
        return NextResponse.json({ error: 'Missing authorization_id' }, { status: 400 });
    }

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll: async () => (await cookies()).getAll(),
                setAll: async (cookiesToSet) => {
                    const cookieStore = await cookies();
                    cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
                },
            },
        }
    );

    if (decision === 'approve') {
        const { data, error } = await (supabase.auth as any).oauth.approveAuthorization(authorizationId);

        if (error) {
            console.error('Approval error:', error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        // Redirect back to the client with authorization code
        return NextResponse.redirect(data.redirect_to);
    } else {
        const { data, error } = await (supabase.auth as any).oauth.denyAuthorization(authorizationId);

        if (error) {
            console.error('Denial error:', error);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        // Redirect back to the client with error
        return NextResponse.redirect(data.redirect_to);
    }
}
