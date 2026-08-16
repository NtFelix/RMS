import { NextRequest, NextResponse } from 'next/server';
import { NO_CACHE_HEADERS } from '@/lib/constants/http';
import { submitDecisionAction } from '@/app/oauth/consent/actions';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const authorizationId = searchParams.get('authorization_id');
    const baseUrl = new URL(request.url).origin;

    if (!authorizationId) {
        return NextResponse.json({ error: 'Missing authorization_id' }, { status: 400, headers: NO_CACHE_HEADERS });
    }

    try {
        const { success, redirect_to, error } = await submitDecisionAction(authorizationId, 'allow');

        if (!success || error || !redirect_to) {
            console.error('[OAuth Approve] Approval failed:', error);
            return NextResponse.redirect(
                new URL(
                    `/oauth/consent?error=approval_failed&message=${encodeURIComponent(error || 'Unknown error')}`,
                    baseUrl
                )
            );
        }

        return NextResponse.redirect(redirect_to);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown server error';
        console.error('[OAuth Approve] Approval error:', err);
        return NextResponse.redirect(
            new URL(`/oauth/consent?error=server_error&message=${encodeURIComponent(message)}`, baseUrl)
        );
    }
}
