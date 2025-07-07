import { NextRequest, NextResponse } from 'next/server';
import { getPageContent } from '../../../../../lib/notion-service'; // Adjust path as necessary

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
) {
  const pageId = new URL(request.url).pathname.split('/').filter(Boolean).pop();

  if (!pageId) {
    return NextResponse.json({ error: 'Page ID is required' }, { status: 400 });
  }

  try {
    const content = await getPageContent(pageId); // pageId is already asserted or checked
    return NextResponse.json(content);
  } catch (error) {
    console.error(`API Error fetching content for page ${pageId}:`, error);
    // Check if the error is an instance of Error to safely access message property
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: `Failed to fetch content for page ${pageId}`, details: errorMessage }, { status: 500 });
  }
}
