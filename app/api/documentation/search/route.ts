export const runtime = 'edge';
import { NextResponse } from "next/server";
import { createDocumentationService } from "@/lib/documentation-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Suchbegriff ist erforderlich.' },
        { status: 400 }
      );
    }

    const documentationService = createDocumentationService(true);
    const searchResults = await documentationService.searchArticles(query.trim());

    return NextResponse.json(searchResults, { status: 200 });
  } catch (error) {
    console.error('GET /api/documentation/search error:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Suche in der Dokumentation.' },
      { status: 500 }
    );
  }
}