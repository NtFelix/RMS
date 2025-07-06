import { NextResponse } from 'next/server';
import { getDatabasePages } from '../../../lib/notion-service';

export const runtime = 'edge';

export async function GET() {
  try {
    const pages = await getDatabasePages();
    return NextResponse.json(pages);
  } catch (error: any) {
    // Updated console.error to reflect the new path
    console.error('[API /api/doclisting] Error calling getDatabasePages:', error);
    const status = error.status || 500;
    const message = error.message || 'An internal server error occurred while fetching page list.';
    return NextResponse.json({ error: "Failed to fetch page list from Notion.", details: message, notion_code: error.code }, { status });
  }
}
