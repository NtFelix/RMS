import { NextResponse } from 'next/server';
import { NO_CACHE_HEADERS } from "@/lib/constants/http";


export async function POST() {
  // Dummy logout route for E2E tests and client consistency
  return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS });
}
