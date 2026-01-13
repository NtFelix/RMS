export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getPlanDetails } from '@/lib/stripe-server';

export async function GET(
    request: Request,
    { params }: { params: { priceId: string } }
) {
    try {
        const { priceId } = params;

        if (!priceId) {
            return NextResponse.json({ error: 'Price ID is required' }, { status: 400 });
        }

        const plan = await getPlanDetails(priceId);

        if (!plan) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        return NextResponse.json(plan);
    } catch (error) {
        console.error(`Error fetching plan details for ${params.priceId}:`, error);
        return NextResponse.json(
            { error: 'Failed to fetch plan details' },
            { status: 500 }
        );
    }
}
