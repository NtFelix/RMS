import { NextRequest, NextResponse } from 'next/server';
import { getPageContent } from '../../../../../lib/notion-service';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: any // Letting params be inferred or any for diagnostic
) {
  const pageId = params.id;

  if (!pageId) {
    return NextResponse.json({ error: 'Page ID is required' }, { status: 400 });
  }

  try {
    const content = await getPageContent(pageId);
    if (content === null) { // This case is handled if getPageContent returns null for 404
        return NextResponse.json({ error: 'Page not found in Notion.' }, { status: 404 });
    }
    return NextResponse.json(content);
  } catch (error: any) { // Changed to any to inspect error properties
    console.error(`[API /api/documentation/page/${pageId}] Error calling getPageContent:`, error);
    const status = error.status || 500;
    const message = error.message || `An internal server error occurred while fetching content for page ${pageId}.`;
    return NextResponse.json({ error: `Failed to fetch content for page ${pageId} from Notion.`, details: message, notion_code: error.code }, { status });
  }
}
