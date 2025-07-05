import { NextRequest, NextResponse } from 'next/server';
import { getPageContent } from '../../../../../lib/notion-service';

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
    if (content === null) {
        return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }
    return NextResponse.json(content);
  } catch (error) {
    console.error(`Failed to fetch content for page ${pageId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Failed to fetch content for page ${pageId}`, details: errorMessage }, { status: 500 });
  }
}
