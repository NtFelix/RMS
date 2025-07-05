import { NextResponse } from 'next/server';
import { getDatabasePages } from '../../../../lib/notion-service'; // Adjust path as needed

export const runtime = 'edge';

export async function GET() {
  try {
    const pages = await getDatabasePages();
    return NextResponse.json(pages);
  } catch (error: any) { // Changed to any to inspect error properties
    console.error('[API /api/documentation/pages] Error calling getDatabasePages:', error);
    const status = error.status || 500;
    const message = error.message || 'An internal server error occurred while fetching page list.';
    // If the error came from our re-thrown Notion error, it might have a more specific message.
    return NextResponse.json({ error: "Failed to fetch page list from Notion.", details: message, notion_code: error.code }, { status });
  }
}
