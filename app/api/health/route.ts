import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * Health check endpoint for connectivity testing
 * Used by the network status hook to verify actual connectivity
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      server: 'mietevo-api'
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }
  );
}

/**
 * HEAD request for lightweight connectivity checks
 */
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}