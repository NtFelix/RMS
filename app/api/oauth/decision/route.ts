import { NextResponse } from 'next/server';
import { NO_CACHE_HEADERS } from '@/lib/constants/http';
import { submitDecisionAction } from '@/app/oauth/consent/actions';

export async function POST(request: Request) {
    const formData = await request.formData();
    const decision = formData.get('decision');
    const authorizationId = formData.get('authorization_id') as string;

    if (!authorizationId) {
        return NextResponse.json({ error: 'Missing authorization_id' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    const { success, redirect_to, error } = await submitDecisionAction(
        authorizationId,
        decision === 'approve' ? 'allow' : 'deny'
    );

    if (!success || error || !redirect_to) {
        return NextResponse.json({ error: error || 'Decision failed' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    return NextResponse.redirect(redirect_to, { headers: NO_CACHE_HEADERS });
}
