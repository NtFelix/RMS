import { NextResponse } from 'next/server';

export async function POST() {
  // Dummy clear-auth-cookie route for E2E tests and client consistency
  return NextResponse.json({ success: true });
}
