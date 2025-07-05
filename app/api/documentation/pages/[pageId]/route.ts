import { NextResponse } from 'next/server';
import { getPageContent } from '../../../../../lib/notion-service'; // Adjusted path based on nesting

interface RouteContext {
  params: {
    pageId: string;
  };
}

export async function GET(
  request: Request,
  context: RouteContext
) {
  const pageId = context.params.pageId;

  if (!pageId) {
    return NextResponse.json({ message: 'Page ID is required' }, { status: 400 });
  }

  try {
    const content = await getPageContent(pageId);
    return NextResponse.json(content);
  } catch (error) {
    console.error(`Failed to fetch content for page ${pageId}:`, error);
    return NextResponse.json({ message: `Failed to fetch content for page ${pageId}`, error: (error as Error).message }, { status: 500 });
  }
}
