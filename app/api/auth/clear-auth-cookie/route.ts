import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST() {
  // Dummy clear-auth-cookie route for E2E tests and client consistency
  return NextResponse.json({ success: true });
}
