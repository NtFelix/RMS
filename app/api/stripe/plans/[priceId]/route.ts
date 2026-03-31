export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getPlanDetails } from '@/lib/stripe-server';
import { NO_CACHE_HEADERS } from '@/lib/constants/http';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ priceId: string }> }
) {
    const { priceId } = await params;

    if (!priceId) {
        return NextResponse.json({ error: 'Price ID is required' }, {
            status: 400,
            headers: NO_CACHE_HEADERS,
        });
    }

    try {
        const plan = await getPlanDetails(priceId);

        if (!plan) {
            return NextResponse.json({ error: 'Plan not found' }, {
                status: 404,
                headers: NO_CACHE_HEADERS,
            });
        }

        return NextResponse.json(plan, { headers: NO_CACHE_HEADERS });
    } catch (error) {
        console.error(`Error fetching plan details for ${priceId}:`, error);
        return NextResponse.json(
            { error: 'Failed to fetch plan details' },
            {
                status: 500,
                headers: NO_CACHE_HEADERS,
            }
        );
    }
}
