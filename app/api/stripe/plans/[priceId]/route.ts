export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getPlanDetails } from '@/lib/stripe-server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ priceId: string }> }
) {
    const { priceId } = await params;

    if (!priceId) {
        return NextResponse.json({ error: 'Price ID is required' }, { status: 400 });
    }

    try {
        const plan = await getPlanDetails(priceId);

        if (!plan) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        return NextResponse.json(plan);
    } catch (error) {
        console.error(`Error fetching plan details for ${priceId}:`, error);
        return NextResponse.json(
            { error: 'Failed to fetch plan details' },
            { status: 500 }
        );
    }
}
